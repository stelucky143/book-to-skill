export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type BookStatus = "processing" | "ready" | "failed" | string;

export interface Book {
  id: string;
  title: string;
  slug?: string;
  format?: string;
  status: BookStatus;
  created_at?: string;
  updated_at?: string;
  author?: string;
  pages?: number;
  file_name?: string;
  metadata?: Record<string, unknown>;
}

export interface UsageInfo {
  tier?: string;
  books_used?: number;
  books_limit?: number | null;
  questions_this_month?: number;
  questions_limit?: number | null;
}

export interface BooksResult {
  books: Book[];
  usage: UsageInfo | null;
}

export interface AuthResponse {
  token: string;
}

export interface AskResponse {
  answer: string;
}

export interface UploadResponse {
  id?: string;
  book?: Book;
  message?: string;
}

function normalizePath(path: string) {
  if (/^https?:\/\//.test(path)) {
    return path;
  }

  return `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

function getErrorMessage(data: unknown, fallback: string) {
  if (typeof data === "string" && data.trim()) {
    return data;
  }

  if (data && typeof data === "object") {
    const candidate = (data as Record<string, unknown>).message ?? (data as Record<string, unknown>).error ?? (data as Record<string, unknown>).detail;
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate;
    }
  }

  return fallback;
}

async function parseResponseBody(response: Response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function handleUnauthorized() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("bookskill_token");
    window.location.href = "/auth/signin";
  }
}

export function getToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem("bookskill_token");
}

export async function apiFetch<T>(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  const token = getToken();

  if (token) {
    headers.set("Authorization", "Bearer " + token);
  }

  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(normalizePath(path), {
    ...options,
    headers,
  });

  if (response.status === 401) {
    handleUnauthorized();
    throw new Error("Your session has expired. Please sign in again.");
  }

  const data = await parseResponseBody(response);

  if (!response.ok) {
    throw new Error(getErrorMessage(data, "Request failed."));
  }

  return data as T;
}

export async function authenticate(mode: "signin" | "register", email: string, password: string): Promise<AuthResponse> {
  const data = await apiFetch<Record<string, unknown>>(mode === "signin" ? "/auth/login" : "/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  const token = data.token ?? data.access_token ?? data.jwt;
  if (typeof token !== "string" || !token) {
    throw new Error("Authentication succeeded, but no token was returned.");
  }

  return { token };
}

export async function listBooks(): Promise<BooksResult> {
  const data = await apiFetch<Record<string, unknown> | Book[]>("/books");

  if (Array.isArray(data)) {
    return { books: data, usage: null };
  }

  const books = Array.isArray(data.books)
    ? (data.books as Book[])
    : Array.isArray((data as Record<string, unknown>).items)
      ? ((data as Record<string, unknown>).items as Book[])
      : [];

  const usage = (data.usage as UsageInfo | undefined) ?? null;

  return { books, usage };
}

export async function getBookDetails(id: string): Promise<Book> {
  const data = await apiFetch<Book | { book: Book }>(`/books/${id}`);
  if (data && typeof data === "object" && "book" in data) {
    return data.book;
  }

  return data;
}

export async function askBook(bookId: string, question: string): Promise<AskResponse> {
  const data = await apiFetch<Record<string, unknown>>("/ask", {
    method: "POST",
    body: JSON.stringify({ book_id: bookId, question }),
  });

  const answer = data.answer ?? data.response ?? data.message;
  if (typeof answer !== "string") {
    throw new Error("The AI response could not be parsed.");
  }

  return { answer };
}

export async function deleteBook(id: string) {
  await apiFetch(`/books/${id}`, {
    method: "DELETE",
  });
}

interface UploadBookInput {
  file: File;
  extractionMode: string;
  slug?: string;
  onProgress?: (progress: number) => void;
}

export function uploadBook({ file, extractionMode, slug, onProgress }: UploadBookInput): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("extraction_mode", extractionMode);
  if (slug) {
    formData.append("slug", slug);
  }

  if (typeof window === "undefined") {
    return apiFetch<UploadResponse>("/upload", {
      method: "POST",
      body: formData,
    });
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", normalizePath("/upload"));

    const token = getToken();
    if (token) {
      xhr.setRequestHeader("Authorization", "Bearer " + token);
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      const raw = xhr.responseText;
      let parsed: unknown = null;
      try {
        parsed = raw ? JSON.parse(raw) : null;
      } catch {
        parsed = raw;
      }

      if (xhr.status === 401) {
        handleUnauthorized();
        reject(new Error("Your session has expired. Please sign in again."));
        return;
      }

      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(getErrorMessage(parsed, "Upload failed.")));
        return;
      }

      resolve((parsed as UploadResponse) ?? {});
    };

    xhr.onerror = () => reject(new Error("Upload failed. Please try again."));
    xhr.send(formData);
  });
}
