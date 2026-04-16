import { readFileSync } from "node:fs";

export interface VocabularySenseImportRecord {
  partOfSpeech: string;
  definitions: string[];
}

export interface VocabularyItemImportRecord {
  word: string;
  partOfSpeech: string;
  definitions: string[];
  senses: VocabularySenseImportRecord[];
}

export interface OfficialBookImportMeta {
  key: string;
  title: string;
  description: string;
}

export interface OfficialBookImportRecord extends OfficialBookImportMeta {
  fileName: string;
  words: VocabularyItemImportRecord[];
}

const PART_OF_SPEECH_PATTERN = /([A-Za-z]+(?:\.\/[A-Za-z]+)*\.)/g;
const DEFINITION_SPLIT_PATTERN = /[；;，,、]/;

/** Summary: This function parses one TXT line into a normalized word record with grouped senses. */
export function parseOfficialBookLine(line: string): VocabularyItemImportRecord {
  const normalizedLine = line.replace(/^\uFEFF/, "").trim();
  const tabIndex = normalizedLine.indexOf("\t");
  const content = tabIndex >= 0
    ? {
        word: normalizedLine.slice(0, tabIndex).trim().toLowerCase(),
        payload: normalizedLine.slice(tabIndex + 1).replace(/\s+/g, " ").trim()
      }
    : parseSpaceSeparatedLine(normalizedLine);
  const matches = Array.from(content.payload.matchAll(PART_OF_SPEECH_PATTERN));

  if (matches.length === 0) {
    throw new Error(`Unable to find part-of-speech markers in line: ${line}`);
  }

  const senses = matches.map((match, index) => {
    const start = match.index ?? 0;
    const end = index + 1 < matches.length ? (matches[index + 1].index ?? content.payload.length) : content.payload.length;
    const partOfSpeech = match[1].trim();
    const definitions = splitDefinitions(content.payload.slice(start + partOfSpeech.length, end));

    if (definitions.length === 0) {
      throw new Error(`Unable to find definitions for ${content.word} (${partOfSpeech})`);
    }

    return {
      partOfSpeech,
      definitions
    };
  });

  return {
    word: content.word,
    partOfSpeech: senses.map((sense) => sense.partOfSpeech).join(" "),
    definitions: senses.flatMap((sense) => sense.definitions),
    senses
  };
}

/** Summary: This function parses a full TXT file into normalized import rows. */
export function parseOfficialBookContent(content: string): VocabularyItemImportRecord[] {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => parseOfficialBookLine(line));
}

/** Summary: This function reads a local official-book TXT file and parses all rows. */
export function parseOfficialBookFile(filePath: string): VocabularyItemImportRecord[] {
  return parseOfficialBookContent(readFileSync(filePath, "utf8"));
}

/** Summary: This function derives stable book metadata from the imported TXT filename. */
export function resolveOfficialBookMeta(fileName: string): OfficialBookImportMeta {
  if (fileName.includes("四级")) {
    return {
      key: "cet4",
      title: "大学英语四级词库",
      description: "从 txt 文件导入的 CET-4 官方词库。"
    };
  }
  if (fileName.includes("六级")) {
    return {
      key: "cet6",
      title: "大学英语六级词库",
      description: "从 txt 文件导入的 CET-6 官方词库。"
    };
  }
  if (fileName.includes("考研")) {
    return {
      key: "kaoyan-2",
      title: "考研英语二词库",
      description: "从 txt 文件导入的考研英语词库。"
    };
  }

  throw new Error(`Unsupported official book filename: ${fileName}`);
}

/** Summary: This function parses one line when the source row uses whitespace instead of a tab separator. */
function parseSpaceSeparatedLine(line: string): { word: string; payload: string } {
  const match = line.match(/^(\S+)\s+(.+)$/);
  if (!match) {
    throw new Error(`Unable to split word row: ${line}`);
  }

  return {
    word: match[1].trim().toLowerCase(),
    payload: match[2].replace(/\s+/g, " ").trim()
  };
}

/** Summary: This function turns one definition fragment into cleaned Chinese meaning strings. */
function splitDefinitions(fragment: string): string[] {
  return fragment
    .trim()
    .replace(/^[：:]+/, "")
    .replace(/(^|\s)<(?=[；;，,、]|$)/g, "$1")
    .split(DEFINITION_SPLIT_PATTERN)
    .map((item) => item.trim().replace(/\s*<\s*$/g, ""))
    .filter(Boolean);
}
