# Kanadere — Project Overview

## Identity

现代化日历应用，核心特色是**中国节假日/调休/补班制度的精确建模**。

- 四种日期类型：节假日 / 调休工作日 / 普通周末 / 工作日
- 桌面端布局：侧边栏（MiniCalendar + 近期事件） + 拉伸主视图
- 月/周/日三视图，分段切换，模式感知导航
- MD3 暗色/浅色双主题，设置中一键切换
- 设置页 container transform 动画（齿轮 📍 → 全屏展开）
- 月切换 shared axis 滑动动画，视图切换 scale+fade 快速动画
- 离月时右下角 FAB 快捷回今天
- 事件系统：创建/编辑/删除、全天/时间段、重复规则（日/周/月/年）
- 跨平台事件存储：`core/events/storage.ts` 定义 `EventStorage` 接口，`src/platform/` 提供 localStorage（Web）与 tauri-plugin-store（桌面 events.json）适配器，桌面端自动迁移旧 localStorage 数据
- 开发者调试：设置页开发者分区（开发水印 / 清除事件 / 一键重置，二次点击确认）
- 节日开关：设置页「日历」分区三组独立开关（法定节假日 / 传统节日 / 西方节日），关闭后对应节日不再显示为节假日，回落为普通周末/工作日；调休补班不受影响
- 特殊日分类配色 + 农历与节气：节假日按类别分色（法定红 / 传统橙 / 西方蓝，调休补班蓝灰）；每格显示农历日（初一显示月名，闰月带「闰」），节气日优先显示 24 节气名
- 个性化：图片背景（遮罩强度/模糊可调，最长边 1920 JPEG 压缩持久化）+ 特殊日颜色自定义（法定/传统/西方三色取色器，自动派生可读前景色，恢复默认回落方案色）
- Tauri 2 桌面打包：Windows exe + NSIS 安装包（alpha 预发布版本暂不含 MSI，正式版恢复），GitHub Actions 自动构建
- 移动端 swipe 手势：月/周/日视图左右滑动切换（复用模式感知导航）
- 后续：云同步

## Tech Stack

