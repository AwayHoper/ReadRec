import { describe, expect, it } from "vitest";
import { selectDailyWords } from "../src/modules/daily-session/domain/daily-session-selector.js";

/** Summary: This callback verifies the ratio-driven daily word selection behavior. */
describe("selectDailyWords", function runSelectDailyWordsSuite() {
  /** Summary: This callback verifies that words shared across the new and review pools are only selected once. */
  it("returns an overlapping word only once", function verifyOverlapDeduplication() {
    const result = selectDailyWords({
      dailyWordCount: 4,
      newWordRatio: 1,
      reviewWordRatio: 1,
      newWordIds: ["n1", "shared"],
      reviewWordIds: ["shared", "r1"],
      prioritizedReviewWordIds: []
    });

    expect(result.map((item) => item.wordId)).toEqual(["n1", "shared", "r1"]);
    expect(result.filter((item) => item.wordId === "shared")).toHaveLength(1);
  });

  /** Summary: This callback verifies that undersized pools stay unique and never exceed the daily limit. */
  it("keeps undersized pools unique and within the daily count", function verifyUndersizedPoolBounds() {
    const result = selectDailyWords({
      dailyWordCount: 5,
      newWordRatio: 1,
      reviewWordRatio: 1,
      newWordIds: ["n1", "n1", "shared"],
      reviewWordIds: ["shared", "r1", "r1"],
      prioritizedReviewWordIds: ["r1", "r1"]
    });

    expect(result).toHaveLength(3);
    expect(result.map((item) => item.wordId)).toEqual(["n1", "shared", "r1"]);
    expect(new Set(result.map((item) => item.wordId)).size).toBe(result.length);
    expect(result.length).toBeLessThanOrEqual(5);
  });

  /** Summary: This callback verifies that the selector treats dailyWordCount as the full daily volume. */
  it("splits the daily total according to the configured ratio", function verifyRatioSelection() {
    const result = selectDailyWords({
      dailyWordCount: 5,
      newWordRatio: 2,
      reviewWordRatio: 1,
      newWordIds: ["n1", "n2", "n3", "n4"],
      reviewWordIds: ["r1", "r2", "r3"],
      prioritizedReviewWordIds: ["r3"]
    });

    expect(result).toHaveLength(5);
    expect(
      result.filter(
        /** Summary: This callback keeps only newly selected words for assertion. */
        function keepNewWords(item) {
          return item.type === "NEW";
        }
      )
    ).toHaveLength(3);
    expect(
      result.filter(
        /** Summary: This callback keeps only review words for assertion. */
        function keepReviewWords(item) {
          return item.type === "REVIEW";
        }
      )
    ).toHaveLength(2);
    expect(result.slice(3).map((item) => item.wordId)).toEqual(["r3", "r1"]);
  });

  /** Summary: This callback verifies that prioritized review ids are consumed before the regular review pool. */
  it("prefers prioritized review ids ahead of regular review ids", function verifyPrioritizedReviewOrdering() {
    const result = selectDailyWords({
      dailyWordCount: 3,
      newWordRatio: 0,
      reviewWordRatio: 1,
      newWordIds: [],
      reviewWordIds: ["r1", "r2", "r3"],
      prioritizedReviewWordIds: ["r3", "r2"]
    });

    expect(result).toEqual([
      { wordId: "r3", type: "REVIEW" },
      { wordId: "r2", type: "REVIEW" },
      { wordId: "r1", type: "REVIEW" }
    ]);
  });

  /** Summary: This callback verifies that the selector backfills from the remaining bucket when needed. */
  it("fills with remaining words when one bucket is not enough", function verifyBackfillSelection() {
    const result = selectDailyWords({
      dailyWordCount: 4,
      newWordRatio: 1,
      reviewWordRatio: 3,
      newWordIds: ["n1", "n2", "n3"],
      reviewWordIds: ["r1"],
      prioritizedReviewWordIds: ["r1"]
    });

    expect(result).toEqual([
      { wordId: "n1", type: "NEW" },
      { wordId: "r1", type: "REVIEW" },
      { wordId: "n2", type: "NEW" },
      { wordId: "n3", type: "NEW" }
    ]);
  });

  /** Summary: This callback verifies the zero-ratio fallback still fills the daily quota. */
  it("falls back to review-first selection when both ratios are zero", function verifyZeroRatioFallback() {
    const result = selectDailyWords({
      dailyWordCount: 3,
      newWordRatio: 0,
      reviewWordRatio: 0,
      newWordIds: ["n1", "n2"],
      reviewWordIds: ["r1"],
      prioritizedReviewWordIds: ["r1"]
    });

    expect(result).toEqual([
      { wordId: "r1", type: "REVIEW" },
      { wordId: "n1", type: "NEW" },
      { wordId: "n2", type: "NEW" }
    ]);
  });
});
