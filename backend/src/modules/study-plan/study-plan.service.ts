import { Injectable, NotFoundException } from '@nestjs/common';
import { AppDataService } from '../../common/data/app-data.service.js';
import { createId } from '../../common/utils/id.util.js';
import { UpdateStudyPlanDto } from './dto/update-study-plan.dto.js';

@Injectable()
export class StudyPlanService {
  constructor(private readonly appDataService: AppDataService) {}

  /** Summary: This method returns the current active book's study plan and progress snapshot. */
  getCurrentPlan(userId: string) {
    const state = this.appDataService.getState();
    const user = state.users.find((item) => item.id === userId);
    if (!user) {
      throw new NotFoundException('用户不存在。');
    }
    const plan = state.plans.find((item) => item.userId === userId && item.bookId === user.activeBookId);
    return {
      activeBookId: user.activeBookId,
      plan
    };
  }

  /** Summary: This method upserts the study plan for one book and activates that book for the user. */
  updateCurrentPlan(userId: string, dto: UpdateStudyPlanDto) {
    const state = this.appDataService.getState();
    const user = state.users.find((item) => item.id === userId);
    if (!user) {
      throw new NotFoundException('用户不存在。');
    }
    user.activeBookId = dto.bookId;
    const existingPlan = state.plans.find((item) => item.userId === userId && item.bookId === dto.bookId);
    const plan = this.appDataService.upsertPlan({
      id: existingPlan?.id ?? createId('plan'),
      userId,
      bookId: dto.bookId,
      dailyWordCount: dto.dailyWordCount,
      newWordRatio: dto.newWordRatio,
      reviewWordRatio: dto.reviewWordRatio,
      articleStyle: dto.articleStyle
    });
    this.appDataService.upsertProgress(state.progress.find((item) => item.userId === userId && item.bookId === dto.bookId) ?? {
      userId,
      bookId: dto.bookId,
      learnedWordIds: [],
      reviewedWordIds: [],
      flaggedWordIds: []
    });
    return {
      activeBookId: user.activeBookId,
      plan
    };
  }

  /** Summary: This method switches the active book and lazily creates default plan data when needed. */
  switchBook(userId: string, bookId: string) {
    const state = this.appDataService.getState();
    const user = state.users.find((item) => item.id === userId);
    if (!user) {
      throw new NotFoundException('用户不存在。');
    }
    user.activeBookId = bookId;
    const existingPlan = state.plans.find((item) => item.userId === userId && item.bookId === bookId);
    if (!existingPlan) {
      this.appDataService.upsertPlan({
        id: createId('plan'),
        userId,
        bookId,
        dailyWordCount: 6,
        newWordRatio: 2,
        reviewWordRatio: 1,
        articleStyle: 'EXAM'
      });
    }
    this.appDataService.upsertProgress(state.progress.find((item) => item.userId === userId && item.bookId === bookId) ?? {
      userId,
      bookId,
      learnedWordIds: [],
      reviewedWordIds: [],
      flaggedWordIds: []
    });
    return this.getCurrentPlan(userId);
  }
}