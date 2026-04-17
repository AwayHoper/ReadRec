import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { createTodayRange } from '../src/common/prisma/prisma-mappers.js';
import { DashboardService } from '../src/modules/dashboard/dashboard.service.js';

describe('DashboardService.getHome', function runDashboardServiceSuite() {
  it('returns pending status with first-batch targets before any completed batch exists', async function verifyPendingHomeSummary() {
    const service = new DashboardService(createDashboardPrismaStub());

    const result = await service.getHome('user-1');

    expect(result.today.state).toBe('pending');
    expect(result.today.target).toEqual({
      newCount: 10,
      reviewCount: 5,
      totalCount: 15
    });
    expect(result.today.learnedUniqueWordCount).toBe(0);
    expect(result.today.completedBatchCount).toBe(0);
    expect(result.cta.mode).toBe('start');
    expect(result.encouragement.tone).toBe('encourage');
  });

  it('returns completed status and celebrate copy after two completed batches without regressing because of a later unfinished batch', async function verifyCelebrateSummary() {
    const service = new DashboardService(createDashboardPrismaStub({
      sessions: [
        createSessionRecord({
          id: 'session-1',
          batchIndex: 1,
          status: 'COMPLETED',
          vocabularyItemIds: ['w1', 'w2', 'w3']
        }),
        createSessionRecord({
          id: 'session-2',
          batchIndex: 2,
          status: 'COMPLETED',
          vocabularyItemIds: ['w3', 'w4']
        }),
        createSessionRecord({
          id: 'session-3',
          batchIndex: 3,
          status: 'ROUND_ONE',
          vocabularyItemIds: ['w5', 'w6']
        })
      ]
    }));

    const result = await service.getHome('user-1');

    expect(result.today.state).toBe('completed');
    expect(result.today.learnedUniqueWordCount).toBe(4);
    expect(result.today.completedBatchCount).toBe(2);
    expect(result.encouragement.tone).toBe('celebrate');
    expect(result.cta.mode).toBe('continue');
  });

  it('maps reviewed, learned-only, and unseen words into mastery buckets', async function verifyMasteryBuckets() {
    const service = new DashboardService(createDashboardPrismaStub({
      progress: {
        userId: 'user-1',
        bookId: 'book-1',
        learnedWordIds: ['w1', 'w2', 'w3', 'w4'],
        reviewedWordIds: ['w2', 'w4'],
        flaggedWordIds: []
      },
      totalWordCount: 10
    }));

    const result = await service.getHome('user-1');

    expect(result.mastery).toMatchObject({
      familiarCount: 2,
      fuzzyCount: 2,
      unseenCount: 6,
      totalWordCount: 10
    });
  });

  it('calculates streak totals, consecutive streak depth, remaining days, and finish date from completed days', async function verifyStreakSummary() {
    const service = new DashboardService(createDashboardPrismaStub({
      progress: {
        userId: 'user-1',
        bookId: 'book-1',
        learnedWordIds: ['w1', 'w2', 'w3', 'w4'],
        reviewedWordIds: ['w1'],
        flaggedWordIds: []
      },
      totalWordCount: 10,
      plan: {
        id: 'plan-1',
        userId: 'user-1',
        bookId: 'book-1',
        dailyWordCount: 6,
        newWordRatio: 1,
        reviewWordRatio: 2,
        articleStyle: 'NEWS'
      },
      sessions: [
        createSessionRecord({
          id: 'session-today',
          batchIndex: 1,
          status: 'COMPLETED',
          vocabularyItemIds: ['w1', 'w2'],
          sessionDate: offsetUtcDay(0)
        }),
        createSessionRecord({
          id: 'session-yesterday',
          batchIndex: 1,
          status: 'COMPLETED',
          vocabularyItemIds: ['w3'],
          sessionDate: offsetUtcDay(-1)
        }),
        createSessionRecord({
          id: 'session-two-days-ago',
          batchIndex: 1,
          status: 'COMPLETED',
          vocabularyItemIds: ['w4'],
          sessionDate: offsetUtcDay(-2)
        }),
        createSessionRecord({
          id: 'session-four-days-ago',
          batchIndex: 1,
          status: 'COMPLETED',
          vocabularyItemIds: ['w5'],
          sessionDate: offsetUtcDay(-4)
        })
      ]
    }));

    const result = await service.getHome('user-1');

    expect(result.streaks.totalDays).toBe(4);
    expect(result.streaks.currentStreakDays).toBe(3);
    expect(result.streaks.remainingDays).toBe(3);
    expect(result.streaks.estimatedFinishDate).toBe(offsetUtcDateString(3));
    expect(result.streaks.calendar.some((item) => item.date === offsetUtcDateString(-3) && item.completed)).toBe(false);
  });

  it('returns a zero current streak when today has no completed learning even if recent prior days were completed', async function verifyCurrentStreakRequiresTodayCompletion() {
    const service = new DashboardService(createDashboardPrismaStub({
      sessions: [
        createSessionRecord({
          id: 'session-pending-today',
          batchIndex: 1,
          status: 'ROUND_ONE',
          vocabularyItemIds: ['w1', 'w2'],
          sessionDate: offsetUtcDay(0)
        }),
        createSessionRecord({
          id: 'session-yesterday',
          batchIndex: 1,
          status: 'COMPLETED',
          vocabularyItemIds: ['w3'],
          sessionDate: offsetUtcDay(-1)
        }),
        createSessionRecord({
          id: 'session-two-days-ago',
          batchIndex: 1,
          status: 'COMPLETED',
          vocabularyItemIds: ['w4'],
          sessionDate: offsetUtcDay(-2)
        })
      ]
    }));

    const result = await service.getHome('user-1');

    expect(result.today.state).toBe('pending');
    expect(result.streaks.totalDays).toBe(2);
    expect(result.streaks.currentStreakDays).toBe(0);
  });

  it('reads aggregate inputs through a transaction and uses targeted completed-session queries', async function verifyTargetedSnapshotReads() {
    const prismaService = createDashboardPrismaStub({
      sessions: [
        createSessionRecord({
          id: 'session-today-completed',
          batchIndex: 1,
          status: 'COMPLETED',
          vocabularyItemIds: ['w1', 'w2'],
          sessionDate: offsetUtcDay(0)
        }),
        createSessionRecord({
          id: 'session-yesterday-completed',
          batchIndex: 1,
          status: 'COMPLETED',
          vocabularyItemIds: ['w3'],
          sessionDate: offsetUtcDay(-1)
        }),
        createSessionRecord({
          id: 'session-today-pending',
          batchIndex: 2,
          status: 'ROUND_ONE',
          vocabularyItemIds: ['w4'],
          sessionDate: offsetUtcDay(0)
        })
      ]
    });
    const service = new DashboardService(prismaService);

    await service.getHome('user-1');

    expect(prismaService.$transaction).toHaveBeenCalledTimes(1);
    expect(prismaService.$transaction.mock.calls[0]?.[1]).toMatchObject({
      isolationLevel: 'RepeatableRead'
    });
    expect(prismaService.dailySession.findMany).toHaveBeenCalledTimes(3);
    expect(prismaService.dailySession.findFirst).toHaveBeenCalledTimes(1);

    const todayCompletedQuery = prismaService.dailySession.findMany.mock.calls.find((call) => call[0]?.where?.sessionDate?.gte);
    expect(todayCompletedQuery?.[0]).toMatchObject({
      where: {
        userId: 'user-1',
        bookId: 'book-1',
        status: 'COMPLETED'
      }
    });

    const recentCalendarQuery = prismaService.dailySession.findMany.mock.calls.find((call) =>
      call[0]?.where?.sessionDate?.gte && call[0]?.where?.sessionDate?.lt && !call[0]?.include && call[0]?.select?.words
    );
    expect(recentCalendarQuery?.[0]).toMatchObject({
      where: {
        userId: 'user-1',
        bookId: 'book-1',
        status: 'COMPLETED'
      },
      select: {
        sessionDate: true,
        words: {
          select: {
            vocabularyItemId: true
          }
        }
      }
    });

    const distinctDaysQuery = prismaService.dailySession.findMany.mock.calls.find((call) => call[0]?.distinct?.includes('sessionDate'));
    expect(distinctDaysQuery?.[0]).toMatchObject({
      where: {
        userId: 'user-1',
        bookId: 'book-1',
        status: 'COMPLETED'
      },
      distinct: ['sessionDate'],
      select: {
        sessionDate: true
      }
    });
    expect(distinctDaysQuery?.[0]?.select?.words).toBeUndefined();

    expect(prismaService.dailySession.findFirst.mock.calls[0]?.[0]).toMatchObject({
      where: {
        userId: 'user-1',
        bookId: 'book-1',
        status: 'COMPLETED'
      }
    });
  });

  it('throws when the user does not exist', async function verifyMissingUser() {
    const service = new DashboardService(createDashboardPrismaStub({
      user: null
    }));

    await expect(service.getHome('missing-user')).rejects.toBeInstanceOf(NotFoundException);
  });
});

