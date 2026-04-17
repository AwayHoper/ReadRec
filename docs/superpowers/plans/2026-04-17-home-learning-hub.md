# Home Learning Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a homepage learning hub that shows today’s study state, mastery breakdown, streak calendar, encouragement copy, and supports unlimited “learn another round” batches within the same day.

**Architecture:** Extend the daily-session model from “one session per day” to “many ordered batches per day,” then add a backend dashboard aggregation endpoint that summarizes today’s status, mastery, streaks, and forecast from persisted data. The frontend dashboard consumes this single aggregate response, renders the new learning-hub layout, and routes the main CTA to either the first batch or the next batch without duplicating business logic in the browser.

**Tech Stack:** NestJS, Prisma, PostgreSQL, React, TanStack Query, Vite, Vitest

---

## File Structure

### Backend

- Modify: `backend/prisma/schema.prisma`
  - Add batch sequencing support for same-day multi-session learning.
- Modify: `backend/src/modules/daily-session/daily-session.service.ts`
  - Separate “current active batch,” “today batch list,” and “create next batch” behaviors.
- Modify: `backend/src/modules/daily-session/daily-session.controller.ts`
  - Expose an endpoint for creating the next same-day batch.
- Modify: `backend/src/modules/learning/learning.service.ts`
  - Resolve all learning actions against the current active batch instead of “first session today.”
- Create: `backend/src/modules/dashboard/dashboard.module.ts`
  - Register the dashboard aggregate feature.
- Create: `backend/src/modules/dashboard/dashboard.controller.ts`
  - Expose `GET /dashboard/home`.
- Create: `backend/src/modules/dashboard/dashboard.service.ts`
  - Compute homepage aggregate data from plans, sessions, progress, and word book data.
- Modify: `backend/src/app.module.ts`
  - Register the new dashboard module.
- Create: `backend/test/dashboard.service.spec.ts`
  - Verify homepage aggregate rules and streak/mastery projections.
- Modify: `backend/test/daily-session-selector.spec.ts`
  - Keep coverage aligned if selector wiring changes.
- Create: `backend/test/daily-session.service.spec.ts`
  - Verify same-day multi-batch creation and active-batch resolution.

### Frontend

- Modify: `frontend/src/types.ts`
  - Add dashboard aggregate response types.
- Modify: `frontend/src/lib/api.ts`
  - Add dashboard fetch and “next batch” mutation helpers.
- Modify: `frontend/src/pages/dashboard-page.tsx`
  - Replace the placeholder card with the learning-hub layout.

### Docs

- Modify: `docs/business/prd.md`
- Modify: `docs/business/iteration-log.md`
- Modify: `docs/technical/code-architecture.md`
- Modify: `docs/technical/database.md`

---

### Task 1: Rework Daily Sessions For Same-Day Multi-Batch Learning

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Modify: `backend/src/modules/daily-session/daily-session.service.ts`
- Modify: `backend/src/modules/daily-session/daily-session.controller.ts`
- Modify: `backend/src/modules/learning/learning.service.ts`
- Create: `backend/test/daily-session.service.spec.ts`

- [ ] **Step 1: Write the failing same-day multi-batch tests**

```ts
import { describe, expect, it, vi } from 'vitest';
import { DailySessionService } from '../src/modules/daily-session/daily-session.service.js';

describe('DailySessionService multi-batch behavior', () => {
  it('creates batch 2 after batch 1 is completed on the same day', async () => {
    const prismaService = createPrismaStubWithCompletedBatchOne();
    const service = new DailySessionService(prismaService as never, createDictionaryStub() as never, createAiStub() as never);

    const session = await service.createNextSession('user-1');

    expect(session.batchIndex).toBe(2);
    expect(prismaService.dailySession.create).toHaveBeenCalled();
  });

  it('returns the latest unfinished batch as the active learning session', async () => {
    const prismaService = createPrismaStubWithBatches([
      { id: 'session-1', batchIndex: 1, status: 'COMPLETED' },
      { id: 'session-2', batchIndex: 2, status: 'ROUND_ONE' }
    ]);
    const service = new DailySessionService(prismaService as never, createDictionaryStub() as never, createAiStub() as never);

    const session = await service.getCurrentLearningSession('user-1');

    expect(session.id).toBe('session-2');
    expect(session.batchIndex).toBe(2);
  });
});
```

