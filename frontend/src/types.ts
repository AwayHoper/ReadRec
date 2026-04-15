export interface UserProfile { id: string; email: string; activeBookId: string; }
export interface AuthResponse { accessToken: string; user: UserProfile; }
export interface VocabularyBookSummary { id: string; key: string; title: string; description: string; learnedCount: number; reviewedCount: number; totalWordCount: number; }
export interface StudyPlan { id: string; userId: string; bookId: string; dailyWordCount: number; newWordRatio: number; reviewWordRatio: number; articleStyle: 'EXAM' | 'NEWS' | 'TED'; }
export interface SessionWordSummary { id: string; vocabularyItemId: string; type: 'NEW' | 'REVIEW'; status: string; isSelectedUnknown: boolean; reviewAttempts: number; }
export interface GeneratedArticle { id: string; sessionId: string; title: string; content: string; summary: string; translation: string; coveredWordIds: string[]; orderIndex: number; }
export interface ReviewRound { sessionWordId: string; choices: string[]; correctAnswer: string; explanation: string; currentPhase: 'NOTES' | 'QUIZ' | 'PASSED'; isPassed: boolean; word?: string; phonetic?: string; definitions?: string[]; }
export interface ReadingQuestion { id: string; sessionId: string; sessionWordId: string; prompt: string; options: string[]; correctOption: string; explanation: string; translation: string; }
export interface ReadingAnswer { questionId: string; sessionWordId: string; selectedOption: string; isCorrect: boolean; }
export interface DailySession { id: string; userId: string; bookId: string; studyPlanId: string; sessionDate: string; status: string; articleStyle: 'EXAM' | 'NEWS' | 'TED'; words: SessionWordSummary[]; articles: GeneratedArticle[]; reviewRounds: ReviewRound[]; readingQuestions: ReadingQuestion[]; readingAnswers: ReadingAnswer[]; }
export interface WrongBookEntry { id: string; wordId: string; word: string; definitions: string[]; phonetic: string; }