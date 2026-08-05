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
- 事件系统：创建/编辑/删除、全天/时间段、重复规则（日/周/月/年）、localStorage 持久化
- 后续：swipe 手势、云同步

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
│       └── engine.test.ts
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
│   └── base.css                  # CSS reset + 全局基础
├── App.vue                       # 固定导航层 + 内容切换 + 独立设置按钮 + overlay (clip-path)
└── main.ts                       # createApp + createPinia
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
resolveDayType(date, data):
  1. 在 holidays[].range 内？ → Holiday
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
| 设置页 | 主题 / 每周起始日 / 显示周数(占位) / 节假日订阅(占位) / 关于 |
| 2025+2026 数据 | 元旦/春节(9天)/清明/劳动/端午/中秋·国庆(7天) |
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
| 53 单测 | holiday 7 + calendar 16 + events 30 |

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
- [x] 2025 + 2026 holiday data + year routing
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

## Up Next

### Phase 2 — Views (剩余)

- [ ] Swipe gestures (mobile)

### Phase 4 — Packaging

- [ ] Tauri desktop
- [ ] PWA
- [ ] iCal import/export

## Notes for Future Agents

- Core (`src/core/`) MUST remain framework-agnostic — no Vue/Pinia imports.
- Pinia is SSOT. Components derive via composables.
- New year data: add `data/202X.ts` + register in `data/index.ts`.
- **MD3 tokens** (`src/styles/tokens.css`) are the design authority. Never hardcode colors.
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
