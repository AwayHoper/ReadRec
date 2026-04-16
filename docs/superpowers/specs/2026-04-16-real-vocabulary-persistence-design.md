# ReadRec Real Vocabulary Persistence Design

## 背景

当前 ReadRec 已完成官方词库导入，`VocabularyBook` 与 `VocabularyItem` 已存入线上 PostgreSQL，`dictionary` 模块也已切换为真实数据库读取。

但整条学习链路仍存在明显断层：

- 后端 `study-plan`、`daily-session`、`learning`、`wrong-book` 仍以 `AppDataService` 内存态为主
- 前端多个页面仍通过 `frontend/src/lib/mock-api.ts` 消费假数据
- 用户虽然能拿到真实词库列表，但学习流程、计划、生词本和总结页并未真正建立在真实词库与真实持久化状态之上

## 本次目标

把“所有和词库学习相关的功能”接入真实 PostgreSQL 持久化，使前端页面通过真实后端接口读取与写入数据，不再依赖词库 mock 数据。

本次目标包括：

- 后端将 `StudyPlan`、`UserBookProgress`、`DailySession`、`DailySessionWord`、`GeneratedArticle`、`WordReviewRound`、`ReadingQuestion`、`ReadingAnswer`、`WrongBookEntry` 切换到 PostgreSQL
- 后端 `dictionary / study-plan / daily-session / learning / wrong-book` 模块统一使用 Prisma 持久化
- 前端词库、计划、学习流程、生词本页面切换到真实 HTTP API
- 真实词库数据贯穿抽词、二轮复习、三轮阅读题、总结页和生词本

## 不在本次范围

- 不处理新的后台词库上传功能
- 不新增管理端
- 不接入真实 OpenAI 能力
- 不改变当前产品流程与页面结构
- 不做用户体系重构，仅在现有账号模型基础上完成持久化

## 方案选择

本次采用“方案二：整条词库学习链路一起持久化”。

原因：

- 如果只切词库读取，服务重启后计划、会话、生词本会丢，用户体验依旧不完整
- 当前 Prisma schema 已具备主要实体，继续落地实现比重做模型更划算
- 前端切真实 API 时，如果后端仍是半内存半数据库，会造成状态不一致与调试困难

## 数据设计

### 已存在并继续使用的实体

- `VocabularyBook`
- `VocabularyItem`

### 本次正式启用的实体

- `User`
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

### 词义结构

`VocabularyItem` 保留以下字段：

- `partOfSpeech`：词性摘要字符串
- `definitions`：扁平化释义数组
- `senses`：按词性分组的 JSON 数组

前端若要按词性展示释义，应优先使用 `senses`。

## 后端设计

### 核心思路

以后端 Prisma 持久化层替换 `AppDataService` 在词库学习链路中的职责，保留当前模块边界和控制器路由，尽量不改接口形状。

### 模块调整

#### 1. `auth`

- 注册时把用户写入 PostgreSQL
- 登录从 PostgreSQL 读取用户
- 用户的 `activeBookId` 持久化到 `User`

#### 2. `study-plan`

- 读取当前用户 `activeBookId`
- `StudyPlan` 改为 Prisma upsert
- `UserBookProgress` 改为 Prisma upsert

#### 3. `dictionary`

- 已切到 Prisma
- 继续保持为词库统一读取入口

#### 4. `daily-session`

- 今日学习会话改为从 PostgreSQL 查询
- 若不存在则按当前计划与进度创建并持久化
- 抽词使用真实 `VocabularyItem`
- 文章快照写入 `GeneratedArticle`

#### 5. `learning`

- 一轮选词结果写入 `DailySessionWord` 与 `ArticleUnknownWordSelection`
- 二轮复习读真实 `VocabularyItem` 释义并持久化 `WordReviewRound`
- 三轮阅读题持久化 `ReadingQuestion`、`ReadingAnswer`
- 学习完成后更新 `UserBookProgress`

#### 6. `wrong-book`

- 标记写入 `WrongBookEntry`
- 列表与导出通过关联 `VocabularyItem` 返回真实词义

### 持久化基础设施

- 新增统一 `PrismaService`
- 需要为 Prisma 相关查询添加最小的转换层，保证接口返回格式与前端期望兼容

## 前端设计

### 核心思路

用真实 HTTP API 替换 `mock-api.ts` 在词库学习链路中的职责，但尽量保持前端页面组件结构不大改。

### 实施方式

- 新增 `frontend/src/lib/api.ts` 或等价真实请求层
- 将以下页面切换到真实后端：
  - 词库列表/详情相关页面
  - `plans-page`
  - `read-round-page`
  - `review-round-page`
  - `questions-round-page`
  - `summary-page`
  - `wrong-book-page`
- 保持 TanStack Query 的使用方式不变，降低页面层改动量

## 迁移策略

### 数据迁移

- 线上词库数据已存在，无需重复建模
- 其他业务表为空时，可直接通过 `prisma db push` 启用
- 首次真实学习流程将自然产生 `StudyPlan`、`DailySession`、`WrongBookEntry` 等数据

### 风险点

- 当前前端依赖的 mock 接口返回结构与后端真实接口可能存在字段差异
- `DailySession` 及其下游实体改为持久化后，状态流转错误会比内存态更难回滚
- 如果学习流程接口存在并发调用，需要避免重复创建今日 session

## 验证标准

- 后端测试通过，且新增持久化相关测试
- 后端 build 通过
- 前端 build 通过
- 用户登录后可以：
  - 查看真实词库
  - 设置学习计划
  - 创建今日学习
  - 进入一轮、二轮、三轮
  - 完成学习并进入总结页
  - 将单词加入生词本并查看/导出
- 服务重启后，学习计划、生词本与当日会话仍存在

## 预期结果

ReadRec 将从“真实词库 + 其余流程 mock/内存态”的半接入状态，升级为“词库学习链路完整接入真实 PostgreSQL”的可持续迭代基础版本。
