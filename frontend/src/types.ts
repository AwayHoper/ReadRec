export interface UserProfile { id: string; email: string; activeBookId: string; }
export interface AuthResponse { accessToken: string; user: UserProfile; }
export interface VocabularyBookSummary { id: string; key: string; title: string; description: string; learnedCount: number; reviewedCount: number; totalWordCount: number; }
export interface StudyPlan { id: string; userId: string; bookId: string; dailyWordCount: number; newWordRatio: number; reviewWordRatio: number; articleStyle: 'EXAM' | 'NEWS' | 'TED'; }
export interface VocabularySense { partOfSpeech: string; definitions: string[]; }
export type SessionWordStatus = 'PENDING' | 'PASSED_ROUND_ONE' | 'NEEDS_REVIEW' | 'PASSED_ROUND_TWO' | 'PASSED_ROUND_THREE' | 'MARKED_WRONG_BOOK';
export type DailySessionStatus = 'PENDING' | 'ROUND_ONE' | 'ROUND_TWO' | 'ROUND_THREE' | 'COMPLETED';
export interface BookWordItem { id: string; bookId: string; word: string; phonetic: string; partOfSpeech: string; definitions: string[]; senses: VocabularySense[]; examples: string[]; isLearned: boolean; }
export interface BookWordPagination { page: number; pageSize: number; total: number; totalPages: number; }
export interface BookWordPage { items: BookWordItem[]; pagination: BookWordPagination; }
export interface SessionWordSummary { id: string; vocabularyItemId: string; type: 'NEW' | 'REVIEW'; status: SessionWordStatus; isSelectedUnknown: boolean; reviewAttempts: number; word?: string; phonetic?: string; partOfSpeech?: string; definitions?: string[]; senses?: VocabularySense[]; examples?: string[]; }
export interface GeneratedArticle { id: string; sessionId: string; title: string; content: string; summary: string; translation: string; coveredWordIds: string[]; orderIndex: number; }
export interface ReviewRound { sessionWordId: string; choices: string[]; correctAnswer: string; explanation: string; currentPhase: 'NOTES' | 'QUIZ' | 'PASSED'; isPassed: boolean; word?: string; phonetic?: string; definitions?: string[]; }
export interface ReviewRoundResponse { sessionId: string; status: DailySessionStatus; rounds: ReviewRound[]; }
export interface ReadingQuestion { id: string; sessionId: string; sessionWordId: string; prompt: string; options: string[]; correctOption: string; explanation: string; translation: string; }
export interface ReadingAnswer { questionId: string; sessionWordId: string; selectedOption: string; isCorrect: boolean; }
export interface DailySession { id: string; userId: string; bookId: string; studyPlanId: string; sessionDate: string; status: DailySessionStatus; articleStyle: 'EXAM' | 'NEWS' | 'TED'; words: SessionWordSummary[]; articles: GeneratedArticle[]; reviewRounds: ReviewRound[]; readingQuestions: ReadingQuestion[]; readingAnswers: ReadingAnswer[]; }
export interface WrongBookEntry { id: string; wordId: string; word: string; definitions: string[]; phonetic: string; }
