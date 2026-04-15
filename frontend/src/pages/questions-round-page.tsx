import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import * as api from '../lib/mock-api';
import { SectionCard } from '../components/section-card';
import { ReadingQuestion } from '../types';

/** Summary: This component renders the round-three reading question page. */
export function QuestionsRoundPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const questionsQuery = useQuery({ queryKey: ['questions'], queryFn: api.getReadingQuestions });

  /** Summary: This function submits one reading-question answer. */
  async function submitReadingAnswer(payload: { questionId: string; selectedOption: string }) {
    return api.answerReadingQuestion(payload.questionId, payload.selectedOption);
  }

  /** Summary: This function refreshes the reading-question cache after one answer is submitted. */
  async function handleReadingAnswerSuccess() {
    await queryClient.invalidateQueries({ queryKey: ['questions'] });
  }

  const mutation = useMutation({
    mutationFn: submitReadingAnswer,
    onSuccess: handleReadingAnswerSuccess
  });

  /** Summary: This function submits the selected option for the given reading question. */
  function handleQuestionOptionClick(questionId: string, selectedOption: string) {
    mutation.mutate({ questionId, selectedOption });
  }

  /** Summary: This function completes the question round and navigates to the summary page. */
  async function handleComplete() {
    await api.completeLearning();
    await queryClient.invalidateQueries({ queryKey: ['session'] });
    navigate('/learn/summary');
  }

  /** Summary: This function renders one answer option for a reading question. */
  function renderQuestionOption(question: ReadingQuestion, option: string) {
    return (
      <button key={option} onClick={function handleSelectQuestionOption() { handleQuestionOptionClick(question.id, option); }} className="rounded-2xl border border-black/10 px-4 py-3 text-left hover:border-coral">
        {option}
      </button>
    );
  }

  /** Summary: This function renders one reading question card in round three. */
  function renderQuestion(question: ReadingQuestion) {
    return (
      <SectionCard key={question.id} title="第三轮：阅读理解">
        <p className="mb-4 text-lg font-medium">{question.prompt}</p>
        <div className="grid gap-3 md:grid-cols-2">{question.options.map((option) => renderQuestionOption(question, option))}</div>
        <div className="mt-4 rounded-2xl bg-sand p-4 text-sm"><p>解析：{question.explanation}</p><p className="mt-2">译文：{question.translation}</p></div>
      </SectionCard>
    );
  }

  return (
    <div className="space-y-6">
      {questionsQuery.data?.map(renderQuestion)}
      <button onClick={handleComplete} className="rounded-full bg-ink px-5 py-3 text-sand">结束学习并进入总结</button>
    </div>
  );
}