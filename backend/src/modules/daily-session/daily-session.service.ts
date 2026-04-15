import { Injectable, NotFoundException } from '@nestjs/common';
import { AiContentService } from '../ai-content/ai-content.service.js';
import { AppDataService } from '../../common/data/app-data.service.js';
import { createId } from '../../common/utils/id.util.js';
import { DictionaryService } from '../dictionary/dictionary.service.js';
import { selectDailyWords } from './domain/daily-session-selector.js';

@Injectable()
export class DailySessionService {
  constructor(
    private readonly appDataService: AppDataService,
    private readonly dictionaryService: DictionaryService,
    private readonly aiContentService: AiContentService
  ) {}

  /** Summary: This method gets or lazily creates the current day's learning session for the user. */
  async getTodaySession(userId: string) {
    const state = this.appDataService.getState();
    const today = new Date().toISOString().slice(0, 10);
    const existingSession = state.sessions.find((item) => item.userId === userId && item.sessionDate === today);
    if (existingSession) {
      return existingSession;
    }
    return this.createTodaySession(userId);
  }

  /** Summary: This method transitions today's session into round one without regenerating the snapshot. */
  async startTodaySession(userId: string) {
    const session = await this.getTodaySession(userId);
    session.status = 'ROUND_ONE';
    return this.appDataService.upsertSession(session);
  }

  /** Summary: This method returns the article snapshots for the user's current daily session. */
  async getTodayArticles(userId: string) {
    const session = await this.getTodaySession(userId);
    return session.articles;
  }

  /** Summary: This method creates the current day's session snapshot and article content. */
  private async createTodaySession(userId: string) {
    const state = this.appDataService.getState();
    const user = state.users.find((item) => item.id === userId);
    if (!user) {
      throw new NotFoundException('用户不存在。');
    }
    const plan = state.plans.find((item) => item.userId === userId && item.bookId === user.activeBookId);
    if (!plan) {
      throw new NotFoundException('当前词库尚未配置学习计划。');
    }
    const progress = state.progress.find((item) => item.userId === userId && item.bookId === user.activeBookId) ?? {
      userId,
      bookId: user.activeBookId,
      learnedWordIds: [],
      reviewedWordIds: [],
      flaggedWordIds: []
    };
    const bookWords = this.dictionaryService.getBookWords(userId, user.activeBookId);
    const newWordIds = bookWords.filter((item) => !progress.learnedWordIds.includes(item.id)).map((item) => item.id);
    const reviewWordIds = bookWords.filter((item) => progress.learnedWordIds.includes(item.id)).map((item) => item.id);
    const selectedWords = selectDailyWords({
      dailyWordCount: plan.dailyWordCount,
      newWordRatio: plan.newWordRatio,
      reviewWordRatio: plan.reviewWordRatio,
      newWordIds,
      reviewWordIds,
      flaggedReviewWordIds: progress.flaggedWordIds
    });
    const selectedWordRecords = selectedWords.map((item) => {
      const vocabularyItem = bookWords.find((word) => word.id === item.wordId)!;
      return {
        id: createId('session-word'),
        sessionId: '',
        vocabularyItemId: vocabularyItem.id,
        type: item.type,
        status: 'PENDING' as const,
        isSelectedUnknown: false,
        reviewAttempts: 0
      };
    });
    const sessionId = createId('session');
    selectedWordRecords.forEach((item) => {
      item.sessionId = sessionId;
    });
    const articles = await this.aiContentService.generateArticles({
      style: plan.articleStyle,
      words: selectedWordRecords.map((item) => {
        const vocabularyItem = bookWords.find((word) => word.id === item.vocabularyItemId)!;
        return {
          id: vocabularyItem.id,
          word: vocabularyItem.word,
          definitions: vocabularyItem.definitions
        };
      })
    });
    const session = {
      id: sessionId,
      userId,
      bookId: user.activeBookId,
      studyPlanId: plan.id,
      sessionDate: new Date().toISOString().slice(0, 10),
      status: 'PENDING' as const,
      articleStyle: plan.articleStyle,
      words: selectedWordRecords,
      articles: articles.map((article, index) => ({
        id: createId('article'),
        sessionId,
        title: article.title,
        content: article.content,
        summary: article.summary,
        translation: article.translation,
        coveredWordIds: article.coveredWordIds,
        orderIndex: index
      })),
      readingQuestions: [],
      reviewRounds: [],
      readingAnswers: []
    };
    return this.appDataService.upsertSession(session);
  }
}