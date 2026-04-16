import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard.js';
import { LearningService } from '../learning/learning.service.js';
import { DailySessionService } from './daily-session.service.js';

@Controller('daily-session')
@UseGuards(AuthGuard)
export class DailySessionController {
  constructor(
    private readonly dailySessionService: DailySessionService,
    private readonly learningService: LearningService
  ) {}

  /** Summary: This endpoint returns or initializes the user's current daily session. */
  @Get('today')
  getToday(@Req() request: Request & { user: { sub: string } }) {
    return this.dailySessionService.getTodaySession(request.user.sub);
  }

  /** Summary: This endpoint starts today's session and moves it into round one. */
  @Post('today/start')
  startToday(@Req() request: Request & { user: { sub: string } }) {
    return this.dailySessionService.startTodaySession(request.user.sub);
  }

  /** Summary: This endpoint returns today's generated articles. */
  @Get('today/articles')
  getTodayArticles(@Req() request: Request & { user: { sub: string } }) {
    return this.dailySessionService.getTodayArticles(request.user.sub);
  }

  /** Summary: This endpoint records the selected unknown words for one generated article. */
  @Post('today/articles/:articleId/selections')
  submitSelections(@Req() request: Request & { user: { sub: string } }, @Param('articleId') articleId: string, @Body('sessionWordIds') sessionWordIds: string[]) {
    return this.learningService.submitArticleSelections(request.user.sub, articleId, sessionWordIds ?? []);
  }
}