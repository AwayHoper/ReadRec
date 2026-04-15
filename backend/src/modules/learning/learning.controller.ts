import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard.js';
import { LearningService } from './learning.service.js';

@Controller('learning')
@UseGuards(AuthGuard)
export class LearningController {
  constructor(private readonly learningService: LearningService) {}

  /** Summary: This endpoint returns the current round-two review state. */
  @Get('review-round')
  getReviewRound(@Req() request: Request & { user: { sub: string } }) {
    return this.learningService.getReviewRound(request.user.sub);
  }

  /** Summary: This endpoint evaluates one round-two answer submission. */
  @Post('review-round/:sessionWordId/check')
  checkReviewAnswer(@Req() request: Request & { user: { sub: string } }, @Param('sessionWordId') sessionWordId: string, @Body('selectedOption') selectedOption: string) {
    return this.learningService.checkReviewAnswer(request.user.sub, sessionWordId, selectedOption);
  }

  /** Summary: This endpoint returns the current round-three reading questions. */
  @Get('reading-questions')
  getReadingQuestions(@Req() request: Request & { user: { sub: string } }) {
    return this.learningService.getReadingQuestions(request.user.sub);
  }

  /** Summary: This endpoint stores one reading-question answer. */
  @Post('reading-questions/:questionId/answer')
  answerQuestion(@Req() request: Request & { user: { sub: string } }, @Param('questionId') questionId: string, @Body('selectedOption') selectedOption: string) {
    return this.learningService.answerReadingQuestion(request.user.sub, questionId, selectedOption);
  }

  /** Summary: This endpoint marks the current daily learning flow as completed. */
  @Post('complete')
  complete(@Req() request: Request & { user: { sub: string } }) {
    return this.learningService.completeLearning(request.user.sub);
  }
}