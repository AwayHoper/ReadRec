/** Summary: This interface describes the inputs used to select daily learning words. */
export interface SelectDailyWordsInput {
  dailyWordCount: number;
  newWordRatio: number;
  reviewWordRatio: number;
  newWordIds: string[];
  reviewWordIds: string[];
  flaggedReviewWordIds: string[];
}
/** Summary: This interface describes one selected word output item for a daily session. */
export interface SelectedDailyWord {
  wordId: string;
  type: 'NEW' | 'REVIEW';
}

/** Summary: This function computes the day's selected new and review words based on the configured ratio. */
export function selectDailyWords(input: SelectDailyWordsInput): SelectedDailyWord[] {
  const ratioTotal = input.newWordRatio + input.reviewWordRatio;
  const desiredNewCount = Math.round((input.dailyWordCount * input.newWordRatio) / Math.max(ratioTotal, 1));
  const newSelections = input.newWordIds.slice(0, desiredNewCount).map((wordId) => ({ wordId, type: 'NEW' as const }));
  const prioritizedReviewIds = [...input.flaggedReviewWordIds, ...input.reviewWordIds.filter((wordId) => !input.flaggedReviewWordIds.includes(wordId))];
  const desiredReviewCount = input.dailyWordCount - newSelections.length;
  const reviewSelections = prioritizedReviewIds.slice(0, desiredReviewCount).map((wordId) => ({ wordId, type: 'REVIEW' as const }));
  const selectedIds = new Set([...newSelections, ...reviewSelections].map((item) => item.wordId));
  const remainingNewSelections = input.newWordIds.filter((wordId) => !selectedIds.has(wordId)).map((wordId) => ({ wordId, type: 'NEW' as const }));
  const remainingReviewSelections = prioritizedReviewIds.filter((wordId) => !selectedIds.has(wordId)).map((wordId) => ({ wordId, type: 'REVIEW' as const }));
  return [...newSelections, ...reviewSelections, ...remainingNewSelections, ...remainingReviewSelections].slice(0, input.dailyWordCount);
}