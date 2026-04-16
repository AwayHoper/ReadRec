import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiContentService } from './ai-content.service.js';
import { MockAiProvider } from './mock-ai.provider.js';
import { OpenAiProvider } from './openai.provider.js';

@Module({
  imports: [ConfigModule],
  providers: [AiContentService, MockAiProvider, OpenAiProvider],
  exports: [AiContentService]
})
export class AiContentModule {}