type DashboardPrismaStubOptions = {
  user?: { id: string; activeBookId: string | null } | null;
  book?: {
    id: string;
    key: string;
    title: string;
    description: string;
  } | null;
  totalWordCount?: number;
  plan?: {
    id: string;
    userId: string;
    bookId: string;
    dailyWordCount: number;
    newWordRatio: number;
    reviewWordRatio: number;
    articleStyle: 'EXAM' | 'NEWS' | 'TED';
  } | null;
  progress?: {
    userId: string;
    bookId: string;
    learnedWordIds: string[];
    reviewedWordIds: string[];
    flaggedWordIds: string[];
  } | null;
  sessions?: SessionRecord[];
};

type SessionStatus = 'PENDING' | 'ROUND_ONE' | 'ROUND_TWO' | 'ROUND_THREE' | 'COMPLETED';

type SessionRecord = {
  id: string;
  userId: string;
  bookId: string;
  studyPlanId: string;
  sessionDate: Date;
  batchIndex: number;
  status: SessionStatus;
  articleStyle: 'EXAM' | 'NEWS' | 'TED';
  createdAt: Date;
  updatedAt: Date;
  words: Array<{
    id: string;
    vocabularyItemId: string;
  }>;
};

function createDashboardPrismaStub(options: DashboardPrismaStubOptions = {}) {
  const book = options.book === undefined ? {
    id: 'book-1',
    key: 'cet4',
    title: '四级词库',
    description: 'desc'
  } : options.book;
  const totalWordCount = options.totalWordCount ?? 30;
  const user = options.user === undefined ? {
    id: 'user-1',
    activeBookId: book?.id ?? null
  } : options.user;
  const plan = options.plan === undefined ? {
    id: 'plan-1',
    userId: 'user-1',
    bookId: 'book-1',
    dailyWordCount: 15,
    newWordRatio: 2,
    reviewWordRatio: 1,
    articleStyle: 'NEWS' as const
  } : options.plan;
  const progress = options.progress === undefined ? {
    userId: 'user-1',
    bookId: 'book-1',
    learnedWordIds: ['w1', 'w2', 'w3'],
    reviewedWordIds: ['w1'],
    flaggedWordIds: []
  } : options.progress;
  const sessions = options.sessions ?? [
    createSessionRecord({
      id: 'session-pending',
      batchIndex: 1,
      status: 'ROUND_ONE',
      vocabularyItemIds: ['w1', 'w2'],
      sessionDate: offsetUtcDay(0)
    })
  ];

  const sessionFindMany = vi.fn(async (args?: Record<string, any>) => findManySessions(sessions, args));
  const sessionFindFirst = vi.fn(async (args?: Record<string, any>) => findFirstSession(sessions, args));

  const prismaLike = {
    user: {
      findUnique: vi.fn(async () => user)
    },
    vocabularyBook: {
      findUnique: vi.fn(async () => book ? {
        ...book,
        _count: {
          words: totalWordCount
        }
      } : null)
    },
    studyPlan: {
      findUnique: vi.fn(async () => plan)
    },
    userBookProgress: {
      findUnique: vi.fn(async () => progress)
    },
    dailySession: {
      findMany: sessionFindMany,
      findFirst: sessionFindFirst
    }
  };

  return {
    ...prismaLike,
    $transaction: vi.fn(async (callback: (transactionClient: typeof prismaLike) => unknown) => callback(prismaLike))
  };
}

