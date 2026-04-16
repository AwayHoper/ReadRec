import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { StudyPlanController } from './study-plan.controller.js';
import { StudyPlanService } from './study-plan.service.js';

@Module({
  imports: [AuthModule],
  controllers: [StudyPlanController],
  providers: [StudyPlanService],
  exports: [StudyPlanService]
})
export class StudyPlanModule {}