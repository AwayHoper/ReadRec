import { describe, expect, it, vi } from 'vitest';
import { createTodayRange } from '../src/common/prisma/prisma-mappers.js';
import { DailySessionService } from '../src/modules/daily-session/daily-session.service.js';

type SessionStatus = 'PENDING' | 'ROUND_ONE' | 'ROUND_TWO' | 'ROUND_THREE' | 'COMPLETED';

describe('DailySessionService multi-batch behavior', function runDailySessionServiceSuite() {
  it('returns the latest completed batch without creating another one for read-only today access', async function verifyReadOnlyTodayLookup() {
    const prismaService = createPrismaStubWithBatches([
      createSessionRecord({
        id: 'session-1',
        batchIndex: 1,
        status: 'COMPLETED'
      }),
      createSessionRecord({
        id: 'session-2',
        batchIndex: 2,
        status: 'COMPLETED'
      })
    ]);
    const service = createService(prismaService);

    const session = await service.getTodaySession('user-1');

    expect(session.id).toBe('session-2');
    expect(session.batchIndex).toBe(2);
    expect(prismaService.dailySession.create).not.toHaveBeenCalled();
  });

  it('does not reopen the latest completed batch when start is requested after finishing today', async function verifyStartDoesNotReopenCompletedBatch() {
    const prismaService = createPrismaStubWithBatches([
      createSessionRecord({
        id: 'session-1',
        batchIndex: 1,
        status: 'COMPLETED'
      }),
      createSessionRecord({
        id: 'session-2',
        batchIndex: 2,
        status: 'COMPLETED'
      })
    ]);
    const service = createService(prismaService);

    const session = await service.startTodaySession('user-1');

    expect(session.id).toBe('session-2');
    expect(session.status).toBe('COMPLETED');
    expect(prismaService.dailySession.update).not.toHaveBeenCalled();
  });

  it('creates batch 2 after batch 1 is completed on the same day', async function verifyCreateSecondBatch() {
    const prismaService = createPrismaStubWithBatches([
      createSessionRecord({
        id: 'session-1',
        batchIndex: 1,
        status: 'COMPLETED'
      })
    ]);
    const service = createService(prismaService);

    const session = await (
      service as DailySessionService & {
        createNextSession(userId: string): Promise<{ batchIndex: number }>;
      }
    ).createNextSession('user-1');

    expect(session.batchIndex).toBe(2);
    expect(prismaService.dailySession.create.mock.calls[0]?.[0]?.data?.batchIndex).toBe(2);
    expect(prismaService.dailySession.create).toHaveBeenCalledTimes(1);
  });

  it('creates the next highest batch index when multiple same-day batches are already completed', async function verifyCreateThirdBatch() {
    const prismaService = createPrismaStubWithBatches([
      createSessionRecord({
        id: 'session-1',
        batchIndex: 1,
        status: 'COMPLETED'
      }),
      createSessionRecord({
        id: 'session-2',
        batchIndex: 2,
        status: 'COMPLETED'
      })
    ]);
    const service = createService(prismaService);

    const session = await (
      service as DailySessionService & {
        createNextSession(userId: string): Promise<{ batchIndex: number }>;
      }
    ).createNextSession('user-1');

    expect(session.batchIndex).toBe(3);
    expect(prismaService.dailySession.create.mock.calls[0]?.[0]?.data?.batchIndex).toBe(3);
  });

  it('returns the latest unfinished batch as the active learning session', async function verifyLatestActiveBatchLookup() {
    const prismaService = createPrismaStubWithBatches([
      createSessionRecord({
        id: 'session-1',
        batchIndex: 1,
        status: 'COMPLETED'
      }),
      createSessionRecord({
        id: 'session-2',
        batchIndex: 2,
        status: 'ROUND_ONE'
      })
    ]);
    const service = createService(prismaService);

    const session = await (
      service as DailySessionService & {
        getCurrentLearningSession(userId: string): Promise<{ id: string; batchIndex: number }>;
      }
    ).getCurrentLearningSession('user-1');

    expect(session.id).toBe('session-2');
    expect(session.batchIndex).toBe(2);
  });
});

function createService(prismaService: ReturnType<typeof createPrismaStubWithBatches>) {
  return new DailySessionService(
    prismaService as never,
    {
      getBookWords: vi.fn(async () => ({
        items: []
      }))
    } as never,
    {
      generateArticles: vi.fn(async () => [])
    } as never
  );
}

function createPrismaStubWithBatches(seedSessions: ReturnType<typeof createSessionRecord>[]) {
  const sessions = [...seedSessions];
  const user = {
    id: 'user-1',
    activeBookId: 'book-1'
  };
  const plan = {
    id: 'plan-1',
    dailyWordCount: 10,
    newWordRatio: 1,
    reviewWordRatio: 1,
    articleStyle: 'NEWS'
  };

  return {
    user: {
      findUnique: vi.fn(async () => user)
    },
    studyPlan: {
      findUnique: vi.fn(async () => plan)
    },
    userBookProgress: {
      findUnique: vi.fn(async () => null)
    },
    wrongBookEntry: {
      findMany: vi.fn(async () => [])
    },
    dailySession: {
      findFirst: vi.fn(async (args?: Record<string, any>) => findFirstSession(sessions, args)),
      findMany: vi.fn(async (args?: Record<string, any>) => findManySessions(sessions, args)),
      update: vi.fn(async (args: Record<string, any>) => {
        const session = sessions.find((item) => item.id === args.where.id);
        if (!session) {
          return null;
        }

        Object.assign(session, args.data);
        return session;
      }),
      create: vi.fn(async (args: Record<string, any>) => {
        const createdSession = createSessionRecord({
          id: args.data.id,
          batchIndex: args.data.batchIndex ?? 1,
          status: args.data.status,
          sessionDate: args.data.sessionDate,
          articleStyle: args.data.articleStyle
        });
        sessions.push(createdSession);
        return createdSession;
      })
    }
  };
}

function findFirstSession(sessions: ReturnType<typeof createSessionRecord>[], args?: Record<string, any>) {
  return findManySessions(sessions, args)[0] ?? null;
}

function findManySessions(sessions: ReturnType<typeof createSessionRecord>[], args?: Record<string, any>) {
  const where = args?.where ?? {};

  const filteredSessions = sessions.filter((session) => {
    if (where.userId && session.userId !== where.userId) {
      return false;
    }

    if (typeof where.batchIndex === 'number' && session.batchIndex !== where.batchIndex) {
      return false;
    }

    if (where.status?.not && session.status === where.status.not) {
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

  if (Array.isArray(args?.orderBy)) {
    return [...filteredSessions].sort((left, right) => {
      const batchDirection = args.orderBy[0]?.batchIndex;
      return batchDirection === 'asc' ? left.batchIndex - right.batchIndex : right.batchIndex - left.batchIndex;
    });
  }

  return filteredSessions;
}

function createSessionRecord(input: {
  id: string;
  batchIndex: number;
  status: SessionStatus;
  sessionDate?: Date;
  articleStyle?: 'EXAM' | 'NEWS' | 'TED';
}) {
  const { start } = createTodayRange();

  return {
    id: input.id,
    userId: 'user-1',
    bookId: 'book-1',
    studyPlanId: 'plan-1',
    sessionDate: input.sessionDate ?? start,
    batchIndex: input.batchIndex,
    status: input.status,
    articleStyle: input.articleStyle ?? 'NEWS',
    createdAt: start,
    updatedAt: start,
    words: [],
    articles: [],
    readingQuestions: []
  };
}
