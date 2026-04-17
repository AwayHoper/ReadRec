import { Injectable, NotFoundException } from '@nestjs/common';
import { createTodayRange, normalizeStringArray } from '../../common/prisma/prisma-mappers.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';

type DashboardSessionRecord = {
  id: string;
  sessionDate: Date;
  batchIndex: number;
  status: string;
  words: Array<{
    vocabularyItemId: string;
  }>;
};

type DashboardHomeResponse = {
  activeBook: {
    id: string;
    key: string;
    title: string;
    description: string;
    totalWordCount: number;
    learnedCount: number;
    reviewedCount: number;
  } | null;
  plan: {
    id: string;
    userId: string;
    bookId: string;
    dailyWordCount: number;
    newWordRatio: number;
    reviewWordRatio: number;
    articleStyle: 'EXAM' | 'NEWS' | 'TED';
  } | null;
  today: {
    date: string;
    state: 'pending' | 'completed';
    target: {
      newCount: number;
      reviewCount: number;
      totalCount: number;
    };
    learnedUniqueWordCount: number;
    completedBatchCount: number;
  };
  cta: {
    mode: 'start' | 'continue';
    label: string;
  };
  mastery: {
    familiarCount: number;
    fuzzyCount: number;
    unseenCount: number;
    totalWordCount: number;
  };
  streaks: {
    calendar: Array<{
      date: string;
      completed: boolean;
      completedBatchCount: number;
      learnedUniqueWordCount: number;
      intensity: 'none' | 'low' | 'medium' | 'high';
    }>;
    totalDays: number;
    currentStreakDays: number;
    remainingDays: number | null;
    estimatedFinishDate: string | null;
  };
  encouragement: {
    tone: 'encourage' | 'praise' | 'celebrate';
    message: string;
  };
  history: {
    lastCompletedDate: string | null;
    lastCompletedBatchWordCount: number;
    activeBookTitle: string | null;
  };
};

@Injectable()
export class DashboardService {
  constructor(private readonly prismaService: PrismaService) {}

