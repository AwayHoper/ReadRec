import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import * as api from '../lib/mock-api';
import { SectionCard } from '../components/section-card';
import { StudyPlan, VocabularyBookSummary } from '../types';

/** Summary: This component renders the study-plan settings form for the current book. */
export function PlansPage() {
  const queryClient = useQueryClient();
  const planQuery = useQuery({ queryKey: ['plan'], queryFn: api.getCurrentPlan });
  const booksQuery = useQuery({ queryKey: ['books'], queryFn: api.getBooks });
  const { register, handleSubmit, reset } = useForm({ defaultValues: planQuery.data?.plan });

  useEffect(
    /** Summary: This callback resets the form whenever the latest plan snapshot arrives. */
    function syncPlanFormWithQuery() {
      if (planQuery.data?.plan) {
        reset(planQuery.data.plan);
      }
    },
    [planQuery.data, reset]
  );

  /** Summary: This function converts the form values into the normalized study plan payload. */
  async function savePlan(values: any) {
    return api.updatePlan({
      ...values,
      dailyWordCount: Number(values.dailyWordCount),
      newWordRatio: Number(values.newWordRatio),
      reviewWordRatio: Number(values.reviewWordRatio)
    });
  }

  /** Summary: This function refreshes the cached plan data after a successful save. */
  async function handleSavePlanSuccess() {
    await queryClient.invalidateQueries({ queryKey: ['plan'] });
  }

  /** Summary: This function submits the current plan form through the mutation layer. */
  function submitPlanForm(values: Partial<StudyPlan>) {
    mutation.mutate(values);
  }

  /** Summary: This function renders one vocabulary book option inside the selector. */
  function renderBookOption(book: VocabularyBookSummary) {
    return <option key={book.id} value={book.id}>{book.title}</option>;
  }

  const mutation = useMutation({
    mutationFn: savePlan,
    onSuccess: handleSavePlanSuccess
  });

  return (
    <SectionCard title="学习计划">
      <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit(submitPlanForm)}>
        <label className="block"><span className="mb-2 block text-sm">词库</span><select {...register('bookId')} className="w-full rounded-2xl border border-black/10 px-4 py-3">{booksQuery.data?.map(renderBookOption)}</select></label>
        <label className="block"><span className="mb-2 block text-sm">每日词量</span><input {...register('dailyWordCount')} className="w-full rounded-2xl border border-black/10 px-4 py-3" /></label>
        <label className="block"><span className="mb-2 block text-sm">新词比例</span><input {...register('newWordRatio')} className="w-full rounded-2xl border border-black/10 px-4 py-3" /></label>
        <label className="block"><span className="mb-2 block text-sm">复习比例</span><input {...register('reviewWordRatio')} className="w-full rounded-2xl border border-black/10 px-4 py-3" /></label>
        <label className="block md:col-span-2"><span className="mb-2 block text-sm">文章风格</span><select {...register('articleStyle')} className="w-full rounded-2xl border border-black/10 px-4 py-3"><option value="EXAM">考研 / CET 风格</option><option value="NEWS">News 风格</option><option value="TED">TED 风格</option></select></label>
        <button className="w-fit rounded-full bg-ink px-5 py-3 text-sand">保存计划</button>
      </form>
    </SectionCard>
  );
}