- [ ] **Step 2: Run the new test to verify it fails**

Run: `cd /Users/awayer/code/ReadRec/backend && npm test -- daily-session.service.spec.ts`

Expected: FAIL because `createNextSession`, `getCurrentLearningSession`, and `batchIndex` do not exist yet.

- [ ] **Step 3: Update the Prisma model to support multiple batches per day**

```prisma
model DailySession {
  id               String             @id @default(cuid())
  userId           String
  bookId           String
  studyPlanId      String
  sessionDate      DateTime
  batchIndex       Int
  status           DailySessionStatus
  articleStyle     ArticleStyle
  createdAt        DateTime           @default(now())
  updatedAt        DateTime           @updatedAt
  user             User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  book             VocabularyBook     @relation(fields: [bookId], references: [id], onDelete: Cascade)
  studyPlan        StudyPlan          @relation(fields: [studyPlanId], references: [id], onDelete: Cascade)
  words            DailySessionWord[]
  articles         GeneratedArticle[]
  readingQuestions ReadingQuestion[]

  @@unique([userId, sessionDate, batchIndex])
  @@index([userId, sessionDate])
}
```

- [ ] **Step 4: Implement active-batch lookup and next-batch creation in the service**

```ts
async getCurrentLearningSession(userId: string) {
  const existing = await this.findLatestActiveSession(userId);
  if (existing) {
    return mapDailySession(existing);
  }

  const completedBatches = await this.findTodaySessions(userId);
  if (completedBatches.length === 0) {
    return this.createSessionBatch(userId, 1);
  }

  return this.createSessionBatch(userId, completedBatches.length + 1);
}

async createNextSession(userId: string) {
  const sessions = await this.findTodaySessions(userId);
  const nextBatchIndex = sessions.length + 1;
  return this.createSessionBatch(userId, nextBatchIndex);
}

private findLatestActiveSession(userId: string) {
  const { start, end } = createTodayRange();
  return this.prismaService.dailySession.findFirst({
    where: {
      userId,
      sessionDate: { gte: start, lt: end },
      status: { not: 'COMPLETED' }
    },
    orderBy: [{ batchIndex: 'desc' }],
    include: DAILY_SESSION_INCLUDE
  });
}
```

- [ ] **Step 5: Expose the new endpoint and retarget learning flows to the active batch**

```ts
@Post('today/next')
createNext(@Req() request: Request & { user: { sub: string } }) {
  return this.dailySessionService.createNextSession(request.user.sub);
}
```

```ts
private async getCurrentSessionForUser(userId: string) {
  const session = await this.prismaService.dailySession.findFirst({
    where: {
      userId,
      sessionDate: { gte: start, lt: end },
      status: { not: 'COMPLETED' }
    },
    orderBy: [{ batchIndex: 'desc' }],
    include: LEARNING_SESSION_INCLUDE
  });

  if (!session) {
    throw new NotFoundException('当前没有可继续的学习批次。');
  }

  return session;
}
```

- [ ] **Step 6: Run focused verification**

Run:

```bash
cd /Users/awayer/code/ReadRec/backend
npx prisma generate --schema prisma/schema.prisma
npm test -- daily-session.service.spec.ts
```

Expected:

- Prisma client regenerates successfully
- `daily-session.service.spec.ts` passes

- [ ] **Step 7: Commit**

