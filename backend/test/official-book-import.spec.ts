import { describe, expect, it } from "vitest";
import { parseOfficialBookLine } from "../src/modules/dictionary/domain/official-book-import.js";

/** Summary: This suite verifies TXT word-book rows are parsed into structured senses for import. */
describe("parseOfficialBookLine", function runParseOfficialBookLineSuite() {
  /** Summary: This test verifies one line with multiple parts of speech keeps definition ownership grouped by sense. */
  it("groups definitions under their matching parts of speech", function verifyGroupedSenseParsing() {
    const result = parseOfficialBookLine("signal\tn. 信号 v. 发信号，打信号；示意");

    expect(result).toEqual({
      word: "signal",
      partOfSpeech: "n. v.",
      definitions: ["信号", "发信号", "打信号", "示意"],
      senses: [
        {
          partOfSpeech: "n.",
          definitions: ["信号"]
        },
        {
          partOfSpeech: "v.",
          definitions: ["发信号", "打信号", "示意"]
        }
      ]
    });
  });

  /** Summary: This test verifies a line with multiple definitions in multiple senses preserves each sense independently. */
  it("handles mixed adjective and noun definitions separately", function verifyMixedSenseParsing() {
    const result = parseOfficialBookLine("yellow\tadj. 黄的，黄色的 n. 黄色");

    expect(result).toEqual({
      word: "yellow",
      partOfSpeech: "adj. n.",
      definitions: ["黄的", "黄色的", "黄色"],
      senses: [
        {
          partOfSpeech: "adj.",
          definitions: ["黄的", "黄色的"]
        },
        {
          partOfSpeech: "n.",
          definitions: ["黄色"]
        }
      ]
    });
  });

  /** Summary: This test verifies stray marker characters from the source TXT do not leak into stored definitions. */
  it("strips standalone marker characters from definitions", function verifyMarkerCleanup() {
    const result = parseOfficialBookLine("passive\tadj. 被动的，消极的 <");

    expect(result).toEqual({
      word: "passive",
      partOfSpeech: "adj.",
      definitions: ["被动的", "消极的"],
      senses: [
        {
          partOfSpeech: "adj.",
          definitions: ["被动的", "消极的"]
        }
      ]
    });
  });
});
