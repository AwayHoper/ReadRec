import { Module, forwardRef } from '@nestjs/common';
import { AiContentModule } from '../ai-content/ai-content.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { DictionaryModule } from '../dictionary/dictionary.module.js';
import { LearningModule } from '../learning/learning.module.js';
import { DailySessionController } from './daily-session.controller.js';
import { DailySessionService } from './daily-session.service.js';

@Module({
  imports: [AuthModule, DictionaryModule, AiContentModule, forwardRef(() => LearningModule)],
  controllers: [DailySessionController],
  providers: [DailySessionService],
  exports: [DailySessionService]
})
export class DailySessionModule {}