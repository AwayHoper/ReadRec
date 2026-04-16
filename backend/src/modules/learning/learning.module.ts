import { Module, forwardRef } from '@nestjs/common';
import { AiContentModule } from '../ai-content/ai-content.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { DailySessionModule } from '../daily-session/daily-session.module.js';
import { LearningController } from './learning.controller.js';
import { LearningService } from './learning.service.js';

@Module({
  imports: [AuthModule, AiContentModule, forwardRef(() => DailySessionModule)],
  controllers: [LearningController],
  providers: [LearningService],
  exports: [LearningService]
})
export class LearningModule {}