import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createTodayRange, mapVocabularyItem, normalizeStringArray } from '../../common/prisma/prisma-mappers.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { createId } from '../../common/utils/id.util.js';
import { AiContentService } from '../ai-content/ai-content.service.js';
import { DictionaryService } from '../dictionary/dictionary.service.js';
import { selectDailyWords } from './domain/daily-session-selector.js';

@Injectable()
export class DailySessionService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly dictionaryService: DictionaryService,
    private readonly aiContentService: AiContentService
  ) {}

  /** Summary: This method gets or lazily creates the current day's learning session for the user. */
  async getTodaySession(userId: string) {
    const existingSession = await this.findTodaySession(userId);
    if (existingSession) {
      return mapDailySession(existingSession);
    }
    return this.createTodaySession(userId);
  }

  /** Summary: This method transitions today's session into round one without regenerating the snapshot. */
  async startTodaySession(userId: string) {
    const session = await this.getTodaySession(userId);
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

  /** Summary: This method creates the current day's session snapshot and article content. */
  private async createTodaySession(userId: string) {
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

    const learnedWordIds = normalizeStringArray(progress?.learnedWordIds);
    const flaggedWordIds = normalizeStringArray(progress?.flaggedWordIds);
    const selectedWords = selectDailyWords({
      dailyWordCount: plan.dailyWordCount,
      newWordRatio: plan.newWordRatio,
      reviewWordRatio: plan.reviewWordRatio,
      newWordIds: bookWords.filter((item) => !learnedWordIds.includes(item.id)).map((item) => item.id),
      reviewWordIds: bookWords.filter((item) => learnedWordIds.includes(item.id)).map((item) => item.id),
      flaggedReviewWordIds: flaggedWordIds
    });

    const selectedWordRecords = selectedWords.map((item) => {
      const vocabularyItem = bookWords.find((word) => word.id === item.wordId)!;
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

    const articles = await this.aiContentService.generateArticles({
      style: plan.articleStyle,
      words: selectedWordRecords.map((item) => ({
        id: item.vocabularyItem.id,
        word: item.vocabularyItem.word,
        definitions: item.vocabularyItem.definitions
      }))
    });

    const { start } = createTodayRange();
    const sessionId = createId('session');

    await this.prismaService.dailySession.create({
      data: {
        id: sessionId,
        userId,
        bookId: user.activeBookId,
        studyPlanId: plan.id,
        sessionDate: start,
        status: 'PENDING',
        articleStyle: plan.articleStyle,
        words: {
          create: selectedWordRecords.map((item) => ({
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

    const createdSession = await this.findTodaySession(userId);
    if (!createdSession) {
      throw new NotFoundException('今日学习创建失败。');
    }
    return mapDailySession(createdSession);
  }

  /** Summary: This method loads the current day's session with all child snapshots needed by the learning flow. */
  private findTodaySession(userId: string) {
    const { start, end } = createTodayRange();
    return this.prismaService.dailySession.findFirst({
      where: {
        userId,
        sessionDate: {
          gte: start,
          lt: end
        }
      },
      include: {
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
      }
    });
  }
}

/** Summary: This helper converts one Prisma daily-session aggregate into the response shape used by the frontend. */
function mapDailySession(session: Prisma.DailySessionGetPayload<{
  include: {
    words: {
      include: {
        vocabularyItem: true;
        reviewRound: true;
      };
    };
    articles: true;
    readingQuestions: {
      include: {
        answer: true;
      };
    };
  };
}>) {
  const sortedWords = [...session.words];
  const sortedArticles = [...session.articles].sort((left, right) => left.orderIndex - right.orderIndex);
  const sortedQuestions = [...session.readingQuestions];

  return {
    id: session.id,
    userId: session.userId,
    bookId: session.bookId,
    studyPlanId: session.studyPlanId,
    sessionDate: session.sessionDate.toISOString().slice(0, 10),
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
