import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import * as api from '../lib/mock-api';
import { SectionCard } from '../components/section-card';
import { SessionWordSummary } from '../types';

/** Summary: This component renders the daily summary and wrong-book marking UI. */
export function SummaryPage() {
  const sessionQuery = useQuery({ queryKey: ['session'], queryFn: api.getTodaySession });
  const [selectedWordIds, setSelectedWordIds] = useState<string[]>([]);

  /** Summary: This function submits the selected summary words into the wrong-book list. */
  async function submitWrongBookSelection() {
    return api.markWrongBook(selectedWordIds);
  }

  const mutation = useMutation({ mutationFn: submitWrongBookSelection });

  /** Summary: This function toggles whether a word is selected for the wrong-book list. */
  function toggleWrongBookWord(wordId: string) {
    setSelectedWordIds((current) => current.includes(wordId) ? current.filter((item) => item !== wordId) : [...current, wordId]);
  }

  /** Summary: This function triggers the wrong-book mutation from the summary page. */
  function handleMarkWrongBook() {
    mutation.mutate();
  }

  /** Summary: This function renders one summary word chip for wrong-book selection. */
  function renderSummaryWord(word: SessionWordSummary) {
    const isActive = selectedWordIds.includes(word.vocabularyItemId);
    return (
      <button key={word.id} onClick={function handleToggleSummaryWord() { toggleWrongBookWord(word.vocabularyItemId); }} className={`rounded-full px-4 py-2 ${isActive ? 'bg-coral text-white' : 'bg-sand'}`}>
        {word.vocabularyItemId}
      </button>
    );
  }

  return (
    <div className="space-y-6">
      <SectionCard title="学习总结">
        <p className="mb-4">请选择需要进入生词本的词。</p>
        <div className="flex flex-wrap gap-3">{sessionQuery.data?.words.map(renderSummaryWord)}</div>
        <button onClick={handleMarkWrongBook} className="mt-5 rounded-full bg-ink px-5 py-3 text-sand">加入生词本</button>
      </SectionCard>
    </div>
  );
}