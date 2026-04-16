/** Summary: This interface describes the inputs used to select daily learning words. */
export interface SelectDailyWordsInput {
  dailyWordCount: number;
  newWordRatio: number;
  reviewWordRatio: number;
  newWordIds: string[];
  reviewWordIds: string[];
  prioritizedReviewWordIds: string[];
}
/** Summary: This interface describes one selected word output item for a daily session. */
export interface SelectedDailyWord {
  wordId: string;
  type: 'NEW' | 'REVIEW';
}

/** Summary: This function computes the day's selected new and review words based on the configured ratio. */
export function selectDailyWords(input: SelectDailyWordsInput): SelectedDailyWord[] {
  const ratioTotal = input.newWordRatio + input.reviewWordRatio;
  const desiredNewCount = ratioTotal === 0 ? 0 : Math.round((input.dailyWordCount * input.newWordRatio) / ratioTotal);
  const desiredReviewCount = input.dailyWordCount - desiredNewCount;

  const uniqueWordIds = (wordIds: string[]): string[] => {
    const seen = new Set<string>();
    return wordIds.filter((wordId) => {
      if (seen.has(wordId)) {
        return false;
      }
      seen.add(wordId);
      return true;
    });
  };

  const takeSelections = (wordIds: string[], count: number, selectedIds: Set<string>, type: 'NEW' | 'REVIEW'): SelectedDailyWord[] =>
    wordIds
      .filter((wordId) => !selectedIds.has(wordId))
      .slice(0, count)
      .map((wordId) => {
        selectedIds.add(wordId);
        return { wordId, type };
      });

  const selectedIds = new Set<string>();
  const newWordIds = uniqueWordIds(input.newWordIds);
  const reviewWordIds = uniqueWordIds([...input.prioritizedReviewWordIds, ...input.reviewWordIds]);

  const newSelections = takeSelections(newWordIds, desiredNewCount, selectedIds, 'NEW');
  const reviewSelections = takeSelections(reviewWordIds, desiredReviewCount, selectedIds, 'REVIEW');

  const newShortfall = desiredNewCount - newSelections.length;
  const reviewShortfall = desiredReviewCount - reviewSelections.length;

  const reviewBackfill = newShortfall > 0 ? takeSelections(reviewWordIds, newShortfall, selectedIds, 'REVIEW') : [];
  const newBackfill = reviewShortfall > 0 ? takeSelections(newWordIds, reviewShortfall, selectedIds, 'NEW') : [];

  return [...newSelections, ...reviewSelections, ...reviewBackfill, ...newBackfill].slice(0, input.dailyWordCount);
}