| 层面 | 选择 | 备注 |
|------|------|------|
| Framework | Vue 3 + Composition API + `<script setup lang="ts">` | |
| Build | Vite 8 | |
| State | Pinia | `currentView` / `viewMode` / `theme` / `weekStartsOn` / `navDirection` |
| Styles | **Material Design 3** | `<style scoped>` + CSS custom properties，零 utility class |
| Theme | `[data-theme]` on `<html>` | `:root` = dark, `[data-theme="light"]` = light |
| Design Tokens | `src/styles/tokens.css` | 完整 MD3 双主题：color / surface-container 梯度 / typescale / elevation / shape / motion |
| Transitions | Vue `<Transition>` | view 切换（scale+fade）+ shared axis 月滑动 + icon crossfade |
| Animations | CSS clip-path + transform + border-radius | 设置页 container transform、FAB scale、cell press、shape morph |
| Dates | date-fns | 纯函数、tree-shakeable |
| Lunar | lunar-javascript 1.7.7 | 农历日 + 24 节气；年份级 JieQi 表按日期组件匹配（库内固定北京时间，UTC 稳定） |
| Desktop | Tauri 2 | `src-tauri/`，Rust 壳 + WebView2，NSIS 打包（alpha 暂缓 MSI） |
| CI | GitHub Actions | ubuntu: test+vite dist；windows: Tauri exe + 安装包，均上传 artifact |
| Testing | Vitest | 测试文件：`src/**/*.test.ts` |
| Language | TypeScript (strict) | |

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      App.vue                                  │
│  ┌─────────────┬───────────────────────────────────────────┐ │
│  │   Sidebar   │  Main Area (flex: 1)                       │ │
│  │  260px      │  ┌──────────────────────────────────────┐ │ │
│  │  纯展示      │  │ ViewNavigator (« ← 2026年8月 → »)   │ │ │
│  │             │  │ ViewModeTabs (月/周/日)              │ │ │ ← 固定层
│  MiniCalendar│  ├──────────────────────────────────────┤ │ │
│  (跟随主视图) │  │ <Transition :name="view">            │ │ │
│             │  │   MonthView / WeekView / DayView     │ │ │ ← 内容层
│  Events      │  │   (key=viewMode 才触发动画)           │ │ │
│  (近期事件)   │  │ </Transition>                        │ │ │
│  │             │  │                          [📅 FAB]    │ │ │
│  └─────────────┴───────────────────────────────────────────┘ │
│                                                               │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ Settings Overlay (clip-path circle from gear, z:999)      │ │
│  │ ┌──────────────────────────────────────────┐             │ │
│  │ │ 设置                                     │             │ │
│  │ │ 外观 > 主题 / 日历 > 每周起始日 / 关于    │             │ │
│  │ └──────────────────────────────────────────┘             │ │
│  └──────────────────────────────────────────────────────────┘ │
│  ⚙/✕ (App.vue 独立按钮, fixed, z:1000) ← 同一按钮 toggle 开关  │
├──────────────────────────────────────────────────────────────┤
│  Core Logic (纯 TS，零 Vue 导入)                              │
│  core/holiday/engine.ts  resolveDayType / getHolidayName     │
│  core/calendar/engine.ts generateMonthGrid / generateWeekGrid │
│                        / generateDayCell                     │
└──────────────────────────────────────────────────────────────┘
```

**层级约束**：
- `src/core/` 禁止导入 Vue / Pinia / 任何 UI 框架
- `src/stores/` 桥接 Core → UI，不包含计算逻辑
- `src/components/` 只渲染，决策来自 Store
- `src/styles/tokens.css` 定义 MD3 token，组件通过 `var(--md-sys-*)` 引用

## Directory Structure

```
src/
├── core/
│   ├── holiday/
│   │   ├── types.ts              # DayType 枚举, HolidayEntry, YearHolidayData
│   │   ├── engine.ts             # resolveDayType, getHolidayName
│   │   ├── engine.test.ts
│   │   └── data/
│   │       ├── index.ts           # getHolidayData(year) — 年份路由 + 空兜底
│   │       ├── 2025.ts
│   │       └── 2026.ts
│   └── calendar/
│       ├── types.ts              # DateCell, MonthGrid, WeekGrid, DayGrid, ViewMode
│       ├── engine.ts             # generateMonthGrid / generateWeekGrid / generateDayCell
│       └── engine.test.ts
│   └── events/
│       ├── types.ts              # CalendarEvent, RecurrenceRule, EventOccurrence, TimeBlockLayout
│       ├── engine.ts             # 重复展开 / getEventsInRange / validateEvent / layoutTimeBlocks
│       ├── engine.test.ts
│       ├── ical.ts               # iCal (RFC 5545) 导入导出：generateICal / parseICal
│       └── ical.test.ts
├── stores/
│   ├── calendarStore.ts          # currentView / viewMode / theme / weekStartsOn / navDirection / 模式感知导航 (goNext/goPrev)
│   └── eventsStore.ts            # 事件 CRUD + localStorage 持久化 (kanadere.events.v1) + dialog 状态
├── composables/
│   └── useCalendar.ts            # useCalendar() + useMiniCalendar() helper
├── components/
│   ├── CalendarGrid.vue          # 7×n 网格 + 周末列底色 + 行分割线 + 圆角卡片
│   ├── DateCell.vue              # 状态机 + 左色条 + today badge + 事件 chip + 创建入口
│   ├── ViewNavigator.vue         # 顶部导航栏（« ← 标题 → »），固定层
│   ├── ViewModeTabs.vue          # 月/周/日 分段切换，固定层
│   ├── Sidebar.vue               # 侧边栏（MiniCalendar + 近期事件列表）
│   ├── MiniCalendar.vue          # 紧凑月历，跟随主视图月份，事件点
│   ├── EventDialog.vue           # 事件创建/编辑对话框（MD3 dialog + switch）
│   └── TodayFab.vue              # 离月时右下角悬浮回今天按钮
├── views/
│   ├── MonthView.vue              # 月视图内容（slide transition 只作用于网格）
│   ├── WeekView.vue               # 周视图 7 列 × 24h 网格
│   ├── DayView.vue                # 日视图 24h 时间线
│   └── SettingsView.vue           # 设置页（无关闭按钮，走 App.vue 独立按钮）
├── styles/
│   ├── tokens.css                # MD3 暗/亮双主题 Design Tokens
│   └── base.css                  # CSS reset + 全局基础（含 MD3 滚动条）
├── App.vue                       # 固定导航层 + 内容切换 + 独立设置按钮 + overlay (clip-path)
└── main.ts                       # createApp + createPinia
src-tauri/                        # Tauri 2 桌面壳
├── Cargo.toml / build.rs / tauri.conf.json
├── capabilities/default.json
├── icons/                        # 由 app-icon.png 生成（`tauri icon`）
└── src/main.rs + lib.rs
.github/workflows/build.yml       # test + vite dist + Tauri windows exe（artifact）
```

## Key Design Decisions

### 桌面端布局

```
Sidebar (260px)              Main Area (flex: 1)
┌──────────────┬──────────────────────────────────────┐
│ 品牌名        │ « ← 2026年8月 → »        (固定层)    │
│              │──────────────────────────────────────│
│ MiniCalendar │ [月][周][日]              (固定层)    │
│  紧凑 7×6    │──────────────────────────────────────│
│  跟随主视图   │ ┌──────────────────────────────────┐ │
│              │ │  一  二  三  四  五  六  日        │ │
│ 近期事件      │  │  CalendarGrid (圆角卡片, m:12px)  │ │
│  事件列表     │ └──────────────────────────────────────┘ │
│              │                          [📅 FAB]    │
└──────────────┴──────────────────────────────────────┘
[⚙/✕] 独立按钮：position:fixed; left:12px; bottom:16px; z-index:1000
```

无 max-width——日历网格吃满（圆角卡片带 12px margin）。FAB 仅 `currentDate` 非本月时出现。

### 视图切换架构（固定层 + 内容层）

`App.vue` 的 main 分两层：

- **固定层**：`ViewNavigator` + `ViewModeTabs` + `TodayFab` 不参与任何切换动画
- **内容层**：`<Transition :name="view">` 只包裹 Month/Week/Day 组件

```vue
<Transition :name="transitionName" mode="out-in">
  <component :is="activeView" :key="store.viewMode" />
