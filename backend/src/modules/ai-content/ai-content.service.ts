import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MockAiProvider } from './mock-ai.provider.js';
import { OpenAiProvider } from './openai.provider.js';
import { GenerateArticlesInput, GenerateReadingQuestionsInput, GeneratedArticleDraft, GeneratedReadingQuestionDraft } from './ai-content.types.js';

@Injectable()
export class AiContentService {
  constructor(
    private readonly configService: ConfigService,
    private readonly mockAiProvider: MockAiProvider,
    private readonly openAiProvider: OpenAiProvider
  ) {}

  /** Summary: This method delegates article generation to the currently active AI provider. */
  async generateArticles(input: GenerateArticlesInput): Promise<GeneratedArticleDraft[]> {
    return this.getActiveProvider().generateArticles(input);
  }

  /** Summary: This method delegates reading-question generation to the currently active AI provider. */
  async generateReadingQuestions(input: GenerateReadingQuestionsInput): Promise<GeneratedReadingQuestionDraft[]> {
    return this.getActiveProvider().generateReadingQuestions(input);
  }

  /** Summary: This method selects the mock or OpenAI provider based on environment configuration. */
  private getActiveProvider() {
    return this.configService.get<string>('ACTIVE_AI_PROVIDER') === 'openai' ? this.openAiProvider : this.mockAiProvider;
  }
}