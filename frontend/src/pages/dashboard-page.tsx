import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import * as api from '../lib/api';
import { SectionCard } from '../components/section-card';

/** Summary: This component renders the authenticated dashboard with books, plan, and session status. */
export function DashboardPage() {
  const booksQuery = useQuery({ queryKey: ['books'], queryFn: api.getBooks });
  const planQuery = useQuery({ queryKey: ['plan'], queryFn: api.getCurrentPlan });
  const sessionQuery = useQuery({ queryKey: ['session'], queryFn: api.getTodaySession });
  const activeBook = booksQuery.data?.find((item) => item.id === planQuery.data?.activeBookId);

  return (
    <div className="space-y-6">
      <SectionCard title="今日学习">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-sand p-4">当前词库：{activeBook?.title ?? planQuery.data?.activeBookId}</div>
          <div className="rounded-2xl bg-sand p-4">学习状态：{sessionQuery.data?.status}</div>
          <div className="rounded-2xl bg-sand p-4">计划词量：{planQuery.data?.plan?.dailyWordCount ?? 0}</div>
        </div>
        <Link to="/learn/read" className="mt-5 inline-flex rounded-full bg-coral px-5 py-3 text-white">开始今天的三轮学习</Link>
      </SectionCard>
    </div>
  );
}