```bash
git add backend/prisma/schema.prisma \
  backend/src/modules/daily-session/daily-session.service.ts \
  backend/src/modules/daily-session/daily-session.controller.ts \
  backend/src/modules/learning/learning.service.ts \
  backend/test/daily-session.service.spec.ts
git commit -m "feat: support same-day multi-batch sessions"
```

---

### Task 2: Add Backend Homepage Aggregate Endpoint

**Files:**
- Create: `backend/src/modules/dashboard/dashboard.module.ts`
- Create: `backend/src/modules/dashboard/dashboard.controller.ts`
- Create: `backend/src/modules/dashboard/dashboard.service.ts`
- Modify: `backend/src/app.module.ts`
- Create: `backend/test/dashboard.service.spec.ts`

- [ ] **Step 1: Write the failing dashboard aggregate tests**

```ts
import { describe, expect, it } from 'vitest';
import { DashboardService } from '../src/modules/dashboard/dashboard.service.js';

describe('DashboardService.getHome', () => {
  it('returns pending status with first-batch targets before any completed batch exists', async () => {
    const service = new DashboardService(createDashboardPrismaStub() as never);

    const result = await service.getHome('user-1');

    expect(result.today.state).toBe('pending');
    expect(result.today.target.newCount).toBe(10);
    expect(result.cta.mode).toBe('start');
  });

  it('returns completed status and celebrate copy after two completed batches', async () => {
    const service = new DashboardService(createDashboardPrismaStubWithTwoCompletedBatches() as never);

    const result = await service.getHome('user-1');

    expect(result.today.state).toBe('completed');
    expect(result.today.completedBatchCount).toBe(2);
    expect(result.encouragement.tone).toBe('celebrate');
    expect(result.cta.mode).toBe('continue');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd /Users/awayer/code/ReadRec/backend && npm test -- dashboard.service.spec.ts`

Expected: FAIL because the dashboard module and service do not exist yet.

- [ ] **Step 3: Implement the dashboard service contract**

```ts
@Injectable()
export class DashboardService {
  constructor(private readonly prismaService: PrismaService) {}

  async getHome(userId: string) {
    const [user, books, activePlan, sessions, progress] = await Promise.all([
      this.prismaService.user.findUnique({ where: { id: userId } }),
      this.prismaService.vocabularyBook.findMany(),
      this.prismaService.studyPlan.findFirst({ where: { userId, bookId: user?.activeBookId ?? '' } }),
      this.loadRecentSessions(userId),
      this.prismaService.userBookProgress.findFirst({ where: { userId, bookId: user?.activeBookId ?? '' } })
    ]);

    return {
      activeBook: buildActiveBookSummary(user, books),
      today: buildTodayStatus(activePlan, sessions),
      mastery: buildMasterySummary(progress, books),
      streaks: buildStreakSummary(sessions, activePlan, books, progress),
      encouragement: buildEncouragementSummary(sessions),
      history: buildHistorySummary(sessions),
      cta: buildCtaSummary(sessions)
    };
  }
}
```

- [ ] **Step 4: Expose the controller endpoint and register the module**

```ts
@Controller('dashboard')
@UseGuards(AuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('home')
  getHome(@Req() request: Request & { user: { sub: string } }) {
    return this.dashboardService.getHome(request.user.sub);
  }
}
```

```ts
@Module({
  controllers: [DashboardController],
  providers: [DashboardService]
})
export class DashboardModule {}
```

- [ ] **Step 5: Cover mastery, streak, and encouragement edge cases**

```ts
it('maps learned/reviewed progress into familiar, fuzzy, and new buckets', async () => {
  const result = await service.getHome('user-1');

  expect(result.mastery.familiarCount).toBe(24);
  expect(result.mastery.fuzzyCount).toBe(16);
  expect(result.mastery.unseenCount).toBe(4603);
});

it('calculates streak depth from consecutive completed-learning dates', async () => {
  const result = await service.getHome('user-1');

  expect(result.streaks.totalDays).toBe(8);
  expect(result.streaks.currentStreakDays).toBe(4);
  expect(result.streaks.remainingDaysToFinish).toBe(32);
});
```

