import { VocabularySenseRecord } from "../domain/models.js";

/** Summary: This helper normalizes JSON arrays from Prisma into a stable string-array shape. */
export function normalizeStringArray(input: unknown): string[] {
  return Array.isArray(input) ? input.filter((item): item is string => typeof item === "string") : [];
}

/** Summary: This helper normalizes stored JSON senses into grouped vocabulary-sense records. */
export function normalizeSenses(input: unknown): VocabularySenseRecord[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input.flatMap((item) => {
    if (typeof item !== "object" || item === null) {
      return [];
    }

    const sense = item as { partOfSpeech?: unknown; definitions?: unknown };
    if (typeof sense.partOfSpeech !== "string") {
      return [];
    }

    return [{
      partOfSpeech: sense.partOfSpeech,
      definitions: normalizeStringArray(sense.definitions)
    }];
  });
}

/** Summary: This helper converts a Prisma vocabulary item into the frontend/backend shared response shape. */
export function mapVocabularyItem(item: {
  id: string;
  bookId: string;
  word: string;
  phonetic: string | null;
  partOfSpeech: string | null;
  definitions: unknown;
  senses: unknown;
  examples: unknown;
}) {
  return {
    id: item.id,
    bookId: item.bookId,
    word: item.word,
    phonetic: item.phonetic ?? "",
    partOfSpeech: item.partOfSpeech ?? "",
    definitions: normalizeStringArray(item.definitions),
    senses: normalizeSenses(item.senses),
    examples: normalizeStringArray(item.examples)
  };
}

/** Summary: This helper builds the UTC day bounds used to query one user's current daily session. */
export function createTodayRange() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}
