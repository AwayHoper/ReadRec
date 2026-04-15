import { Injectable } from '@nestjs/common';
import { AiProvider, GenerateArticlesInput, GenerateReadingQuestionsInput, GeneratedArticleDraft, GeneratedReadingQuestionDraft } from './ai-content.types.js';

@Injectable()
export class MockAiProvider implements AiProvider {
  /** Summary: This method generates deterministic article drafts for the MVP and local development. */
  async generateArticles(input: GenerateArticlesInput): Promise<GeneratedArticleDraft[]> {
    const chunkSize = Math.max(1, Math.ceil(input.words.length / Math.min(input.words.length || 1, 3)));
    const chunks = Array.from({ length: Math.ceil(input.words.length / chunkSize) }, (_, index) => input.words.slice(index * chunkSize, (index + 1) * chunkSize));
    return chunks.map((chunk, index) => ({
      title: `${input.style} Article ${index + 1}`,
      content: `In this passage, ${chunk.map((item) => item.word).join(', ')} appear in a realistic reading context designed for ReadRec learners.`,
      summary: `This article reinforces ${chunk.map((item) => item.word).join(', ')} in a contextualized passage.`,
      translation: `这篇文章围绕 ${chunk.map((item) => item.word).join('、')} 构建语境化阅读内容。`,
      coveredWordIds: chunk.map((item) => item.id)
    }));
  }

  /** Summary: This method generates deterministic reading questions tied to selected unknown words. */
  async generateReadingQuestions(input: GenerateReadingQuestionsInput): Promise<GeneratedReadingQuestionDraft[]> {
    return input.words.map((item) => ({
      sessionWordId: item.sessionWordId,
      prompt: `Which option best matches the role of "${item.word}" in the passage "${input.articleTitle}"?`,
      options: [item.definitions[0] ?? '正确释义', '与语境无关的解释 A', '与语境无关的解释 B', '与语境无关的解释 C'],
      correctOption: item.definitions[0] ?? '正确释义',
      explanation: `${item.word} is used to express ${item.definitions[0] ?? 'its primary meaning'} in the article.`,
      translation: `${item.word} 在文章中表达的是“${item.definitions[0] ?? '正确释义'}”。`
    }));
  }
}