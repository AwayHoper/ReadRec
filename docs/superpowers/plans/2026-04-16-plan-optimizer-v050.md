# Plan Optimizer v0.5.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the plan module from raw parameter inputs to a ratio selector, fixed plan-picker cards, dynamic forecast, and improved daily word selection rules with shuffle and wrong-book prioritization.

**Architecture:** Keep the existing `StudyPlan` table and API shape, but reinterpret the stored fields so the frontend can project product-friendly ratio and plan choices onto the existing `dailyWordCount`, `newWordRatio`, and `reviewWordRatio`. Update the daily-session selector to use those persisted values as total daily count plus ratio inputs, then add shuffle and wrong-book prioritization before session creation.

**Tech Stack:** React, React Query, React Hook Form, NestJS, Prisma, TypeScript, Vitest

---

## File Structure

- Modify: `frontend/src/pages/plans-page.tsx`
  - Replace raw numeric plan fields with ratio selector, plan cards, and forecast UI.
- Modify: `frontend/src/types.ts`
  - Add typed helpers for plan preview / current-plan inference when needed by the page.
- Modify: `frontend/src/lib/api.ts`
  - Keep plan update typing aligned if the frontend helper payload changes shape locally.
- Modify: `backend/src/modules/study-plan/dto/update-study-plan.dto.ts`
  - Adjust validation to allow the new total daily count values.
- Modify: `backend/src/modules/study-plan/study-plan.service.ts`
  - Ensure returned plan values remain compatible with the new interpretation.
- Modify: `backend/src/modules/daily-session/domain/daily-session-selector.ts`
  - Rework selection math so `dailyWordCount` is treated as total daily volume and ratio fields determine new/review targets.
- Modify: `backend/src/modules/daily-session/daily-session.service.ts`
  - Add wrong-book prioritization and final shuffle before session persistence.
- Modify: `backend/test/daily-session-selector.spec.ts`
  - Cover new ratio math, backfilling behavior, and ordering constraints.
- Modify: `docs/business/prd.md`
- Modify: `docs/business/iteration-log.md`
- Modify: `docs/technical/code-architecture.md`
- Modify: `docs/technical/database.md`

### Task 1: Rework Daily Selection Math

**Files:**
- Modify: `backend/src/modules/daily-session/domain/daily-session-selector.ts`
- Test: `backend/test/daily-session-selector.spec.ts`

- [ ] **Step 1: Write the failing selector tests**

Add coverage for:

```ts
it('treats dailyWordCount as total daily volume and derives new/review counts from ratio', () => {
  const result = selectDailyWords({
    dailyWordCount: 40,
    newWordRatio: 1,
    reviewWordRatio: 3,
    newWordIds: ['n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7', 'n8', 'n9', 'n10'],
    reviewWordIds: ['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8', 'r9', 'r10', 'r11', 'r12', 'r13', 'r14', 'r15', 'r16', 'r17', 'r18', 'r19', 'r20', 'r21', 'r22', 'r23', 'r24', 'r25', 'r26', 'r27', 'r28', 'r29', 'r30'],
    prioritizedReviewWordIds: []
  });

  expect(result.filter((item) => item.type === 'NEW')).toHaveLength(10);
  expect(result.filter((item) => item.type === 'REVIEW')).toHaveLength(30);
});

it('backfills missing review capacity with remaining new words', () => {
  const result = selectDailyWords({
    dailyWordCount: 20,
    newWordRatio: 1,
    reviewWordRatio: 3,
    newWordIds: ['n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7', 'n8', 'n9', 'n10', 'n11', 'n12', 'n13', 'n14', 'n15', 'n16', 'n17', 'n18', 'n19', 'n20'],
    reviewWordIds: ['r1', 'r2'],
    prioritizedReviewWordIds: []
  });

  expect(result).toHaveLength(20);
  expect(result.filter((item) => item.type === 'REVIEW')).toHaveLength(2);
  expect(result.filter((item) => item.type === 'NEW')).toHaveLength(18);
});
```

