# Dashboard UI Refine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将首页从多卡片堆叠收敛为更克制的学习驾驶舱布局。

**Architecture:** 保持现有 `GET /dashboard/home` 数据结构不变，主要在前端 `DashboardPage` 内重组信息层级。通过一个宽 Hero、一个掌握度环图、一个真实月历视图和一个紧凑摘要面板承接现有数据，减少重复文案与独立卡片数量。

**Tech Stack:** React 19, TanStack Query, Tailwind CSS, Vitest, Testing Library

---

### Task 1: 固定新版首页结构

**Files:**
- Create: `frontend/src/pages/dashboard-page.test.tsx`
- Modify: `frontend/src/pages/dashboard-page.tsx`

- [ ] 写一个首页渲染测试，覆盖新版主结构：主 Hero、掌握度、学习日历、今日摘要。
- [ ] 先运行前端测试，确认新测试在旧布局下失败。
- [ ] 改造 `dashboard-page.tsx`，移除独立的鼓励卡、掌握度三卡和旧块状日历，改成驾驶舱式三主区块布局。
- [ ] 再次运行前端测试，确认通过。

### Task 2: 图形化掌握度与真实月历

**Files:**
- Modify: `frontend/src/pages/dashboard-page.tsx`

- [ ] 增加简洁的 SVG 环形图，展示熟悉 / 模糊 / 陌生占比。
- [ ] 增加 hover `i` 提示，显示三个熟练度定义与计算口径。
- [ ] 将现有最近 14 天块状列表改成月历网格视图，用日期背景深浅表示学习强度。

### Task 3: 验证与收尾

**Files:**
- Modify: `docs/business/iteration-log.md`（如实现后需要补一句）

- [ ] 运行 `cd /Users/awayer/code/ReadRec/frontend && npm test`
- [ ] 运行 `cd /Users/awayer/code/ReadRec/frontend && npm run build`
- [ ] 若最终视觉结构与轻量日志一致，则只在必要时补一条迭代记录，不额外扩写文档
