import { Injectable, NotFoundException } from '@nestjs/common';
import { AppDataService } from '../../common/data/app-data.service.js';
import { createId } from '../../common/utils/id.util.js';
import { AiContentService } from '../ai-content/ai-content.service.js';
import { evaluateReviewAnswer } from './domain/review-progress.js';

@Injectable()
export class LearningService {
  constructor(
    private readonly appDataService: AppDataService,
    private readonly aiContentService: AiContentService
  ) {}

  /** Summary: This method saves round-one selections and prepares the review-round state. */
  async submitArticleSelections(userId: string, articleId: string, sessionWordIds: string[]) {
    const session = this.getTodaySessionForUser(userId);
    const article = session.articles.find((item) => item.id === articleId);
    if (!article) {
      throw new NotFoundException('文章不存在。');
    }
    session.words.forEach((word) => {
      if (article.coveredWordIds.includes(word.vocabularyItemId)) {
        const isUnknown = sessionWordIds.includes(word.id);
        word.isSelectedUnknown = word.isSelectedUnknown || isUnknown;
        word.status = isUnknown ? 'NEEDS_REVIEW' : 'PASSED_ROUND_ONE';
      }
    });
    session.reviewRounds = session.words.filter((word) => word.isSelectedUnknown).map((word) => {
      const vocabularyItem = this.appDataService.getState().words.find((item) => item.id === word.vocabularyItemId)!;
      return {
        sessionWordId: word.id,
        choices: [vocabularyItem.definitions[0] ?? '正确释义', '错误释义 A', '错误释义 B', '错误释义 C'],
        correctAnswer: vocabularyItem.definitions[0] ?? '正确释义',
        explanation: `${vocabularyItem.word} 在本文语境中对应其基础释义。`,
        currentPhase: 'NOTES' as const,
        isPassed: false
      };
    });
    session.status = 'ROUND_TWO';
    if (session.reviewRounds.length === 0) {
      await this.ensureReadingQuestions(session.id);
      session.status = 'ROUND_THREE';
    }
    return this.appDataService.upsertSession(session);
  }

  /** Summary: This method returns the current review-round state for today's session. */
  getReviewRound(userId: string) {
    const session = this.getTodaySessionForUser(userId);
    return {
      sessionId: session.id,
      status: session.status,
      rounds: session.reviewRounds.map((round) => {
        const sessionWord = session.words.find((item) => item.id === round.sessionWordId)!;
        const vocabularyItem = this.appDataService.getState().words.find((item) => item.id === sessionWord.vocabularyItemId)!;
        return {
          ...round,
          word: vocabularyItem.word,
          phonetic: vocabularyItem.phonetic,
          definitions: vocabularyItem.definitions
        };
      })
    };
  }

  /** Summary: This method evaluates one review answer and unlocks round three when all words pass. */
  async checkReviewAnswer(userId: string, sessionWordId: string, selectedOption: string) {
    const session = this.getTodaySessionForUser(userId);
    const reviewRound = session.reviewRounds.find((item) => item.sessionWordId === sessionWordId);
    const sessionWord = session.words.find((item) => item.id === sessionWordId);
    if (!reviewRound || !sessionWord) {
      throw new NotFoundException('复习单词不存在。');
    }
    const evaluation = evaluateReviewAnswer({
      selectedOption,
      correctOption: reviewRound.correctAnswer,
      currentAttempts: sessionWord.reviewAttempts
    });
    sessionWord.reviewAttempts = evaluation.attempts;
    reviewRound.currentPhase = evaluation.nextPhase;
    reviewRound.isPassed = evaluation.isPassed;
    sessionWord.status = evaluation.isPassed ? 'PASSED_ROUND_TWO' : 'NEEDS_REVIEW';
    if (session.reviewRounds.every((item) => item.isPassed)) {
      await this.ensureReadingQuestions(session.id);
      session.status = 'ROUND_THREE';
    }
    return this.appDataService.upsertSession(session);
  }

