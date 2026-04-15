import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '../lib/mock-api';
import { SectionCard } from '../components/section-card';
import { SessionWordSummary } from '../types';

/** Summary: This component renders the round-one reading page and unknown-word selection flow. */
export function ReadRoundPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const sessionQuery = useQuery({ queryKey: ['session'], queryFn: api.getTodaySession });
  const [selectedSessionWordIds, setSelectedSessionWordIds] = useState<string[]>([]);

  /** Summary: This function submits the selected unknown words for round one. */
  async function submitRoundOneSelections() {
    return api.submitSelections(selectedSessionWordIds);
  }

  /** Summary: This function refreshes session data and moves the flow into round two after a successful submit. */
  async function handleRoundOneSubmitSuccess() {
    await queryClient.invalidateQueries({ queryKey: ['session'] });
    navigate('/learn/review');
  }

  const mutation = useMutation({
    mutationFn: submitRoundOneSelections,
    onSuccess: handleRoundOneSubmitSuccess
  });

  const selectableWords = useMemo(
    /** Summary: This callback derives the current selectable words from the session query result. */
    function deriveSelectableWords() {
      return sessionQuery.data?.words ?? [];
    },
    [sessionQuery.data]
  );

  /** Summary: This function toggles whether a session word is marked as unknown. */
  function toggleSelectedWord(sessionWordId: string) {
    setSelectedSessionWordIds((current) => current.includes(sessionWordId) ? current.filter((item) => item !== sessionWordId) : [...current, sessionWordId]);
  }

  /** Summary: This function triggers the round-one submit mutation. */
  function handleContinueToReview() {
    mutation.mutate();
  }

  /** Summary: This function renders one selectable word chip for the round-one page. */
  function renderSelectableWord(word: SessionWordSummary) {
    const isActive = selectedSessionWordIds.includes(word.id);
    return (
      <button key={word.id} type="button" onClick={function handleToggleWordSelection() { toggleSelectedWord(word.id); }} className={`rounded-full px-4 py-2 ${isActive ? 'bg-coral text-white' : 'bg-sand'}`}>
        {word.vocabularyItemId}
      </button>
    );
  }

  return (
    <div className="space-y-6">
      <SectionCard title="第一轮：语境阅读">
        <h1 className="mb-4 text-3xl font-bold">{sessionQuery.data?.articles[0]?.title}</h1>
        <p className="text-lg leading-8">{sessionQuery.data?.articles[0]?.content}</p>
      </SectionCard>
      <SectionCard title="选出不认识的词">
        <div className="flex flex-wrap gap-3">{selectableWords.map(renderSelectableWord)}</div>
        <button onClick={handleContinueToReview} className="mt-5 rounded-full bg-ink px-5 py-3 text-sand">进入第二轮</button>
      </SectionCard>
    </div>
  );
}