import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import * as api from '../lib/api';
import { SectionCard } from '../components/section-card';
import { StudyPlan, VocabularyBookSummary } from '../types';

const RATIO_PRESETS = [1, 2, 3, 4] as const;
const NEW_WORD_PRESETS = [5, 10, 20, 40] as const;
const DEFAULT_RATIO_PRESET = 1;
const DEFAULT_NEW_WORD_PRESET = 10;

interface PlanFormValues {
  articleStyle: StudyPlan['articleStyle'];
}

interface PlanSubmissionPayload {
  bookId: string;
  dailyWordCount: number;
  newWordRatio: 1;
  reviewWordRatio: number;
  articleStyle: StudyPlan['articleStyle'];
}

/** Summary: This helper infers the review ratio preset from one persisted plan snapshot. */
function inferRatioPreset(plan: StudyPlan | null | undefined) {
  if (!plan || !Number.isFinite(plan.newWordRatio) || !Number.isFinite(plan.reviewWordRatio) || plan.newWordRatio <= 0) {
    return DEFAULT_RATIO_PRESET;
  }

  const inferredRatio = plan.reviewWordRatio / plan.newWordRatio;
  return RATIO_PRESETS.find((preset) => preset === inferredRatio) ?? DEFAULT_RATIO_PRESET;
}

/** Summary: This helper infers the new-word preset from one persisted plan snapshot and ratio. */
function inferNewWordPreset(plan: StudyPlan | null | undefined, ratioPreset: number) {
  if (!plan || !Number.isFinite(plan.dailyWordCount) || ratioPreset <= 0) {
    return DEFAULT_NEW_WORD_PRESET;
  }

  const inferredNewWordCount = plan.dailyWordCount / (ratioPreset + 1);
  return NEW_WORD_PRESETS.find((preset) => preset === inferredNewWordCount) ?? DEFAULT_NEW_WORD_PRESET;
}

/** Summary: This helper formats one forecast date for the user-facing summary card. */
function formatFinishDateLabel(requiredDays: number) {
  if (requiredDays === 0) {
    return '当前词库已完成';
  }

  const finishDate = new Date();
  finishDate.setDate(finishDate.getDate() + requiredDays);

  return `预计完成：${new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(finishDate)}`;
}

