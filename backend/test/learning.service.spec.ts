import { describe, expect, it, vi } from 'vitest';
import { createTodayRange } from '../src/common/prisma/prisma-mappers.js';
import { LearningService } from '../src/modules/learning/learning.service.js';

type SessionStatus = 'PENDING' | 'ROUND_ONE' | 'ROUND_TWO' | 'ROUND_THREE' | 'COMPLETED';

describe('LearningService active batch resolution', function runLearningServiceSuite() {
  it('selects the latest unfinished batch when an earlier same-day batch is already completed', async function verifyLatestActiveLearningBatch() {
    const prismaService = createLearningPrismaStub([
      createLearningSessionRecord({
        id: 'session-1',
        batchIndex: 1,
        status: 'COMPLETED'
      }),
      createLearningSessionRecord({
        id: 'session-2',
        batchIndex: 2,
        status: 'ROUND_ONE'
      })
    ]);
    const service = new LearningService(
      prismaService as never,
      {
        generateReadingQuestions: vi.fn(async () => [])
      } as never
    );

    const reviewRound = await service.getReviewRound('user-1');

    expect(reviewRound.sessionId).toBe('session-2');
    expect(reviewRound.status).toBe('ROUND_ONE');
  });
});

function createLearningPrismaStub(seedSessions: ReturnType<typeof createLearningSessionRecord>[]) {
  const sessions = [...seedSessions];

  return {
    dailySession: {
      findFirst: vi.fn(async (args?: Record<string, any>) => findFirstSession(sessions, args)),
      findUnique: vi.fn(async ({ where }: Record<string, any>) => sessions.find((session) => session.id === where.id) ?? null)
    }
  };
}

function findFirstSession(sessions: ReturnType<typeof createLearningSessionRecord>[], args?: Record<string, any>) {
  return findManySessions(sessions, args)[0] ?? null;
}

function findManySessions(sessions: ReturnType<typeof createLearningSessionRecord>[], args?: Record<string, any>) {
  const where = args?.where ?? {};

  const filteredSessions = sessions.filter((session) => {
    if (where.userId && session.userId !== where.userId) {
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

function createLearningSessionRecord(input: {
  id: string;
  batchIndex: number;
  status: SessionStatus;
}) {
  const { start } = createTodayRange();

  return {
    id: input.id,
    userId: 'user-1',
    bookId: 'book-1',
    studyPlanId: 'plan-1',
    sessionDate: start,
    batchIndex: input.batchIndex,
    status: input.status,
    articleStyle: 'NEWS' as const,
    createdAt: start,
    updatedAt: start,
    words: [],
    articles: [],
    readingQuestions: []
  };
}
