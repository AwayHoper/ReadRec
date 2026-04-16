import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import * as api from '../lib/api';
import { SectionCard } from '../components/section-card';

/** Summary: This component renders a simple book detail view with word statistics. */
export function BookDetailPage() {
  const { bookId } = useParams();
  const [page, setPage] = useState(1);
  const booksQuery = useQuery({ queryKey: ['books'], queryFn: api.getBooks });
  const activeBookId = bookId ?? '';
  const book = booksQuery.data?.find((item) => item.id === activeBookId);
  const isBookLoading = booksQuery.isPending;
  const isBookError = booksQuery.isError;
  const isBookNotFound = booksQuery.isSuccess && !book;
  const wordsQuery = useQuery({
    queryKey: ['book-words', activeBookId, page],
    queryFn: () => api.getBookWords(activeBookId, page, 50),
    enabled: Boolean(book)
  });
  const wordItems = wordsQuery.data?.items ?? [];
  const pagination = wordsQuery.data?.pagination;
  const currentPage = pagination?.page ?? page;
  const totalPages = pagination?.totalPages ?? 0;
  const hasPagination = totalPages > 0;

  useEffect(() => {
    setPage(1);
  }, [activeBookId]);

  return (
    <div className="space-y-6">
      <SectionCard title="词库详情">
        {isBookLoading ? (
          <p className="text-sm text-black/60">词库信息加载中...</p>
        ) : isBookError ? (
          <p className="text-sm text-black/60">词库信息加载失败，请稍后重试。</p>
        ) : isBookNotFound ? (
          <p className="text-sm text-black/60">未找到对应词库。</p>
        ) : book ? (
          <>
            <h1 className="text-2xl font-bold">{book.title}</h1>
            <p className="mt-3 text-black/70">{book.description}</p>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl bg-sand p-4">总词数：{book.totalWordCount}</div>
              <div className="rounded-2xl bg-sand p-4">已学：{book.learnedCount}</div>
              <div className="rounded-2xl bg-sand p-4">已复习：{book.reviewedCount}</div>
            </div>
          </>
        ) : null}
      </SectionCard>
      <SectionCard title="单词列表">
        {isBookLoading ? (
          <p className="text-sm text-black/60">词库信息加载中，暂时无法加载单词列表。</p>
        ) : isBookError ? (
          <p className="text-sm text-black/60">词库信息加载失败，暂时无法加载单词列表。</p>
        ) : isBookNotFound ? (
          <p className="text-sm text-black/60">未找到对应词库，无法加载单词列表。</p>
        ) : wordsQuery.isLoading ? (
          <p className="text-sm text-black/60">单词列表加载中...</p>
        ) : wordsQuery.isError ? (
          <p className="text-sm text-black/60">单词列表加载失败，请稍后重试。</p>
        ) : (
          <div className="space-y-4">
            {wordItems.length ? (
              <div className="grid gap-4">
                {wordItems.map((word) => (
                  <article key={word.id} className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-lg font-semibold">{word.word}</h3>
                        {word.partOfSpeech ? <p className="mt-1 text-sm text-black/60">{word.partOfSpeech}</p> : null}
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          word.isLearned ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {word.isLearned ? '已学习' : '未学习'}
                      </span>
                    </div>

                    <div className="mt-4 space-y-2 text-sm text-black/75">
                      {word.senses?.length ? (
                        word.senses.map((sense, index) => (
                          <div key={`${word.id}-sense-${index}`} className="rounded-xl bg-sand px-3 py-2">
                            <div className="font-medium">
                              {sense.partOfSpeech ? `${sense.partOfSpeech} · ` : ''}
                              {sense.definitions?.length ? sense.definitions.join(' / ') : '暂无释义'}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-xl bg-sand px-3 py-2">
                          {word.definitions?.length ? word.definitions.join(' / ') : '暂无释义'}
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="text-sm text-black/60">当前页没有单词。</p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/10 pt-4">
              <p className="text-sm text-black/60">{hasPagination ? `第 ${currentPage} / ${totalPages} 页` : '暂无分页数据'}</p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setPage((nextPage) => Math.max(1, nextPage - 1))}
                  disabled={!hasPagination || currentPage <= 1}
                  className="rounded-full border border-black/10 px-4 py-2 text-sm transition disabled:cursor-not-allowed disabled:opacity-50"
                >
                  上一页
                </button>
                <button
                  type="button"
                  onClick={() => setPage((nextPage) => nextPage + 1)}
                  disabled={!hasPagination || currentPage >= totalPages}
                  className="rounded-full border border-black/10 px-4 py-2 text-sm transition disabled:cursor-not-allowed disabled:opacity-50"
                >
                  下一页
                </button>
              </div>
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