</Transition>
```

关键规则：
- 视图组件**常驻 DOM**（无 v-if）——设置开关时被 overlay 盖住，不卸载、不触发动画
- 仅 `viewMode` 变化（`:key` 变化）触发 `view` 切换动画（200ms scale+fade 进场 / 150ms 离场）
- 月内导航触发 MonthView 内部的 slide 动画（导航栏标题即时更新，网格滑动）
- 周/日视图键盘导航（navigateSelection）同步移动 currentDate，视图跟随

### DateCell 左色条 (Accent Bar)

不再用整格背景区分类型，改用 3px 左边框（`::before` 伪元素），为事件系统留出 cell 内部空间：

| 状态 | 左色条 | 标签色 | 背景 |
|------|--------|--------|------|
| Holiday | `error` 3px | `error` | 透明 |
| AdjustedWorkday | `tertiary` 3px | — | 透明 |
| Weekend | 无 | `on-surface-variant` | 透明 |
| Workday | 无 | `on-surface` | 透明 |
| Today | Badge: `primary` 实心圆 | — | — |
| Selected | Badge: `primary` 实心圆 + `primary-container` 底 | — | — |

Hover/选中背景是 `::after` 圆角块（`inset: 2px` + `border-radius: sm`，带 shape morph 过渡）。

事件 chip 渲染在 `.dc__label` 之后（`.dc__events`），位于 `::after` hover 块之上（`::after` 带 `pointer-events: none`，chip 可正常点击）。hover 时右上角出现 `.dc__add` 小圆按钮（双击格亦可）创建事件。

周末列仍保留 `surface-container-lowest` 整列底色——不影响 cell 内部放事件。

`:active { transform: scale(0.97) }` 提供按压反馈。

### 动画体系

| 动画 | 触发 | 实现 | Duration |
|------|------|------|----------|
| 视图切换 | viewMode 变化 | `view` transition：scale(0.98→1) + translateY(6px→0) + fade | 200ms enter / 150ms leave |
| 月切换（向前） | goNext (month) | `<Transition>` shared axis：离开 `-80px`，进入 `+80px` | 350ms enter / 200ms leave |
| 月切换（向后） | goPrev (month) | 反向：离开 `+80px`，进入 `-80px` | 同上 |
| 设置展开 | 齿轮点击 | `clip-path: circle(0→150vmax at Xpx Ypx)` | 350ms |
| 设置收起 | X 点击（同一按钮） | `clip-path` 逆缩回齿轮位置 | 350ms |
| Gear↔X 图标 | 设置开关 | `<Transition mode="out-in">` + rotate±180° + scale0.4 | 300ms enter / 150ms leave |
| 按钮 hover | 指针悬浮 | `scale(1.12)` + 齿轮 rotate60° | 350ms |
| 按钮 active | 按下 | `scale(0.9)` | 100ms |
| FAB 出现/消失 | 离月/回月 | `scale(0.5)→1` + opacity | 300ms |
| Cell 按下 | `:active` | `transform: scale(0.97)` | 100ms |

`navDirection` 在 store 中由所有导航方法自动设定（forward/backward），月滑动方向始终正确。

### 设置页 Container Transform

- 设置按钮是 **App.vue 的独立元素**（不在 Sidebar 内）：`position: fixed; left: 12px; bottom: 16px; z-index: 1000`，齿轮↔X 同一按钮 toggle
- 按钮位置作为 `clip-path: circle()` 圆心。展开时 circle 半径从 0 → 150vmax，背景 `surface-container-high`（与日历 surface 有色差，动画边界可见）
- 关闭时逆序缩回。overlay `position: fixed; inset: 0; z-index: 999; pointer-events: none`，子元素 `pointer-events: auto`
- 展开动画用 `setTimeout(50ms)` 延迟触发（保证浏览器先渲染 `circle(0)` 初始帧），easing 用 `standard`（全程可见）

### 双主题

`store.theme: 'dark' | 'light'`。`watch({ immediate: true })` 同步 `<html data-theme="...">`。所有色值在 `tokens.css` 的两个块中定义。

### 跨月导航（点击 + 键盘）

- `selectDate(date)` 自动检测：若目标日期不在当前月，先切 `currentDate` → 触发月滑动动画 + 选中
- `navigateSelection(dir)`（键盘 ←→↑↓）同样跨月自动切月；周/日视图下选区移动时视图跟随
- MiniCalendar `watch(store.currentDate)` 跟随主视图月份（用户手动翻 mini 不受影响）

### 节假日优先级链

```
resolveDayType(date, data, enabled?):
  1. 在 holidays[].range 内（按 enabled 类别集合过滤，缺省全启用）？ → Holiday
  2. 在 adjustedWorkdays[] 中？ → AdjustedWorkday
  3. date-fns isWeekend？    → Weekend
  4. 否则                   → Workday
