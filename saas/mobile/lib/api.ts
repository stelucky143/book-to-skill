import AsyncStorage from '@react-native-async-storage/async-storage';

export const API_URL = 'http://localhost:8000';

const TOKEN_KEY = 'bookskill_token';
const EMAIL_KEY = 'bookskill_email';

export type AuthResponse = {
  access_token: string;
};

export type RegisterResponse = {
  access_token?: string;
  message?: string;
};

export type BookStatus = 'processing' | 'ready' | 'failed' | string;

export type Book = {
  id: string;
  title: string;
  format?: string;
  status: BookStatus;
  created_at?: string;
  job_id?: string;
  [key: string]: unknown;
};

export type AskResponse = {
  answer?: string;
  response?: string;
  message?: string;
  [key: string]: unknown;
};

export type JobStatusResponse = {
  job_id?: string;
  status?: string;
  [key: string]: unknown;
};

export async function getToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function setToken(token: string) {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function clearToken() {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

export async function getStoredEmail() {
  return AsyncStorage.getItem(EMAIL_KEY);
}

export async function setStoredEmail(email: string) {
  await AsyncStorage.setItem(EMAIL_KEY, email);
}

export async function clearStoredEmail() {
  await AsyncStorage.removeItem(EMAIL_KEY);
}

async function getErrorMessage(response: Response) {
  try {
    const data = await response.json();
    return data?.detail || data?.message || data?.error || 'Request failed';
  } catch {
    return response.statusText || 'Request failed';
  }
}

async function parseResponse<T>(response: Response) {
  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  const text = await response.text();
  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = await getToken();
  const headers = new Headers(options.headers);

  if (token) {
    headers.set('Authorization', 'Bearer ' + token);
  }

  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  if (!isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });
}

export async function login(email: string, password: string) {
  const response = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  return parseResponse<AuthResponse>(response);
}

export async function register(email: string, password: string) {
  const response = await apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  return parseResponse<RegisterResponse>(response);
}

export async function listBooks() {
  const response = await apiFetch('/books');
  return parseResponse<Book[]>(response);
}

export async function getBook(id: string) {
  const response = await apiFetch(`/books/${id}`);
  return parseResponse<Book>(response);
}

export async function deleteBook(id: string) {
  const response = await apiFetch(`/books/${id}`, {
    method: 'DELETE',
  });

  return parseResponse<undefined>(response);
}

export async function askQuestion(bookId: string, question: string) {
  const response = await apiFetch('/ask', {
    method: 'POST',
    body: JSON.stringify({ book_id: bookId, question }),
  });

  return parseResponse<AskResponse>(response);
}

export async function getStatus(jobId: string) {
  const response = await apiFetch(`/status/${jobId}`);
  return parseResponse<JobStatusResponse>(response);
}