  /** Summary: This method returns the generated round-three reading questions for today's session. */
  getReadingQuestions(userId: string) {
    const session = this.getTodaySessionForUser(userId);
    return session.readingQuestions;
  }

  /** Summary: This method records one reading-question answer for the current session. */
  answerReadingQuestion(userId: string, questionId: string, selectedOption: string) {
    const session = this.getTodaySessionForUser(userId);
    const question = session.readingQuestions.find((item) => item.id === questionId);
    if (!question) {
      throw new NotFoundException('阅读题不存在。');
    }
    const existingAnswerIndex = session.readingAnswers.findIndex((item) => item.questionId === questionId);
    const answer = {
      questionId,
      sessionWordId: question.sessionWordId,
      selectedOption,
      isCorrect: selectedOption === question.correctOption
    };
    if (existingAnswerIndex >= 0) {
      session.readingAnswers[existingAnswerIndex] = answer;
    } else {
      session.readingAnswers.push(answer);
    }
    if (session.readingAnswers.length === session.readingQuestions.length) {
      session.words.forEach((word) => {
        if (session.readingAnswers.some((item) => item.sessionWordId === word.id)) {
          word.status = 'PASSED_ROUND_THREE';
        }
      });
    }
    return this.appDataService.upsertSession(session);
  }

  /** Summary: This method completes today's learning flow and returns a summary payload. */
  completeLearning(userId: string) {
    const session = this.getTodaySessionForUser(userId);
    session.status = 'COMPLETED';
    const state = this.appDataService.getState();
    const progress = state.progress.find((item) => item.userId === userId && item.bookId === session.bookId)!;
    session.words.forEach((word) => {
      if (!progress.learnedWordIds.includes(word.vocabularyItemId)) {
        progress.learnedWordIds.push(word.vocabularyItemId);
      }
      if (!progress.reviewedWordIds.includes(word.vocabularyItemId)) {
        progress.reviewedWordIds.push(word.vocabularyItemId);
      }
    });
    this.appDataService.upsertProgress(progress);
    this.appDataService.upsertSession(session);
    return {
      session,
      words: session.words.map((word) => {
        const vocabularyItem = state.words.find((item) => item.id === word.vocabularyItemId)!;
        return {
          sessionWordId: word.id,
          wordId: vocabularyItem.id,
          word: vocabularyItem.word,
          definitions: vocabularyItem.definitions,
          selectedUnknown: word.isSelectedUnknown
        };
      })
    };
  }

  /** Summary: This method returns the current daily session for the given user. */
  private getTodaySessionForUser(userId: string) {
    const today = new Date().toISOString().slice(0, 10);
    const session = this.appDataService.getState().sessions.find((item) => item.userId === userId && item.sessionDate === today);
    if (!session) {
      throw new NotFoundException('今日学习尚未初始化。');
    }
    return session;
  }

  /** Summary: This method generates the round-three reading questions once the review round is finished. */
  private async ensureReadingQuestions(sessionId: string) {
    const state = this.appDataService.getState();
    const session = state.sessions.find((item) => item.id === sessionId)!;
    if (session.readingQuestions.length > 0) {
      return;
    }
    const selectedWords = session.words.filter((word) => word.isSelectedUnknown);
    if (selectedWords.length === 0) {
      return;
    }
    const firstArticle = session.articles[0];
    const questionDrafts = await this.aiContentService.generateReadingQuestions({
      articleTitle: firstArticle.title,
      articleContent: firstArticle.content,
      words: selectedWords.map((word) => {
        const vocabularyItem = state.words.find((item) => item.id === word.vocabularyItemId)!;
        return {
          sessionWordId: word.id,
          word: vocabularyItem.word,
          definitions: vocabularyItem.definitions
        };
      })
    });
    session.readingQuestions = questionDrafts.map((item) => ({
      id: createId('question'),
      sessionId,
      sessionWordId: item.sessionWordId,
      prompt: item.prompt,
      options: item.options,
      correctOption: item.correctOption,
      explanation: item.explanation,
      translation: item.translation
    }));
  }
}