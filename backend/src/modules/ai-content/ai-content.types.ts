import { ArticleStyle } from '../../common/domain/models.js';

/** Summary: This interface describes the payload required to generate article snapshots. */
export interface GenerateArticlesInput {
  style: ArticleStyle;
  words: { id: string; word: string; definitions: string[] }[];
}
/** Summary: This interface describes one generated article snapshot returned by a provider. */
export interface GeneratedArticleDraft {
  title: string;
  content: string;
  summary: string;
  translation: string;
  coveredWordIds: string[];
}
/** Summary: This interface describes the payload required to generate reading questions. */
export interface GenerateReadingQuestionsInput {
  articleTitle: string;
  articleContent: string;
  words: { sessionWordId: string; word: string; definitions: string[] }[];
}
/** Summary: This interface describes one generated reading question draft returned by a provider. */
export interface GeneratedReadingQuestionDraft {
  sessionWordId: string;
  prompt: string;
  options: string[];
  correctOption: string;
  explanation: string;
  translation: string;
}
/** Summary: This interface defines the provider contract used by the AI content service. */
export interface AiProvider {
  generateArticles(input: GenerateArticlesInput): Promise<GeneratedArticleDraft[]>;
  generateReadingQuestions(input: GenerateReadingQuestionsInput): Promise<GeneratedReadingQuestionDraft[]>;
}