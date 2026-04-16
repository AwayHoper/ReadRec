import { describe, expect, it } from "vitest";
import { selectDailyWords } from "../src/modules/daily-session/domain/daily-session-selector.js";

/** Summary: This callback verifies the ratio-driven daily word selection behavior. */
describe("selectDailyWords", function runSelectDailyWordsSuite() {
  /** Summary: This callback verifies that the selector respects the new and review ratio targets. */
  it("mixes new and review words according to the plan ratio", function verifyRatioSelection() {
    const result = selectDailyWords({
      dailyWordCount: 6,
      newWordRatio: 2,
      reviewWordRatio: 1,
      newWordIds: ["n1", "n2", "n3", "n4"],
      reviewWordIds: ["r1", "r2", "r3"],
      flaggedReviewWordIds: ["r3"]
    });

    expect(result).toHaveLength(6);
    expect(
      result.filter(
        /** Summary: This callback keeps only newly selected words for assertion. */
        function keepNewWords(item) {
          return item.type === "NEW";
        }
      )
    ).toHaveLength(4);
    expect(
      result.filter(
        /** Summary: This callback keeps only review words for assertion. */
        function keepReviewWords(item) {
          return item.type === "REVIEW";
        }
      )
    ).toHaveLength(2);
    expect(result[4]?.wordId).toBe("r3");
  });

  /** Summary: This callback verifies that the selector backfills from the remaining bucket when needed. */
  it("fills with remaining words when one bucket is not enough", function verifyBackfillSelection() {
    const result = selectDailyWords({
      dailyWordCount: 4,
      newWordRatio: 3,
      reviewWordRatio: 1,
      newWordIds: ["n1"],
      reviewWordIds: ["r1", "r2", "r3"],
      flaggedReviewWordIds: []
    });

    expect(result).toEqual([
      { wordId: "n1", type: "NEW" },
      { wordId: "r1", type: "REVIEW" },
      { wordId: "r2", type: "REVIEW" },
      { wordId: "r3", type: "REVIEW" }
    ]);
  });
});