# Database Design

## 当前状态

当前 MVP 运行时以内存态数据服务为主，但已经补齐 Prisma 数据库模型，后续可直接迁移到 PostgreSQL。

## 核心实体

- `User`：账号信息、当前激活词库
- `VocabularyBook`：官方词库元数据
- `VocabularyItem`：词库单词与静态释义
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

## 同步约束

- 若后续扩展用户自定义词库、后台导入、复杂复习权重，需要更新实体与索引说明
- 若运行态正式切换到 PostgreSQL，需把迁移命令、种子方式、连接约束补充到本文档