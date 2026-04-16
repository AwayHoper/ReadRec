import { readdirSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { Prisma, PrismaClient } from "@prisma/client";
import { config } from "dotenv";
import { parseOfficialBookFile, resolveOfficialBookMeta } from "../src/modules/dictionary/domain/official-book-import.js";

const backendDirectoryPath = process.cwd();
const rootDirectoryPath = resolve(backendDirectoryPath, "..");
const defaultWordsDirectoryPath = join(rootDirectoryPath, "words");

config({ path: join(backendDirectoryPath, ".env") });

/** Summary: This function imports all official TXT books into PostgreSQL using stable book keys and per-word upserts. */
async function importOfficialBooks() {
  const cliArguments = process.argv.slice(2);
  const dryRun = cliArguments.includes("--dry-run");
  const wordsDirectoryArgument = cliArguments.find((argument) => !argument.startsWith("--"));
  const wordsDirectoryPath = wordsDirectoryArgument ? resolve(wordsDirectoryArgument) : defaultWordsDirectoryPath;
  const files = readdirSync(wordsDirectoryPath)
    .filter((fileName) => extname(fileName).toLowerCase() === ".txt")
    .sort();
  const books = files.map((fileName) => ({
    fileName,
    ...resolveOfficialBookMeta(fileName),
    words: parseOfficialBookFile(join(wordsDirectoryPath, fileName))
  }));

  if (dryRun) {
    console.log(JSON.stringify(books, null, 2));
    return;
  }

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to import official books.");
  }

  const prisma = new PrismaClient();

  try {
    for (const book of books) {
      const uniqueWords = Array.from(
        book.words.reduce((wordMap, word) => wordMap.set(word.word, word), new Map<string, (typeof book.words)[number]>()).values()
      );
      const savedBook = await prisma.vocabularyBook.upsert({
        where: { key: book.key },
        update: {
          title: book.title,
          description: book.description
        },
        create: {
          key: book.key,
          title: book.title,
          description: book.description
        }
      });

      await prisma.vocabularyItem.deleteMany({
        where: {
          bookId: savedBook.id
        }
      });

      await prisma.vocabularyItem.createMany({
        data: uniqueWords.map((word) => ({
          bookId: savedBook.id,
          word: word.word,
          partOfSpeech: word.partOfSpeech,
          definitions: word.definitions,
          senses: word.senses as unknown as Prisma.InputJsonValue,
          examples: []
        }))
      });

      console.log(`Imported ${uniqueWords.length} words into ${book.title} (${book.key}).`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

await importOfficialBooks();
