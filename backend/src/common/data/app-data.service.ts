import { Injectable } from '@nestjs/common';
import { AppState, DailySessionRecord, StudyPlanRecord, UserBookProgressRecord, UserRecord, WrongBookEntryRecord } from '../domain/models.js';
import { createSeedState } from './seed-data.js';

@Injectable()
export class AppDataService {
  private readonly state: AppState = createSeedState();

  /** Summary: This method exposes the full in-memory application state to module services. */
  getState(): AppState {
    return this.state;
  }

  /** Summary: This method persists a user record in the in-memory store. */
  addUser(user: UserRecord): UserRecord {
    this.state.users.push(user);
    return user;
  }

  /** Summary: This method appends or replaces a study plan for one user and one book. */
  upsertPlan(plan: StudyPlanRecord): StudyPlanRecord {
    const index = this.state.plans.findIndex((item) => item.userId === plan.userId && item.bookId === plan.bookId);
    if (index >= 0) {
      this.state.plans[index] = plan;
      return this.state.plans[index];
    }
    this.state.plans.push(plan);
    return plan;
  }

  /** Summary: This method appends or replaces a user progress snapshot for one book. */
  upsertProgress(progress: UserBookProgressRecord): UserBookProgressRecord {
    const index = this.state.progress.findIndex((item) => item.userId === progress.userId && item.bookId === progress.bookId);
    if (index >= 0) {
      this.state.progress[index] = progress;
      return this.state.progress[index];
    }
    this.state.progress.push(progress);
    return progress;
  }

  /** Summary: This method appends or replaces one daily session snapshot. */
  upsertSession(session: DailySessionRecord): DailySessionRecord {
    const index = this.state.sessions.findIndex((item) => item.id === session.id);
    if (index >= 0) {
      this.state.sessions[index] = session;
      return this.state.sessions[index];
    }
    this.state.sessions.push(session);
    return session;
  }

  /** Summary: This method appends a wrong-book marker when it does not already exist. */
  addWrongBookEntry(entry: WrongBookEntryRecord): WrongBookEntryRecord {
    const exists = this.state.wrongBookEntries.some((item) => item.userId === entry.userId && item.vocabularyItemId === entry.vocabularyItemId);
    if (!exists) {
      this.state.wrongBookEntries.push(entry);
    }
    return entry;
  }
}