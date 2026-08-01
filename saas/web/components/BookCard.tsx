"use client";

import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { CalendarDays, LoaderCircle, MessageSquareText, Trash2 } from "lucide-react";
import { Book, deleteBook } from "@/lib/api";

interface BookCardProps {
  book: Book;
  onDeleted?: (id: string) => void;
}

const statusStyles: Record<string, string> = {
  processing: "border-yellow-400/20 bg-yellow-500/10 text-yellow-200",
  ready: "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
  failed: "border-red-400/20 bg-red-500/10 text-red-200",
};

function formatDate(date?: string) {
  if (!date) {
    return "Recently added";
  }

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return "Recently added";
  }

  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function BookCard({ book, onDeleted }: BookCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    if (!window.confirm(`Delete ${book.title}? This action cannot be undone.`)) {
      return;
    }

    try {
      setIsDeleting(true);
      setError("");
      await deleteBook(book.id);
      onDeleted?.(book.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete book.");
    } finally {
      setIsDeleting(false);
    }
  };

  const status = book.status || "processing";
  const format = (book.format || book.file_name?.split(".").pop() || "file").toUpperCase();

  return (
    <div className="rounded-3xl border border-white/10 bg-gray-900/70 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="mb-3 inline-flex rounded-full border border-indigo-400/20 bg-indigo-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-200">
            {format}
          </div>
          <h3 className="text-lg font-semibold text-white">{book.title}</h3>
        </div>
        <span
          className={clsx(
            "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold capitalize",
            statusStyles[status] || "border-white/10 bg-white/5 text-gray-200"
          )}
        >
          {status === "processing" ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : null}
          {status}
        </span>
      </div>

      <div className="mt-5 flex items-center gap-2 text-sm text-gray-400">
        <CalendarDays className="h-4 w-4" />
        <span>{formatDate(book.created_at)}</span>
      </div>

      {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}

      <div className="mt-6 flex items-center gap-3">
        <Link
          href={`/books/${book.id}`}
          className={clsx(
            "inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition",
            status === "ready"
              ? "bg-indigo-500 text-white hover:bg-indigo-400"
              : "cursor-not-allowed bg-gray-800 text-gray-400"
          )}
          aria-disabled={status !== "ready"}
          onClick={(event) => {
            if (status !== "ready") {
              event.preventDefault();
            }
          }}
        >
          <MessageSquareText className="h-4 w-4" />
          Chat
        </Link>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-gray-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isDeleting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
