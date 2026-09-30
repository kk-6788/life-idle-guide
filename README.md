# 人生浪费指南

一个可以安心浪费时间的地方。

看云、发呆、走一条不认识的小路，或者和朋友一起闲着。没有打卡、排行，也不用证明这段时间有什么用。

目前收录 40 件小事，包含一个人、两个人、三人及以上的活动。大多数无需额外花费，也有旅游、逛展等需要预算的选择。每件小事都附有一句短句。

## 这里有什么

- **网页**：浏览、筛选、随机挑选、收藏。静态页面不要求邀请码。
- **微信小程序**：随机转盘、收藏、30 人邀请试用、留言与回复。留言经管理员审核后展示。
- **共同维护的内容库**：网页与小程序使用同一份 `shared/content.json`，欢迎通过 Issue 或 Pull Request 提建议。

源码版本为 v0.8。源码公开不代表微信小程序已正式发布，也不代表网页社区已经上线。

## 先在电脑上看看

需要已有的 Python 3。在仓库根目录运行：

```bash
python -m http.server 8000 --bind 127.0.0.1
```

打开 <http://127.0.0.1:8000/web/>。只浏览、抽取和收藏小事时不需要后台；静态模式的闲聊页面会显示服务尚未开放。

如果还想在本机测试留言功能，Windows 可以双击 `启动网页.cmd`，也可以运行：

```bash
python server/app.py
```

随后打开 <http://127.0.0.1:8765/>。这个 Python 社区服务只监听本机，不能直接作为公开社区后台使用。审核方法见 [使用说明](docs/使用说明.md)。

## 微信小程序

在微信开发者工具中导入 `miniprogram/`。公开版本使用占位 AppID 和云环境，需填写自己的配置；邀请与闲聊后台的初始化方法见 [云端说明](cloudfunctions/README.md)。

普通小程序码与体验版码的访问权限不同，邀请功能不能代替微信平台的发布与体验权限。

## 内容共建

请先看 [内容规则](CONTENT_GUIDE.md) 和 [贡献指南](CONTRIBUTING.md)。允许什么都没做；不收录刷短视频、电子游戏或充值推荐，也不把花钱作为休息的前提。

修改 `shared/content.json` 后，同步到小程序：

```bash
node tools/sync_content.js
node tools/sync_content.js --check
```

## 项目结构

```text
shared/          共同内容与筛选逻辑
web/             静态网页
miniprogram/     微信原生小程序与转盘
cloudfunctions/ 邀请、权限、留言审核后台
server/          Python 标准库编写的本机社区服务
tests/           内容、邀请、转盘与本机服务测试
tools/           内容同步、转盘素材生成、私有邀请码生成
docs/            使用说明与上线边界
```

## 检查

```bash
node --test tests/guide.test.js tests/cloud-invite.test.cjs tests/mini-invite.test.cjs tests/wheel.test.cjs
python -m unittest discover -s tests -p test_community.py -v
node tools/sync_content.js --check
```

运行网页与已有转盘素材不需要 Pillow；仅重新绘制 `tools/draw-wheel.py` 的图片时需要它。云函数使用锁定版本的官方 `wx-server-sdk`，需在自己的部署环境安装。

## 许可与上线边界

当前先公开源码，代码与文字的许可尚未确定，本仓库暂不授予 MIT 或 CC BY 许可。第三方素材的权利不在本项目授权范围内。

GitHub 仓库不会自动运行公开评论后台。微信小程序的正式发布、备案、类目、隐私声明与内容审核需要根据实际功能完成；详见 [上线前事项](docs/上线前事项.md)。
