import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiContentModule } from './modules/ai-content/ai-content.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { DailySessionModule } from './modules/daily-session/daily-session.module.js';
import { DictionaryModule } from './modules/dictionary/dictionary.module.js';
import { LearningModule } from './modules/learning/learning.module.js';
import { StudyPlanModule } from './modules/study-plan/study-plan.module.js';
import { WrongBookModule } from './modules/wrong-book/wrong-book.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    DictionaryModule,
    StudyPlanModule,
    AiContentModule,
    LearningModule,
    DailySessionModule,
    WrongBookModule
  ]
})
export class AppModule {}