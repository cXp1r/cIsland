# cIsland

基于 Tauri 2 + Rust + TypeScript 构建的Windows灵动岛

![Windows](https://img.shields.io/badge/platform-Windows_10%2F11-blue)
![Tauri](https://img.shields.io/badge/Tauri-2.0-orange)
![Rust](https://img.shields.io/badge/Rust-1.70+-red)
![Version](https://img.shields.io/badge/version-1.0.3-green)

## 功能

- **时间显示** — 屏幕顶部居中的胶囊状悬浮窗，实时显示时间，鼠标靠近顶部自动展开、移开自动收缩
- **音乐歌词** — 通过 Windows SMTC 自动识别正在播放的音乐，同步显示逐行滚动歌词，支持按播放器独立校准时间偏移
- **剪贴板链接** — 自动识别剪贴板中的 URL，Alt+O 一键打开，支持多链接列表
- **天气** — 通过系统定位 / IP 定位获取位置，使用 Open-Meteo API 获取实时天气
- **邮件通知** — IMAP 轮询收件箱，新邮件到达时弹出通知，可设置轮询间隔
- **隐私指示器** — 检测麦克风 / 摄像头使用状态并在胶囊上显示
- **搜索** — 集成 Everything 搜索，快捷键呼出搜索栏
- **屏幕镜像** — ADB 投屏，支持触控 / 滚动 / 键盘 / 剪贴板注入
- **进程黑名单** — 指定前台进程或全屏进程时自动隐藏胶囊
- **SMTC 白名单** — 仅允许指定音乐应用触发歌词显示
- **开机自启** — 支持注册到 Windows 启动项
- **自动更新** — 从 GitHub Releases 检测并下载新版本
- **系统托盘** — 右键托盘图标打开设置或退出

## 歌词来源
- [Lyrix](https://github.com/cXp1r/Lyrix) — 集成多平台歌词（网易云、QQ 音乐、酷狗、汽水音乐）

## TODO

详见 [TODO.md](TODO.md)

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | Tauri 2（tray-icon, image-png, global-shortcut） |
| 后端 | Rust + Windows API (Win32, WinRT, COM) |
| 前端 | Vanilla TypeScript + Vite |
| 媒体 | Windows SMTC + IAudioEndpointVolume (COM) |
| 歌词 | Lyrix（多平台聚合） |
| 天气 | Windows Geolocation API + IP-API + Open-Meteo |
| AI | OpenAI 兼容 Chat Completions API (SSE) |
| 渲染 | marked + highlight.js + KaTeX |
| 邮件 | IMAP (native-tls) |

## 构建

### 前置要求

- [Node.js](https://nodejs.org/) (LTS)
- [Rust](https://www.rust-lang.org/tools/install) (1.70+)
- [Tauri 2 CLI](https://v2.tauri.app/start/prerequisites/)
- Windows 10/11

### 开发与打包

```bash
npm install

# 开发模式
npx tauri dev

# 打包安装包
npx tauri build
```

构建产物：
- MSI: `src-tauri/target/release/bundle/msi/DynamicIsland_a.b.c_x64_en-US.msi`
- NSIS: `src-tauri/target/release/bundle/nsis/DynamicIsland_a.b.c_x64-setup.exe`


## 设置

通过系统托盘右键 → 设置，可配置：

- 剪贴板链接监控开关与快捷键
- 歌词显示模式（歌词 / 仅歌曲信息 / 关闭）及偏移补偿
- AI API 地址、密钥、模型与窗口大小
- 天气城市（手动覆盖）
- 邮箱 IMAP 配置与轮询间隔
- 黑名单进程列表
- SMTC 应用白名单
- Everything CLI 路径
- 开机自启
- 预览更新通道
- 日志级别

## License

This project is released under **GNU General Public License v3.0 (GPLv3)** or later (`GPL-3.0-or-later`).

Under GPLv3 Section 7(b), limited additional terms apply: the following author attributions must be retained in all copies, modified versions, and any Appropriate Legal Notices displayed by the program:

- Copyright (C) 2026-present [Coding_w](https://github.com/2064878930) [cXp1r](https://github.com/cXp1r)
- Copyright (C) 2026-present pyisland.com (https://pyisland.com)

For full terms (including the standard GPLv3 text and additional clauses), see the `LICENSE` file in the repository root.