- [ ] **Step 2: Run the selector tests to verify they fail**

Run:

```bash
cd /Users/awayer/code/ReadRec/backend
npm test -- daily-session-selector.spec.ts
```

Expected: FAIL because the current selector treats `dailyWordCount` like a base count, not a total daily volume.

- [ ] **Step 3: Implement the new selector math**

Update `daily-session-selector.ts` so:

- `dailyWordCount` is the total number of words to select for the day
- desired new count = `Math.round((dailyWordCount * newWordRatio) / (newWordRatio + reviewWordRatio))`
- desired review count = `dailyWordCount - desiredNewCount`
- review candidates start with `prioritizedReviewWordIds`, then the rest of `reviewWordIds`
- if one side is short, the other side fills the remainder
- the result length never exceeds `dailyWordCount`

Also rename the selector input to use:

```ts
prioritizedReviewWordIds: string[];
```

instead of the more misleading `flaggedReviewWordIds`.

- [ ] **Step 4: Run the selector tests to verify they pass**

Run:

```bash
cd /Users/awayer/code/ReadRec/backend
npm test -- daily-session-selector.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/awayer/code/ReadRec
git add backend/src/modules/daily-session/domain/daily-session-selector.ts backend/test/daily-session-selector.spec.ts
git commit -m "feat: update daily selector math for plan presets"
```

### Task 2: Apply Wrong-Book Priority and Shuffle Before Session Creation

**Files:**
- Modify: `backend/src/modules/daily-session/daily-session.service.ts`
- Test: `backend/test/daily-session-selector.spec.ts`

- [ ] **Step 1: Extend the test coverage for prioritized review candidates**

Add a focused selector/service-level assertion like:

```ts
it('places wrong-book review candidates ahead of normal review candidates before filling the review target', () => {
  const result = selectDailyWords({
    dailyWordCount: 12,
    newWordRatio: 1,
    reviewWordRatio: 2,
    newWordIds: ['n1', 'n2', 'n3', 'n4'],
    reviewWordIds: ['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8'],
    prioritizedReviewWordIds: ['r7', 'r8']
  });

  expect(result.filter((item) => item.type === 'REVIEW').map((item) => item.wordId)).toContain('r7');
  expect(result.filter((item) => item.type === 'REVIEW').map((item) => item.wordId)).toContain('r8');
});
```

- [ ] **Step 2: Run the relevant backend tests**

Run:

```bash
cd /Users/awayer/code/ReadRec/backend
npm test -- daily-session-selector.spec.ts
```

Expected: FAIL until the selector/service input is updated.

- [ ] **Step 3: Wire wrong-book priority and shuffle into session creation**

In `daily-session.service.ts`:

- derive prioritized review ids from `WrongBookEntry` for the current user/book
- pass them into `selectDailyWords()`
- once `selectedWordRecords` is built, shuffle the final list before article generation/session persistence

Use a small local helper such as:

```ts
function shuffleArray<T>(items: T[]) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}
```

Keep the shuffle after selection, not during ratio computation.

- [ ] **Step 4: Run backend tests to verify the logic compiles and passes**

Run:

```bash
cd /Users/awayer/code/ReadRec/backend
npm test -- daily-session-selector.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/awayer/code/ReadRec
git add backend/src/modules/daily-session/daily-session.service.ts backend/test/daily-session-selector.spec.ts
git commit -m "feat: prioritize wrong-book review words"
```

### Task 3: Relax Plan DTO Validation for Preset Totals

**Files:**
- Modify: `backend/src/modules/study-plan/dto/update-study-plan.dto.ts`

- [ ] **Step 1: Capture the failing validation expectation**

The DTO currently caps `dailyWordCount` at `20`, which would reject valid preset totals such as:

- `10` with ratio `1:4` => total `50`
- `20` with ratio `1:4` => total `100`
- `40` with ratio `1:4` => total `200`

