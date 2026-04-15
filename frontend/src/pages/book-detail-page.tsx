import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import * as api from '../lib/mock-api';
import { SectionCard } from '../components/section-card';
import { VocabularyBookSummary } from '../types';

/** Summary: This component renders a simple book detail view with word statistics. */
export function BookDetailPage() {
  const { bookId } = useParams();
  const booksQuery = useQuery({ queryKey: ['books'], queryFn: api.getBooks });
  const book = booksQuery.data?.find(
    /** Summary: This callback locates the active book for the current route parameter. */
    function matchRouteBook(item: VocabularyBookSummary) {
      return item.id === bookId;
    }
  );

  return (
    <SectionCard title="词库详情">
      <h1 className="text-2xl font-bold">{book?.title}</h1>
      <p className="mt-3 text-black/70">{book?.description}</p>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-sand p-4">总词数：{book?.totalWordCount}</div>
        <div className="rounded-2xl bg-sand p-4">已学：{book?.learnedCount}</div>
        <div className="rounded-2xl bg-sand p-4">已复习：{book?.reviewedCount}</div>
      </div>
    </SectionCard>
  );
}