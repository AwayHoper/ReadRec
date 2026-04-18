# Database Design

## 当前状态

当前项目已使用 PostgreSQL 持久化词库学习主链路数据，包含用户、学习计划、每日学习会话、复习题与生词本。

## 核心实体

- `User`：账号信息、当前激活词库
- `VocabularyBook`：官方词库元数据
- `VocabularyItem`：词库单词与静态释义，包含扁平释义与按词性分组的 `senses`
- `UserBookProgress`：用户在某词库下的已学/已复习/已标记状态
- `StudyPlan`：每词库唯一学习计划
- `DailySession`：用户每日学习会话
- `DailySessionWord`：当日被抽中的单词快照
- `GeneratedArticle`：一轮学习文章快照
- `ArticleUnknownWordSelection`：一轮选中的生词记录
- `WordReviewRound`：二轮四选一状态
- `ReadingQuestion`：三轮阅读题快照
- `ReadingAnswer`：三轮答题结果
- `WrongBookEntry`：生词本条目

## 关键关系

- `User 1 - n StudyPlan`
- `VocabularyBook 1 - n VocabularyItem`
- `User + VocabularyBook 1 - 1 UserBookProgress`
- `User + VocabularyBook 1 - 1 StudyPlan`
- `DailySession 1 - n DailySessionWord`
- `DailySession 1 - n GeneratedArticle`
- `DailySession 1 - n ReadingQuestion`
- `DailySessionWord 1 - 0..1 WordReviewRound`
- `ReadingQuestion 1 - 0..1 ReadingAnswer`
- `User 1 - n WrongBookEntry`

## 状态字段

- `DailySession.status`
  - `PENDING`
  - `ROUND_ONE`
  - `ROUND_TWO`
  - `ROUND_THREE`
  - `COMPLETED`
- `DailySessionWord.status`
  - `PENDING`
  - `PASSED_ROUND_ONE`
  - `NEEDS_REVIEW`
  - `PASSED_ROUND_TWO`
  - `PASSED_ROUND_THREE`
  - `MARKED_WRONG_BOOK`

## 索引建议

- `VocabularyBook.key` 唯一索引
- `VocabularyItem(bookId, word)` 唯一索引
- `UserBookProgress(userId, bookId)` 唯一索引
- `StudyPlan(userId, bookId)` 唯一索引
- `DailySession(userId, sessionDate, batchIndex)` 唯一索引
- `DailySession(userId, sessionDate)` 普通索引，用于当天批次查询
- `ArticleUnknownWordSelection(articleId, sessionWordId)` 唯一索引
- `WrongBookEntry(userId, vocabularyItemId)` 唯一索引

## 词库存储约定

- `VocabularyItem.word`：单词正文
- `VocabularyItem.partOfSpeech`：当前单词包含的词性摘要，例如 `n. v.`
- `VocabularyItem.definitions`：扁平化中文释义数组，便于兼容简单列表展示
- `VocabularyItem.senses`：按词性分组的 JSON 数组，例如：

```json
[
  { "partOfSpeech": "n.", "definitions": ["信号"] },
  { "partOfSpeech": "v.", "definitions": ["发信号", "打信号", "示意"] }
]
```

- 前端若需要区分词性与释义归属，应优先使用 `senses`

## 学习状态判定

- `GET /books/:bookId/words` 返回分页单词列表时，会附带 `isLearned`
- `isLearned` 的判定依据为当前用户在该词库下是否已存在该单词的学习进度记录
- 产品展示口径：
  - `isLearned = true` 时显示“已学习”
  - `isLearned = false` 时显示“未学习”

## 学习计划字段约定

- `StudyPlan.dailyWordCount`：当前版本表示“每日总词量”
- `StudyPlan.newWordRatio`：当前版本固定为 `1`
- `StudyPlan.reviewWordRatio`：当前版本表示复习倍数，范围为 `1..4`

例如：

- 若前端用户选择比例 `1:3`，新词方案 `10`
- 则落库为：
  - `dailyWordCount = 40`
  - `newWordRatio = 1`
  - `reviewWordRatio = 3`

## 每日抽词规则

- 当日新词数和复习词数根据 `dailyWordCount` 与比例字段共同推导
- 若一侧候选不足，由另一侧补齐
- 生词本条目在复习词候选中优先级更高
- 最终选中的单词在写入 `DailySessionWord` 前会做乱序处理

## 同日多批次会话约定

- `DailySession.batchIndex` 表示同一天内的学习批次序号，从 `1` 开始
- 同一用户同一天可存在多个 `DailySession`
- 历史数据迁移时，旧的单日单批次记录统一回填为 `batchIndex = 1`
- 首页“今日是否完成”不依赖当前活动批次状态，而依赖当天是否存在至少一个 `COMPLETED` 批次

## 首页聚合数据口径

- `GET /dashboard/home` 通过聚合查询生成首页数据
- `today.state`
  - 当天无任何已完成批次 -> `pending`
  - 当天至少有一个已完成批次 -> `completed`
- `today.learnedUniqueWordCount`
  - 统计当天所有已完成批次中的去重单词数
- `streaks.currentStreakDays`
  - 从“今天”开始向前连续存在完成记录的天数
- `streaks.remainingDays` / `estimatedFinishDate`
  - 基于“剩余新词数 / 每日新词目标”计算，而不是基于每日总量
- `encouragement.tone`
  - `encourage`: 今天完成批次数为 `0`
  - `praise`: 今天完成批次数为 `1`
  - `celebrate`: 今天完成批次数大于等于 `2`

## 当前落库状态

- 已在线上 PostgreSQL 导入 3 本官方词库：
  - `cet4`
  - `cet6`
  - `kaoyan-2`
- 当前线上总词数：`13581`
- 当前 `auth`、`dictionary`、`study-plan`、`daily-session`、`learning`、`wrong-book` 已切到 Prisma 持久化
- 同一单词在不同词库内允许重复存在，但在同一词库内受 `(bookId, word)` 唯一索引约束

## 同步约束

- 若后续扩展用户自定义词库、后台导入、复杂复习权重，需要更新实体与索引说明
- 若后续移除遗留内存态服务，需补充清理策略与回归验证要求