Use this validation target:

```txt
dailyWordCount must accept at least 200 in v0.5.0
newWordRatio remains fixed to 1
reviewWordRatio must accept 1 through 4
```

- [ ] **Step 2: Run backend build to verify the DTO still compiles after the later UI change**

Run:

```bash
cd /Users/awayer/code/ReadRec/backend
npm run build
```

Expected: PASS baseline before editing.

- [ ] **Step 3: Update the DTO constraints**

Change `update-study-plan.dto.ts` so:

- `dailyWordCount` allows totals up to at least `200`
- `newWordRatio` allows `1`
- `reviewWordRatio` allows `1..4`

Minimal acceptable shape:

```ts
@IsInt()
@Min(1)
@Max(200)
dailyWordCount!: number;

@IsInt()
@Min(1)
@Max(1)
newWordRatio!: number;

@IsInt()
@Min(1)
@Max(4)
reviewWordRatio!: number;
```

- [ ] **Step 4: Run backend build**

Run:

```bash
cd /Users/awayer/code/ReadRec/backend
npm run build
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/awayer/code/ReadRec
git add backend/src/modules/study-plan/dto/update-study-plan.dto.ts
git commit -m "feat: support plan preset totals in dto"
```

### Task 4: Replace Raw Plan Inputs With Ratio + Plan Picker + Forecast

**Files:**
- Modify: `frontend/src/pages/plans-page.tsx`
- Modify: `frontend/src/types.ts`
- Modify: `frontend/src/lib/api.ts`

- [ ] **Step 1: Define the page-level view model**

Introduce typed helpers for the page such as:

```ts
type RatioPreset = 1 | 2 | 3 | 4;
type NewWordPreset = 5 | 10 | 20 | 40;

interface PlanOption {
  id: string;
  newWordCount: NewWordPreset;
  reviewWordCount: number;
  totalWordCount: number;
  requiredDays: number;
  estimatedFinishDateLabel: string;
}
```

- [ ] **Step 2: Run frontend build before refactoring the page**

Run:

```bash
cd /Users/awayer/code/ReadRec/frontend
npm run build
```

Expected: PASS baseline before editing.

- [ ] **Step 3: Implement ratio selector and plan options**

Update `plans-page.tsx` so the current “每日词量 / 新词比例 / 复习比例” inputs are replaced by:

- a ratio preset switcher for `1:1 / 1:2 / 1:3 / 1:4`
- a fixed set of plan cards for `5 / 10 / 20 / 40` new words
- a dynamic forecast block

The page should:

- infer current ratio preset from `plan.newWordRatio` + `plan.reviewWordRatio`
- infer current new-word preset from `plan.dailyWordCount` and the ratio
- default to ratio `1:1` and new-word preset `10` when no current plan exists
- compute:
  - review count = `newWordCount * ratioPreset`
  - total daily count = `newWordCount + reviewCount`
  - remaining new words = `max(totalWordCount - learnedCount, 0)`
  - required days = `remainingNewWords === 0 ? 0 : Math.ceil(remainingNewWords / newWordCount)`
  - estimated finish date based on today + required days

When saving, convert the selected option back to:

```ts
bookId: selectedBookId,
dailyWordCount: selectedOption.totalWordCount,
newWordRatio: 1,
reviewWordRatio: ratioPreset,
articleStyle
```

- [ ] **Step 4: Run frontend build**

Run:

```bash
cd /Users/awayer/code/ReadRec/frontend
npm run build
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/awayer/code/ReadRec
git add frontend/src/pages/plans-page.tsx frontend/src/types.ts frontend/src/lib/api.ts
git commit -m "feat: add plan ratio selector and forecast"
```

### Task 5: Sync Current Plan Restoration With Preset UI

**Files:**
- Modify: `frontend/src/pages/plans-page.tsx`
- Modify: `backend/src/modules/study-plan/study-plan.service.ts`

