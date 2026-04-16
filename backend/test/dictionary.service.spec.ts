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
  it("returns paginated words with learned-state derived from progress", async function verifyGetBookWords() {
    const service = new DictionaryService(
      createPrismaServiceStub({
        vocabularyBook: {
          findUnique: async () => ({
            id: "book-1",
            key: "cet4",
            title: "四级词库",
            description: "desc"
          })
        },
        userBookProgress: {
          findUnique: async () => ({
            userId: "user-1",
            bookId: "book-1",
            learnedWordIds: ["w1"],
            reviewedWordIds: [],
            flaggedWordIds: []
          })
        },
        vocabularyItem: {
          findMany: async () => [
            { id: "w1", bookId: "book-1", word: "alpha", phonetic: null, partOfSpeech: "n.", definitions: ["首位"], senses: [{ partOfSpeech: "n.", definitions: ["首位"] }], examples: [] },
            { id: "w2", bookId: "book-1", word: "beta", phonetic: null, partOfSpeech: "n.", definitions: ["第二"], senses: [{ partOfSpeech: "n.", definitions: ["第二"] }], examples: [] },
            { id: "w3", bookId: "book-1", word: "gamma", phonetic: null, partOfSpeech: "n.", definitions: ["第三"], senses: [{ partOfSpeech: "n.", definitions: ["第三"] }], examples: [] }
          ]
        }
      })
    );

    await expect(service.getBookWords("user-1", "book-1", undefined, 1, 2)).resolves.toEqual({
      items: [
        { id: "w1", bookId: "book-1", word: "alpha", phonetic: "", partOfSpeech: "n.", definitions: ["首位"], senses: [{ partOfSpeech: "n.", definitions: ["首位"] }], examples: [], isLearned: true },
        { id: "w2", bookId: "book-1", word: "beta", phonetic: "", partOfSpeech: "n.", definitions: ["第二"], senses: [{ partOfSpeech: "n.", definitions: ["第二"] }], examples: [], isLearned: false }
      ],
      pagination: {
        page: 1,
        pageSize: 2,
        total: 3,
        totalPages: 2
      }
    });
  });

  /** Summary: This test verifies learned filtering happens before pagination slices the result set. */
  it("filters learned words before paginating", async function verifyGetBookWordsByStatus() {
    const service = new DictionaryService(
      createPrismaServiceStub({
        vocabularyBook: {
          findUnique: async () => ({
            id: "book-1",
            key: "cet4",
            title: "四级词库",
            description: "desc"
          })
        },
        userBookProgress: {
          findUnique: async () => ({
            userId: "user-1",
            bookId: "book-1",
            learnedWordIds: ["w1"],
            reviewedWordIds: [],
            flaggedWordIds: []
          })
        },
        vocabularyItem: {
          findMany: async () => [
            { id: "w1", bookId: "book-1", word: "alpha", phonetic: null, partOfSpeech: "n.", definitions: ["首位"], senses: [{ partOfSpeech: "n.", definitions: ["首位"] }], examples: [] },
            { id: "w2", bookId: "book-1", word: "beta", phonetic: null, partOfSpeech: "n.", definitions: ["第二"], senses: [{ partOfSpeech: "n.", definitions: ["第二"] }], examples: [] },
            { id: "w3", bookId: "book-1", word: "gamma", phonetic: null, partOfSpeech: "n.", definitions: ["第三"], senses: [{ partOfSpeech: "n.", definitions: ["第三"] }], examples: [] }
          ]
        }
      })
    );

    await expect(service.getBookWords("user-1", "book-1", "learned", 1, 10)).resolves.toEqual({
      items: [
        { id: "w1", bookId: "book-1", word: "alpha", phonetic: "", partOfSpeech: "n.", definitions: ["首位"], senses: [{ partOfSpeech: "n.", definitions: ["首位"] }], examples: [], isLearned: true }
      ],
      pagination: {
        page: 1,
        pageSize: 10,
        total: 1,
        totalPages: 1
      }
    });
  });

  /** Summary: This test verifies missing books fail consistently for the words endpoint. */
  it("throws when the requested book does not exist for book words", async function verifyMissingBookWords() {
    const service = new DictionaryService(
      createPrismaServiceStub({
        vocabularyBook: {
          findUnique: async () => null
        }
      })
    );

    await expect(service.getBookWords("user-1", "missing-book")).rejects.toBeInstanceOf(NotFoundException);
  });

  /** Summary: This test verifies reviewed and unlearned filters are applied before pagination. */
  it("filters reviewed and unlearned words", async function verifyReviewedAndUnlearnedFilters() {
    const service = new DictionaryService(
      createPrismaServiceStub({
        vocabularyBook: {
          findUnique: async () => ({
            id: "book-1",
            key: "cet4",
            title: "四级词库",
            description: "desc"
          })
        },
        userBookProgress: {
          findUnique: async () => ({
            userId: "user-1",
            bookId: "book-1",
            learnedWordIds: ["w1"],
            reviewedWordIds: ["w2"],
            flaggedWordIds: []
          })
        },
        vocabularyItem: {
          findMany: async () => [
            { id: "w1", bookId: "book-1", word: "alpha", phonetic: null, partOfSpeech: "n.", definitions: ["首位"], senses: [{ partOfSpeech: "n.", definitions: ["首位"] }], examples: [] },
            { id: "w2", bookId: "book-1", word: "beta", phonetic: null, partOfSpeech: "v.", definitions: ["第二"], senses: [{ partOfSpeech: "v.", definitions: ["第二"] }], examples: [] },
            { id: "w3", bookId: "book-1", word: "gamma", phonetic: null, partOfSpeech: "adj.", definitions: ["第三"], senses: [{ partOfSpeech: "adj.", definitions: ["第三"] }], examples: [] }
          ]
        }
      })
    );

    await expect(service.getBookWords("user-1", "book-1", "reviewed", 1, 10)).resolves.toMatchObject({
      items: [
        {
          id: "w2",
          word: "beta",
          isLearned: false
        }
      ],
      pagination: {
        page: 1,
        pageSize: 10,
        total: 1,
        totalPages: 1
      }
    });

    await expect(service.getBookWords("user-1", "book-1", "unlearned", 1, 10)).resolves.toMatchObject({
      items: [
        {
          id: "w2",
          word: "beta",
          isLearned: false
        },
        {
          id: "w3",
          word: "gamma",
          isLearned: false
        }
      ],
      pagination: {
        page: 1,
        pageSize: 10,
        total: 2,
        totalPages: 1
      }
    });
  });

  /** Summary: This test verifies invalid pagination values fall back to normalized defaults. */
  it("normalizes invalid pagination inputs", async function verifyInvalidPaginationFallback() {
    const service = new DictionaryService(
      createPrismaServiceStub({
        vocabularyBook: {
          findUnique: async () => ({
            id: "book-1",
            key: "cet4",
            title: "四级词库",
            description: "desc"
          })
        },
        userBookProgress: {
          findUnique: async () => ({
            userId: "user-1",
            bookId: "book-1",
            learnedWordIds: [],
            reviewedWordIds: [],
            flaggedWordIds: []
          })
        },
        vocabularyItem: {
          findMany: async () => [
            { id: "w1", bookId: "book-1", word: "alpha", phonetic: null, partOfSpeech: "n.", definitions: ["首位"], senses: [{ partOfSpeech: "n.", definitions: ["首位"] }], examples: [] },
            { id: "w2", bookId: "book-1", word: "beta", phonetic: null, partOfSpeech: "n.", definitions: ["第二"], senses: [{ partOfSpeech: "n.", definitions: ["第二"] }], examples: [] }
          ]
        }
      })
    );

    await expect(service.getBookWords("user-1", "book-1", undefined, 0, -5)).resolves.toMatchObject({
      items: [
        {
          id: "w1",
          word: "alpha",
          isLearned: false
        },
        {
          id: "w2",
          word: "beta",
          isLearned: false
        }
      ],
      pagination: {
        page: 1,
        pageSize: 50,
        total: 2,
        totalPages: 1
      }
    });
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

  /** Summary: This test verifies the book detail response keeps words as a plain array. */
  it("returns plain words from book detail", async function verifyGetBookDetailWordsShape() {
    const service = new DictionaryService(
      createPrismaServiceStub({
        vocabularyBook: {
          findUnique: async () => ({
            id: "book-1",
            key: "cet4",
            title: "四级词库",
            description: "desc"
          })
        },
        userBookProgress: {
          findUnique: async () => ({
            userId: "user-1",
            bookId: "book-1",
            learnedWordIds: ["w1"],
            reviewedWordIds: [],
            flaggedWordIds: []
          })
        },
        studyPlan: {
          findUnique: async () => ({
            id: "plan-1",
            userId: "user-1",
            bookId: "book-1",
            dailyWordCount: 10,
            newWordRatio: 0.6,
            reviewWordRatio: 0.4,
            articleStyle: "standard"
          })
        },
        vocabularyItem: {
          findMany: async () => [
            { id: "w1", bookId: "book-1", word: "alpha", phonetic: null, partOfSpeech: "n.", definitions: ["首位"], senses: [{ partOfSpeech: "n.", definitions: ["首位"] }], examples: [] },
            { id: "w2", bookId: "book-1", word: "beta", phonetic: null, partOfSpeech: "n.", definitions: ["第二"], senses: [{ partOfSpeech: "n.", definitions: ["第二"] }], examples: [] }
          ]
        }
      })
    );

    const result = await service.getBookDetail("user-1", "book-1");

    expect(Array.isArray(result.words)).toBe(true);
    expect(result.words).toHaveLength(2);
    expect(result.words).toEqual([
      { id: "w1", bookId: "book-1", word: "alpha", phonetic: "", partOfSpeech: "n.", definitions: ["首位"], senses: [{ partOfSpeech: "n.", definitions: ["首位"] }], examples: [], isLearned: true },
      { id: "w2", bookId: "book-1", word: "beta", phonetic: "", partOfSpeech: "n.", definitions: ["第二"], senses: [{ partOfSpeech: "n.", definitions: ["第二"] }], examples: [], isLearned: false }
    ]);
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
