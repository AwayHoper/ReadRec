import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { AiProvider, GenerateArticlesInput, GenerateReadingQuestionsInput, GeneratedArticleDraft, GeneratedReadingQuestionDraft } from './ai-content.types.js';

@Injectable()
export class OpenAiProvider implements AiProvider {
  /** Summary: This method throws a clear placeholder error until a production OpenAI integration is configured. */
  async generateArticles(_input: GenerateArticlesInput): Promise<GeneratedArticleDraft[]> {
    throw new InternalServerErrorException('OpenAI provider is not configured in this MVP environment.');
  }

  /** Summary: This method throws a clear placeholder error until a production OpenAI integration is configured. */
  async generateReadingQuestions(_input: GenerateReadingQuestionsInput): Promise<GeneratedReadingQuestionDraft[]> {
    throw new InternalServerErrorException('OpenAI provider is not configured in this MVP environment.');
  }
}