- [ ] **Step 1: Write the restoration target**

Use this manual acceptance target:

```txt
1. Select book A and save ratio 1:3 with new-word preset 10
2. Refresh /plans
3. The same book remains selected
4. Ratio 1:3 is highlighted
5. The 10-new-word plan card is highlighted
6. Forecast matches the restored plan
```

- [ ] **Step 2: Confirm the backend current-plan payload is sufficient**

Review whether `getCurrentPlan()` already returns enough data (`activeBookId`, `plan`) for the preset inference. If yes, do not expand the API surface.

- [ ] **Step 3: Implement restoration behavior**

In `plans-page.tsx`, ensure:

- changing books re-infers the ratio + preset from that book’s stored plan
- missing plan falls back to defaults
- the selected ratio/preset remains the true UI source of truth rather than raw numeric inputs

Only touch `study-plan.service.ts` if a tiny compatibility adjustment is required.

- [ ] **Step 4: Run frontend build**

Run:

```bash
cd /Users/awayer/code/ReadRec/frontend
npm run build
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/awayer/code/ReadRec
git add frontend/src/pages/plans-page.tsx backend/src/modules/study-plan/study-plan.service.ts
git commit -m "feat: restore saved plan presets per book"
```

### Task 6: Sync Product and Technical Docs

**Files:**
- Modify: `docs/business/prd.md`
- Modify: `docs/business/iteration-log.md`
- Modify: `docs/technical/code-architecture.md`
- Modify: `docs/technical/database.md`

- [ ] **Step 1: Update the product docs**

Add to `prd.md`:

- the ratio selector options `1:1 / 1:2 / 1:3 / 1:4`
- the fixed new-word presets `5 / 10 / 20 / 40`
- the dynamic forecast formula and “预计完成日期” definition
- the updated daily selection rules: shuffle, ratio-based split, wrong-book priority

- [ ] **Step 2: Update iteration and technical docs**

Record:

- plan page moved from raw numeric inputs to ratio + preset cards
- `dailyWordCount` is now interpreted as total daily count
- wrong-book review candidates are prioritized before normal review candidates
- selected daily words are shuffled before session persistence

- [ ] **Step 3: Run a doc sanity check**

Run:

```bash
cd /Users/awayer/code/ReadRec
rg -n "1:4|5 / 10 / 20 / 40|预计完成日期|dailyWordCount|乱序|生词本" docs/business docs/technical
```

Expected: matching lines appear in the intended docs only.

- [ ] **Step 4: Commit**

```bash
cd /Users/awayer/code/ReadRec
git add docs/business/prd.md docs/business/iteration-log.md docs/technical/code-architecture.md docs/technical/database.md
git commit -m "docs: document v0.5.0 plan optimizer"
```

### Task 7: Final Verification

**Files:**
- Verify only

- [ ] **Step 1: Run backend tests**

```bash
cd /Users/awayer/code/ReadRec/backend
npm test
```

Expected: PASS.

- [ ] **Step 2: Run backend build**

```bash
cd /Users/awayer/code/ReadRec/backend
npm run build
```

Expected: PASS.

- [ ] **Step 3: Run frontend build**

```bash
cd /Users/awayer/code/ReadRec/frontend
npm run build
```

Expected: PASS.

- [ ] **Step 4: Run a manual smoke test**

```txt
1. Open /plans
2. Confirm the ratio selector shows 1:1 / 1:2 / 1:3 / 1:4
3. Click different ratios and verify the plan cards recompute immediately
4. Click different plan cards and verify forecast updates immediately
5. Save a plan, refresh, and confirm the same ratio/card restore
6. Start a new daily session and confirm selected words are not alphabetically clustered
7. Confirm wrong-book words are favored when review candidates exist
```

- [ ] **Step 5: Confirm clean integration state**

```bash
cd /Users/awayer/code/ReadRec
git status
```

Expected: only intended changes remain, ready for a final integration commit.