  /** Summary: This method aggregates homepage data for the user's active book from persisted state. */
  async getHome(userId: string): Promise<DashboardHomeResponse> {
    const user = await this.prismaService.user.findUnique({
      where: {
        id: userId
      }
    });

    if (!user) {
      throw new NotFoundException('用户不存在。');
    }

    if (!user.activeBookId) {
      return this.buildEmptyHome();
    }

    const [book, plan, progress, sessions] = await Promise.all([
      this.prismaService.vocabularyBook.findUnique({
        where: {
          id: user.activeBookId
        },
        include: {
          _count: {
            select: {
              words: true
            }
          }
        }
      }),
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
      this.prismaService.dailySession.findMany({
        where: {
          userId,
          bookId: user.activeBookId
        },
        include: {
          words: {
            select: {
              vocabularyItemId: true
            }
          }
        },
        orderBy: [
          {
            sessionDate: 'desc'
          },
          {
            batchIndex: 'desc'
          }
        ]
      })
    ]);

    const learnedWordIds = new Set(normalizeStringArray(progress?.learnedWordIds));
    const reviewedWordIds = new Set(normalizeStringArray(progress?.reviewedWordIds));
    const familiarWordIds = new Set([...reviewedWordIds].filter((wordId) => learnedWordIds.has(wordId)));
    const fuzzyWordIds = new Set([...learnedWordIds].filter((wordId) => !familiarWordIds.has(wordId)));
    const totalWordCount = book?._count.words ?? 0;
    const todayDate = createTodayRange().start.toISOString().slice(0, 10);
    const todayTarget = buildTodayTarget(plan);
    const completedSessions = sessions.filter((session) => session.status === 'COMPLETED');
    const todayCompletedSessions = completedSessions.filter((session) => isDateWithinToday(session.sessionDate));
    const todayLearnedWordIds = new Set(todayCompletedSessions.flatMap((session) => session.words.map((word) => word.vocabularyItemId)));
    const todayState = todayCompletedSessions.length > 0 ? 'completed' : 'pending';
    const completedDays = buildCompletedDayStats(completedSessions);
    const lastCompletedSession = [...completedSessions].sort(compareSessionsByRecency)[0] ?? null;
    const currentStreakDays = calculateCurrentStreakDays(completedDays);
    const remainingNewWordCount = Math.max(0, totalWordCount - learnedWordIds.size);
    const remainingDays = plan ? calculateRemainingDays(remainingNewWordCount, todayTarget.newCount) : null;
    const estimatedFinishDate = remainingDays === null ? null : offsetUtcDateString(remainingDays);

    return {
      activeBook: book ? {
        id: book.id,
        key: book.key,
        title: book.title,
        description: book.description,
        totalWordCount,
        learnedCount: learnedWordIds.size,
        reviewedCount: familiarWordIds.size
      } : null,
      plan: plan ? {
        id: plan.id,
        userId: plan.userId,
        bookId: plan.bookId,
        dailyWordCount: plan.dailyWordCount,
        newWordRatio: plan.newWordRatio,
        reviewWordRatio: plan.reviewWordRatio,
        articleStyle: plan.articleStyle
      } : null,
      today: {
        date: todayDate,
        state: todayState,
        target: todayTarget,
        learnedUniqueWordCount: todayLearnedWordIds.size,
        completedBatchCount: todayCompletedSessions.length
      },
      cta: {
        mode: todayCompletedSessions.length > 0 ? 'continue' : 'start',
        label: todayCompletedSessions.length > 0 ? '再学一轮' : '开始今日学习'
      },
      mastery: {
        familiarCount: familiarWordIds.size,
        fuzzyCount: fuzzyWordIds.size,
        unseenCount: Math.max(0, totalWordCount - learnedWordIds.size),
        totalWordCount
      },
      streaks: {
        calendar: buildCalendar(completedDays, plan?.dailyWordCount ?? null),
        totalDays: completedDays.size,
        currentStreakDays,
        remainingDays,
        estimatedFinishDate
      },
      encouragement: buildEncouragement(todayCompletedSessions.length),
      history: {
        lastCompletedDate: lastCompletedSession ? lastCompletedSession.sessionDate.toISOString().slice(0, 10) : null,
        lastCompletedBatchWordCount: lastCompletedSession?.words.length ?? 0,
        activeBookTitle: book?.title ?? null
      }
    };
  }

  private buildEmptyHome(): DashboardHomeResponse {
    return {
      activeBook: null,
      plan: null,
      today: {
        date: createTodayRange().start.toISOString().slice(0, 10),
        state: 'pending',
        target: {
          newCount: 0,
          reviewCount: 0,
          totalCount: 0
        },
        learnedUniqueWordCount: 0,
        completedBatchCount: 0
      },
      cta: {
        mode: 'start',
        label: '开始今日学习'
      },
      mastery: {
        familiarCount: 0,
        fuzzyCount: 0,
        unseenCount: 0,
        totalWordCount: 0
      },
      streaks: {
        calendar: buildCalendar(new Map(), null),
        totalDays: 0,
        currentStreakDays: 0,
        remainingDays: null,
        estimatedFinishDate: null
      },
      encouragement: buildEncouragement(0),
      history: {
        lastCompletedDate: null,
        lastCompletedBatchWordCount: 0,
        activeBookTitle: null
      }
    };
  }
}

function buildTodayTarget(plan: {
  dailyWordCount: number;
  newWordRatio: number;
  reviewWordRatio: number;
} | null) {
  if (!plan) {
    return {
      newCount: 0,
      reviewCount: 0,
      totalCount: 0
    };
  }

  const ratioTotal = plan.newWordRatio + plan.reviewWordRatio;
  const newCount = ratioTotal === 0 ? 0 : Math.round((plan.dailyWordCount * plan.newWordRatio) / ratioTotal);
  return {
    newCount,
    reviewCount: Math.max(0, plan.dailyWordCount - newCount),
    totalCount: plan.dailyWordCount
  };
}

