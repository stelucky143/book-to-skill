"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, LoaderCircle, LogOut, Plus, RefreshCcw } from "lucide-react";
import BookCard from "@/components/BookCard";
import { Book, UsageInfo, getToken, listBooks } from "@/lib/api";

function normalizeUsage(usage: UsageInfo | null, books: Book[]) {
  return {
    tier: usage?.tier ?? "Free",
    booksUsed: usage?.books_used ?? books.length,
    booksLimit: usage?.books_limit === undefined ? 2 : usage.books_limit,
    questionsThisMonth: usage?.questions_this_month ?? 0,
    questionsLimit: usage?.questions_limit === undefined ? 50 : usage.questions_limit,
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const [books, setBooks] = useState<Book[]>([]);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadBooks = useCallback(async (showLoading = false) => {
    try {
      setError("");
      if (showLoading) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }

      const result = await listBooks();
      setBooks(result.books);
      setUsage(result.usage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load your books.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/auth/signin");
      return;
    }

    void loadBooks(true);
  }, [loadBooks, router]);

  const hasProcessingBooks = books.some((book) => book.status === "processing");

  useEffect(() => {
    if (!hasProcessingBooks) {
      return;
    }

    const interval = window.setInterval(() => {
      void loadBooks(false);
    }, 3000);

    return () => window.clearInterval(interval);
  }, [hasProcessingBooks, loadBooks]);

  const usageSummary = useMemo(() => normalizeUsage(usage, books), [usage, books]);

  const handleSignOut = () => {
    localStorage.removeItem("bookskill_token");
    router.push("/auth/signin");
  };

  return (
    <main className="min-h-screen bg-gray-950 px-6 py-10 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-gray-900/70 p-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-indigo-300">Dashboard</p>
            <h1 className="mt-2 text-3xl font-bold text-white">Your AI reading workspace</h1>
            <p className="mt-2 text-gray-400">Upload books, monitor processing, and jump back into any chat.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void loadBooks(false)}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              {isRefreshing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
              Refresh
            </button>
            <Link
              href="/upload"
              className="inline-flex items-center gap-2 rounded-2xl bg-indigo-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400"
            >
              <Plus className="h-4 w-4" />
              Upload New Book
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-gray-900/70 p-5">
            <p className="text-sm text-gray-400">Plan</p>
            <p className="mt-2 text-2xl font-semibold text-white">{usageSummary.tier}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-gray-900/70 p-5">
            <p className="text-sm text-gray-400">Books used</p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {usageSummary.booksUsed} / {usageSummary.booksLimit ?? "Unlimited"}
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-gray-900/70 p-5">
            <p className="text-sm text-gray-400">Questions this month</p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {usageSummary.questionsThisMonth} / {usageSummary.questionsLimit ?? "Unlimited"}
            </p>
          </div>
        </section>

        {error ? <p className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p> : null}

        {isLoading ? (
          <div className="flex min-h-[320px] items-center justify-center rounded-3xl border border-white/10 bg-gray-900/50">
            <LoaderCircle className="h-8 w-8 animate-spin text-indigo-300" />
          </div>
        ) : books.length ? (
          <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {books.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                onDeleted={() => void loadBooks(false)}
              />
            ))}
          </section>
        ) : (
          <section className="flex min-h-[320px] flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-gray-900/50 px-6 text-center">
            <div className="rounded-2xl bg-indigo-500/15 p-4 text-indigo-300">
              <BookOpen className="h-8 w-8" />
            </div>
            <h2 className="mt-6 text-2xl font-semibold text-white">No books uploaded yet</h2>
            <p className="mt-3 max-w-md text-gray-400">Start by uploading a PDF, EPUB, or notes file. Once processing finishes, you can chat with it from here.</p>
            <Link
              href="/upload"
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-indigo-500 px-5 py-3 font-semibold text-white transition hover:bg-indigo-400"
            >
              <Plus className="h-4 w-4" />
              Upload your first book
            </Link>
          </section>
        )}
      </div>
    </main>
  );
}
