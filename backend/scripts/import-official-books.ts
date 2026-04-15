import { readFileSync } from 'node:fs';

/** Summary: This function reads a local JSON word-book file and prints a normalized preview for future imports. */
function previewOfficialBookImport(filePath: string) {
  const content = readFileSync(filePath, 'utf8');
  const rows = JSON.parse(content) as Array<{ word: string; definitions: string[] }>;
  return rows.map((row) => ({
    word: row.word.trim().toLowerCase(),
    definitions: row.definitions
  }));
}

const targetPath = process.argv[2];
if (targetPath) {
  console.log(JSON.stringify(previewOfficialBookImport(targetPath), null, 2));
}