/** Summary: This file declares the shared in-memory domain models used by the MVP modules. */
export type ArticleStyle = 'EXAM' | 'NEWS' | 'TED';
/** Summary: This type describes the lifecycle stage of a daily learning session. */
export type DailySessionStatus = 'PENDING' | 'ROUND_ONE' | 'ROUND_TWO' | 'ROUND_THREE' | 'COMPLETED';
/** Summary: This type distinguishes whether a session word is new or review content. */
export type SessionWordType = 'NEW' | 'REVIEW';
/** Summary: This type tracks the progress of a selected word across the learning rounds. */
export type SessionWordStatus = 'PENDING' | 'PASSED_ROUND_ONE' | 'NEEDS_REVIEW' | 'PASSED_ROUND_TWO' | 'PASSED_ROUND_THREE' | 'MARKED_WRONG_BOOK';
/** Summary: This interface represents a persisted user account. */
export interface UserRecord { id: string; email: string; passwordHash: string; activeBookId: string; }
/** Summary: This interface represents a supported official vocabulary book. */
export interface VocabularyBookRecord { id: string; key: string; title: string; description: string; }
/** Summary: This interface stores a single vocabulary entry inside a book. */
export interface VocabularyItemRecord { id: string; bookId: string; word: string; phonetic: string; partOfSpeech: string; definitions: string[]; examples: string[]; }
/** Summary: This interface tracks user progress within a vocabulary book. */
export interface UserBookProgressRecord { userId: string; bookId: string; learnedWordIds: string[]; reviewedWordIds: string[]; flaggedWordIds: string[]; }
/** Summary: This interface describes the editable study plan for one book. */
export interface StudyPlanRecord { id: string; userId: string; bookId: string; dailyWordCount: number; newWordRatio: number; reviewWordRatio: number; articleStyle: ArticleStyle; }
/** Summary: This interface stores one selected session word in a daily session. */
export interface DailySessionWordRecord { id: string; sessionId: string; vocabularyItemId: string; type: SessionWordType; status: SessionWordStatus; isSelectedUnknown: boolean; reviewAttempts: number; }
/** Summary: This interface stores one generated article snapshot. */
export interface GeneratedArticleRecord { id: string; sessionId: string; title: string; content: string; summary: string; translation: string; coveredWordIds: string[]; orderIndex: number; }
/** Summary: This interface stores one generated reading question snapshot. */
export interface ReadingQuestionRecord { id: string; sessionId: string; sessionWordId: string; prompt: string; options: string[]; correctOption: string; explanation: string; translation: string; }
/** Summary: This interface stores the review-round multiple-choice state for a word. */
export interface WordReviewRoundRecord { sessionWordId: string; choices: string[]; correctAnswer: string; explanation: string; currentPhase: 'NOTES' | 'QUIZ' | 'PASSED'; isPassed: boolean; }
/** Summary: This interface stores one reading answer submission. */
export interface ReadingAnswerRecord { questionId: string; sessionWordId: string; selectedOption: string; isCorrect: boolean; }
/** Summary: This interface represents a user's wrong-book marker for later review. */
export interface WrongBookEntryRecord { id: string; userId: string; vocabularyItemId: string; }
/** Summary: This interface stores one full daily learning session snapshot. */
export interface DailySessionRecord { id: string; userId: string; bookId: string; studyPlanId: string; sessionDate: string; status: DailySessionStatus; articleStyle: ArticleStyle; words: DailySessionWordRecord[]; articles: GeneratedArticleRecord[]; readingQuestions: ReadingQuestionRecord[]; reviewRounds: WordReviewRoundRecord[]; readingAnswers: ReadingAnswerRecord[]; }
/** Summary: This interface groups the in-memory persistence arrays used by the MVP server. */
export interface AppState { users: UserRecord[]; books: VocabularyBookRecord[]; words: VocabularyItemRecord[]; progress: UserBookProgressRecord[]; plans: StudyPlanRecord[]; sessions: DailySessionRecord[]; wrongBookEntries: WrongBookEntryRecord[]; }