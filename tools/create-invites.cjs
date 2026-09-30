'use strict';
// Offline setup only. Output is PRIVATE; never put it in a public repository or client bundle.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { hash } = require('../cloudfunctions/idleGuide/core');
const target = process.argv[2];
if (!target) throw new Error('Supply a private output directory');
fs.mkdirSync(target, { recursive: true });
const codesFile = path.join(target, '邀请码-仅管理员保存.txt');
const seedFile = path.join(target, 'state-首次初始化.json');
if (fs.existsSync(codesFile) || fs.existsSync(seedFile)) throw new Error('Refusing to overwrite an existing invitation batch');
const createdAt = Date.now(), expiresAt = createdAt + 90 * 86400000;
const codes = Array.from({ length: 30 }, () => crypto.randomBytes(12).toString('hex').toUpperCase());
const invites = Object.fromEntries(codes.map(code => [hash(code), { expiresAt, usedBy: '', revoked: false }]));
const state = { _id: 'state', version: 1, capacity: 30, count: 0, admins: [], members: {}, invites };
fs.writeFileSync(seedFile, JSON.stringify(state, null, 2));
fs.writeFileSync(codesFile, '首批 30 个邀请码，每码限一个微信账号；已激活账号不受邀请码到期影响。\n未部署，尚不可使用。\n未激活邀请码到期：' + new Date(expiresAt).toISOString() + '\n\n' + codes.map((c, i) => String(i + 1).padStart(2, '0') + '  ' + c.match(/.{6}/g).join('-')).join('\n'));
console.log('Created 30 private invitation codes; raw codes withheld from logs.');
