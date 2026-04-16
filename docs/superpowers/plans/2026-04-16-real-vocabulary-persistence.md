# Real Vocabulary Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 ReadRec 的词库学习链路完整切到真实 PostgreSQL，并让前端页面通过真实后端接口工作。

**Architecture:** 后端以 Prisma 替换 `AppDataService` 在认证、计划、会话、学习、生词本链路中的持久化职责；前端新增真实 HTTP API 层替换 `mock-api.ts`，保持页面组件结构尽量稳定。

**Tech Stack:** NestJS, Prisma, PostgreSQL, React, Vite, TanStack Query

---

### Task 1: 持久化基础设施与 Prisma 模型补齐

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/src/common/prisma/prisma.service.ts`
- Modify: `backend/src/common/domain/models.ts`
- Test: `backend/test/dictionary.service.spec.ts`

- [ ] 统一 Prisma 模型与当前持久化边界，确保 `User`、`StudyPlan`、`UserBookProgress`、`DailySession`、`WrongBookEntry` 可被正式启用
- [ ] 保留 `VocabularyItem.senses` JSON 结构
- [ ] 生成 Prisma Client 并验证 schema 可 build

### Task 2: 认证与计划切到 PostgreSQL

**Files:**
- Modify: `backend/src/modules/auth/auth.service.ts`
- Modify: `backend/src/modules/auth/auth.module.ts`
- Modify: `backend/src/modules/study-plan/study-plan.service.ts`
- Modify: `backend/src/modules/study-plan/study-plan.module.ts`

- [ ] 注册登录改为 Prisma 读写 `User`
- [ ] 用户默认激活词库改为从真实 `VocabularyBook` 读取
- [ ] `StudyPlan` 与 `UserBookProgress` 改为 Prisma upsert

### Task 3: 每日学习会话与学习流程持久化

**Files:**
- Modify: `backend/src/modules/daily-session/daily-session.service.ts`
- Modify: `backend/src/modules/daily-session/daily-session.module.ts`
- Modify: `backend/src/modules/learning/learning.service.ts`
- Modify: `backend/src/modules/learning/learning.module.ts`
- Test: `backend/test/*.spec.ts`

- [ ] 今日 session 改为 PostgreSQL 查询/创建
- [ ] 一轮选词、二轮复习、三轮问题、总结页都读写真实数据库
- [ ] 所有单词释义来源统一改成真实 `VocabularyItem`

### Task 4: 生词本持久化与真实词库关联

**Files:**
- Modify: `backend/src/modules/wrong-book/wrong-book.service.ts`
- Modify: `backend/src/modules/wrong-book/wrong-book.module.ts`

- [ ] `WrongBookEntry` 持久化到 PostgreSQL
- [ ] 生词本列表与导出通过关联 `VocabularyItem` 获取真实词义

### Task 5: 前端切换真实 HTTP API

**Files:**
- Create: `frontend/src/lib/api.ts`
- Modify: `frontend/src/providers/auth-provider.tsx`
- Modify: `frontend/src/pages/*.tsx`
- Modify: `frontend/src/types.ts`

- [ ] 用真实 API 替换 `mock-api.ts` 在登录、词库、计划、学习流程、生词本页面的调用
- [ ] 保持现有页面路由与 TanStack Query 使用方式
- [ ] 处理 token 持久化与请求鉴权

### Task 6: 文档与验证

**Files:**
- Modify: `README.md`
- Modify: `docs/technical/code-architecture.md`
- Modify: `docs/technical/database.md`
- Modify: `docs/business/iteration-log.md`

- [ ] 同步更新“已完整接入真实 PostgreSQL”的实现状态
- [ ] 运行后端测试、前后端 build
- [ ] 记录剩余风险与未覆盖边界
