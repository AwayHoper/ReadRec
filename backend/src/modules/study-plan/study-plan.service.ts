import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { UpdateStudyPlanDto } from './dto/update-study-plan.dto.js';

@Injectable()
export class StudyPlanService {
  constructor(private readonly prismaService: PrismaService) {}

  /** Summary: This method returns the current active book's study plan and progress snapshot. */
  async getCurrentPlan(userId: string) {
    const user = await this.prismaService.user.findUnique({
      where: {
        id: userId
      }
    });
    if (!user) {
      throw new NotFoundException('用户不存在。');
    }

    const activeBookId = user.activeBookId ?? '';
    const plan = activeBookId ? await this.prismaService.studyPlan.findUnique({
      where: {
        userId_bookId: {
          userId,
          bookId: activeBookId
        }
      }
    }) : null;

    return {
      activeBookId,
      plan
    };
  }

  /** Summary: This method upserts the study plan for one book and activates that book for the user. */
  async updateCurrentPlan(userId: string, dto: UpdateStudyPlanDto) {
    const [user, book] = await Promise.all([
      this.prismaService.user.findUnique({
        where: {
          id: userId
        }
      }),
      this.prismaService.vocabularyBook.findUnique({
        where: {
          id: dto.bookId
        }
      })
    ]);
    if (!user) {
      throw new NotFoundException('用户不存在。');
    }
    if (!book) {
      throw new NotFoundException('词库不存在。');
    }

    await this.prismaService.user.update({
      where: {
        id: userId
      },
      data: {
        activeBookId: dto.bookId
      }
    });

    const plan = await this.prismaService.studyPlan.upsert({
      where: {
        userId_bookId: {
          userId,
          bookId: dto.bookId
        }
      },
      update: {
        dailyWordCount: dto.dailyWordCount,
        newWordRatio: dto.newWordRatio,
        reviewWordRatio: dto.reviewWordRatio,
        articleStyle: dto.articleStyle
      },
      create: {
        userId,
        bookId: dto.bookId,
        dailyWordCount: dto.dailyWordCount,
        newWordRatio: dto.newWordRatio,
        reviewWordRatio: dto.reviewWordRatio,
        articleStyle: dto.articleStyle
      }
    });

    await this.prismaService.userBookProgress.upsert({
      where: {
        userId_bookId: {
          userId,
          bookId: dto.bookId
        }
      },
      update: {},
      create: {
        userId,
        bookId: dto.bookId,
        learnedWordIds: [],
        reviewedWordIds: [],
        flaggedWordIds: []
      }
    });

    return {
      activeBookId: dto.bookId,
      plan
    };
  }

  /** Summary: This method switches the active book and lazily creates default plan data when needed. */
  async switchBook(userId: string, bookId: string) {
    const [user, book] = await Promise.all([
      this.prismaService.user.findUnique({
        where: {
          id: userId
        }
      }),
      this.prismaService.vocabularyBook.findUnique({
        where: {
          id: bookId
        }
      })
    ]);
    if (!user) {
      throw new NotFoundException('用户不存在。');
    }
    if (!book) {
      throw new NotFoundException('词库不存在。');
    }

    await this.prismaService.user.update({
      where: {
        id: userId
      },
      data: {
        activeBookId: bookId
      }
    });

    await this.prismaService.studyPlan.upsert({
      where: {
        userId_bookId: {
          userId,
          bookId
        }
      },
      update: {},
      create: {
        userId,
        bookId,
        dailyWordCount: 6,
        newWordRatio: 2,
        reviewWordRatio: 1,
        articleStyle: 'EXAM'
      }
    });

    await this.prismaService.userBookProgress.upsert({
      where: {
        userId_bookId: {
          userId,
          bookId
        }
      },
      update: {},
      create: {
        userId,
        bookId,
        learnedWordIds: [],
        reviewedWordIds: [],
        flaggedWordIds: []
      }
    });

    return this.getCurrentPlan(userId);
  }
}
