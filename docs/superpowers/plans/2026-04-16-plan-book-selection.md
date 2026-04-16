# Plan Book Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the official vocabulary module from the dashboard into the plans page, support card-based book selection, and show paginated vocabulary words with learned-state in the book detail page.

**Architecture:** Keep the current module boundaries. Extend the backend `dictionary` module with a word-list response that includes `isLearned`, then update the frontend `plans`, `dashboard`, and `book-detail` pages to consume that data and move selection from a form control into card interactions. Finish by syncing the product and technical docs with the new UX and learned-state definition.

**Tech Stack:** NestJS, Prisma, React, React Query, React Hook Form, TypeScript, Vitest

---

## File Structure

- Modify: `backend/src/modules/dictionary/dictionary.service.ts`
  - Add paginated book-word query and learned-state mapping for the current user.
- Modify: `backend/src/modules/dictionary/dictionary.controller.ts`
  - Accept pagination query parameters for `/books/:bookId/words`.
- Modify: `backend/test/dictionary.service.spec.ts`
  - Cover learned-state and pagination behavior.
- Modify: `frontend/src/types.ts`
  - Add the book detail word item and paginated response types.
- Modify: `frontend/src/lib/api.ts`
  - Add a typed request helper for book-detail word pages.
- Modify: `frontend/src/pages/dashboard-page.tsx`
  - Remove the official vocabulary section.
- Modify: `frontend/src/pages/plans-page.tsx`
  - Render the official vocabulary cards above the plan form and switch to card-based selection.
- Modify: `frontend/src/pages/book-detail-page.tsx`
  - Render paginated vocabulary words with part of speech, definitions, and learned-state.
- Modify: `docs/business/prd.md`
  - Document the new plan-page flow and the learned-state definition.
- Modify: `docs/business/iteration-log.md`
  - Record this UI and data behavior update.
- Modify: `docs/technical/code-architecture.md`
  - Document the new frontend/backend flow and book-word endpoint usage.
- Modify: `docs/technical/database.md`
  - Document learned-state derivation for book-word lists.

### Task 1: Extend Book Word API

**Files:**
- Modify: `backend/src/modules/dictionary/dictionary.service.ts`
- Modify: `backend/src/modules/dictionary/dictionary.controller.ts`
- Test: `backend/test/dictionary.service.spec.ts`

- [ ] **Step 1: Write the failing backend tests**

Add service-level coverage for:

```ts
it('returns paginated words with isLearned derived from user progress', async () => {
  const result = await service.getBookWords('user-1', 'book-1', undefined, 1, 2);

  expect(result.items).toHaveLength(2);
  expect(result.items[0]).toMatchObject({
    id: 'word-1',
    word: 'alpha',
    isLearned: true
  });
  expect(result.items[1]).toMatchObject({
    id: 'word-2',
    word: 'beta',
    isLearned: false
  });
  expect(result.pagination).toMatchObject({
    page: 1,
    pageSize: 2,
    total: 3,
    totalPages: 2
  });
});

it('filters learned words before paginating', async () => {
  const result = await service.getBookWords('user-1', 'book-1', 'learned', 1, 10);

  expect(result.items.map((item) => item.id)).toEqual(['word-1']);
  expect(result.pagination.total).toBe(1);
});
```

- [ ] **Step 2: Run the backend test to verify it fails**

Run:

```bash
cd /Users/awayer/code/ReadRec/backend
npm test -- dictionary.service.spec.ts
```

Expected: FAIL because `getBookWords` still returns a plain array without `items`, `pagination`, or `isLearned`.

- [ ] **Step 3: Implement the paginated dictionary response**

Update `dictionary.service.ts` so `getBookWords` accepts `page` and `pageSize`, derives `isLearned`, and returns:

```ts
return {
  items: filteredWords.slice(startIndex, endIndex).map((word) => ({
    ...word,
    isLearned: learnedWordIds.includes(word.id)
  })),
  pagination: {
    page,
    pageSize,
    total: filteredWords.length,
    totalPages: Math.max(1, Math.ceil(filteredWords.length / pageSize))
  }
};
```

