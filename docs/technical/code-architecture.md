# Code Architecture

## 当前状态

ReadRec 已完成学习闭环 MVP 的前后端脚手架与核心流程实现：

- `frontend/` 使用 `React + Vite + React Router + TanStack Query + Zustand + Tailwind CSS`
- `backend/` 使用 `NestJS + JWT + Prisma Schema + Mock/OpenAI Provider 适配层`
- 当前运行态以后端内存态 `AppDataService` 承载 MVP 数据流，便于本地快速联调
- `backend/prisma/schema.prisma` 已补齐 PostgreSQL 数据模型，为后续切换真实数据库做好准备

## 前端分层

- `src/providers/`：全局 Provider，例如认证上下文
- `src/components/`：布局、路由守卫、通用卡片等可复用组件
- `src/pages/`：页面级学习流程与管理页面
- `src/lib/`：当前使用 `mock-api.ts` 对齐后端接口形状，后续可平滑替换为真实 HTTP API
- `src/stores/`：流程内状态，例如三轮学习轮次推进
- `src/types.ts`：前端统一数据类型

## 后端模块边界

- `auth`：邮箱密码注册登录、JWT 签发、当前用户信息
- `dictionary`：官方词库列表、词库详情、按进度筛选词列表
- `study-plan`：当前词库计划读取、修改、切换词库
- `daily-session`：每日学习会话生成、抽词、文章快照生成、首页会话读取
- `learning`：一轮选词、二轮复习答题、三轮阅读题与学习完成
- `ai-content`：`MockAiProvider` / `OpenAiProvider` 适配层与统一生成接口
- `wrong-book`：生词本标记、列表、导出
- `common`：内存态数据、共享模型、ID 工具

## MVP 学习流程

1. 用户登录后进入首页，读取当前激活词库与学习计划。
2. 首次读取今日学习时，由 `daily-session` 根据计划和进度抽取新词/复习词。
3. `ai-content` 生成文章快照，保存到当日 session。
4. 用户在一轮阅读中标记生词，系统把这些词推进到二轮。
5. 用户在二轮进行释义学习与四选一，全部通过后进入三轮。
6. 三轮基于已标记生词生成阅读题，提交完成后进入总结页。
7. 总结页可把词加入生词本，并支持 txt 导出。

## 后续维护规则

- 若前端从 `mock-api.ts` 切换到真实接口，需同步更新本文档中的数据流说明
- 若后端从 `AppDataService` 切换到 Prisma 持久化实现，需同步更新持久化章节与模块职责
- 若学习流程轮次、状态机或 AI Provider 协议变化，需同步更新本文档与 `database.md`