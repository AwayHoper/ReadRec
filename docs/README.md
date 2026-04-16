# Docs

## 文档目标

本目录用于沉淀 ReadRec 的业务、技术与协作规则文档，作为开发前阅读与开发后同步更新的统一入口。

## 目录结构

```text
docs/
├── README.md
├── business/
│   ├── prd.md
│   └── iteration-log.md
├── technical/
│   ├── database.md
│   ├── code-style.md
│   └── code-architecture.md
└── Rules/
    └── agent-rules.md
```

## 文档分工

- `business/prd.md`：产品定位、用户痛点、学习流程与功能需求
- `business/iteration-log.md`：迭代记录与阶段性变更说明
- `technical/code-architecture.md`：当前前后端架构、模块边界与数据流
- `technical/database.md`：Prisma 数据模型、实体关系与索引建议
- `technical/code-style.md`：代码风格、注释规范与协作要求
- `Rules/agent-rules.md`：文档同步、plan mode、注释规则等约束

## 当前技术栈概览

- 前端：React、Vite、React Router、TanStack Query、Zustand、Tailwind CSS
- 后端：NestJS、JWT、Prisma Schema、Vitest
- 数据运行态：MVP 当前以内存数据服务承载
- 目标数据库：PostgreSQL
- AI 适配：Mock Provider / OpenAI Provider

## 使用约定

- 编码前先阅读业务文档、技术文档与规则文档
- 每次提交代码后同步更新相关产品文档与技术文档
- 文档内容必须和当前实现保持一致
- 当实现仍处于过渡态时，文档要明确写清“当前状态”和“目标状态”