Update `dictionary.controller.ts` so `/books/:bookId/words` accepts:

```ts
@Query('page') page?: string,
@Query('pageSize') pageSize?: string
```

and passes normalized numbers into the service.

- [ ] **Step 4: Run the backend test to verify it passes**

Run:

```bash
cd /Users/awayer/code/ReadRec/backend
npm test -- dictionary.service.spec.ts
```

Expected: PASS with learned-state and pagination assertions green.

- [ ] **Step 5: Commit**

```bash
cd /Users/awayer/code/ReadRec
git add backend/src/modules/dictionary/dictionary.service.ts backend/src/modules/dictionary/dictionary.controller.ts backend/test/dictionary.service.spec.ts
git commit -m "feat: add paginated book words api"
```

### Task 2: Add Frontend Types and API Client Support

**Files:**
- Modify: `frontend/src/types.ts`
- Modify: `frontend/src/lib/api.ts`

- [ ] **Step 1: Write the failing frontend type usage**

Prepare the pages to rely on these new types:

```ts
export interface BookWordItem {
  id: string;
  word: string;
  partOfSpeech?: string | null;
  definitions: string[];
  senses?: VocabularySense[];
  isLearned: boolean;
}

export interface BookWordPage {
  items: BookWordItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
```

- [ ] **Step 2: Run the frontend build to verify it fails after wiring usage**

Run:

```bash
cd /Users/awayer/code/ReadRec/frontend
npm run build
```

Expected: FAIL once `book-detail-page.tsx` starts referencing the new API helper before it exists.

- [ ] **Step 3: Implement the typed client method**

Add to `api.ts`:

```ts
export async function getBookWords(bookId: string, page = 1, pageSize = 50) {
  const searchParams = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize)
  });

  return request<BookWordPage>(`/books/${bookId}/words?${searchParams.toString()}`);
}
```

Also add the new exported types in `types.ts`.

- [ ] **Step 4: Run the frontend build to verify the API layer compiles**

Run:

```bash
cd /Users/awayer/code/ReadRec/frontend
npm run build
```

Expected: PASS for the API/type layer once the page code is aligned.

- [ ] **Step 5: Commit**

```bash
cd /Users/awayer/code/ReadRec
git add frontend/src/types.ts frontend/src/lib/api.ts
git commit -m "feat: add book word client types"
```

### Task 3: Move Official Books Into Plans Page

**Files:**
- Modify: `frontend/src/pages/dashboard-page.tsx`
- Modify: `frontend/src/pages/plans-page.tsx`

- [ ] **Step 1: Write the failing plans-page interaction test or manual check target**

Use this manual acceptance target while implementing:

```txt
1. Open /plans
2. The official vocabulary module appears above the study-plan module
3. Clicking a book card highlights it
4. The plan form's book field immediately shows that book's title
5. Saving the plan persists the clicked book id
6. Open / and confirm the official vocabulary module no longer appears
```

- [ ] **Step 2: Run the frontend build before UI changes**

Run:

```bash
cd /Users/awayer/code/ReadRec/frontend
npm run build
```

Expected: PASS as baseline before editing.

- [ ] **Step 3: Implement the dashboard and plans-page UI changes**

In `dashboard-page.tsx`, remove the official vocabulary `SectionCard` and its `booksQuery`.

In `plans-page.tsx`:

- keep `booksQuery` and `planQuery`
- add local selected state:

```ts
const [selectedBookId, setSelectedBookId] = useState<string>('');
```

- initialize it from the plan or the first available book in an effect
- render the official vocabulary card grid above the plan form
- make each card clickable
- keep a dedicated `Link` for "查看单词"
- replace the editable `select` with a read-only display field that uses `selectedBookId`
- submit `bookId: selectedBookId` in `savePlan`

- [ ] **Step 4: Run the frontend build and verify the UI compiles**

Run:

```bash
cd /Users/awayer/code/ReadRec/frontend
npm run build
```

