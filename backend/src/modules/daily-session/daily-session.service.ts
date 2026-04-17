import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createTodayRange, mapVocabularyItem, normalizeStringArray } from '../../common/prisma/prisma-mappers.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { createId } from '../../common/utils/id.util.js';
import { AiContentService } from '../ai-content/ai-content.service.js';
import { DictionaryService } from '../dictionary/dictionary.service.js';
import { selectDailyWords } from './domain/daily-session-selector.js';

const DAILY_SESSION_INCLUDE = {
  words: {
    include: {
      vocabularyItem: true,
      reviewRound: true
    }
  },
  articles: true,
  readingQuestions: {
    include: {
      answer: true
    }
  }
} as const;

type DailySessionRecord = Prisma.DailySessionGetPayload<{
  include: typeof DAILY_SESSION_INCLUDE;
}>;

@Injectable()
export class DailySessionService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly dictionaryService: DictionaryService,
    private readonly aiContentService: AiContentService
  ) {}

  /** Summary: This method gets or lazily creates the current day's learning session for the user. */
  async getTodaySession(userId: string) {
    const existingSession = await this.findLatestActiveSession(userId);
    if (existingSession) {
      return mapDailySession(existingSession);
    }

    const latestTodaySession = await this.findLatestTodaySession(userId);
    if (latestTodaySession) {
      return mapDailySession(latestTodaySession);
    }

    return this.createSessionBatch(userId, 1);
  }

  /** Summary: This method gets the latest unfinished learning batch or creates the next available batch for today. */
  async getCurrentLearningSession(userId: string) {
    const existingSession = await this.findLatestActiveSession(userId);
    if (existingSession) {
      return mapDailySession(existingSession);
    }

    const todaySessions = await this.findTodaySessions(userId);
    const nextBatchIndex = todaySessions.length === 0 ? 1 : todaySessions.at(-1)!.batchIndex + 1;
    return this.createSessionBatch(userId, nextBatchIndex);
  }

  /** Summary: This method continues today's unfinished batch or creates the next same-day batch when all prior ones are complete. */
  async createNextSession(userId: string) {
    const existingSession = await this.findLatestActiveSession(userId);
    if (existingSession) {
      return mapDailySession(existingSession);
    }

    const todaySessions = await this.findTodaySessions(userId);
    const nextBatchIndex = todaySessions.length === 0 ? 1 : todaySessions.at(-1)!.batchIndex + 1;
    return this.createSessionBatch(userId, nextBatchIndex);
  }

  /** Summary: This method transitions today's session into round one without regenerating the snapshot. */
  async startTodaySession(userId: string) {
    const activeSession = await this.findLatestActiveSession(userId);
    if (activeSession && activeSession.status !== 'PENDING') {
      return mapDailySession(activeSession);
    }

    if (!activeSession) {
      const latestTodaySession = await this.findLatestTodaySession(userId);
      if (latestTodaySession) {
        return mapDailySession(latestTodaySession);
      }
    }

    const session = activeSession ? mapDailySession(activeSession) : await this.createSessionBatch(userId, 1);
    await this.prismaService.dailySession.update({
      where: {
        id: session.id
      },
      data: {
        status: 'ROUND_ONE'
      }
    });
    return this.getTodaySession(userId);
  }

  /** Summary: This method returns the article snapshots for the user's current daily session. */
  async getTodayArticles(userId: string) {
    const session = await this.getTodaySession(userId);
    return session.articles;
  }

  /** Summary: This method creates one batch snapshot and article content for the current UTC day. */
  private async createSessionBatch(userId: string, batchIndex: number) {
    const user = await this.prismaService.user.findUnique({
      where: {
        id: userId
      }
    });
    if (!user) {
      throw new NotFoundException('用户不存在。');
    }
    if (!user.activeBookId) {
      throw new NotFoundException('当前用户尚未配置激活词库。');
    }

    const [plan, progress, bookWords] = await Promise.all([
      this.prismaService.studyPlan.findUnique({
        where: {
          userId_bookId: {
            userId,
            bookId: user.activeBookId
          }
        }
      }),
      this.prismaService.userBookProgress.findUnique({
        where: {
          userId_bookId: {
            userId,
            bookId: user.activeBookId
          }
        }
      }),
      this.dictionaryService.getBookWords(userId, user.activeBookId)
    ]);

    if (!plan) {
      throw new NotFoundException('当前词库尚未配置学习计划。');
    }

    const availableWords = bookWords.items;
    const wrongBookEntries = await this.prismaService.wrongBookEntry.findMany({
      where: {
        userId,
        vocabularyItem: {
          bookId: user.activeBookId
        }
      },
      include: {
        vocabularyItem: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const learnedWordIdSet = new Set(normalizeStringArray(progress?.learnedWordIds));
    const prioritizedReviewWordIds = wrongBookEntries.map((entry) => entry.vocabularyItemId);
    const selectedWords = selectDailyWords({
      dailyWordCount: plan.dailyWordCount,
      newWordRatio: plan.newWordRatio,
      reviewWordRatio: plan.reviewWordRatio,
      newWordIds: availableWords.filter((item) => !learnedWordIdSet.has(item.id)).map((item) => item.id),
      reviewWordIds: availableWords.filter((item) => learnedWordIdSet.has(item.id)).map((item) => item.id),
      prioritizedReviewWordIds
    });

    const availableWordById = new Map(availableWords.map((word) => [word.id, word]));
    const selectedWordRecords = selectedWords.map((item) => {
      const vocabularyItem = availableWordById.get(item.wordId)!;
      return {
        id: createId('session-word'),
        vocabularyItemId: vocabularyItem.id,
        type: item.type,
        status: 'PENDING' as const,
        isSelectedUnknown: false,
        reviewAttempts: 0,
        vocabularyItem
      };
    });
    const shuffledSelectedWordRecords = shuffleArray(selectedWordRecords);

    const articles = await this.aiContentService.generateArticles({
      style: plan.articleStyle,
      words: shuffledSelectedWordRecords.map((item) => ({
        id: item.vocabularyItem.id,
        word: item.vocabularyItem.word,
        definitions: item.vocabularyItem.definitions
      }))
    });

    const { start } = createTodayRange();
    const sessionId = createId('session');

    try {
      await this.prismaService.dailySession.create({
        data: {
          id: sessionId,
          userId,
          bookId: user.activeBookId,
          studyPlanId: plan.id,
          sessionDate: start,
          batchIndex,
          status: 'PENDING',
          articleStyle: plan.articleStyle,
          words: {
            create: shuffledSelectedWordRecords.map((item) => ({
              id: item.id,
              vocabularyItemId: item.vocabularyItemId,
              type: item.type,
              status: item.status,
              isSelectedUnknown: item.isSelectedUnknown,
              reviewAttempts: item.reviewAttempts
            }))
          },
          articles: {
            create: articles.map((article, index) => ({
              id: createId('article'),
              title: article.title,
              content: article.content,
              summary: article.summary,
              translation: article.translation,
              coveredWordIds: article.coveredWordIds as unknown as Prisma.InputJsonValue,
              orderIndex: index
            }))
          }
        }
      });
    } catch (error) {
      if (!isUniqueSessionConstraintError(error)) {
        throw error;
      }
    }

    const createdSession = await this.findTodaySessionByBatchIndex(userId, batchIndex);
    if (!createdSession) {
      throw new NotFoundException('今日学习批次创建失败。');
    }
    return mapDailySession(createdSession);
  }

  /** Summary: This method loads all of today's batches ordered from earliest to latest. */
  private findTodaySessions(userId: string) {
    const { start, end } = createTodayRange();
    return this.prismaService.dailySession.findMany({
      where: {
        userId,
        sessionDate: {
          gte: start,
          lt: end
        }
      },
      orderBy: [{ batchIndex: 'asc' }],
      include: DAILY_SESSION_INCLUDE
    });
  }

  /** Summary: This method loads the latest batch for today regardless of completion state so read-only callers can inspect the current day. */
  private findLatestTodaySession(userId: string) {
    const { start, end } = createTodayRange();
    return this.prismaService.dailySession.findFirst({
      where: {
        userId,
        sessionDate: {
          gte: start,
          lt: end
        }
      },
      orderBy: [{ batchIndex: 'desc' }],
      include: DAILY_SESSION_INCLUDE
    });
  }

  /** Summary: This method loads the latest unfinished learning batch for the current UTC day. */
  private findLatestActiveSession(userId: string) {
    const { start, end } = createTodayRange();
    return this.prismaService.dailySession.findFirst({
      where: {
        userId,
        sessionDate: {
          gte: start,
          lt: end
        },
        status: {
          not: 'COMPLETED'
        }
      },
      orderBy: [{ batchIndex: 'desc' }],
      include: DAILY_SESSION_INCLUDE
    });
  }

  /** Summary: This method loads one batch from today so concurrent creators can reuse it after a unique-conflict race. */
  private findTodaySessionByBatchIndex(userId: string, batchIndex: number) {
    const { start, end } = createTodayRange();
    return this.prismaService.dailySession.findFirst({
      where: {
        userId,
        batchIndex,
        sessionDate: {
          gte: start,
          lt: end
        }
      },
      include: DAILY_SESSION_INCLUDE
    });
  }
}

function isUniqueSessionConstraintError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return false;
  }

  const prismaError = error as { code?: string; meta?: { target?: unknown } };
  if (prismaError.code !== 'P2002') {
    return false;
  }

  const target = Array.isArray(prismaError.meta?.target) ? prismaError.meta?.target : [];
  return target.includes('userId') && target.includes('sessionDate') && target.includes('batchIndex');
}

