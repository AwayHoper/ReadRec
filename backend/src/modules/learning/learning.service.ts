import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createTodayRange, mapVocabularyItem, normalizeStringArray } from '../../common/prisma/prisma-mappers.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { createId } from '../../common/utils/id.util.js';
import { AiContentService } from '../ai-content/ai-content.service.js';
import { evaluateReviewAnswer } from './domain/review-progress.js';

const LEARNING_SESSION_INCLUDE = {
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

type LearningSessionRecord = Prisma.DailySessionGetPayload<{
  include: typeof LEARNING_SESSION_INCLUDE;
}>;

@Injectable()
export class LearningService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly aiContentService: AiContentService
  ) {}

  /** Summary: This method saves round-one selections and prepares the review-round state. */
  async submitArticleSelections(userId: string, articleId: string, sessionWordIds: string[]) {
    const session = await this.getTodaySessionForUser(userId);
    const article = session.articles.find((item) => item.id === articleId);
    if (!article) {
      throw new NotFoundException('文章不存在。');
    }

    const coveredWords = session.words.filter((word) => normalizeStringArray(article.coveredWordIds).includes(word.vocabularyItemId));

    for (const word of coveredWords) {
      const isUnknown = sessionWordIds.includes(word.id);
      await this.prismaService.dailySessionWord.update({
        where: {
          id: word.id
        },
        data: {
          isSelectedUnknown: word.isSelectedUnknown || isUnknown,
          status: isUnknown ? 'NEEDS_REVIEW' : 'PASSED_ROUND_ONE'
        }
      });
    }

    await this.prismaService.articleUnknownWordSelection.deleteMany({
      where: {
        articleId
      }
    });
    if (sessionWordIds.length > 0) {
      await this.prismaService.articleUnknownWordSelection.createMany({
        data: sessionWordIds.map((sessionWordId) => ({
          id: createId('selection'),
          articleId,
          sessionWordId
        }))
      });
    }

    const refreshedSession = await this.getSessionById(session.id);
    const reviewCandidates = refreshedSession.words.filter((word) => word.isSelectedUnknown);
    for (const word of reviewCandidates) {
      const vocabularyItem = mapVocabularyItem(word.vocabularyItem);
      await this.prismaService.wordReviewRound.upsert({
        where: {
          sessionWordId: word.id
        },
        update: {
          choices: [vocabularyItem.definitions[0] ?? '正确释义', '错误释义 A', '错误释义 B', '错误释义 C'],
          correctAnswer: vocabularyItem.definitions[0] ?? '正确释义',
          explanation: `${vocabularyItem.word} 在本文语境中对应其基础释义。`,
          currentPhase: 'NOTES',
          isPassed: false
        },
        create: {
          id: createId('review'),
          sessionWordId: word.id,
          choices: [vocabularyItem.definitions[0] ?? '正确释义', '错误释义 A', '错误释义 B', '错误释义 C'],
          correctAnswer: vocabularyItem.definitions[0] ?? '正确释义',
          explanation: `${vocabularyItem.word} 在本文语境中对应其基础释义。`,
          currentPhase: 'NOTES',
          isPassed: false
        }
      });
    }

    await this.prismaService.dailySession.update({
      where: {
        id: refreshedSession.id
      },
      data: {
        status: reviewCandidates.length === 0 ? 'ROUND_THREE' : 'ROUND_TWO'
      }
    });

    if (reviewCandidates.length === 0) {
      await this.ensureReadingQuestions(refreshedSession.id);
    }

    return this.loadSessionResponse(refreshedSession.id);
  }

  /** Summary: This method returns the current review-round state for today's session. */
  async getReviewRound(userId: string) {
    const session = await this.loadCurrentSessionResponse(userId);
    return {
      sessionId: session.id,
      status: session.status,
      rounds: session.reviewRounds
    };
  }

  /** Summary: This method evaluates one review answer and unlocks round three when all words pass. */
  async checkReviewAnswer(userId: string, sessionWordId: string, selectedOption: string) {
    const session = await this.getTodaySessionForUser(userId);
    const sessionWord = session.words.find((item) => item.id === sessionWordId);
    const reviewRound = sessionWord?.reviewRound;
    if (!reviewRound || !sessionWord) {
      throw new NotFoundException('复习单词不存在。');
    }

    const evaluation = evaluateReviewAnswer({
      selectedOption,
      correctOption: reviewRound.correctAnswer,
      currentAttempts: sessionWord.reviewAttempts
    });

    await this.prismaService.$transaction([
      this.prismaService.dailySessionWord.update({
        where: {
          id: sessionWordId
        },
        data: {
          reviewAttempts: evaluation.attempts,
          status: evaluation.isPassed ? 'PASSED_ROUND_TWO' : 'NEEDS_REVIEW'
        }
      }),
      this.prismaService.wordReviewRound.update({
        where: {
          sessionWordId
        },
        data: {
          currentPhase: evaluation.nextPhase,
          isPassed: evaluation.isPassed
        }
      })
    ]);

    const refreshedSession = await this.getSessionById(session.id);
    const allPassed = refreshedSession.words
      .filter((word) => word.isSelectedUnknown)
      .every((word) => word.reviewRound?.isPassed);

    if (allPassed) {
      await this.ensureReadingQuestions(refreshedSession.id);
      await this.prismaService.dailySession.update({
        where: {
          id: refreshedSession.id
        },
        data: {
          status: 'ROUND_THREE'
        }
      });
    }

    return this.loadSessionResponse(refreshedSession.id);
  }

  /** Summary: This method returns the generated round-three reading questions for today's session. */
  async getReadingQuestions(userId: string) {
    const session = await this.loadCurrentSessionResponse(userId);
    return session.readingQuestions;
  }

  /** Summary: This method records one reading-question answer for the current session. */
  async answerReadingQuestion(userId: string, questionId: string, selectedOption: string) {
    const session = await this.getTodaySessionForUser(userId);
    const question = session.readingQuestions.find((item) => item.id === questionId);
    if (!question) {
      throw new NotFoundException('阅读题不存在。');
    }

    const answer = await this.prismaService.readingAnswer.upsert({
      where: {
        questionId
      },
      update: {
        selectedOption,
        isCorrect: selectedOption === question.correctOption
      },
      create: {
        id: createId('answer'),
        questionId,
        sessionWordId: question.sessionWordId,
        selectedOption,
        isCorrect: selectedOption === question.correctOption
      }
    });

    const answerCount = await this.prismaService.readingAnswer.count({
      where: {
        question: {
          sessionId: session.id
        }
      }
    });

    if (answerCount === session.readingQuestions.length) {
      await this.prismaService.dailySessionWord.updateMany({
        where: {
          sessionId: session.id,
          id: {
            in: session.readingQuestions.map((item) => item.sessionWordId)
          }
        },
        data: {
          status: 'PASSED_ROUND_THREE'
        }
      });
    }

    return {
      questionId: answer.questionId,
      sessionWordId: answer.sessionWordId,
      selectedOption: answer.selectedOption,
      isCorrect: answer.isCorrect
    };
  }

  /** Summary: This method completes today's learning flow and returns a summary payload. */
  async completeLearning(userId: string) {
    const session = await this.getTodaySessionForUser(userId);
    const progress = await this.prismaService.userBookProgress.findUnique({
      where: {
        userId_bookId: {
          userId,
          bookId: session.bookId
        }
      }
    });

    const learnedWordIds = new Set(Array.isArray(progress?.learnedWordIds) ? progress.learnedWordIds : []);
    const reviewedWordIds = new Set(Array.isArray(progress?.reviewedWordIds) ? progress.reviewedWordIds : []);
    session.words.forEach((word) => {
      learnedWordIds.add(word.vocabularyItemId);
      reviewedWordIds.add(word.vocabularyItemId);
    });

    await this.prismaService.$transaction([
      this.prismaService.dailySession.update({
        where: {
          id: session.id
        },
        data: {
          status: 'COMPLETED'
        }
      }),
      this.prismaService.userBookProgress.upsert({
        where: {
          userId_bookId: {
            userId,
            bookId: session.bookId
          }
        },
        update: {
          learnedWordIds: Array.from(learnedWordIds),
          reviewedWordIds: Array.from(reviewedWordIds)
        },
        create: {
          userId,
          bookId: session.bookId,
          learnedWordIds: Array.from(learnedWordIds),
          reviewedWordIds: Array.from(reviewedWordIds),
          flaggedWordIds: []
        }
      })
    ]);

    const responseSession = await this.loadSessionResponse(session.id);
    return {
      session: responseSession,
      words: responseSession.words.map((word) => ({
        sessionWordId: word.id,
        wordId: word.vocabularyItemId,
        word: word.word,
        definitions: word.definitions,
        selectedUnknown: word.isSelectedUnknown
      }))
    };
  }

  /** Summary: This method returns the current unfinished learning batch for the given user. */
  private async getTodaySessionForUser(userId: string) {
    const { start, end } = createTodayRange();
    const session = await this.prismaService.dailySession.findFirst({
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
      include: LEARNING_SESSION_INCLUDE
    });
    if (!session) {
      throw new NotFoundException('当前没有可继续的学习批次。');
    }
    return session;
  }

  /** Summary: This method loads one persisted session aggregate by id. */
  private async getSessionById(sessionId: string) {
    const session = await this.prismaService.dailySession.findUnique({
      where: {
        id: sessionId
      },
      include: LEARNING_SESSION_INCLUDE
    });
    if (!session) {
      throw new NotFoundException('学习批次不存在。');
    }
    return session;
  }

  /** Summary: This method returns the frontend-facing daily-session response shape for the current active user batch. */
  private async loadCurrentSessionResponse(userId: string) {
    return mapLearningSession(await this.getTodaySessionForUser(userId));
  }

  /** Summary: This method returns the frontend-facing daily-session response shape for one persisted batch id. */
  private async loadSessionResponse(sessionId: string) {
    return mapLearningSession(await this.getSessionById(sessionId));
  }

  /** Summary: This method generates the round-three reading questions once the review round is finished. */
  private async ensureReadingQuestions(sessionId: string) {
    const session = await this.prismaService.dailySession.findUnique({
      where: {
        id: sessionId
      },
      include: {
        words: {
          include: {
            vocabularyItem: true
          }
        },
        articles: true,
        readingQuestions: true
      }
    });
    if (!session || session.readingQuestions.length > 0) {
      return;
    }

    const selectedWords = session.words.filter((word) => word.isSelectedUnknown);
    if (selectedWords.length === 0) {
      return;
    }

    const firstArticle = [...session.articles].sort((left, right) => left.orderIndex - right.orderIndex)[0];
    const questionDrafts = await this.aiContentService.generateReadingQuestions({
      articleTitle: firstArticle.title,
      articleContent: firstArticle.content,
      words: selectedWords.map((word) => ({
        sessionWordId: word.id,
        word: word.vocabularyItem.word,
        definitions: normalizeStringArray(word.vocabularyItem.definitions)
      }))
    });

    await this.prismaService.readingQuestion.createMany({
      data: questionDrafts.map((item) => ({
        id: createId('question'),
        sessionId,
        sessionWordId: item.sessionWordId,
        prompt: item.prompt,
        options: item.options as unknown as Prisma.InputJsonValue,
        correctOption: item.correctOption,
        explanation: item.explanation,
        translation: item.translation
      }))
    });
  }
}

