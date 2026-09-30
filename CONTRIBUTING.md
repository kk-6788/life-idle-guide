# 贡献指南（CONTRIBUTING）

欢迎参与《人生浪费指南》。请先读 CONTENT_GUIDE.md 与 docs/上线前事项.md，遵守本项目的边界。

## 一、改内容：只改 shared/content.json

- `shared/content.json` 是唯一内容源（网页与小程序的共同数据来源）。
- 保持数组顺序稳定、id 稳定唯一；新条目追加。
- 投稿与费用收录标准见 CONTENT_GUIDE.md。

改完运行：

```bash
node --test tests/guide.test.js          # 内容与筛选/随机逻辑回归
node tools/sync_content.js               # 同步到小程序
node tools/sync_content.js --check       # 校验网页/小程序同源
```

不要手改 `miniprogram/data/content.js` 或 `miniprogram/utils/guide.js`，它们由同步脚本生成。

## 二、改代码

- 网页：`web/`；后端：`server/`；小程序：`miniprogram/`；共享逻辑：`shared/guide.js`。
- 不引入新依赖；后端只用 Python 标准库。
- 外部用户内容一律按**纯文本**呈现，不要插成 HTML / rich-text。
- 新增行为应有有意义的测试：
  - 内容/筛选逻辑 → `tests/guide.test.js`
  - 后端存储/HTTP → `tests/test_community.py`

运行测试：

```bash
node --test tests/guide.test.js
python -m unittest tests/test_community.py -v
```

## 三、流程

1. 先对照 CONTENT_GUIDE.md 自查，再改 `shared/content.json`。
2. 跑测试与 `sync_content.js --check`，全部通过才算可合并。
3. 每批变更在 `reports/` 记录：新增/删改哪些、为什么、验证结果。如实记录，不夸大。

## 四、不做什么

- 不虚构用户、评论、访客数字或收入；预览内容不得冒充线上社区数据。
- 不收录刷短视频、不提供盗版资源、不制造"必须买 X 才能玩"的条件。
- 不伪造 AppID、不声称未真机验证的发布成功。
- 不把本机匿名接口声明为可直接公网部署。
