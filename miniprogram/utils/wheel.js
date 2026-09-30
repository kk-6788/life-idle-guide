'use strict';

// Angles begin at twelve o'clock and increase clockwise, matching wheel PNGs.
const SIZE = 420;
function createSlots(items, rng = Math.random) {
  const pool = items.slice();
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.max(0, Math.min(i, Math.floor(rng() * (i + 1))));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const slots = pool.slice(0, 8), count = slots.length;
  return slots.map((item, index) => {
    const angle = (index + 0.5) * 360 / count;
    const rad = angle * Math.PI / 180;
    const textAngle = angle > 90 && angle < 270 ? angle - 180 : angle;
    const x = SIZE / 2 + 142 * Math.sin(rad);
    const y = SIZE / 2 - 142 * Math.cos(rad);
    const chars = Array.from(item.title);
    const label = chars.length > 8 ? chars.slice(0, 7).join('') + '…' : item.title;
    return { id: item.id, title: item.title, label,
      style: 'left:' + x.toFixed(2) + 'rpx;top:' + y.toFixed(2) + 'rpx;transform:translate(-50%,-50%) rotate(' + textAngle.toFixed(2) + 'deg);' };
  });
}
function pickIndex(slots, previousId, rng = Math.random) {
  if (!slots.length) return -1;
  let indices = slots.map((_, i) => i).filter(i => slots[i].id !== previousId);
  if (!indices.length) indices = [0];
  return indices[Math.max(0, Math.min(indices.length - 1, Math.floor(rng() * indices.length)))];
}
function stopRotation(current, index, count) {
  const center = (index + 0.5) * 360 / count;
  return current + 1080 + ((360 - center - current % 360 + 360) % 360);
}
module.exports = { createSlots, pickIndex, stopRotation };
