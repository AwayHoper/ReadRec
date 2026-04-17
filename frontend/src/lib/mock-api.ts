import { AuthResponse, DailySession, DashboardHomeResponse, ReadingQuestion, ReviewRound, StudyPlan, VocabularyBookSummary, WrongBookEntry } from '../types';

const books: VocabularyBookSummary[] = [
  { id: 'book-kaoyan', key: 'kaoyan-2', title: '考研英语二词库', description: '面向考研英语二语境的官方词库。', learnedCount: 0, reviewedCount: 0, totalWordCount: 4 },
  { id: 'book-cet4', key: 'cet4', title: '大学英语四级词库', description: '覆盖 CET-4 高频词汇与阅读场景。', learnedCount: 0, reviewedCount: 0, totalWordCount: 2 },
  { id: 'book-cet6', key: 'cet6', title: '大学英语六级词库', description: '覆盖 CET-6 高频词汇与阅读场景。', learnedCount: 0, reviewedCount: 0, totalWordCount: 2 }
];
let auth: AuthResponse | null = null;
let plan: StudyPlan = { id: 'plan-1', userId: 'user-1', bookId: 'book-kaoyan', dailyWordCount: 6, newWordRatio: 2, reviewWordRatio: 1, articleStyle: 'EXAM' };
let session: DailySession = {
  id: 'session-1', userId: 'user-1', bookId: 'book-kaoyan', studyPlanId: 'plan-1', sessionDate: new Date().toISOString().slice(0, 10), batchIndex: 1, status: 'ROUND_ONE', articleStyle: 'EXAM',
  words: [
    { id: 'sw1', vocabularyItemId: 'w1', type: 'NEW', status: 'PENDING', isSelectedUnknown: false, reviewAttempts: 0 },
    { id: 'sw2', vocabularyItemId: 'w2', type: 'NEW', status: 'PENDING', isSelectedUnknown: false, reviewAttempts: 0 },
    { id: 'sw3', vocabularyItemId: 'w3', type: 'NEW', status: 'PENDING', isSelectedUnknown: false, reviewAttempts: 0 }
  ],
  articles: [
    { id: 'article-1', sessionId: 'session-1', title: 'Exam Article 1', content: 'Universities must sustain funding while they allocate new resources to resilient research communities.', summary: 'A contextual article for three target words.', translation: '大学需要维持资金，同时分配新资源给有韧性的研究群体。', coveredWordIds: ['w1', 'w2', 'w3'], orderIndex: 0 }
  ],
  reviewRounds: [
    { sessionWordId: 'sw1', choices: ['维持', '拒绝', '浪费', '隐藏'], correctAnswer: '维持', explanation: 'sustain 在语境中表示维持。', currentPhase: 'NOTES', isPassed: false, word: 'sustain', phonetic: '/səˈsteɪn/', definitions: ['维持', '支撑'] },
    { sessionWordId: 'sw2', choices: ['分配', '逃离', '削减', '占领'], correctAnswer: '分配', explanation: 'allocate 在语境中表示分配。', currentPhase: 'NOTES', isPassed: false, word: 'allocate', phonetic: '/ˈæləkeɪt/', definitions: ['分配', '拨给'] }
  ],
  readingQuestions: [
    { id: 'q1', sessionId: 'session-1', sessionWordId: 'sw1', prompt: 'Which meaning of sustain fits the article?', options: ['维持', '打断', '转移', '抽离'], correctOption: '维持', explanation: 'The passage is about maintaining support.', translation: '文章讨论的是维持支持。' },
    { id: 'q2', sessionId: 'session-1', sessionWordId: 'sw2', prompt: 'Which meaning of allocate fits the article?', options: ['分配', '损坏', '忽略', '退出'], correctOption: '分配', explanation: 'The article refers to distributing resources.', translation: '文章指的是分配资源。' }
  ],
  readingAnswers: []
};
let wrongBook: WrongBookEntry[] = [];
/** Summary: This function simulates user registration and returns a mock auth payload. */
export async function register(email: string, _password: string): Promise<AuthResponse> { auth = { accessToken: 'mock-token', user: { id: 'user-1', email, activeBookId: plan.bookId } }; return auth; }
/** Summary: This function simulates user login and returns a mock auth payload. */
export async function login(email: string, _password: string): Promise<AuthResponse> { auth = { accessToken: 'mock-token', user: { id: 'user-1', email, activeBookId: plan.bookId } }; return auth; }
/** Summary: This function returns the current mock authentication payload. */
export async function me() { return auth?.user ?? null; }
/** Summary: This function returns all vocabulary books for the dashboard. */
export async function getBooks() { return books; }
/** Summary: This function returns the current study plan snapshot. */
export async function getCurrentPlan() { return { activeBookId: plan.bookId, plan }; }
/** Summary: This function updates the current study plan snapshot. */
export async function updatePlan(nextPlan: Omit<StudyPlan, 'id' | 'userId'>) { plan = { ...plan, ...nextPlan }; return { activeBookId: plan.bookId, plan }; }
/** Summary: This function returns the current daily session snapshot. */
export async function getTodaySession(): Promise<DailySession> { return session; }
/** Summary: This function returns the mock homepage aggregate payload. */
export async function getDashboardHome(): Promise<DashboardHomeResponse> {
  const activeBook = books.find((book) => book.id === plan.bookId) ?? null;
  const hasCompletedBatchToday = session.status === 'COMPLETED';

  return {
    activeBook: activeBook ? {
      id: activeBook.id,
      key: activeBook.key,
      title: activeBook.title,
      description: activeBook.description,
      totalWordCount: activeBook.totalWordCount,
      learnedCount: activeBook.learnedCount,
      reviewedCount: activeBook.reviewedCount
    } : null,
    plan,
    today: {
      date: session.sessionDate,
      state: hasCompletedBatchToday ? 'completed' : 'pending',
      target: {
        newCount: 4,
        reviewCount: 2,
        totalCount: plan.dailyWordCount
      },
      learnedUniqueWordCount: hasCompletedBatchToday ? session.words.length : 0,
      completedBatchCount: hasCompletedBatchToday ? session.batchIndex : 0
    },
    cta: {
      mode: hasCompletedBatchToday ? 'continue' : 'start',
      label: hasCompletedBatchToday ? '再学一轮' : '开始今日学习'
    },
    mastery: {
      familiarCount: activeBook?.reviewedCount ?? 0,
      fuzzyCount: activeBook?.learnedCount ?? 0,
      unseenCount: Math.max(0, (activeBook?.totalWordCount ?? 0) - (activeBook?.learnedCount ?? 0)),
      totalWordCount: activeBook?.totalWordCount ?? 0
    },
    streaks: {
      calendar: [{
        date: session.sessionDate,
        completed: hasCompletedBatchToday,
        completedBatchCount: hasCompletedBatchToday ? session.batchIndex : 0,
        learnedUniqueWordCount: hasCompletedBatchToday ? session.words.length : 0,
        intensity: hasCompletedBatchToday ? 'medium' : 'none'
      }],
      totalDays: hasCompletedBatchToday ? 1 : 0,
      currentStreakDays: hasCompletedBatchToday ? 1 : 0,
      remainingDays: null,
      estimatedFinishDate: null
    },
    encouragement: {
      tone: hasCompletedBatchToday ? 'praise' : 'encourage',
      message: hasCompletedBatchToday ? '今天已经完成一轮，继续保持。' : '开始今天的学习，保持节奏。'
    },
    history: {
      lastCompletedDate: hasCompletedBatchToday ? session.sessionDate : null,
      lastCompletedBatchWordCount: hasCompletedBatchToday ? session.words.length : 0,
      activeBookTitle: activeBook?.title ?? null
    }
  };
}
/** Summary: This function returns the current unfinished mock batch or creates the next same-day batch. */
export async function createNextSession(): Promise<DailySession> {
  if (session.status !== 'COMPLETED') {
    return session;
  }

  const nextBatchIndex = session.batchIndex + 1;
  session = {
    ...session,
    id: `session-${nextBatchIndex}`,
    batchIndex: nextBatchIndex,
    status: 'PENDING',
    words: session.words.map((word) => ({
      ...word,
      status: 'PENDING',
      isSelectedUnknown: false,
      reviewAttempts: 0
    })),
    articles: session.articles.map((article, index) => ({
      ...article,
      id: `article-${nextBatchIndex}-${index + 1}`,
      sessionId: `session-${nextBatchIndex}`
    })),
    reviewRounds: session.reviewRounds.map((round) => ({
      ...round,
      currentPhase: 'NOTES',
      isPassed: false
    })),
    readingQuestions: session.readingQuestions.map((question, index) => ({
      ...question,
      id: `q${nextBatchIndex}-${index + 1}`,
      sessionId: `session-${nextBatchIndex}`
    })),
    readingAnswers: []
  };

  return session;
}
/** Summary: This function simulates selecting unknown words during round one. */
export async function submitSelections(sessionWordIds: string[]) { session.words = session.words.map((word) => ({ ...word, isSelectedUnknown: sessionWordIds.includes(word.id), status: sessionWordIds.includes(word.id) ? 'NEEDS_REVIEW' : 'PASSED_ROUND_ONE' })); session.status = 'ROUND_TWO'; return session; }
/** Summary: This function returns the current review-round state. */
export async function getReviewRounds(): Promise<{ rounds: ReviewRound[] }> { return { rounds: session.reviewRounds }; }
/** Summary: This function simulates one review answer and progresses the flow when all answers pass. */
export async function checkReviewAnswer(sessionWordId: string, selectedOption: string) { session.reviewRounds = session.reviewRounds.map((round) => round.sessionWordId === sessionWordId ? { ...round, currentPhase: selectedOption === round.correctAnswer ? 'PASSED' : 'NOTES', isPassed: selectedOption === round.correctAnswer } : round); if (session.reviewRounds.every((round) => round.isPassed)) { session.status = 'ROUND_THREE'; } return session; }
/** Summary: This function returns the current reading questions. */
export async function getReadingQuestions(): Promise<ReadingQuestion[]> { return session.readingQuestions; }
/** Summary: This function simulates one reading-question answer submission. */
export async function answerReadingQuestion(questionId: string, selectedOption: string) { const question = session.readingQuestions.find((item) => item.id === questionId)!; const existingIndex = session.readingAnswers.findIndex((item) => item.questionId === questionId); const answer = { questionId, sessionWordId: question.sessionWordId, selectedOption, isCorrect: selectedOption === question.correctOption }; if (existingIndex >= 0) { session.readingAnswers[existingIndex] = answer; } else { session.readingAnswers.push(answer); } return answer; }
/** Summary: This function returns the final summary payload for the learning session. */
export async function completeLearning() { session.status = 'COMPLETED'; return { session, words: session.words.map((word) => ({ sessionWordId: word.id, wordId: word.vocabularyItemId, word: word.vocabularyItemId, definitions: ['示例释义'], selectedUnknown: word.isSelectedUnknown })) }; }
/** Summary: This function returns the wrong-book list. */
export async function getWrongBook() { return wrongBook; }
/** Summary: This function marks selected words into the wrong-book list. */
export async function markWrongBook(vocabularyItemIds: string[]) { wrongBook = vocabularyItemIds.map((id, index) => ({ id: `wrong-${index + 1}`, wordId: id, word: id, definitions: ['示例释义'], phonetic: '/mock/' })); return wrongBook; }
/** Summary: This function simulates plain-text export for the wrong-book list. */
export async function exportWrongBook() { return { filename: 'wrong-book.txt', content: wrongBook.map((item) => `${item.word}: ${item.definitions.join(' / ')}`).join('\n') }; }
