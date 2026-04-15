/** Summary: This interface captures the state needed to evaluate one review answer. */
export interface EvaluateReviewAnswerInput {
  selectedOption: string;
  correctOption: string;
  currentAttempts: number;
}
/** Summary: This interface captures the next review phase after evaluating one answer. */
export interface ReviewAnswerEvaluation {
  isPassed: boolean;
  nextPhase: 'NOTES' | 'PASSED';
  attempts: number;
}

/** Summary: This function evaluates one review-round answer and returns the next phase for the word. */
export function evaluateReviewAnswer(input: EvaluateReviewAnswerInput): ReviewAnswerEvaluation {
  const attempts = input.currentAttempts + 1;
  if (input.selectedOption === input.correctOption) {
    return {
      isPassed: true,
      nextPhase: 'PASSED',
      attempts
    };
  }
  return {
    isPassed: false,
    nextPhase: 'NOTES',
    attempts
  };
}