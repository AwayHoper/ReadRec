import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import * as api from '../lib/mock-api';
import { SectionCard } from '../components/section-card';
import { VocabularyBookSummary } from '../types';

/** Summary: This component renders the authenticated dashboard with books, plan, and session status. */
export function DashboardPage() {
  const booksQuery = useQuery({ queryKey: ['books'], queryFn: api.getBooks });
  const planQuery = useQuery({ queryKey: ['plan'], queryFn: api.getCurrentPlan });
  const sessionQuery = useQuery({ queryKey: ['session'], queryFn: api.getTodaySession });

  /** Summary: This function renders one official vocabulary book card on the dashboard. */
  function renderBookCard(book: VocabularyBookSummary) {
    return (
      <Link key={book.id} to={`/books/${book.id}`} className="rounded-2xl border border-black/10 p-4 transition hover:-translate-y-1 hover:border-coral">
        <h3 className="text-lg font-semibold">{book.title}</h3>
        <p className="mt-2 text-sm text-black/70">{book.description}</p>
        <p className="mt-3 text-sm">已学 {book.learnedCount} / 总词 {book.totalWordCount}</p>
      </Link>
    );
  }

  return (
    <div className="space-y-6">
      <SectionCard title="今日学习">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-sand p-4">当前词库：{planQuery.data?.activeBookId}</div>
          <div className="rounded-2xl bg-sand p-4">学习状态：{sessionQuery.data?.status}</div>
          <div className="rounded-2xl bg-sand p-4">计划词量：{planQuery.data?.plan.dailyWordCount}</div>
        </div>
        <Link to="/learn/read" className="mt-5 inline-flex rounded-full bg-coral px-5 py-3 text-white">开始今天的三轮学习</Link>
      </SectionCard>
      <SectionCard title="官方词库">
        <div className="grid gap-4 md:grid-cols-3">{booksQuery.data?.map(renderBookCard)}</div>
      </SectionCard>
    </div>
  );
}