function createSessionRecord(input: {
  id: string;
  batchIndex: number;
  status: SessionStatus;
  vocabularyItemIds: string[];
  sessionDate?: Date;
}) {
  const sessionDate = input.sessionDate ?? offsetUtcDay(0);

  return {
    id: input.id,
    userId: 'user-1',
    bookId: 'book-1',
    studyPlanId: 'plan-1',
    sessionDate,
    batchIndex: input.batchIndex,
    status: input.status,
    articleStyle: 'NEWS' as const,
    createdAt: sessionDate,
    updatedAt: sessionDate,
    words: input.vocabularyItemIds.map((vocabularyItemId, index) => ({
      id: `${input.id}-word-${index + 1}`,
      vocabularyItemId
    }))
  };
}

function offsetUtcDay(dayOffset: number) {
  const { start } = createTodayRange();
  const shifted = new Date(start);
  shifted.setUTCDate(shifted.getUTCDate() + dayOffset);
  return shifted;
}

function offsetUtcDateString(dayOffset: number) {
  return offsetUtcDay(dayOffset).toISOString().slice(0, 10);
}

function findFirstSession(sessions: SessionRecord[], args?: Record<string, any>) {
  return findManySessions(sessions, args)[0] ?? null;
}

function findManySessions(sessions: SessionRecord[], args?: Record<string, any>) {
  const where = args?.where ?? {};
  const selectedSessions = sessions.filter((session) => {
    if (where.userId && session.userId !== where.userId) {
      return false;
    }

    if (where.bookId && session.bookId !== where.bookId) {
      return false;
    }

    if (where.status && session.status !== where.status) {
      return false;
    }

    const gte = where.sessionDate?.gte as Date | undefined;
    const lt = where.sessionDate?.lt as Date | undefined;
    if (gte && session.sessionDate < gte) {
      return false;
    }
    if (lt && session.sessionDate >= lt) {
      return false;
    }

    return true;
  });

  const orderedSessions = Array.isArray(args?.orderBy) ? [...selectedSessions].sort((left, right) => {
    for (const order of args.orderBy) {
      if (order.sessionDate) {
        const delta = left.sessionDate.getTime() - right.sessionDate.getTime();
        if (delta !== 0) {
          return order.sessionDate === 'asc' ? delta : -delta;
        }
      }
      if (order.batchIndex) {
        const delta = left.batchIndex - right.batchIndex;
        if (delta !== 0) {
          return order.batchIndex === 'asc' ? delta : -delta;
        }
      }
    }
    return 0;
  }) : selectedSessions;

  const distinctSessions = Array.isArray(args?.distinct) && args.distinct.includes('sessionDate')
    ? orderedSessions.filter((session, index, items) =>
      items.findIndex((candidate) => candidate.sessionDate.getTime() === session.sessionDate.getTime()) === index
    )
    : orderedSessions;

  return distinctSessions.map((session) => selectSessionShape(session, args));
}

function selectSessionShape(session: SessionRecord, args?: Record<string, any>) {
  if (args?.select) {
    return {
      ...(args.select.sessionDate ? { sessionDate: session.sessionDate } : {}),
      ...(args.select.batchIndex ? { batchIndex: session.batchIndex } : {}),
      ...(args.select.words ? {
        words: session.words.map((word) => ({
          ...(args.select.words.select?.vocabularyItemId ? { vocabularyItemId: word.vocabularyItemId } : {}),
          ...(args.select.words.select?.id ? { id: word.id } : {})
        }))
      } : {})
    };
  }

  if (args?.include?.words?.select) {
    return {
      ...session,
      words: session.words.map((word) => ({
        ...(args.include.words.select.vocabularyItemId ? { vocabularyItemId: word.vocabularyItemId } : {}),
        ...(args.include.words.select.id ? { id: word.id } : {})
      }))
    };
  }

  return session;
}
