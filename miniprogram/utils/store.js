'use strict';

/**
 * store.js — 收藏（仅本机）的本地缓存读写。
 * 坏缓存不导致崩溃：任何读写异常都温和回退到空集合。
 */

const KEY = 'lwz_favorites_v1';

function normalize(arr) {
  const out = new Set();
  if (Array.isArray(arr)) {
    for (const v of arr) {
      if (v != null && typeof v !== 'boolean') out.add(String(v));
    }
  }
  return out;
}

function load() {
  try {
    return normalize(wx.getStorageSync(KEY));
  } catch (e) {
    return new Set();
  }
}

function save(set) {
  try {
    wx.setStorageSync(KEY, Array.from(set));
    return true;
  } catch (e) {
    return false;
  }
}

function toggle(set, id) {
  const next = new Set(set);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

module.exports = { load, save, toggle, normalize };