- [ ] **Step 6: Run focused verification**

Run:

```bash
cd /Users/awayer/code/ReadRec/backend
npm test -- dashboard.service.spec.ts
npm run build
```

Expected:

- dashboard service tests pass
- backend build succeeds with the new module wired in

- [ ] **Step 7: Commit**

```bash
git add backend/src/modules/dashboard/dashboard.module.ts \
  backend/src/modules/dashboard/dashboard.controller.ts \
  backend/src/modules/dashboard/dashboard.service.ts \
  backend/src/app.module.ts \
  backend/test/dashboard.service.spec.ts
git commit -m "feat: add dashboard home aggregate endpoint"
```

---

### Task 3: Align Session Responses And Learning APIs With Batch-Aware Types

**Files:**
- Modify: `backend/src/modules/daily-session/daily-session.service.ts`
- Modify: `frontend/src/types.ts`
- Modify: `frontend/src/lib/api.ts`

- [ ] **Step 1: Write the failing type expectation in the frontend**

```ts
export interface DashboardHomeResponse {
  activeBook: {
    id: string;
    title: string;
    totalWordCount: number;
  } | null;
  today: {
    state: 'pending' | 'completed';
    target: { newCount: number; reviewCount: number; totalCount: number };
    learnedUniqueWordCount: number;
    completedBatchCount: number;
  };
  mastery: {
    familiarCount: number;
    fuzzyCount: number;
    unseenCount: number;
    totalWordCount: number;
  };
  cta: {
    mode: 'start' | 'continue';
    label: string;
  };
}
```

- [ ] **Step 2: Run frontend build to verify types are missing**

Run: `cd /Users/awayer/code/ReadRec/frontend && npm run build`

Expected: FAIL because `DashboardHomeResponse` and the new API helpers are not defined.

- [ ] **Step 3: Add the new API helpers and batch-aware session shape**

```ts
export interface DailySession {
  id: string;
  userId: string;
  bookId: string;
  studyPlanId: string;
  sessionDate: string;
  batchIndex: number;
  status: DailySessionStatus;
  articleStyle: 'EXAM' | 'NEWS' | 'TED';
  words: SessionWordSummary[];
  articles: GeneratedArticle[];
  reviewRounds: ReviewRound[];
  readingQuestions: ReadingQuestion[];
  readingAnswers: ReadingAnswer[];
}

export async function getDashboardHome(): Promise<DashboardHomeResponse> {
  return request<DashboardHomeResponse>('/dashboard/home');
}

export async function createNextSession(): Promise<DailySession> {
  return request<DailySession>('/daily-session/today/next', {
    method: 'POST'
  });
}
```

- [ ] **Step 4: Make the backend session mapper return `batchIndex`**

```ts
return {
  id: session.id,
  userId: session.userId,
  bookId: session.bookId,
  studyPlanId: session.studyPlanId,
  sessionDate: session.sessionDate.toISOString().slice(0, 10),
  batchIndex: session.batchIndex,
  status: session.status,
  articleStyle: session.articleStyle,
  words: sortedWords.map(...),
  articles: sortedArticles.map(...),
  reviewRounds: ...,
  readingQuestions: ...,
  readingAnswers: ...
};
```

- [ ] **Step 5: Run cross-layer verification**

Run:

```bash
cd /Users/awayer/code/ReadRec/backend && npm run build
cd /Users/awayer/code/ReadRec/frontend && npm run build
```

Expected:

- backend compiles with the new response shape
- frontend compiles with `DashboardHomeResponse` and `batchIndex`

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/daily-session/daily-session.service.ts \
  frontend/src/types.ts \
  frontend/src/lib/api.ts
