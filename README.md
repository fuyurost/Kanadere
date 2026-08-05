# Kanadere

现代化中国节假日日历应用，基于 Material Design 3 设计系统，支持月 / 周 / 日三视图、暗 / 亮双主题，精确建模中国法定节假日与调休补班制度。

## 已实现功能

- **四种日期类型**：节假日 / 调休工作日 / 普通周末 / 工作日，左色条区分
- **月 / 周 / 日三视图**：分段切换，模式感知导航（月 ±1 月、周 ±7 天、日 ±1 天）
- **中国节假日数据**：2025 + 2026 全年法定节假日与调休安排
- **暗 / 亮双主题**：MD3 token 级翻转，设置页一键切换
- **动画体系**：设置页 container transform 圆形展开、月切换 shared axis 滑动、视图切换 scale+fade、Gear↔X 图标旋转 morph
- **键盘导航**：← → ↑ ↓，跨月自动跟随（主视图与侧边栏迷你日历同步）
- **周末起始日可配置**：周一 / 周日
- **事件系统**：创建/编辑/删除、全天/时间段、每日/每周/每月/每年重复、月/周/日三视图渲染、侧边栏近期事件、迷你日历事件点
- **跨平台事件存储**：桌面端持久化到 `appDataDir/events.json`（tauri-plugin-store，自动迁移旧 localStorage 数据），Web 端 localStorage——存储抽象在 `core`（`EventStorage` 接口），平台实现隔离在 `src/platform/`
- **开发者调试选项**：设置页开发者分区——开发水印（版本号 + 开发中提示，可持久化开关）、清除事件、一键重置（二次点击确认防误触）
- **桌面端打包**：Tauri 2 构建 Windows exe + NSIS/MSI 安装包（GitHub Actions 自动构建，dist/exe 均作为 artifact 产出）
- **移动端手势**：月/周/日视图左右滑动切换（复用模式感知导航与月滑动动画）
- **iCal 导入导出**：设置页「数据」分区——全部事件导出为 `.ics`（RFC 5545，全天/时间段/重复规则齐全），从 `.ics` 合并导入（重复项与无效事件自动跳过）；Web 端 Blob 下载 + 文件选择，桌面端原生保存/打开对话框（tauri-plugin-dialog + tauri-plugin-fs，按选中路径动态授权最小权限）
- **PWA 支持**：Web 端可安装（manifest + service worker 预缓存 + 192/512 应用图标），`registerType: 'autoUpdate'` 更新即生效，离线可访问（图标来自 `src-tauri/app-icon.png`，后续可替换 `public/pwa-*.png`）

## 技术栈

Vue 3 · TypeScript (strict) · Vite 8 · Pinia · date-fns · Vitest · Tauri 2 · Material Design 3

## 快速开始

```bash
npm install       # 安装依赖
npm run dev       # 开发服务器
npm test          # 运行测试（88 个单测）
npm run build     # 生产构建（vue-tsc 类型检查 + vite build）
npm run tauri build  # 打包 Windows 桌面应用（需 Rust；exe 在 src-tauri/target/release/）
npm run preview   # 预览构建产物
```

## 目录结构

```
src/
├── core/          # 纯 TS 核心逻辑（零框架依赖，跨平台可移植）
│   ├── holiday/   # 节假日引擎 + 年份数据（2025/2026）
│   ├── calendar/  # 月/周/日网格生成引擎
│   └── events/    # 事件模型、重复规则引擎、时间块布局、EventStorage 存储接口
├── stores/        # Pinia 状态（视图模式/主题/导航/事件/调试选项）
├── platform/      # 平台存储适配器（localStorage / tauri-plugin-store）
├── components/    # 日历网格、日期单元格、导航栏、视图切换、事件对话框等
├── views/         # 月/周/日视图 + 设置页
└── styles/        # MD3 暗/亮双主题 Design Tokens
src-tauri/         # Tauri 2 桌面壳（Rust + 打包配置）
.github/workflows/ # GitHub Actions：单测 + vite 构建 + Tauri exe 自动构建
```

新增年份数据：在 `src/core/holiday/data/` 添加 `202X.ts` 并在 `index.ts` 注册。

## 路线图

- [x] 移动端 swipe 手势
- [x] 事件系统（创建/编辑/重复事件）
- [x] 桌面端打包（Tauri：Windows exe 自动构建）
- [x] PWA、[x] iCal 导入导出

## 许可

本项目使用 **Vibe Coding**（AI 辅助编程）开发。

Copyright © 2026 fuyurost

本项目采用 **GNU Affero General Public License v3.0 (AGPL-3.0)** 授权。

> 使用、修改或分发本项目代码，需遵守 AGPL-3.0 条款：修改后的版本必须以相同许可证开源，通过网络提供服务时须向用户提供对应源码。
