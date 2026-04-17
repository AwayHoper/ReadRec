import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard.js';
import { DashboardService } from './dashboard.service.js';

@Controller('dashboard')
@UseGuards(AuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /** Summary: This endpoint returns the homepage aggregate for the current user. */
  @Get('home')
  getHome(@Req() request: Request & { user: { sub: string } }) {
    return this.dashboardService.getHome(request.user.sub);
  }
}
