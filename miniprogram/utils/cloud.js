'use strict';
const config = require('../config');
const messages = {
 IDENTITY: '未能确认微信身份，请重新进入。', NOT_READY: '试用正在准备中，请稍后再来。',
 SERVICE_UNAVAILABLE: '暂时连接不上，请稍后重试。', INVITE_REQUIRED: '请先使用邀请码进入。',
 DISABLED: '这个试用账号已暂停使用。', INVALID_INVITE: '邀请码无效、已使用或已到期。',
 TOO_MANY_ATTEMPTS: '尝试次数较多，请一小时后再试。', FULL: '这一轮试用名额已满。',
 RATE_LIMIT: '慢一点，稍后再发吧。', INVALID_INPUT: '请检查填写的内容和字数。',
 NOT_FOUND: '这条内容已经不可用。', FORBIDDEN: '当前账号没有这个操作权限。'
};
function call(action, payload) {
 return new Promise((resolve, reject) => {
  const fail = code => { const error = new Error(messages[code] || messages.SERVICE_UNAVAILABLE); error.code = code; reject(error); };
  if (!wx.cloud || !getApp().globalData.cloudReady) { fail('SERVICE_UNAVAILABLE'); return; }
  let settled = false;
  const timer = setTimeout(() => { settled = true; fail('SERVICE_UNAVAILABLE'); }, config.REQUEST_TIMEOUT);
  wx.cloud.callFunction({ name: config.CLOUD_FUNCTION, data: { action, payload: payload || {} },
   success(response) { if (settled) return; settled=true;clearTimeout(timer);const result=response.result;if(result&&result.ok)resolve(result);else fail(result&&result.code||'SERVICE_UNAVAILABLE'); },
   fail() { if (!settled) { settled=true;clearTimeout(timer);fail('SERVICE_UNAVAILABLE'); } }
  });
 });
}
module.exports={call};