Expected: PASS with the new dashboard/plans UI.

- [ ] **Step 5: Commit**

```bash
cd /Users/awayer/code/ReadRec
git add frontend/src/pages/dashboard-page.tsx frontend/src/pages/plans-page.tsx
git commit -m "feat: move book selection into plans page"
```

### Task 4: Render Book Detail Words With Learned State

**Files:**
- Modify: `frontend/src/pages/book-detail-page.tsx`

- [ ] **Step 1: Write the failing rendering target**

Use this explicit rendering target:

```txt
Book detail page shows:
- top summary cards
- a word list section
- each row includes word, part of speech, grouped senses or fallback definitions, and 已学习/未学习
- pagination controls for previous/next page
```

- [ ] **Step 2: Run the frontend build before the detail-page change**

Run:

```bash
cd /Users/awayer/code/ReadRec/frontend
npm run build
```

Expected: PASS as baseline.

- [ ] **Step 3: Implement the detail-page word list**

Update `book-detail-page.tsx` to:

- query the summary via `getBooks`
- query words via `api.getBookWords(bookId, page, 50)`
- render grouped `senses` when present
- fall back to `definitions.join(' / ')`
- show learned-state label:

```tsx
<span className={item.isLearned ? "rounded-full bg-ink px-3 py-1 text-sand" : "rounded-full bg-sand px-3 py-1 text-black/70"}>
  {item.isLearned ? "已学习" : "未学习"}
</span>
```

- add previous/next pagination buttons guarded by `pagination.page` and `pagination.totalPages`

- [ ] **Step 4: Run the frontend build and verify it passes**

Run:

```bash
cd /Users/awayer/code/ReadRec/frontend
npm run build
```

Expected: PASS with the book detail page rendering the new API response.

- [ ] **Step 5: Commit**

```bash
cd /Users/awayer/code/ReadRec
git add frontend/src/pages/book-detail-page.tsx
git commit -m "feat: show learned state in book detail"
```

### Task 5: Sync Product and Technical Docs

**Files:**
- Modify: `docs/business/prd.md`
- Modify: `docs/business/iteration-log.md`
- Modify: `docs/technical/code-architecture.md`
- Modify: `docs/technical/database.md`

- [ ] **Step 1: Update the product definitions**

Add to `prd.md`:

- official vocabulary module moved from dashboard to plans page
- official vocabulary module sits above the study-plan module
- plan-page book selection is card click, not a form selector
- learned-state definition:

```md
是否学习过：当前用户对该词存在学习进度记录则为“已学习”，否则为“未学习”。
```

- [ ] **Step 2: Update the iteration and technical docs**

Record:

- the dashboard no longer shows official vocabulary cards
- `/books/:bookId/words` now returns paginated word data with `isLearned`
- book detail pages render vocabulary words from the real backend

- [ ] **Step 3: Run a quick doc sanity check**

Run:

```bash
cd /Users/awayer/code/ReadRec
rg -n "是否学习过|计划页|/books/:bookId/words|官方词库" docs/business docs/technical
```

Expected: matching lines appear in the intended docs only.

- [ ] **Step 4: Commit**

```bash
cd /Users/awayer/code/ReadRec
git add docs/business/prd.md docs/business/iteration-log.md docs/technical/code-architecture.md docs/technical/database.md
git commit -m "docs: update book selection flow"
```

### Task 6: Final Verification

**Files:**
- Modify: none
- Verify: backend and frontend build/test commands

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
1. Log in
2. Open the dashboard and confirm there is no official vocabulary module
3. Open the plans page and confirm the official vocabulary module is above the plan form
4. Click a different book card and confirm the form field updates immediately
5. Click 查看单词 and confirm the detail page shows words plus 已学习/未学习
6. Save the plan and refresh the page to confirm the selected book persists
```

- [ ] **Step 5: Commit the final integrated changes if needed**

```bash
cd /Users/awayer/code/ReadRec
git status
```

Expected: clean working tree after the previous task commits, or one final commit if any integration adjustment remains.
