'use strict';
const crypto = require('node:crypto');
const CAPACITY = 30;
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const ok = data => ({ ok: true, ...data });
const fail = code => ({ ok: false, code });
const clean = (v, max) => typeof v === 'string' && v.trim().length > 0 && v.trim().length <= max ? v.trim() : null;
const normalizeCode = v => typeof v === 'string' ? v.toUpperCase().replace(/[\s-]/g, '') : '';
const publicItem = p => ({ id: p._id, activityId: p.activityId || '', nickname: p.nickname, text: p.text, createdAt: new Date(p.createdAt).toISOString(), parentId: p.parentId || '' });

// The adapter supplies transactions and trusted WeChat identity; client OPENID is never read.
function createService(store, { now = Date.now, randomId = () => crypto.randomBytes(16).toString('hex'), activityIds = [] } = {}) {
  const activities = new Set(activityIds);
  return async function handle(event, identity) {
    if (!identity || identity.appid !== 'wx0000000000000000' || !identity.openid) return fail('IDENTITY');
    const uid = hash(identity.openid);
    const action = event && event.action;
    const payload = event && event.payload || {};
    const time = now();
    const id = randomId();
    return store.transaction(async tx => {
      const state = await tx.get('state');
      if (!state || state.version !== 1 || state.capacity !== CAPACITY) return fail('NOT_READY');
      const member = state.members[uid];
      const admin = state.admins.includes(uid);
      const active = member && !member.disabled;
      if (action === 'membership') return ok({ active: !!active, admin: !!(active && admin), memberId: uid, disabled: !!(member && member.disabled) });
      if (action === 'redeem') {
        if (member) return member.disabled ? fail('DISABLED') : ok({ active: true, admin });
        // Attempts are committed even on a wrong code. A DB error rolls everything back.
        const key = 'attempt_' + uid;
        const old = await tx.get(key);
        const attempt = old && time - old.since < 3600000 ? old : { since: time, count: 0 };
        if (attempt.count >= 10) return fail('TOO_MANY_ATTEMPTS');
        await tx.set(key, { since: attempt.since, count: attempt.count + 1 });
        const code = normalizeCode(payload.code);
        const invite = /^[A-F0-9]{24}$/.test(code) ? state.invites[hash(code)] : null;
        if (!invite || invite.usedBy || invite.revoked || time >= invite.expiresAt) return fail('INVALID_INVITE');
        if (state.count >= CAPACITY) return fail('FULL');
        invite.usedBy = uid;
        invite.usedAt = time;
        state.members[uid] = { joinedAt: time, disabled: false };
        state.count += 1;
        await tx.set('state', state);
        return ok({ active: true, admin: state.admins.includes(uid) });
      }
      if (!active) return fail(member ? 'DISABLED' : 'INVITE_REQUIRED');
      if (action === 'status') return ok({ enabled: true, admin, notice: '说点什么，或者只看看。' });
      if (action === 'list' || action === 'comments' || action === 'mine' || action === 'reviewList') {
        const offset = Number.isInteger(payload.offset) && payload.offset >= 0 && payload.offset <= 10000 ? payload.offset : 0;
        let query;
        if (action === 'reviewList') {
          if (!admin) return fail('FORBIDDEN');
          query = { status: 'pending' };
        } else if (action === 'mine') query = { owner: uid };
        else if (action === 'comments') {
          const parent = typeof payload.parentId === 'string' && await tx.get('item_' + payload.parentId);
          if (!parent || parent.kind !== 'post' || parent.status !== 'approved') return fail('NOT_FOUND');
          query = { kind: 'comment', parentId: payload.parentId, status: 'approved' };
        } else query = { kind: 'post', status: 'approved' };
        // List executes outside a transaction in the adapter, after membership was checked.
        return { ok: true, listQuery: query, offset, privateView: action === 'mine' || action === 'reviewList' };
      }
      if (action === 'members') {
        if (!admin) return fail('FORBIDDEN');
        return ok({ count: state.count, capacity: CAPACITY, members: Object.entries(state.members).map(([key, m]) => ({ id: key, ...m, self: key === uid })) });
      }
      if (action === 'disableMember') {
        if (!admin || payload.memberId === uid) return fail('FORBIDDEN');
        const target = state.members[payload.memberId];
        if (!target || typeof payload.disabled !== 'boolean') return fail('INVALID_INPUT');
        target.disabled = payload.disabled;
        await tx.set('state', state); // Keep count and invite used; blocking does not create a new slot.
        return ok({});
      }
      if (action === 'moderate' || action === 'deleteOwn') {
        if (typeof payload.id !== 'string' || !/^[a-f0-9]{32}$/.test(payload.id)) return fail('INVALID_INPUT');
        const item = await tx.get('item_' + payload.id);
        if (!item) return fail('NOT_FOUND');
        if (action === 'deleteOwn') {
          if (item.owner !== uid) return fail('FORBIDDEN');
          item.status = 'deleted'; item.text = ''; item.nickname = '';
        } else {
          if (!admin) return fail('FORBIDDEN');
          if (!['approved', 'rejected'].includes(payload.status)) return fail('INVALID_INPUT');
          if (item.status === 'deleted') return fail('NOT_FOUND');
          if (item.kind === 'report') {
            // Accepting a report hides the reported content in the same transaction.
            if (payload.status === 'approved') {
              const target = await tx.get('item_' + item.targetId);
              if (target && target.status !== 'deleted') { target.status = 'rejected'; await tx.set('item_' + item.targetId, target); }
            }
            item.status = 'resolved';
          } else {
            if (payload.status === 'approved' && item.kind === 'comment') {
              const parent = await tx.get('item_' + item.parentId);
              if (!parent || parent.status !== 'approved') return fail('NOT_FOUND');
            }
            item.status = payload.status;
            if (payload.status === 'approved' && state.members[item.owner]) {
              state.members[item.owner].nickname = item.nickname;
              await tx.set('state', state);
            }
          }
          item.reviewedAt = time;
        }
        await tx.set('item_' + payload.id, item);
        return ok({});
      }
      if (!['post', 'comment', 'report'].includes(action)) return fail('INVALID_ACTION');
      const rateKey = 'rate_' + uid;
      const oldRate = await tx.get(rateKey);
      const rate = oldRate && time - oldRate.since < 3600000 ? oldRate : { since: time, count: 0, last: 0 };
      if (rate.count >= 20 || (rate.count && time - rate.last < 10000)) return fail('RATE_LIMIT');
      const item = { _id: id, kind: action, status: 'pending', owner: uid, createdAt: time };
      if (action === 'report') {
        if (!/^[a-f0-9]{32}$/.test(payload.targetId || '')) return fail('INVALID_INPUT');
        const target = await tx.get('item_' + payload.targetId);
        if (!target || !['post', 'comment'].includes(target.kind) || target.status !== 'approved') return fail('NOT_FOUND');
        item.targetId = payload.targetId;
        item.text = clean(payload.reason, 200);
        item.nickname = '举报';
      } else {
        item.nickname = clean(payload.nickname, 20);
        item.text = clean(payload.text, action === 'post' ? 500 : 300);
        if (!item.nickname) return fail('INVALID_INPUT');
        if (action === 'post') {
          if (payload.activityId && !activities.has(payload.activityId)) return fail('INVALID_INPUT');
          item.activityId = payload.activityId || '';
        } else {
          if (!/^[a-f0-9]{32}$/.test(payload.parentId || '')) return fail('INVALID_INPUT');
          const parent = await tx.get('item_' + payload.parentId);
          if (!parent || parent.kind !== 'post' || parent.status !== 'approved') return fail('NOT_FOUND');
          item.parentId = payload.parentId;
        }
      }
      if (!item.text) return fail('INVALID_INPUT');
      await tx.set(rateKey, { since: rate.since, count: rate.count + 1, last: time });
      await tx.set('item_' + id, item);
      return ok({ id, status: 'pending' });
    }).then(async result => {
      if (!result.listQuery) return result;
      const rows = await store.list(result.listQuery, result.offset, 21);
      const items = await Promise.all(rows.slice(0, 20).map(async p => {
        const item = { ...publicItem(p), ...(result.privateView ? { status: p.status, kind: p.kind, targetId: p.targetId || '' } : {}) };
        if (action === 'reviewList' && (p.targetId || p.parentId)) {
          const related = await store.read('item_' + (p.targetId || p.parentId));
          item.context = related && related.status !== 'deleted' ? related.nickname + '：' + related.text : '相关内容已不可用';
        }
        return item;
      }));
      return ok({ items, more: rows.length > 20, offset: result.offset });
    });
  };
}
module.exports = { createService, hash, normalizeCode, CAPACITY };
