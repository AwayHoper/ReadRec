import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
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

  return {
    user: {
      findUnique: async () => user
    },
    vocabularyBook: {
      findUnique: async () => book ? {
        ...book,
        _count: {
          words: totalWordCount
        }
      } : null
    },
    studyPlan: {
      findUnique: async () => plan
    },
    userBookProgress: {
      findUnique: async () => progress
    },
    dailySession: {
      findMany: async () => sessions
    }
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
