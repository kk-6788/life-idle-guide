'use strict';

// saved.js — 我收着的：只展示本机收藏的条目；onShow 每次刷新。
const content = require('../../data/content.js');
const store = require('../../utils/store.js');

const CAT_CLASS = {
  '放空': 'rest',
  '闲逛': 'stroll',
  '手边小事': 'hand',
  '童年游戏': 'child',
  '一起闲着': 'together',
};

const guard = require('../../utils/guard');
Page(guard({
  data: {
    list: [],
    savedMap: {},
  },

  // 每次回到本页都重读收藏，保证与首页/详情一致；坏缓存不崩溃。
  onShow() {
    this.items = Array.isArray(content) ? content : [];
    this.savedSet = store.load();
    this.render();
  },

  render() {
    const savedMap = {};
    this.savedSet.forEach((id) => { savedMap[id] = true; });
    const list = this.items
      .filter((it) => this.savedSet.has(it.id))
      .map((it) => Object.assign({}, it, {
        catClass: CAT_CLASS[it.category] || 'hand',
        paid: it.cost === 'paid',
      }));
    this.setData({ list, savedMap });
  },

  onCardTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/detail/detail?id=' + encodeURIComponent(id) });
  },

  onFavTap(e) {
    const id = e.currentTarget.dataset.id;
    this.savedSet = store.toggle(this.savedSet, id);
    const ok = store.save(this.savedSet);
    this.render();
    if (!ok) {
      wx.showToast({ title: '收着保存失败（本地存储不可用）', icon: 'none' });
    }
  },

  onGoBrowse() {
    wx.switchTab({ url: '/pages/home/home' });
  },
}));
