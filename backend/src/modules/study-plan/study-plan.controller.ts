import { Body, Controller, Get, Post, Put, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard.js';
import { UpdateStudyPlanDto } from './dto/update-study-plan.dto.js';
import { StudyPlanService } from './study-plan.service.js';

@Controller('study-plans')
@UseGuards(AuthGuard)
export class StudyPlanController {
  constructor(private readonly studyPlanService: StudyPlanService) {}

  /** Summary: This endpoint returns the active study plan for the current user. */
  @Get('current')
  getCurrent(@Req() request: Request & { user: { sub: string } }) {
    return this.studyPlanService.getCurrentPlan(request.user.sub);
  }

  /** Summary: This endpoint updates the active study plan for the current user. */
  @Put('current')
  updateCurrent(@Req() request: Request & { user: { sub: string } }, @Body() dto: UpdateStudyPlanDto) {
    return this.studyPlanService.updateCurrentPlan(request.user.sub, dto);
  }

  /** Summary: This endpoint switches the active book and returns the matching plan. */
  @Post('switch-book')
  switchBook(@Req() request: Request & { user: { sub: string } }, @Body('bookId') bookId: string) {
    return this.studyPlanService.switchBook(request.user.sub, bookId);
  }
}