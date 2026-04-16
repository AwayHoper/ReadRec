# Code Architecture

## 当前状态

ReadRec 已完成学习闭环 MVP 的前后端脚手架与核心流程实现：

- `frontend/` 使用 `React + Vite + React Router + TanStack Query + Zustand + Tailwind CSS`
- `backend/` 使用 `NestJS + JWT + Prisma Schema + Mock/OpenAI Provider 适配层`
- 当前词库学习主链路已切换为 PostgreSQL 持久化
- 后端通过 `PrismaService` 读写用户、计划、会话、词库、生词本等核心学习数据
- `backend/prisma/schema.prisma` 已落地 PostgreSQL 数据模型，学习链路相关表已在线上库启用

## 前端分层

- `src/providers/`：全局 Provider，例如认证上下文
- `src/components/`：布局、路由守卫、通用卡片等可复用组件
- `src/pages/`：页面级学习流程与管理页面
- `src/lib/`：当前使用 `api.ts` 作为真实 HTTP 请求层，统一封装鉴权与接口调用
- `src/stores/`：流程内状态，例如三轮学习轮次推进
- `src/types.ts`：前端统一数据类型

## 后端模块边界

- `auth`：邮箱密码注册登录、JWT 签发、当前用户信息，使用 Prisma 持久化 `User`
- `dictionary`：通过 Prisma 读取官方词库列表、词库详情、按进度筛选词列表
- `study-plan`：通过 Prisma 维护当前词库计划与用户当前激活词库
- `daily-session`：通过 Prisma 维护每日学习会话、抽词与文章快照
- `learning`：通过 Prisma 持久化一轮选词、二轮复习答题、三轮阅读题与学习完成
- `ai-content`：`MockAiProvider` / `OpenAiProvider` 适配层与统一生成接口
- `wrong-book`：通过 Prisma 持久化生词本标记、列表、导出
- `common`：Prisma 访问、共享模型、旧内存态数据、ID 工具

## 词库导入约定

- 官方词库通过 `backend/scripts/import-official-books.ts` 从 `words/*.txt` 临时导入
- 导入脚本会把单词释义同时保存为：
  - `definitions`：扁平数组
  - `senses`：按词性分组的 JSON 结构
- 导入脚本会对同一本词库内的重复单词按 `word` 去重后再批量写入
- 后续若前端需要按词性展示释义，应读取 `senses`

## 当前持久化边界

- 已切到 PostgreSQL：
  - `User`
  - `VocabularyBook`
  - `VocabularyItem`
  - `UserBookProgress`
  - `StudyPlan`
  - `DailySession`
  - `DailySessionWord`
  - `GeneratedArticle`
  - `ArticleUnknownWordSelection`
  - `WordReviewRound`
  - `ReadingQuestion`
  - `ReadingAnswer`
  - `WrongBookEntry`
- 仍保留但不在主流程中使用：
  - `AppDataService`
  - `seed-data.ts`

## MVP 学习流程

1. 用户登录后进入首页，读取当前激活词库与学习计划。
2. 首次读取今日学习时，由 `daily-session` 根据计划和进度抽取新词/复习词。
3. `ai-content` 生成文章快照，保存到当日 session。
4. 用户在一轮阅读中标记生词，系统把这些词推进到二轮。
5. 用户在二轮进行释义学习与四选一，全部通过后进入三轮。
6. 三轮基于已标记生词生成阅读题，提交完成后进入总结页。
7. 总结页可把词加入生词本，并支持 txt 导出。

## 计划页与词库详情页

- 首页不再展示官方词库，官方词库入口统一放在“计划”页
- “计划”页先读取 `GET /books` 和 `GET /study-plans/current`
- 页面上方渲染官方词库卡片，下方渲染学习计划模块
- 计划模块使用比例调节器、固定方案卡片与动态预测来生成最终计划参数
- 用户点击词库卡片后，会通过 `POST /study-plans/switch-book` 切换当前激活词库并恢复该词库的计划快照
- 保存计划时，前端把当前方案映射成 `PUT /study-plans/current` 所需的 `dailyWordCount / newWordRatio / reviewWordRatio`
- 词库详情页通过 `GET /books/:bookId/words?page=&pageSize=` 读取分页单词列表
- 词库详情页优先渲染 `senses`，并展示后端返回的 `isLearned`

## v0.5.0 计划优化约定

- `dailyWordCount` 在当前版本中代表“每日总词量”，而不是单独的新词量
- `newWordRatio` 固定为 `1`
- `reviewWordRatio` 取值范围为 `1..4`
- 前端方案卡片中的新词档位固定为 `5 / 10 / 20 / 40`
- 动态预测使用当前词库 `totalWordCount - learnedCount` 作为剩余新词量
- 切换词库后，若该词库已有保存计划，则恢复该计划映射出的比例和方案档位；否则回退到默认档位

## 后续维护规则

- 若前端真实接口返回结构变化，需同步更新本文档中的数据流说明
- 若后续移除遗留的 `AppDataService` 与 `seed-data.ts`，需同步更新持久化章节与模块职责
- 若学习流程轮次、状态机或 AI Provider 协议变化，需同步更新本文档与 `database.md`