git commit -m "feat: expose dashboard and batch-aware api types"
```

---

### Task 4: Rebuild The Dashboard Page As The Learning Hub

**Files:**
- Modify: `frontend/src/pages/dashboard-page.tsx`

- [ ] **Step 1: Write the dashboard rendering expectations as component-driven checkpoints**

```tsx
// Use these UI checkpoints while implementing:
// 1. pending state shows "待完成：新词 X 个 复习词 Y 个"
// 2. completed state shows "已完成：今日已学习 Z 个"
// 3. CTA label follows response.cta.label
// 4. mastery card shows 熟悉 / 模糊 / 陌生
// 5. calendar paints cells by intensity bucket
```

- [ ] **Step 2: Replace the placeholder query trio with the dashboard aggregate query**

```tsx
const dashboardQuery = useQuery({
  queryKey: ['dashboard-home'],
  queryFn: api.getDashboardHome
});

const nextSessionMutation = useMutation({
  mutationFn: api.createNextSession,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['dashboard-home'] });
    queryClient.invalidateQueries({ queryKey: ['session'] });
    navigate('/learn/read');
  }
});
```

- [ ] **Step 3: Render the new learning-hub layout**

```tsx
<div className="space-y-6">
  <SectionCard title="今日学习">
    <div className="grid gap-4 lg:grid-cols-[1.4fr,0.6fr]">
      <div className="rounded-3xl bg-sand p-6">
        <p className="text-sm text-ink/70">{dashboard.today.state === 'pending' ? '待完成' : '今日计划已完成'}</p>
        <h2 className="mt-2 text-3xl font-semibold text-ink">{dashboard.activeBook?.title ?? '未选择词库'}</h2>
        <p className="mt-3 text-lg text-ink/80">
          {dashboard.today.state === 'pending'
            ? `待完成：新词 ${dashboard.today.target.newCount} 个 复习词 ${dashboard.today.target.reviewCount} 个`
            : `已完成：今日已学习 ${dashboard.today.learnedUniqueWordCount} 个`}
        </p>
        <button className="mt-6 rounded-full bg-coral px-5 py-3 text-white" onClick={handlePrimaryAction}>
          {dashboard.cta.label}
        </button>
      </div>

      <div className="rounded-3xl bg-cream p-6">
        <p className="text-sm text-ink/70">鼓励一下</p>
        <p className="mt-3 text-base leading-7 text-ink">{dashboard.encouragement.message}</p>
      </div>
    </div>
  </SectionCard>
</div>
```

- [ ] **Step 4: Add mastery and calendar sections without duplicating backend logic**

```tsx
<SectionCard title="当前词库掌握情况">
  <div className="grid gap-4 md:grid-cols-3">
    <div className="rounded-2xl bg-sand p-4">熟悉：{dashboard.mastery.familiarCount}</div>
    <div className="rounded-2xl bg-sand p-4">模糊：{dashboard.mastery.fuzzyCount}</div>
    <div className="rounded-2xl bg-sand p-4">陌生：{dashboard.mastery.unseenCount}</div>
  </div>
</SectionCard>

<SectionCard title="学习打卡">
  <div className="grid grid-cols-7 gap-2">
    {dashboard.streaks.calendar.map((cell) => (
      <div key={cell.date} className={calendarClassName(cell.intensity)} title={`${cell.date} ${cell.learnedUniqueWordCount} 词`} />
    ))}
  </div>
</SectionCard>
```

- [ ] **Step 5: Build and visually sanity-check**

Run:

```bash
cd /Users/awayer/code/ReadRec/frontend
npm run build
```

Expected:

- frontend build passes
- dashboard page has no unused-query or missing-type errors

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/dashboard-page.tsx
git commit -m "feat: redesign dashboard as home learning hub"
```

---

### Task 5: Update Product And Technical Docs For v0.6.0

