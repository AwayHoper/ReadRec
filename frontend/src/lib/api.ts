import { AuthResponse, BookWordPage, DailySession, ReadingQuestion, ReviewRoundResponse, StudyPlan, UserProfile, VocabularyBookSummary, WrongBookEntry } from "../types";

const ACCESS_TOKEN_STORAGE_KEY = "readrec_access_token";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

/** Summary: This helper reads the current access token from local storage. */
export function getAccessToken() {
  return window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
}

/** Summary: This helper persists a fresh access token for later authenticated requests. */
export function setAccessToken(token: string) {
  window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
}

/** Summary: This helper clears the persisted access token during logout. */
export function clearAccessToken() {
  window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
}

/** Summary: This helper performs one JSON HTTP request against the ReadRec backend. */
async function request<T>(path: string, init?: RequestInit, includeAuth = true): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  const token = includeAuth ? getAccessToken() : null;
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers
  });

  if (response.status === 401) {
    clearAccessToken();
  }

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

/** Summary: This function registers a new user and stores the returned access token. */
export async function register(email: string, password: string): Promise<AuthResponse> {
  const response = await request<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password })
  }, false);
  setAccessToken(response.accessToken);
  return response;
}

/** Summary: This function logs in an existing user and stores the returned access token. */
export async function login(email: string, password: string): Promise<AuthResponse> {
  const response = await request<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  }, false);
  setAccessToken(response.accessToken);
  return response;
}

/** Summary: This function returns the currently authenticated user when a valid token exists. */
export async function me(): Promise<UserProfile | null> {
  if (!getAccessToken()) {
    return null;
  }

  try {
    return await request<UserProfile>("/auth/me");
  } catch (error) {
    if (!getAccessToken()) {
      return null;
    }
    throw error;
  }
}

/** Summary: This function returns all official vocabulary books from the backend. */
export async function getBooks() {
  return request<VocabularyBookSummary[]>("/books");
}

/** Summary: This function returns one page of words for the selected official book. */
export async function getBookWords(bookId: string, page?: number, pageSize?: number): Promise<BookWordPage> {
  const searchParams = new URLSearchParams();

  if (typeof page === "number") {
    searchParams.set("page", String(page));
  }

  if (typeof pageSize === "number") {
    searchParams.set("pageSize", String(pageSize));
  }

  const query = searchParams.toString();
  return request<BookWordPage>(`/books/${bookId}/words${query ? `?${query}` : ""}`);
}

/** Summary: This function returns the current persisted study plan snapshot. */
export async function getCurrentPlan() {
  return request<{ activeBookId: string; plan: StudyPlan | null }>("/study-plans/current");
}

/** Summary: This function updates the current study plan through the real backend API. */
export async function updatePlan(nextPlan: Omit<StudyPlan, "id" | "userId">) {
  return request<{ activeBookId: string; plan: StudyPlan }>("/study-plans/current", {
    method: "PUT",
    body: JSON.stringify(nextPlan)
  });
}

/** Summary: This function switches the active book and returns that book's plan snapshot. */
export async function switchBook(bookId: string) {
  return request<{ activeBookId: string; plan: StudyPlan | null }>("/study-plans/switch-book", {
    method: "POST",
    body: JSON.stringify({ bookId })
  });
}

/** Summary: This function returns or initializes today's persisted daily session. */
export async function getTodaySession(): Promise<DailySession> {
  return request<DailySession>("/daily-session/today");
}

/** Summary: This function submits one article's unknown-word selections for round one. */
export async function submitSelections(articleId: string, sessionWordIds: string[]) {
  return request<DailySession>(`/daily-session/today/articles/${articleId}/selections`, {
    method: "POST",
    body: JSON.stringify({ sessionWordIds })
  });
}

/** Summary: This function returns the current round-two review state. */
export async function getReviewRounds(): Promise<ReviewRoundResponse> {
  return request<ReviewRoundResponse>("/learning/review-round");
}

/** Summary: This function checks one round-two answer through the backend. */
export async function checkReviewAnswer(sessionWordId: string, selectedOption: string) {
  return request<DailySession>(`/learning/review-round/${sessionWordId}/check`, {
    method: "POST",
    body: JSON.stringify({ selectedOption })
  });
}

/** Summary: This function returns the current round-three reading questions. */
export async function getReadingQuestions(): Promise<ReadingQuestion[]> {
  return request<ReadingQuestion[]>("/learning/reading-questions");
}

/** Summary: This function submits one reading-question answer through the backend. */
export async function answerReadingQuestion(questionId: string, selectedOption: string) {
  return request(`/learning/reading-questions/${questionId}/answer`, {
    method: "POST",
    body: JSON.stringify({ selectedOption })
  });
}

/** Summary: This function completes today's learning flow and returns the backend summary payload. */
export async function completeLearning() {
  return request<{ session: DailySession; words: Array<{ sessionWordId: string; wordId: string; word: string; definitions: string[]; selectedUnknown: boolean }> }>("/learning/complete", {
    method: "POST"
  });
}

/** Summary: This function returns the persisted wrong-book list. */
export async function getWrongBook() {
  return request<WrongBookEntry[]>("/wrong-book");
}

/** Summary: This function marks selected words into the persisted wrong-book list. */
export async function markWrongBook(vocabularyItemIds: string[]) {
  return request<WrongBookEntry[]>("/wrong-book/mark", {
    method: "POST",
    body: JSON.stringify({ vocabularyItemIds })
  });
}

/** Summary: This function exports the persisted wrong-book list as a plain-text payload. */
export async function exportWrongBook() {
  return request<{ filename: string; content: string }>("/wrong-book/export");
}
