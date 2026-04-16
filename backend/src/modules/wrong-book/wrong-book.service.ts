import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';

@Injectable()
export class WrongBookService {
  constructor(private readonly prismaService: PrismaService) {}

  /** Summary: This method returns the user's wrong-book list with linked vocabulary details. */
  async getWrongBook(userId: string) {
    const entries = await this.prismaService.wrongBookEntry.findMany({
      where: {
        userId
      },
      include: {
        vocabularyItem: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return entries.map((entry) => ({
      id: entry.id,
      wordId: entry.vocabularyItem.id,
      word: entry.vocabularyItem.word,
      definitions: Array.isArray(entry.vocabularyItem.definitions) ? entry.vocabularyItem.definitions : [],
      phonetic: entry.vocabularyItem.phonetic ?? ''
    }));
  }

  /** Summary: This method marks words from the summary page into the user's wrong-book list. */
  async markWords(userId: string, vocabularyItemIds: string[]) {
    for (const vocabularyItemId of vocabularyItemIds) {
      await this.prismaService.wrongBookEntry.upsert({
        where: {
          userId_vocabularyItemId: {
            userId,
            vocabularyItemId
          }
        },
        update: {},
        create: {
          userId,
          vocabularyItemId
        }
      });
    }

    return this.getWrongBook(userId);
  }

  /** Summary: This method exports the wrong-book list as a plain-text payload. */
  async exportWrongBook(userId: string) {
    const lines = (await this.getWrongBook(userId)).map((item) => `${item.word}: ${item.definitions.join(' / ')}`);
    return {
      filename: 'wrong-book.txt',
      content: lines.join('\n')
    };
  }
}