**Files:**
- Modify: `docs/business/prd.md`
- Modify: `docs/business/iteration-log.md`
- Modify: `docs/technical/code-architecture.md`
- Modify: `docs/technical/database.md`

- [ ] **Step 1: Add the business behavior to PRD**

```md
4.0 首页（开始学习）
- 展示今日学习完成情况、历史学习信息、开始学习入口、再学一轮入口、鼓励文案
- 当天尚未完成任何批次时，展示今日首批待完成新词数与复习词数
- 当天完成至少 1 个批次后，首页切换为“今日计划已完成”，按钮变为“再学一轮”
- “再学一轮”继续沿用当前词库与当前学习计划比例重新抽词
```

- [ ] **Step 2: Record the iteration log entry**

```md
### v0.6.0

- 首页升级为学习中心，展示今日状态、掌握情况、打卡板与鼓励文案
- 同一天支持多批次学习，完成首批后按钮切换为“再学一轮”
- 首页“今日已学习”按当天所有已完成批次的去重单词数统计
```

- [ ] **Step 3: Update technical architecture and database rules**

```md
## 首页学习中心

- 前端首页通过 `GET /dashboard/home` 读取首页聚合数据
- `POST /daily-session/today/next` 创建同一天的新学习批次
- 学习页始终继续当天最新的未完成批次
```

```md
## DailySession 批次约定

- `DailySession.batchIndex` 表示同一天内的学习批次序号，从 `1` 开始
- 同一用户同一天可存在多个 `DailySession`
- 首页“今日完成”以是否完成过 `batchIndex = 1` 或更早完成的任意首批学习为准
```

- [ ] **Step 4: Verify the docs mention the required rules**

Run:

```bash
cd /Users/awayer/code/ReadRec
rg -n "再学一轮|今日计划已完成|batchIndex|dashboard/home|去重单词数" docs/business docs/technical
```

Expected:

- the search output points to all four updated docs

- [ ] **Step 5: Commit**

```bash
git add docs/business/prd.md \
  docs/business/iteration-log.md \
  docs/technical/code-architecture.md \
  docs/technical/database.md
git commit -m "docs: record home learning hub behavior"
```

---

### Task 6: Final Verification

**Files:**
- Verify only

- [ ] **Step 1: Run backend tests**

Run:

```bash
cd /Users/awayer/code/ReadRec/backend
npm test
```

Expected: all backend Vitest suites pass, including the new dashboard and daily-session coverage.

- [ ] **Step 2: Run backend build**

Run:

```bash
cd /Users/awayer/code/ReadRec/backend
npm run build
```

Expected: TypeScript build succeeds with the dashboard module and batch-aware session model.

- [ ] **Step 3: Run frontend build**

Run:

```bash
cd /Users/awayer/code/ReadRec/frontend
npm run build
```

Expected: Vite production build succeeds with the new dashboard hub.

- [ ] **Step 4: Smoke-check the main user paths**

Run:

```bash
cd /Users/awayer/code/ReadRec/backend
npm run start:dev
```

Then confirm manually:

- homepage shows pending state before learning
- completing one batch flips CTA to `再学一轮`
- clicking `再学一轮` opens a new same-day batch
- homepage remains completed after the second batch starts

- [ ] **Step 5: Commit any final fixups**

```bash
git add -A
git commit -m "chore: polish home learning hub rollout"
```

---

## Self-Review Notes

- Spec coverage:
  - homepage sections: covered in Tasks 2 and 4
  - same-day multi-batch + “再学一轮”: covered in Task 1
  - dashboard aggregate API: covered in Task 2
  - types/api wiring: covered in Task 3
  - doc sync: covered in Task 5
  - final validation: covered in Task 6
- Placeholder scan:
  - No `TODO`, `TBD`, or “similar to previous task” shortcuts remain
- Type consistency:
  - `batchIndex`, `DashboardHomeResponse`, `getHome`, and `createNextSession` are used consistently across backend and frontend tasks
