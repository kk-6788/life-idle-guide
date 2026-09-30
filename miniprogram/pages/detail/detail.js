'use strict';

// detail.js — 详情页：展示一条活动的正文与需要，本机收藏，分享卡片。
const content = require('../../data/content.js');
const store = require('../../utils/store.js');
const guide = require('../../utils/guide.js');

const CAT_CLASS = {
  '放空': 'rest',
  '闲逛': 'stroll',
  '手边小事': 'hand',
  '童年游戏': 'child',
  '一起闲着': 'together',
};
const SETTING_LABEL = { indoor: '室内', outdoor: '户外', either: '室内外都行' };
const COMPANY_LABEL = { solo: '一个人', together: '两个人', group: '三人及以上', social: '两人及以上', either: '不限人数' };

const guard = require('../../utils/guard');
Page(guard({
  data: {
    item: null,
    fav: false,
  },

  onLoad(options) {
    let id = '';
    try { id = options && options.id ? decodeURIComponent(options.id) : ''; }
    catch (_) { id = ''; }
    const it = (Array.isArray(content) ? content : []).find((x) => x.id === id);
    if (!it) {
      this.id = '';
      this.setData({ item: null, fav: false });
      wx.showToast({ title: '没找到这条', icon: 'none' });
      return;
    }
    this.id = id;
    this.savedSet = store.load();
    const item = Object.assign({}, it, {
      catClass: CAT_CLASS[it.category] || 'hand',
      settingLabel: SETTING_LABEL[it.setting] || it.setting,
      companyLabel: COMPANY_LABEL[it.company] || it.company,
      costLabel: guide.costLabel(it.cost),
    });
    this.setData({ item, fav: this.savedSet.has(id) });
    wx.setNavigationBarTitle({ title: it.title });
  },

  onFavTap() {
    if (!this.id) return;
    this.savedSet = store.toggle(this.savedSet, this.id);
    const ok = store.save(this.savedSet);
    this.setData({ fav: this.savedSet.has(this.id) });
    if (!ok) {
      wx.showToast({ title: '收着保存失败（本地存储不可用）', icon: 'none' });
    }
  },

  // 分享卡片返回真实页面路径和 id，他人点开直达同一条活动。
  onGoHome() {
    wx.switchTab({ url: '/pages/home/home' });
  },

  onShareAppMessage() {
    return {
      title: (this.data.item && this.data.item.title) || '人生浪费指南',
      path: this.id ? '/pages/detail/detail?id=' + encodeURIComponent(this.id) : '/pages/home/home',
    };
  },
}));