```

新增年份只需加 `data/202X.ts` + 注册 `data/index.ts`。

## Completed Features

| Feature | Details |
|---------|---------|
| 桌面侧边栏 | Sidebar 260px + Main flex:1 |
| MiniCalendar | 紧凑 7×6，独立导航，跟随主视图月份 |
| 月视图 | 42-cell, 拉伸列宽, 80px+ cell, 圆角卡片 |
| DateCell 左色条 | `::before` 3px accent bar（error/tertiary），为事件系统留白 |
| 暗/亮双主题 | 设置页一键切换，token 级翻转 |
| 四种 DayType | Holiday / Adjusted / Weekend / Workday — 左色条区分 |
| 周末列底色 | `surface-container-lowest` |
| 行分割线 | `outline-variant` 1px |
| 今日 badge | `primary` 实心圆 32×32 |
| 选中态 | `primary-container` 圆角背景块 + `primary` badge |
| 月滑动动画 | shared axis：向前右滑，向后左滑，350ms |
| 设置 container transform | `clip-path: circle()` 从按钮展开，350ms |
| 独立设置按钮 | 正圆 40×40，fixed 定位 z:1000，gear↔X 同一按钮 toggle |
| Gear↔X icon morph | rotate±180° + scale0.4 crossfade，300ms |
| 按钮 hover/active | scale 1.12/0.9 + 齿轮旋转 60° |
| 今天 FAB | 离月时右下角弹出，scale 动画，回月消失 |
| 年份快跳 | « » + 点击年份输入 |
| 键盘导航 | ← → ↑ ↓，跨月自动切月，周/日视图跟随 |
| 跨月点击导航 | 点前/后月日期自动切月 |
| 周末起始 | 设置页切换 |
| 设置页 | 主题 / 每周起始日 / 显示周数(占位) / 节日开关(法定/传统/西方) / 关于 |
| 2025–2027 数据 | 法定+调休（2025/2026）＋传统 7 项＋西方 9 项；2027 仅传统/西方（法定安排未公布） |
| 农历/节气 | `core/lunar/lunar.ts` `getLunarSubLabel`（节气优先）：月格数字右侧子标签 + 日视图头部；节气 tertiary、农历 on-surface-variant；初一显示月名（含闰） |
| 分类配色 | 节假日 `dc--cat-*`/迷你日历/周/日视图按类别取 error(法定)/tertiary(传统)/secondary(西方)；调休补班改 inverse-primary（tertiary 让位） |
| 月/周/日视图 | ViewModeTabs 分段切换，模式感知导航 |
| 周视图 | 7 列 × 24h 网格，列头含节假日/调休标签，周末列底色 |
| 日视图 | 24h 时间线，节假日/调休 chip，当前小时高亮 |
| 视图切换动画 | scale+fade 200ms，导航栏/tabs/FAB 固定不动 |
| 设置开关无视图动画 | 视图组件常驻 DOM（被 overlay 盖住），仅 viewMode 切换触发动画 |
| 网格圆角 | 三视图卡片圆角（16px）+ DateCell 圆角 hover/选中块 |
| 事件核心引擎 | `core/events/`：重复展开（日/周/月/年，BYMONTHDAY 跳过语义）、排序、validateEvent、时间块 lane 布局 |
| 事件存储 | Pinia eventsStore + localStorage `kanadere.events.v1`（损坏数据降级空数组） |
| 事件对话框 | MD3 dialog：标题/日期/全天 switch/时间/重复+间隔+结束日期，创建与编辑共用，删除确认 |
| 月视图事件 | DateCell 事件 chip（最多 2 条 + 溢出计数），hover + 按钮 / 双击创建 |
| 周/日视图事件 | 时间块绝对定位 + 重叠分 lane，全天 28px 顶部槽，点击空白按小时创建 |
| 侧边栏近期事件 | 未来 60 天取前 5 条，点击跳转主视图对应日期 |
| 迷你日历事件点 | 有事件日期显示 4px 圆点（currentColor 自适应配色） |
| MD3 滚动条 | 全局 8px 圆角细滚动条（WebKit + Firefox `scrollbar-color`） |
| Tauri 桌面壳 | `src-tauri/`：tauri.conf.json + capabilities + 生成图标集（`tauri icon`） |
| Tauri 打包 | `npm run tauri build` → `kanadere.exe` + NSIS 安装包（alpha 暂缓 MSI） |
| CI exe 构建 | Actions `tauri` job（windows-latest）：npm ci → rust 构建 → 上传 `kanadere-windows-exe` |
| 移动端 swipe 手势 | 月/周/日视图 touch 左右滑动切换（`useSwipeNavigation` + 模式感知 goNext/goPrev，复用月滑动动画） |
| 事件存储抽象 | `core/events/storage.ts` `EventStorage` 异步接口；`src/platform/`：localStorage 适配器（Web）+ tauri-plugin-store 适配器（桌面 events.json，自动迁移旧数据）；eventsStore 异步 init，main.ts 启动前加载 |
| 窄视口响应式 | `<600px` 折叠侧边栏（MD3 compact 断点）；DateCell 事件 chip `min-width:0` + ellipsis 防溢出 |
| 开发者调试 | 设置页开发者分区：开发水印（版本号 `__APP_VERSION__` + 开发中提示，持久化开关）、清除事件、一键重置（二次点击确认，恢复全部默认） |
| 131 单测 | holiday 19 + data 8 + calendar 32 + lunar 8 + events 30 + ical 22 + storage 6 + contrast 6 |
| iCal 导入导出 | `core/events/ical.ts`：generateICal（RFC 5545 VCALENDAR 2.0，CRLF + 75 字符行折叠，全天 VALUE=DATE + DTEND 次日，非全天浮动 DATE-TIME，RRULE FREQ/INTERVAL/UNTIL）+ parseICal（大小写不敏感、折叠/CRLF 容错、RRULE→RecurrenceRule、validateEvent 过滤，不抛异常）；设置页「数据」分区：Web Blob 下载 + 文件选择，Tauri 原生对话框（tauri-plugin-dialog + tauri-plugin-fs，dialog:allow-open/save + fs:allow-read/write-text-file 最小权限，选中路径由 dialog 动态加入 fs scope）；导入去重（title/date/allDay/startTime 全同跳过）+ 结果提示弹窗 |
| PWA | `vite-plugin-pwa`：manifest（`#A8C7FA` theme / `#111318` background，zh-CN，standalone，portrait）+ workbox 预缓存 + navigateFallback，192/512 应用图标（源自 `src-tauri/app-icon.png`），autoUpdate 更新即生效 |