/** Summary: This helper shuffles a list in place-safe form before persistence and article generation. */
function shuffleArray<T>(items: T[]): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

/** Summary: This helper converts one Prisma daily-session aggregate into the response shape used by the frontend. */
function mapDailySession(session: DailySessionRecord) {
  const sortedWords = [...session.words];
  const sortedArticles = [...session.articles].sort((left, right) => left.orderIndex - right.orderIndex);
  const sortedQuestions = [...session.readingQuestions];

  return {
    id: session.id,
    userId: session.userId,
    bookId: session.bookId,
    studyPlanId: session.studyPlanId,
    sessionDate: session.sessionDate.toISOString().slice(0, 10),
    batchIndex: session.batchIndex,
    status: session.status,
    articleStyle: session.articleStyle,
    words: sortedWords.map((word) => {
      const vocabularyItem = mapVocabularyItem(word.vocabularyItem);
      return {
        id: word.id,
        vocabularyItemId: word.vocabularyItemId,
        type: word.type,
        status: word.status,
        isSelectedUnknown: word.isSelectedUnknown,
        reviewAttempts: word.reviewAttempts,
        word: vocabularyItem.word,
        phonetic: vocabularyItem.phonetic,
        definitions: vocabularyItem.definitions,
        senses: vocabularyItem.senses
      };
    }),
    articles: sortedArticles.map((article) => ({
      id: article.id,
      sessionId: article.sessionId,
      title: article.title,
      content: article.content,
      summary: article.summary,
      translation: article.translation,
      coveredWordIds: normalizeStringArray(article.coveredWordIds),
      orderIndex: article.orderIndex
    })),
    reviewRounds: sortedWords
      .filter((word) => word.reviewRound)
      .map((word) => ({
        sessionWordId: word.id,
        choices: normalizeStringArray(word.reviewRound?.choices),
        correctAnswer: word.reviewRound?.correctAnswer ?? '',
        explanation: word.reviewRound?.explanation ?? '',
        currentPhase: (word.reviewRound?.currentPhase ?? 'NOTES') as 'NOTES' | 'QUIZ' | 'PASSED',
        isPassed: word.reviewRound?.isPassed ?? false,
        word: word.vocabularyItem.word,
        phonetic: word.vocabularyItem.phonetic ?? '',
        definitions: normalizeStringArray(word.vocabularyItem.definitions),
        senses: mapVocabularyItem(word.vocabularyItem).senses
      })),
    readingQuestions: sortedQuestions.map((question) => ({
      id: question.id,
      sessionId: question.sessionId,
      sessionWordId: question.sessionWordId,
      prompt: question.prompt,
      options: normalizeStringArray(question.options),
      correctOption: question.correctOption,
      explanation: question.explanation,
      translation: question.translation
    })),
    readingAnswers: sortedQuestions
      .filter((question) => question.answer)
      .map((question) => ({
        questionId: question.answer?.questionId ?? question.id,
        sessionWordId: question.answer?.sessionWordId ?? question.sessionWordId,
        selectedOption: question.answer?.selectedOption ?? '',
        isCorrect: question.answer?.isCorrect ?? false
      }))
  };
}
