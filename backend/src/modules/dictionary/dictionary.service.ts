import { Injectable, NotFoundException } from '@nestjs/common';
import { AppDataService } from '../../common/data/app-data.service.js';
import { UserBookProgressRecord } from '../../common/domain/models.js';

@Injectable()
export class DictionaryService {
  constructor(private readonly appDataService: AppDataService) {}

  /** Summary: This method returns all official books with user-specific progress snapshots. */
  getBooks(userId: string) {
    const state = this.appDataService.getState();
    return state.books.map((book) => {
      const progress = state.progress.find((item) => item.userId === userId && item.bookId === book.id);
      return {
        ...book,
        learnedCount: progress?.learnedWordIds.length ?? 0,
        reviewedCount: progress?.reviewedWordIds.length ?? 0,
        totalWordCount: state.words.filter((word) => word.bookId === book.id).length
      };
    });
  }

  /** Summary: This method returns one official book with its current plan and progress data. */
  getBookDetail(userId: string, bookId: string) {
    const state = this.appDataService.getState();
    const book = state.books.find((item) => item.id === bookId);
    if (!book) {
      throw new NotFoundException('词库不存在。');
    }
    const progress = state.progress.find((item) => item.userId === userId && item.bookId === bookId);
    const plan = state.plans.find((item) => item.userId === userId && item.bookId === bookId);
    return {
      ...book,
      progress,
      plan,
      words: state.words.filter((item) => item.bookId === bookId)
    };
  }

  /** Summary: This method filters the book's words by learned, unlearned, or reviewed status. */
  getBookWords(userId: string, bookId: string, status?: string) {
    const state = this.appDataService.getState();
    const progress: UserBookProgressRecord = state.progress.find((item) => item.userId === userId && item.bookId === bookId) ?? {
      userId,
      bookId,
      learnedWordIds: [],
      reviewedWordIds: [],
      flaggedWordIds: []
    };
    return state.words.filter((word) => {
      if (word.bookId !== bookId) {
        return false;
      }
      if (status === 'learned') {
        return progress.learnedWordIds.includes(word.id);
      }
      if (status === 'reviewed') {
        return progress.reviewedWordIds.includes(word.id);
      }
      if (status === 'unlearned') {
        return !progress.learnedWordIds.includes(word.id);
      }
      return true;
    });
  }
}