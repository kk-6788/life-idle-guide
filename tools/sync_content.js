'use strict';

/**
 * sync_content.js — 从 shared/content.json 同步到小程序可 require 的模块。
 *
 * 唯一内容源是 shared/content.json。本脚本生成：
 *   - miniprogram/data/content.js   内容数据（module.exports = 数组）
 *   - miniprogram/utils/guide.js    共享筛选/随机逻辑副本（小程序不可跨项目根 require）
 *
 * 用法：
 *   node tools/sync_content.js          生成/覆盖上述两个文件
 *   node tools/sync_content.js --check  只校验，不写入；不一致则退出码 1
 *
 * 改内容请改 shared/content.json，然后重新运行同步；不要手改生成文件。
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC_CONTENT = path.join(ROOT, 'shared', 'content.json');
const SRC_GUIDE = path.join(ROOT, 'shared', 'guide.js');
const OUT_CONTENT = path.join(ROOT, 'miniprogram', 'data', 'content.js');
const OUT_GUIDE = path.join(ROOT, 'miniprogram', 'utils', 'guide.js');
const OUT_IDS = path.join(ROOT, 'cloudfunctions', 'idleGuide', 'activity-ids.json');

const CHECK = process.argv.includes('--check');

function fail(msg) {
  process.stderr.write('sync_content: ' + msg + '\n');
  process.exitCode = 1;
}

function buildContentText(data) {
  const header = [
    "'use strict';",
    '/*',
    ' * 由 tools/sync_content.js 从 shared/content.json 自动生成，请勿手改。',
    ' * 唯一内容源是 shared/content.json；改内容请改那里并重新运行同步。',
    ' */',
    'module.exports =',
    JSON.stringify(data, null, 2),
    ';',
    '',
  ].join('\n');
  return header;
}

function main() {
  let raw;
  try {
    raw = fs.readFileSync(SRC_CONTENT, 'utf8');
  } catch (e) {
    return fail('读取 shared/content.json 失败：' + e.message);
  }
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    return fail('shared/content.json 不是合法 JSON：' + e.message);
  }
  if (!Array.isArray(data)) {
    return fail('shared/content.json 顶层应为数组');
  }

  const contentText = buildContentText(data);
  const idsText = JSON.stringify(data.map(item => item.id), null, 2) + '\n';

  let guideText;
  try {
    guideText = fs.readFileSync(SRC_GUIDE, 'utf8');
  } catch (e) {
    return fail('读取 shared/guide.js 失败：' + e.message);
  }

  if (CHECK) {
    let mismatch = [];
    for (const [out, expect] of [
      [OUT_CONTENT, contentText],
      [OUT_GUIDE, guideText],
      [OUT_IDS, idsText],
    ]) {
      if (!fs.existsSync(out)) {
        mismatch.push('缺失：' + path.relative(ROOT, out));
        continue;
      }
      if (fs.readFileSync(out, 'utf8') !== expect) {
        mismatch.push('不一致：' + path.relative(ROOT, out));
      }
    }
    if (mismatch.length) {
      return fail('需要同步：\n  ' + mismatch.join('\n  '));
    }
    // 额外校验生成内容可被 require 且与源数据等价。
    const generated = require(OUT_CONTENT);
    const equal = JSON.stringify(generated) === JSON.stringify(data);
    if (!equal) {
      return fail('miniprogram/data/content.js 与 shared/content.json 数据不等价');
    }
    process.stdout.write('sync_content: 同步且一致（--check 通过）\n');
    return;
  }

  fs.mkdirSync(path.dirname(OUT_CONTENT), { recursive: true });
  fs.mkdirSync(path.dirname(OUT_GUIDE), { recursive: true });
  fs.writeFileSync(OUT_CONTENT, contentText, 'utf8');
  fs.writeFileSync(OUT_GUIDE, guideText, 'utf8');
  fs.mkdirSync(path.dirname(OUT_IDS), { recursive: true });
  fs.writeFileSync(OUT_IDS, idsText, 'utf8');
  process.stdout.write(
    'sync_content: 已生成\n  ' +
    path.relative(ROOT, OUT_CONTENT) + '\n  ' +
    path.relative(ROOT, OUT_GUIDE) + '\n'
  );
}

main();
