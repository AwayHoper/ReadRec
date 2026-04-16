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
- `DailySession(userId, sessionDate)` 唯一索引
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
