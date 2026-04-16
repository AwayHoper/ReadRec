import { Injectable, NotFoundException } from '@nestjs/common';
import { mapVocabularyItem } from '../../common/prisma/prisma-mappers.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';

@Injectable()
export class DictionaryService {
  constructor(private readonly prismaService: PrismaService) {}

  /** Summary: This method returns all official books with user-specific progress snapshots. */
  async getBooks(userId: string) {
    const [books, progressRows] = await Promise.all([
      this.prismaService.vocabularyBook.findMany({
        include: {
          _count: {
            select: {
              words: true
            }
          }
        },
        orderBy: {
          key: 'asc'
        }
      }),
      this.prismaService.userBookProgress.findMany({
        where: {
          userId
        }
      })
    ]);

    return books.map((book) => {
      const progress = progressRows.find((item) => item.bookId === book.id);
      return {
        id: book.id,
        key: book.key,
        title: book.title,
        description: book.description,
        learnedCount: Array.isArray(progress?.learnedWordIds) ? progress.learnedWordIds.length : 0,
        reviewedCount: Array.isArray(progress?.reviewedWordIds) ? progress.reviewedWordIds.length : 0,
        totalWordCount: book._count.words
      };
    });
  }

  /** Summary: This method returns one official book with its current plan and progress data. */
  async getBookDetail(userId: string, bookId: string) {
    const [book, progress, plan, words] = await Promise.all([
      this.prismaService.vocabularyBook.findUnique({
        where: {
          id: bookId
        }
      }),
      this.prismaService.userBookProgress.findUnique({
        where: {
          userId_bookId: {
            userId,
            bookId
          }
        }
      }),
      this.prismaService.studyPlan.findUnique({
        where: {
          userId_bookId: {
            userId,
            bookId
          }
        }
      }),
      this.getBookWords(userId, bookId)
    ]);

    if (!book) {
      throw new NotFoundException('词库不存在。');
    }

    return {
      id: book.id,
      key: book.key,
      title: book.title,
      description: book.description,
      progress: progress ? {
        userId: progress.userId,
        bookId: progress.bookId,
        learnedWordIds: Array.isArray(progress.learnedWordIds) ? progress.learnedWordIds : [],
        reviewedWordIds: Array.isArray(progress.reviewedWordIds) ? progress.reviewedWordIds : [],
        flaggedWordIds: Array.isArray(progress.flaggedWordIds) ? progress.flaggedWordIds : []
      } : null,
      plan: plan ? {
        id: plan.id,
        userId: plan.userId,
        bookId: plan.bookId,
        dailyWordCount: plan.dailyWordCount,
        newWordRatio: plan.newWordRatio,
        reviewWordRatio: plan.reviewWordRatio,
        articleStyle: plan.articleStyle
      } : null,
      words
    };
  }

  /** Summary: This method filters the book's words by learned, unlearned, or reviewed status. */
  async getBookWords(userId: string, bookId: string, status?: string) {
    const [progress, words] = await Promise.all([
      this.prismaService.userBookProgress.findUnique({
        where: {
          userId_bookId: {
            userId,
            bookId
          }
        }
      }),
      this.prismaService.vocabularyItem.findMany({
        where: {
          bookId
        },
        orderBy: {
          word: 'asc'
        }
      })
    ]);

    const learnedWordIds = Array.isArray(progress?.learnedWordIds) ? progress.learnedWordIds : [];
    const reviewedWordIds = Array.isArray(progress?.reviewedWordIds) ? progress.reviewedWordIds : [];

    return words
      .map((word) => mapVocabularyItem(word))
      .filter((word) => {
        if (status === 'learned') {
          return learnedWordIds.includes(word.id);
        }
        if (status === 'reviewed') {
          return reviewedWordIds.includes(word.id);
        }
        if (status === 'unlearned') {
          return !learnedWordIds.includes(word.id);
        }
        return true;
      });
  }
}