## Commands

```bash
npm run dev       # 开发服务器
npm test          # Vitest
npm run build     # 生产构建
npx vue-tsc --noEmit  # 类型检查
```

---

# Progress

## Completed

- [x] Project scaffold
- [x] Core holiday types + engine + tests (7)
- [x] Core calendar types + engine + tests (8)
- [x] 2025–2027 holiday data + year routing（2025/2026 法定+调休；传统/西方各年齐备；2027 无法定）
- [x] Pinia calendarStore (currentView / viewMode / theme / weekStartsOn / navDirection / full nav API)
- [x] MD3 Design System (dual-theme tokens + base + surface-container gradient)
- [x] Desktop sidebar (Sidebar + MiniCalendar + events placeholder)
- [x] Settings page (theme + weekend start + placeholders + about)
- [x] Settings container transform animation (clip-path circle + gear↔X crossfade)
- [x] Standalone circular settings button (App.vue, fixed, gear↔X toggle)
- [x] DateCell — accent bar + state machine + solid today badge + rounded hover/selected block
- [x] CalendarGrid — weekend column shading + row separators + rounded card
- [x] ViewNavigator — centered year/month nav (« ← title → »), fixed layer
- [x] ViewModeTabs — 月/周/日 segmented control
- [x] TodayFab — floating button when not in current month
- [x] Month slide animation (shared axis, 350ms)
- [x] Cross-month click navigation
- [x] Cross-month keyboard navigation (selection follows, mini calendar syncs)
- [x] WeekView.vue (7 列 × 24h 网格 + 列头节假日标签)
- [x] DayView.vue (24h 时间线 + 节假日 chip)
- [x] ViewMode tabs (月/周/日 分段切换)
- [x] 模式感知导航 (goNext/goPrev 按 viewMode 步进)
- [x] View transition (scale+fade, 导航栏固定不动)
- [x] 设置开关不触发视图切换动画（视图常驻 + overlay 覆盖）
- [x] core/events 事件模型 + 重复规则引擎 + 30 单测
- [x] Pinia eventsStore（localStorage 持久化 + dialog 状态）
- [x] EventDialog 创建/编辑/删除（MD3 dialog + 全天 switch + 重复规则表单）
- [x] 月视图事件 chip + hover 创建入口（+ 按钮 / 双击）
- [x] 周/日视图时间块 + 全天槽 + 点击空白按小时创建
- [x] 侧边栏近期事件列表 + 迷你日历事件点
- [x] MD3 风格全局滚动条
- [x] Tauri 2 桌面壳（src-tauri + 图标 + capabilities）
- [x] Actions tauri job：Windows exe + NSIS 自动构建（artifact；alpha 暂缓 MSI）
- [x] 本地 `npm run tauri build` 全链路验证
- [x] 移动端 swipe 手势（月/周/日视图 touch 导航，`useSwipeNavigation`）
- [x] 事件存储抽象与桌面迁移（EventStorage + tauri-plugin-store + 旧数据迁移）
- [x] 窄视口响应式（<600px 折叠侧边栏，chip 防溢出）
- [x] 开发者调试选项（水印 / 清除事件 / 一键重置，二次确认）
- [x] iCal 导入导出（core/events/ical.ts + 设置页「数据」分区，Web/Tauri 双端，22 单测）
- [x] PWA（manifest + service worker 预缓存 + 192/512 应用图标，autoUpdate）
- [x] 节日开关（FestivalCategory 三组独立开关：法定/传统/西方；engine/网格生成器 enabled 过滤；设置页三行 + MD3 switch；数据 2025–2027 传统+西方，2025/2026 法定+调休）
- [x] 农历与节气 + 分类配色（`core/lunar/lunar.ts` 封装 lunar-javascript 1.7.7：年份级 JieQi 表按日期组件匹配、UTC 稳定，2025–2027 与香港天文台逐条核对；`getHolidayEntry` 统一名称/类别；DateCell 子标签 + `dc--cat-*` 分类色，调休改 inverse-primary；`src/types/lunar-javascript.d.ts` 声明）
- [x] 个性化大升级（图片背景 + 节日颜色自定义：`utils/backgroundImage.ts` 最长边 1920/JPEG 0.78 压缩；store 新状态全进 prefs；`core/color/contrast.ts` 对比度前景（WCAG 亮度阈值 0.4）；tokens.css `--app-festival-*` 语义别名；设置页取色器/滑杆/二次确认移除；三视图与迷你日历全部换别名，调休 inverse 系不动）

