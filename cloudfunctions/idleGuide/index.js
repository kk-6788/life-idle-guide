'use strict';
// wx-server-sdk must be approved and installed in the cloud before deployment.
const cloud = require('wx-server-sdk');
const { createService } = require('./core');
const activityIds = require('./activity-ids.json');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const collection = 'idle_guide';
function withoutId(value) { const copy = { ...value }; delete copy._id; return copy; }
function checked(result) {
  if (result && (result.code || result.errCode)) throw result;
  return result;
}
const store = {
  async read(id) {
    const result = checked(await db.collection(collection).where({ _id: id }).limit(1).get());
    return result.data[0] || null;
  },
  transaction: run => db.runTransaction(async transaction => run({
    async get(id) {
      try {
        const result = checked(await transaction.collection(collection).doc(id).get());
        const value = result.data;
        return value ? withoutId(value) : null;
      } catch (error) {
        // Missing documents only; never treat a connection or permission error as an empty DB.
        if (error.code === 'DATABASE_DOCUMENT_NOT_EXIST' || /document.*(not exist|not found)/i.test(error.message || error.errMsg || '')) return null;
        throw error;
      }
    },
    set: async (id, value) => checked(await transaction.collection(collection).doc(id).set({ data: withoutId(value) })),
  })),
  async list(query, offset, limit) {
    const result = checked(await db.collection(collection).where(query).orderBy('createdAt', 'desc').orderBy('_id', 'desc').skip(offset).limit(limit).get());
    return result.data.map(row => ({ ...row, _id: row._id.replace(/^item_/, '') }));
  },
};
const handle = createService(store, { activityIds });
exports.main = async event => {
  const context = cloud.getWXContext();
  try { return await handle(event, { openid: context.OPENID, appid: context.APPID }); }
  catch (_) { return { ok: false, code: 'SERVICE_UNAVAILABLE' }; }
};
