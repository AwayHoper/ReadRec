import { NotFoundException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { DictionaryService } from "../src/modules/dictionary/dictionary.service.js";

/** Summary: This suite verifies dictionary reads come from Prisma while progress filtering still uses local session state. */
describe("DictionaryService", function runDictionaryServiceSuite() {
  /** Summary: This test verifies the books endpoint combines Prisma totals with in-memory user progress. */
  it("returns persisted books with computed totals and learned progress", async function verifyGetBooks() {
    const service = new DictionaryService(
      createPrismaServiceStub({
        vocabularyBook: {
          findMany: async () => [
            {
              id: "book-1",
              key: "cet4",
              title: "四级词库",
              description: "desc",
              _count: { words: 2 }
            }
          ]
        },
        userBookProgress: {
          findMany: async () => [
            {
              userId: "user-1",
              bookId: "book-1",
              learnedWordIds: ["w1"],
              reviewedWordIds: ["w1"],
              flaggedWordIds: []
            }
          ]
        }
      })
    );

    await expect(service.getBooks("user-1")).resolves.toEqual([
      {
        id: "book-1",
        key: "cet4",
        title: "四级词库",
        description: "desc",
        learnedCount: 1,
        reviewedCount: 1,
        totalWordCount: 2
      }
    ]);
  });

  /** Summary: This test verifies word filtering uses persisted words with local progress state. */
  it("filters persisted words by learned status", async function verifyGetBookWords() {
    const service = new DictionaryService(
      createPrismaServiceStub({
        userBookProgress: {
          findUnique: async () => ({
            userId: "user-1",
            bookId: "book-1",
            learnedWordIds: ["w2"],
            reviewedWordIds: [],
            flaggedWordIds: []
          })
        },
        vocabularyItem: {
          findMany: async () => [
            { id: "w1", bookId: "book-1", word: "signal", phonetic: null, partOfSpeech: "n.", definitions: ["信号"], senses: [{ partOfSpeech: "n.", definitions: ["信号"] }], examples: [] },
            { id: "w2", bookId: "book-1", word: "access", phonetic: null, partOfSpeech: "v.", definitions: ["获取"], senses: [{ partOfSpeech: "v.", definitions: ["获取"] }], examples: [] }
          ]
        }
      })
    );

    await expect(service.getBookWords("user-1", "book-1", "learned")).resolves.toEqual([
      { id: "w2", bookId: "book-1", word: "access", phonetic: "", partOfSpeech: "v.", definitions: ["获取"], senses: [{ partOfSpeech: "v.", definitions: ["获取"] }], examples: [] }
    ]);
    await expect(service.getBookWords("user-1", "book-1", "unlearned")).resolves.toEqual([
      { id: "w1", bookId: "book-1", word: "signal", phonetic: "", partOfSpeech: "n.", definitions: ["信号"], senses: [{ partOfSpeech: "n.", definitions: ["信号"] }], examples: [] }
    ]);
  });

  /** Summary: This test verifies missing books still raise a not-found error after the Prisma switch. */
  it("throws when the requested book does not exist", async function verifyMissingBook() {
    const service = new DictionaryService(
      createPrismaServiceStub({
        vocabularyBook: {
          findUnique: async () => null
        }
      })
    );

    await expect(service.getBookDetail("user-1", "missing-book")).rejects.toBeInstanceOf(NotFoundException);
  });
});

/** Summary: This helper creates the minimum PrismaService shape needed for dictionary tests. */
function createPrismaServiceStub(overrides?: Record<string, object>) {
  return {
    vocabularyBook: {
      findMany: async () => [],
      findUnique: async () => null,
      ...overrides?.vocabularyBook
    },
    vocabularyItem: {
      findMany: async () => [],
      ...overrides?.vocabularyItem
    },
    userBookProgress: {
      findMany: async () => [],
      findUnique: async () => null,
      ...overrides?.userBookProgress
    },
    studyPlan: {
      findUnique: async () => null,
      ...overrides?.studyPlan
    }
  };
}
