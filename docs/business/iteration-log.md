# Iteration Log

## 版本记录

### v0.1.0

- 初始化项目目录结构
- 初始化业务文档、技术文档与规则文档骨架

### v0.2.0

- 新增官方词库 txt 导入脚本
- 官方词库已导入线上 PostgreSQL
- `dictionary` 模块已切换为读取真实 PostgreSQL 词库数据

### v0.3.0

- `auth / study-plan / daily-session / learning / wrong-book` 已切换到 Prisma 持久化
- 前端词库学习链路已从 `mock-api` 切换到真实 HTTP API
- 学习计划、每日学习、生词本与总结页现在基于真实 PostgreSQL 数据运行
