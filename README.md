# ReadRec

ReadRec 是一个围绕“词生文 -> 词义提取 -> 阅读应用”三轮学习闭环设计的英语学习项目。当前仓库已经完成学习闭环 MVP 的前后端工程骨架、核心页面和后端模块化结构，适合作为后续接入真实数据库、真实 AI 能力和真实前后端联调的基础版本。

## 当前实现状态

当前仓库已经落地的内容：

- 前端 `frontend/`
  - 使用 `React + Vite + React Router + TanStack Query + Zustand + Tailwind CSS`
  - 已实现登录页、首页、计划页、词库详情页、三轮学习页、生词本页
  - 当前通过 `src/lib/api.ts` 直接请求真实后端接口
- 后端 `backend/`
  - 使用 `NestJS + JWT + Prisma Schema + Vitest`
  - 已按模块拆分 `auth`、`dictionary`、`study-plan`、`daily-session`、`learning`、`ai-content`、`wrong-book`
  - 词库学习主链路已切换到 PostgreSQL 持久化
  - `auth / dictionary / study-plan / daily-session / learning / wrong-book` 已接入 Prisma
- 数据模型
  - `backend/prisma/schema.prisma` 已补齐 PostgreSQL 目标模型
  - 官方词库已导入线上 PostgreSQL，共 3 本词库、13581 个单词
- AI 能力
  - 已定义统一 AI 适配层接口
  - 已提供 `MockAiProvider`
  - `OpenAiProvider` 目前是占位实现，尚未接入真实 OpenAI 调用

## 当前覆盖的 MVP 功能

- 邮箱密码登录骨架
- 官方词库列表与词库详情
- 学习计划查看与编辑
- 今日学习首页与会话展示
- 一轮学习：文章阅读与生词选择
- 二轮学习：释义查看与四选一答题
- 三轮学习：阅读题与解析查看
- 学习总结与生词本标记
- 生词本列表与 txt 导出

## 项目结构

```text
ReadRec/
├── docs/          # 业务、技术与协作文档
├── frontend/      # React + Vite 前端应用
└── backend/       # NestJS 后端应用
```

### 前端结构

```text
frontend/src/
├── app.tsx
├── main.tsx
├── components/    # 布局、路由守卫、通用展示组件
├── lib/           # 真实 HTTP API 与请求封装
├── pages/         # 登录、首页、计划、学习流程、生词本页面
├── providers/     # 全局 Provider，例如认证上下文
├── stores/        # 本地流程状态
├── test/          # 前端测试
└── types.ts       # 前端统一类型
```

### 后端结构

```text
backend/src/
├── app.module.ts
├── main.ts
├── common/        # Prisma、共享模型、遗留内存态辅助代码
└── modules/
    ├── ai-content/
    ├── auth/
    ├── daily-session/
    ├── dictionary/
    ├── learning/
    ├── study-plan/
    └── wrong-book/
```

## 技术栈

- 前端：React、Vite、React Router、TanStack Query、Zustand、Tailwind CSS、React Hook Form、Zod
- 后端：NestJS、JWT、class-validator、Vitest
- 数据层：Prisma Schema，目标数据库为 PostgreSQL
- 密码加密：`bcryptjs`
- AI 适配：Mock Provider / OpenAI Provider

## 快速开始

### 1. 安装依赖

在仓库根目录执行：

```bash
npm install
```

或使用 workspace 脚本：

```bash
npm run install:all
```

### 2. 配置后端环境变量

把 `backend/.env.example` 复制为 `backend/.env`，并根据本地环境调整：

```env
PORT=3000
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/readrec?schema=public"
JWT_SECRET="readrec-dev-secret"
ACTIVE_AI_PROVIDER="mock"
OPENAI_API_KEY=""
APP_ENV="development"
```

### 3. 启动后端

```bash
cd backend
npm run start:dev
```

默认端口：`3000`

### 4. 启动前端

```bash
cd frontend
npm run dev
```

默认端口：`5173`

## 常用命令

### 仓库根目录

```bash
npm test
npm run build
```

### 后端

```bash
cd backend
npm run start:dev
npm test
npm run build
```

### 前端

```bash
cd frontend
npm run dev
npm test
npm run build
```

## 文档入口

- `docs/README.md`：文档总览
- `docs/business/prd.md`：产品需求文档
- `docs/technical/code-architecture.md`：代码架构说明
- `docs/technical/database.md`：数据库设计说明
- `docs/technical/code-style.md`：代码风格约束
- `docs/Rules/agent-rules.md`：协作规则与文档同步要求

## 当前限制与下一步

当前实现为了尽快搭出 MVP 骨架，保留了几处明确的边界：

- 前端已经切到真实 HTTP 接口，但暂未增加离线兜底与错误提示优化
- 后端学习主链路已切到 PostgreSQL，但仍保留遗留 `AppDataService` 代码，尚未清理
- `OpenAiProvider` 仍是占位实现，尚未接真实模型
- 官方词库导入脚本已可从 `words/*.txt` 批量导入 PostgreSQL

后续推荐的推进顺序：

1. 补齐前端错误态、加载态与接口异常提示
2. 清理遗留 `AppDataService` / `seed-data` 代码
3. 接入真实 OpenAI Provider
4. 完善官方词库导入与数据库初始化流程

## 协作约定

- 编码前先阅读业务文档、技术文档与规则文档
- 每次提交代码后同步更新相关产品文档与技术文档
- 若实现与 PRD 边界有确认性调整，需要同步更新文档
- 函数注释采用总结式表达，保持与仓库规则一致
