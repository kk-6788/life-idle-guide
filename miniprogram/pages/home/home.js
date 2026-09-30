'use strict';

// home.js — 首页：默认只展示少量条目，搜索/筛选收在"找一找"里；随机 / 收藏。
const guide = require('../../utils/guide.js');
const content = require('../../data/content.js');
const store = require('../../utils/store.js');
const wheel = require('../../utils/wheel.js');

const PAGE_SIZE = 6;
const SPIN_MS = 2200;

function cancelSpin(page) {
  if (page._spinTimer != null) clearTimeout(page._spinTimer);
  page._spinTimer = null;
  page.setData({ spinning: false });
}

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
    categories: guide.CATEGORIES,
    settings: [
      { value: '', label: '不限地点' },
      { value: 'indoor', label: '室内' },
      { value: 'outdoor', label: '户外' },
    ],
    companies: [
      { value: '', label: '不限人数' },
      { value: 'solo', label: '一个人' },
      { value: 'together', label: '两个人' },
      { value: 'group', label: '三人及以上' },
    ],
    query: '',
    category: '',
    setting: '',
    company: '',
    filtersOpen: false,
    filtersActiveCount: 0,
    list: [],
    visibleList: [],
    visibleCount: 0,
    resultCount: 0,
    savedMap: {},
    wheelItems: [],
    wheelImage: '/assets/wheel-8.png',
    wheelRotation: 0,
    wheelSelected: -1,
    spinning: false,
  },

  onLoad() {
    this.items = Array.isArray(content) ? content : [];
  },

  // 收藏在本机；每次回到首页都重新读取，保证与"我收着的"一致，坏缓存不崩溃。
  // 已展开的列表长度保留，不会因为回到首页被收回。
  onShow() {
    this.savedSet = store.load();
    this.applyFilter();
  },

  onHide() { cancelSpin(this); },
  onUnload() { cancelSpin(this); },

  activeFilterCount() {
    const d = this.data;
    return (d.category ? 1 : 0) + (d.setting ? 1 : 0) +
      (d.company ? 1 : 0) + (String(d.query).trim() ? 1 : 0);
  },

  applyFilter() {
    cancelSpin(this);
    const list = guide.filterActivities(this.items, {
      query: this.data.query,
      category: this.data.category,
      setting: this.data.setting,
      company: this.data.company,
    });
    const savedMap = {};
    this.savedSet.forEach((id) => { savedMap[id] = true; });
    const viewList = list.map((it) => Object.assign({}, it, {
      catClass: CAT_CLASS[it.category] || 'hand',
      paid: it.cost === 'paid',
    }));
    // 保留已展开的长度（不超过当前结果数），收藏刷新不打断浏览。
    const prev = this.data.visibleCount || 0;
    const visibleCount = Math.max(PAGE_SIZE, Math.min(prev, viewList.length));
    const wheelItems = wheel.createSlots(viewList);
    this.setData({
      list: viewList,
      resultCount: viewList.length,
      visibleList: viewList.slice(0, visibleCount),
      visibleCount,
      savedMap,
      filtersActiveCount: this.activeFilterCount(),
      wheelItems,
      wheelImage: '/assets/wheel-' + (wheelItems.length || 8) + '.png',
      wheelRotation: 0,
      wheelSelected: -1,
    });
  },

  onToggleFilters() {
    this.setData({ filtersOpen: !this.data.filtersOpen });
  },

  onResetFilters() {
    this.setData({ query: '', category: '', setting: '', company: '', visibleCount: PAGE_SIZE });
    this.applyFilter();
  },

  onSearchInput(e) {
    this.setData({ query: e.detail.value, visibleCount: PAGE_SIZE });
    this.applyFilter();
  },

  onChipTap(e) {
    const { group, value } = e.currentTarget.dataset;
    this.setData({ [group]: value, visibleCount: PAGE_SIZE });
    this.applyFilter();
  },

  onShowMore() {
    const next = Math.min(this.data.visibleCount + PAGE_SIZE, this.data.list.length);
    this.setData({
      visibleCount: next,
      visibleList: this.data.list.slice(0, next),
    });
  },

  onRandom() {
    if (this.data.spinning) return;
    const index = wheel.pickIndex(this.data.wheelItems, this.lastRandomId);
    if (index < 0) {
      wx.showToast({ title: '没有可挑的条目', icon: 'none' });
      return;
    }
    const picked = this.data.wheelItems[index];
    this.setData({ spinning: true, wheelSelected: index,
      wheelRotation: wheel.stopRotation(this.data.wheelRotation, index, this.data.wheelItems.length) });
    this._spinTimer = setTimeout(() => {
      this._spinTimer = null;
      this.setData({ spinning: false });
      if (!this.data.authorized) return;
      this.lastRandomId = picked.id;
      wx.navigateTo({ url: '/pages/detail/detail?id=' + encodeURIComponent(picked.id) });
    }, SPIN_MS);
  },

  onCardTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/detail/detail?id=' + encodeURIComponent(id) });
  },

  onFavTap(e) {
    const id = e.currentTarget.dataset.id;
    this.savedSet = store.toggle(this.savedSet, id);
    const ok = store.save(this.savedSet);
    this.applyFilter();
    if (!ok) {
      wx.showToast({ title: '收着保存失败（本地存储不可用）', icon: 'none' });
    }
  },
}));