function buildCompletedDayStats(sessions: DashboardSessionRecord[]) {
  const dayStats = new Map<string, {
    completedBatchCount: number;
    learnedWordIds: Set<string>;
  }>();

  for (const session of sessions) {
    const date = session.sessionDate.toISOString().slice(0, 10);
    const existing = dayStats.get(date) ?? {
      completedBatchCount: 0,
      learnedWordIds: new Set<string>()
    };
    existing.completedBatchCount += 1;
    for (const word of session.words) {
      existing.learnedWordIds.add(word.vocabularyItemId);
    }
    dayStats.set(date, existing);
  }

  return dayStats;
}

function calculateCurrentStreakDays(dayStats: Map<string, { completedBatchCount: number; learnedWordIds: Set<string> }>) {
  const { start } = createTodayRange();
  let cursor = new Date(start);
  let streakDays = 0;

  if (!dayStats.has(cursor.toISOString().slice(0, 10))) {
    return 0;
  }

  while (dayStats.has(cursor.toISOString().slice(0, 10))) {
    streakDays += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return streakDays;
}

function buildCalendar(
  dayStats: Map<string, { completedBatchCount: number; learnedWordIds: Set<string> }>,
  dailyWordCount: number | null
) {
  return Array.from({ length: 14 }, (_, index) => {
    const dayOffset = index - 13;
    const date = offsetUtcDateString(dayOffset);
    const stats = dayStats.get(date);
    const learnedUniqueWordCount = stats?.learnedWordIds.size ?? 0;

    return {
      date,
      completed: Boolean(stats),
      completedBatchCount: stats?.completedBatchCount ?? 0,
      learnedUniqueWordCount,
      intensity: calculateCalendarIntensity(learnedUniqueWordCount, dailyWordCount)
    };
  });
}

function calculateCalendarIntensity(learnedUniqueWordCount: number, dailyWordCount: number | null) {
  if (learnedUniqueWordCount === 0) {
    return 'none' as const;
  }

  if (!dailyWordCount || learnedUniqueWordCount < dailyWordCount) {
    return 'low' as const;
  }

  if (learnedUniqueWordCount < dailyWordCount * 2) {
    return 'medium' as const;
  }

  return 'high' as const;
}

function buildEncouragement(completedBatchCount: number) {
  if (completedBatchCount >= 2) {
    return {
      tone: 'celebrate' as const,
      message: '今天已经超额完成，状态很棒，继续保持这个节奏。'
    };
  }

  if (completedBatchCount === 1) {
    return {
      tone: 'praise' as const,
      message: '今天首轮学习已完成，干得漂亮，再接再厉。'
    };
  }

  return {
    tone: 'encourage' as const,
    message: '今天还没完成首轮，先开始一批，稳稳推进就好。'
  };
}

function isDateWithinToday(value: Date) {
  const { start, end } = createTodayRange();
  return value >= start && value < end;
}

function calculateRemainingDays(remainingWordCount: number, dailyNewWordCount: number) {
  if (remainingWordCount <= 0) {
    return 0;
  }

  if (dailyNewWordCount <= 0) {
    return null;
  }

  return Math.ceil(remainingWordCount / dailyNewWordCount);
}

function offsetUtcDateString(dayOffset: number) {
  const { start } = createTodayRange();
  const shifted = new Date(start);
  shifted.setUTCDate(shifted.getUTCDate() + dayOffset);
  return shifted.toISOString().slice(0, 10);
}

function compareSessionsByRecency(left: DashboardSessionRecord, right: DashboardSessionRecord) {
  const sessionTimeDelta = right.sessionDate.getTime() - left.sessionDate.getTime();
  if (sessionTimeDelta !== 0) {
    return sessionTimeDelta;
  }
  return right.batchIndex - left.batchIndex;
}