/** Summary: This component renders the study-plan settings form for the current book. */
export function PlansPage() {
  const queryClient = useQueryClient();
  const planQuery = useQuery({ queryKey: ['plan'], queryFn: api.getCurrentPlan });
  const booksQuery = useQuery({ queryKey: ['books'], queryFn: api.getBooks });
  const [selectedBookId, setSelectedBookId] = useState('');
  const [selectedRatioPreset, setSelectedRatioPreset] = useState<number>(DEFAULT_RATIO_PRESET);
  const [selectedNewWordPreset, setSelectedNewWordPreset] = useState<number>(DEFAULT_NEW_WORD_PRESET);
  const [isPresetSyncPending, setIsPresetSyncPending] = useState(false);
  const pendingSwitchBookIdRef = useRef('');
  const { register, handleSubmit, reset } = useForm<PlanFormValues>({ defaultValues: { articleStyle: 'EXAM' } });
  const selectedBook = booksQuery.data?.find((book) => book.id === selectedBookId);
  const activePlan = planQuery.data?.plan ?? null;
  const hasPlanForSelectedBook = activePlan?.bookId === selectedBookId;
  const reviewCount = selectedNewWordPreset * selectedRatioPreset;
  const totalDailyCount = selectedNewWordPreset + reviewCount;
  const hasSelectedBook = Boolean(selectedBook);
  const remainingNewWords = selectedBook ? Math.max(selectedBook.totalWordCount - selectedBook.learnedCount, 0) : null;
  const requiredDays = remainingNewWords === null ? null : remainingNewWords === 0 ? 0 : Math.ceil(remainingNewWords / selectedNewWordPreset);
  const finishDateLabel = requiredDays === null ? '请选择词库后查看预计完成日期' : formatFinishDateLabel(requiredDays);
  useEffect(
    /** Summary: This callback keeps the selected book aligned with the latest book list. */
    function syncSelectedBook() {
      const books = booksQuery.data;

      if (!books?.length) {
        return;
      }

      const activeBookId = planQuery.data?.activeBookId;
      const persistedBookId = planQuery.data?.plan?.bookId;
      const currentBookExists = books.some((book) => book.id === selectedBookId);
      const desiredBookId =
        (activeBookId && books.some((book) => book.id === activeBookId) ? activeBookId : null) ??
        (persistedBookId && books.some((book) => book.id === persistedBookId) ? persistedBookId : null) ??
        books[0].id;

      if (selectedBookId && currentBookExists && selectedBookId === desiredBookId) {
        return;
      }

      if (desiredBookId !== selectedBookId) {
        setSelectedBookId(desiredBookId);
      }
    },
    [booksQuery.data, planQuery.data?.activeBookId, planQuery.data?.plan?.bookId, selectedBookId]
  );

  useEffect(
    /** Summary: This callback resets the form whenever the latest plan snapshot arrives. */
    function syncPlanFormWithQuery() {
      reset({ articleStyle: planQuery.data?.plan?.articleStyle ?? 'EXAM' });
    },
    [planQuery.data?.plan?.articleStyle, reset]
  );

  useEffect(
    /** Summary: This callback keeps the ratio and new-word presets aligned with the selected book. */
    function syncSelectedPresets() {
      if (!selectedBookId) {
        return;
      }

      if (isPresetSyncPending) {
        return;
      }

      if (!hasPlanForSelectedBook) {
        setSelectedRatioPreset(DEFAULT_RATIO_PRESET);
        setSelectedNewWordPreset(DEFAULT_NEW_WORD_PRESET);
        setIsPresetSyncPending(false);
        return;
      }

      const nextRatioPreset = inferRatioPreset(activePlan);
      setSelectedRatioPreset(nextRatioPreset);
      setSelectedNewWordPreset(inferNewWordPreset(activePlan, nextRatioPreset));
      setIsPresetSyncPending(false);
    },
    [activePlan, hasPlanForSelectedBook, isPresetSyncPending, selectedBookId]
  );

  /** Summary: This helper snapshots the selected plan state into one stable request payload. */
  function createPlanSubmissionPayload(values: PlanFormValues): PlanSubmissionPayload | null {
    if (!selectedBookId) {
      return null;
    }

    return {
      bookId: selectedBookId,
      dailyWordCount: selectedNewWordPreset + selectedNewWordPreset * selectedRatioPreset,
      newWordRatio: 1,
      reviewWordRatio: selectedRatioPreset,
      articleStyle: values.articleStyle
    };
  }

  /** Summary: This function sends one stable plan payload to the backend. */
  async function savePlan(payload: PlanSubmissionPayload) {
    return api.updatePlan(payload);
  }

  /** Summary: This function switches the active book and returns its current saved plan snapshot. */
  async function switchSelectedBook(bookId: string) {
    return api.switchBook(bookId);
  }

  /** Summary: This function refreshes the cached plan data after a successful save. */
  async function handleSavePlanSuccess() {
    await queryClient.invalidateQueries({ queryKey: ['plan'] });
    await queryClient.invalidateQueries({ queryKey: ['books'] });
  }

  /** Summary: This function submits the current plan form through the mutation layer. */
  function submitPlanForm(values: PlanFormValues) {
    const payload = createPlanSubmissionPayload(values);

    if (!payload || isPresetSyncPending) {
      return;
    }

    mutation.mutate(payload);
  }

  const mutation = useMutation({
    mutationFn: savePlan,
    onSuccess: handleSavePlanSuccess
  });

  const switchBookMutation = useMutation({
    mutationFn: switchSelectedBook,
    onSuccess: (nextPlanSnapshot, requestedBookId) => {
      if (requestedBookId !== pendingSwitchBookIdRef.current) {
        return;
      }

      pendingSwitchBookIdRef.current = '';
      queryClient.setQueryData(['plan'], nextPlanSnapshot);
      setSelectedBookId(nextPlanSnapshot.activeBookId);
      setIsPresetSyncPending(false);
    },
    onError: (_error, requestedBookId) => {
      if (requestedBookId !== pendingSwitchBookIdRef.current) {
        return;
      }

      pendingSwitchBookIdRef.current = '';
      setIsPresetSyncPending(false);
    }
  });

  /** Summary: This function marks one vocabulary book card as selected. */
  function selectBook(bookId: string) {
    if (bookId === selectedBookId && !switchBookMutation.isPending) {
      return;
    }

    pendingSwitchBookIdRef.current = bookId;
    setIsPresetSyncPending(true);
    setSelectedBookId(bookId);
    switchBookMutation.mutate(bookId);
  }

  /** Summary: This function renders one official vocabulary book card. */
  function renderBookCard(book: VocabularyBookSummary) {
    const isSelected = book.id === selectedBookId;

    return (
      <div key={book.id} className={`rounded-2xl border p-4 transition ${isSelected ? 'border-coral bg-coral/10 shadow-sm' : 'border-black/10 bg-white hover:-translate-y-1 hover:border-coral'}`}>
        <div className="flex items-start justify-between gap-4">
          <button
            type="button"
            aria-pressed={isSelected}
            onClick={() => selectBook(book.id)}
            className="min-w-0 flex-1 text-left"
          >
            <h3 className="text-lg font-semibold">{book.title}</h3>
            <p className="mt-2 text-sm text-black/70">{book.description}</p>
            <p className="mt-3 text-sm text-black/70">
              {book.key} · 已学 {book.learnedCount} / 总词 {book.totalWordCount}
            </p>
          </button>
          <span className={`rounded-full px-3 py-1 text-xs ${isSelected ? 'bg-coral text-white' : 'bg-sand text-black/70'}`}>
            {isSelected ? '已选择' : '点击选择'}
          </span>
        </div>
        <Link
          to={`/books/${book.id}`}
          className="mt-4 inline-flex rounded-full border border-black/10 px-4 py-2 text-sm transition hover:border-coral hover:text-coral"
        >
          查看单词
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionCard title="官方词库">
        <div className="grid gap-4 md:grid-cols-3">{booksQuery.data?.map(renderBookCard)}</div>
      </SectionCard>
      <SectionCard title="学习计划">
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit(submitPlanForm)}>
          <div className="block md:col-span-2">
            <span className="mb-2 block text-sm">词库</span>
            <div className="rounded-2xl border border-black/10 bg-sand px-4 py-3">
              <div className="font-medium">{selectedBook?.title ?? '请选择一个词库'}</div>
              <div className="mt-1 text-sm text-black/70">
                {selectedBook ? `${selectedBook.key} · 已学 ${selectedBook.learnedCount} / 总词 ${selectedBook.totalWordCount}` : '点击上方卡片切换词库'}
              </div>
            </div>
          </div>
          <div className="md:col-span-2">
            <span className="mb-2 block text-sm">学习比例</span>
            <div className="grid gap-3 sm:grid-cols-4">
              {RATIO_PRESETS.map((ratioPreset) => {
                const isSelected = ratioPreset === selectedRatioPreset;

                return (
                  <button
                    key={ratioPreset}
                    type="button"
                    onClick={() => setSelectedRatioPreset(ratioPreset)}
                    className={`rounded-2xl border px-4 py-3 text-left transition ${isSelected ? 'border-coral bg-coral/10 text-coral shadow-sm' : 'border-black/10 bg-white hover:border-coral'}`}
                  >
                    <div className="text-lg font-semibold">1:{ratioPreset}</div>
                    <div className="mt-1 text-sm text-black/70">每学 1 个新词，复习 {ratioPreset} 个</div>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="md:col-span-2">
            <span className="mb-2 block text-sm">每日计划</span>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {NEW_WORD_PRESETS.map((newWordPreset) => {
                const optionReviewCount = newWordPreset * selectedRatioPreset;
                const optionTotalWordCount = newWordPreset + optionReviewCount;
                const isSelected = newWordPreset === selectedNewWordPreset;

                return (
                  <button
                    key={newWordPreset}
                    type="button"
                    onClick={() => setSelectedNewWordPreset(newWordPreset)}
                    className={`rounded-2xl border p-4 text-left transition ${isSelected ? 'border-coral bg-coral/10 shadow-sm' : 'border-black/10 bg-white hover:-translate-y-1 hover:border-coral'}`}
                  >
                    <div className="text-sm text-black/60">方案</div>
                    <div className="mt-2 text-2xl font-semibold">{newWordPreset}</div>
                    <div className="text-sm text-black/70">新词 / 天</div>
                    <div className="mt-4 space-y-1 text-sm text-black/70">
                      <div>复习词量：{optionReviewCount}</div>
                      <div>总词量：{optionTotalWordCount}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="rounded-2xl border border-black/10 bg-sand p-4 md:col-span-2">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-sm text-black/60">学习预估</div>
                <div className="mt-2 text-lg font-semibold">{finishDateLabel}</div>
                <div className="mt-1 text-sm text-black/70">
                  {!hasSelectedBook
                    ? '请先选择上方词库，再查看计划预测。'
                    : remainingNewWords === 0
                      ? '这本词库的新词已经学完，可以保持轻量复习节奏。'
                      : `按当前计划预计还需要 ${requiredDays} 天完成剩余新词。`}
                </div>
              </div>
              <div className="grid min-w-[220px] gap-2 text-sm text-black/70">
                <div className="rounded-2xl bg-white px-4 py-3">剩余新词：{remainingNewWords ?? '--'}</div>
                <div className="rounded-2xl bg-white px-4 py-3">每日总词量：{totalDailyCount}</div>
                <div className="rounded-2xl bg-white px-4 py-3">今日新词 / 复习：{selectedNewWordPreset} / {reviewCount}</div>
              </div>
            </div>
          </div>
          <label className="block md:col-span-2"><span className="mb-2 block text-sm">文章风格</span><select {...register('articleStyle')} className="w-full rounded-2xl border border-black/10 px-4 py-3"><option value="EXAM">考研 / CET 风格</option><option value="NEWS">News 风格</option><option value="TED">TED 风格</option></select></label>
          <button className="w-fit rounded-full bg-ink px-5 py-3 text-sand" disabled={!selectedBookId || isPresetSyncPending || mutation.isPending}>保存计划</button>
        </form>
      </SectionCard>
    </div>
  );
}