/** Summary: This helper converts one persisted learning-session aggregate into the frontend response shape. */
function mapLearningSession(session: LearningSessionRecord) {
  const words = session.words.map((item) => ({
    id: item.id,
    vocabularyItemId: item.vocabularyItemId,
    type: item.type,
    status: item.status,
    isSelectedUnknown: item.isSelectedUnknown,
    reviewAttempts: item.reviewAttempts,
    word: item.vocabularyItem.word,
    phonetic: item.vocabularyItem.phonetic ?? '',
    partOfSpeech: item.vocabularyItem.partOfSpeech ?? '',
    definitions: normalizeStringArray(item.vocabularyItem.definitions),
    senses: mapVocabularyItem(item.vocabularyItem).senses,
    examples: normalizeStringArray(item.vocabularyItem.examples)
  }));

  return {
    id: session.id,
    userId: session.userId,
    bookId: session.bookId,
    studyPlanId: session.studyPlanId,
    sessionDate: session.sessionDate.toISOString().slice(0, 10),
    batchIndex: session.batchIndex,
    status: session.status,
    articleStyle: session.articleStyle,
    words,
    articles: [...session.articles]
      .sort((left, right) => left.orderIndex - right.orderIndex)
      .map((article) => ({
        id: article.id,
        sessionId: article.sessionId,
        title: article.title,
        content: article.content,
        summary: article.summary,
        translation: article.translation,
        coveredWordIds: normalizeStringArray(article.coveredWordIds),
        orderIndex: article.orderIndex
      })),
    reviewRounds: session.words
      .filter((item) => item.reviewRound)
      .map((item) => ({
        sessionWordId: item.id,
        choices: normalizeStringArray(item.reviewRound?.choices),
        correctAnswer: item.reviewRound?.correctAnswer ?? '',
        explanation: item.reviewRound?.explanation ?? '',
        currentPhase: (item.reviewRound?.currentPhase ?? 'NOTES') as 'NOTES' | 'QUIZ' | 'PASSED',
        isPassed: item.reviewRound?.isPassed ?? false,
        word: item.vocabularyItem.word,
        phonetic: item.vocabularyItem.phonetic ?? '',
        definitions: normalizeStringArray(item.vocabularyItem.definitions)
      })),
    readingQuestions: session.readingQuestions.map((item) => ({
      id: item.id,
      sessionId: item.sessionId,
      sessionWordId: item.sessionWordId,
      prompt: item.prompt,
      options: normalizeStringArray(item.options),
      correctOption: item.correctOption,
      explanation: item.explanation,
      translation: item.translation
    })),
    readingAnswers: session.readingQuestions
      .filter((item) => item.answer)
      .map((item) => ({
        questionId: item.answer?.questionId ?? item.id,
        sessionWordId: item.answer?.sessionWordId ?? item.sessionWordId,
        selectedOption: item.answer?.selectedOption ?? '',
        isCorrect: item.answer?.isCorrect ?? false
      }))
  };
}