## Up Next

### Phase 4 — Packaging (剩余)

- [ ] 云同步

## Notes for Future Agents

- Core (`src/core/`) MUST remain framework-agnostic — no Vue/Pinia imports. Storage abstraction: `EventStorage` interface lives in core (async, platform-neutral), concrete adapters live in `src/platform/` (localStorage / tauri-plugin-store). Future Flutter/Kotlin/Swift ports implement the same interface — never put platform storage calls in core or stores.
- Lunar: `lunar-javascript@1.7.7` 无 TS 类型，声明在 `src/types/lunar-javascript.d.ts`（只声明用到的 API）。节气必须用年份级表 `Lunar.fromYmd(y, 1, 1).getJieQiTable()`（key→Solar，key 即简体中文名）按日期组件匹配——库内固定北京时间计算，CI(UTC) 稳定；勿用 `Solar.getJieQi()`。该版本不存在 `LunarYear.fromYear(y).getJieQiTable()`。表覆盖「上一年冬至～当年大雪」，12 月下旬的冬至要查下一年的表（`getSolarTermLabel` 查 table[y] 再查 table[y+1]）。
- Events load async via `eventsStore.init()` (resolved in main.ts before mount). All mutators (`createEvent`/`updateEvent`/`deleteEvent`/`clearEvents`) await init internally — never assume sync state.
- Tauri detection: `'__TAURI_INTERNALS__' in window`; tauri adapter is dynamic-imported so web builds stay free of plugin code.
- Desktop events live in `appDataDir/events.json` (`tauri-plugin-store`, autoSave). First load migrates legacy `kanadere.events.v1` localStorage once. Web keeps using the localStorage key.
- Debug options: `debugStore` persists `kanadere.debug.v1` (showWatermark). Destructive actions (clear/reset) use two-click arming (`confirmTarget` + 3s timer), NOT `window.confirm` — WebView2's native dialog is unreliable.
- Settings page has no close button — App.vue's standalone gear button toggles it; overlay covers mounted views (never unmount views on settings toggle).
- Pinia is SSOT. Components derive via composables.
- New year data: add `data/202X.ts` + register in `data/index.ts`.
- MD3 tokens (`src/styles/tokens.css`) are the design authority. Never hardcode colors. Personalization aliases (`--app-festival-*`, `--app-bg-*`) are defined there (or set inline on `<html>` by the store) — components must reference the aliases, not raw tokens, so user overrides propagate.
- Background layer: `html[data-background]` drives `body::before` (image, `filter: blur(var(--app-bg-blur))` + `scale(1.06)`) and `body::after` (surface mask via `color-mix` + `--app-bg-dim`) at `z-index: -1`, so in-flow opaque backgrounds hide them. Transparencies (`.app`, `.mv/.wv/.dv`, `.cg`, `.wv__grid`, `.wv__day-head`, `.dv__body`) and 55% weekend columns live in `base.css` GLOBAL scope (scoped rules can't reach them and would lose the specificity race). Sidebar / settings overlay / dialog stay opaque. Do not move these to scoped styles.
- Festival color flow: store writes `--app-festival-X` (user hex) + `--app-festival-X-fg` (`contrastForeground`, threshold L>0.4 → black) inline on `<html>`; unset categories fall back to tokens.css aliases (error/tertiary/secondary). DayView tags are SOLID pills (`fg` on alias bg) — keep them that way; `.dc__label--*` text stays on-surface in the alias color (NOT `-fg`, which is for text on the colored bg).
- `getComputedStyle().getPropertyValue('--x')` returns the raw token stream (`var(--md-sys-color-error)` unresolved) — SettingsView swatch defaults read the BASE tokens (`--md-sys-color-error` etc.) directly, never the aliases.
- State layers (`::after` pseudo) handle hover/press. Rounded with `border-radius` transition (shape morph).
- DateCell uses `::before` for type accent bars. Event chips render below the label in `.dc__events` (above the `::after` hover layer, which has `pointer-events: none`).
- Events: `core/events/engine.ts` owns recurrence expansion (RRULE BYMONTHDAY skip semantics — never clamp), sorting, validation, and lane layout. Store forwards to it; components only render.
- Event dialog (`.ed`/`ed__*`) is self-contained: reads `eventsStore.dialog`, z-index 1100 (above settings overlay 999 / gear 1000). Repeat edit/delete applies to the whole series — no per-occurrence exceptions.
- localStorage key `kanadere.events.v1`; corrupted JSON degrades silently to `[]`.
- `navDirection` is set by ALL navigation methods. The month slide transition reads it.
- Navigation API is mode-aware: `goNext()`/`goPrev()` step by month/week/day per `viewMode`. Month views anchor `currentDate` to the 1st; week/day anchor to the actual date.
- Settings button is a STANDALONE element in App.vue (`position: fixed; left: 12px; bottom: 16px; z-index: 1000`), NOT inside Sidebar. Same button toggles open/close (gear↔X). Sidebar is display-only.
- Overlay stacking: overlay `z-index: 999` + `pointer-events: none` (children `pointer-events: auto`); button `z-index: 1000`. `position: fixed` on the sidebar itself breaks full-screen animation — never do that.
- Overlay expand uses `setTimeout(50ms)` before raising `overlayOpen` so the browser paints `circle(0)` first; easing `standard` keeps the reveal visible.
- View components (Month/Week/Day) stay MOUNTED at all times — settings overlay covers them instead of unmounting, so opening/closing settings never triggers the view transition. Only `viewMode` changes (`:key` on `<component>`) play the `view` transition.
- `:key` on CalendarGrid forces re-mount — intentional, works with `<Transition>` for slide animation.
- `selectDate` / `navigateSelection` auto-navigate when crossing the current month; MiniCalendar follows `store.currentDate` via watch.
- Today FAB only renders when `currentDate` year/month ≠ today year/month.
- `useMiniCalendar(year, month, ws)` is a pure helper — no store dependency.
- MD3 "shape morph" has no official Web API, but native CSS `border-radius`/`clip-path` transitions achieve the same effect.
