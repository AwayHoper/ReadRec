import { Injectable } from '@nestjs/common';
import { AppDataService } from '../../common/data/app-data.service.js';
import { createId } from '../../common/utils/id.util.js';

@Injectable()
export class WrongBookService {
  constructor(private readonly appDataService: AppDataService) {}

  /** Summary: This method returns the user's wrong-book list with linked vocabulary details. */
  getWrongBook(userId: string) {
    const state = this.appDataService.getState();
    return state.wrongBookEntries.filter((item) => item.userId === userId).map((entry) => {
      const word = state.words.find((item) => item.id === entry.vocabularyItemId)!;
      return {
        id: entry.id,
        wordId: word.id,
        word: word.word,
        definitions: word.definitions,
        phonetic: word.phonetic
      };
    });
  }

  /** Summary: This method marks words from the summary page into the user's wrong-book list. */
  markWords(userId: string, vocabularyItemIds: string[]) {
    vocabularyItemIds.forEach((vocabularyItemId) => {
      this.appDataService.addWrongBookEntry({
        id: createId('wrong-book'),
        userId,
        vocabularyItemId
      });
    });
    return this.getWrongBook(userId);
  }

  /** Summary: This method exports the wrong-book list as a plain-text payload. */
  exportWrongBook(userId: string) {
    const lines = this.getWrongBook(userId).map((item) => `${item.word}: ${item.definitions.join(' / ')}`);
    return {
      filename: 'wrong-book.txt',
      content: lines.join('\n')
    };
  }
}