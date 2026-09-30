'use strict';
const config = require('./config');
App({
 globalData: { cloudReady: false, returnPath: '' },
 onLaunch() {
  if (!wx.cloud) return;
  try { wx.cloud.init({ env: config.CLOUD_ENV, traceUser: false }); this.globalData.cloudReady = true; }
  catch (_) { this.globalData.cloudReady = false; }
 }
});
