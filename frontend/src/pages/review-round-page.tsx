import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import * as api from '../lib/api';
import { SectionCard } from '../components/section-card';
import { DailySession, ReviewRound } from '../types';

/** Summary: This component renders the round-two vocabulary review and quiz loop. */
export function ReviewRoundPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const reviewQuery = useQuery({ queryKey: ['review-round'], queryFn: api.getReviewRounds });

  /** Summary: This function submits one round-two answer choice. */
  async function submitReviewAnswer(payload: { sessionWordId: string; selectedOption: string }) {
    return api.checkReviewAnswer(payload.sessionWordId, payload.selectedOption);
  }

  /** Summary: This function refreshes review data and advances to round three when unlocked. */
  async function handleReviewAnswerSuccess(session: DailySession) {
    await queryClient.invalidateQueries({ queryKey: ['review-round'] });
    if (session.status === 'ROUND_THREE') {
      navigate('/learn/questions');
    }
  }

  const mutation = useMutation({
    mutationFn: submitReviewAnswer,
    onSuccess: handleReviewAnswerSuccess
  });

  /** Summary: This function submits the selected option for one review card. */
  function handleChoiceSelection(sessionWordId: string, selectedOption: string) {
    mutation.mutate({ sessionWordId, selectedOption });
  }

  /** Summary: This function renders one answer choice button for a review card. */
  function renderChoice(round: ReviewRound, choice: string) {
    return (
      <button key={choice} onClick={function handleSelectReviewChoice() { handleChoiceSelection(round.sessionWordId, choice); }} className="rounded-2xl border border-black/10 px-4 py-3 text-left hover:border-coral">
        {choice}
      </button>
    );
  }

  /** Summary: This function renders one review card in the round-two page. */
  function renderReviewRound(round: ReviewRound) {
    return (
      <SectionCard key={round.sessionWordId} title={`第二轮：${round.word}`}>
        <p className="mb-3 text-sm text-black/60">{round.phonetic}</p>
        <p className="mb-4">注释：{round.definitions?.join(' / ')}</p>
        <div className="grid gap-3 md:grid-cols-2">{round.choices.map((choice) => renderChoice(round, choice))}</div>
      </SectionCard>
    );
  }

  return <div className="space-y-6">{reviewQuery.data?.rounds.map(renderReviewRound)}</div>;
}
