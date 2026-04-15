import { describe, expect, it } from "vitest";
import { evaluateReviewAnswer } from "../src/modules/learning/domain/review-progress.js";

/** Summary: This callback verifies how review-round answers transition between phases. */
describe("evaluateReviewAnswer", function runEvaluateReviewAnswerSuite() {
  /** Summary: This callback verifies that a correct answer immediately passes the word. */
  it("marks a correct answer as passed", function verifyCorrectAnswerFlow() {
    const result = evaluateReviewAnswer({
      selectedOption: "A",
      correctOption: "A",
      currentAttempts: 0
    });

    expect(result).toEqual({
      isPassed: true,
      nextPhase: "PASSED",
      attempts: 1
    });
  });

  /** Summary: This callback verifies that an incorrect answer returns the word to the notes phase. */
  it("sends an incorrect answer back to the note phase", function verifyIncorrectAnswerFlow() {
    const result = evaluateReviewAnswer({
      selectedOption: "B",
      correctOption: "A",
      currentAttempts: 1
    });

    expect(result).toEqual({
      isPassed: false,
      nextPhase: "NOTES",
      attempts: 2
    });
  });
});