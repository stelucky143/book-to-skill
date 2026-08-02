"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, LoaderCircle, SendHorizonal } from "lucide-react";
import ChatMessage from "@/components/ChatMessage";
import { Book, askBook, getBookDetails, getToken } from "@/lib/api";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  isTyping?: boolean;
}

function formatDate(date?: string) {
  if (!date) {
    return "Unknown";
  }

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return "Unknown";
  }

  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function BookChatPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const bookId = typeof params.id === "string" ? params.id : "";
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [book, setBook] = useState<Book | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome-message",
      role: "assistant",
      content: "Ask about key ideas, request summaries, or turn the book into a quiz. I will answer from the uploaded text.",
    },
  ]);
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!getToken()) {
      router.replace("/auth/signin");
      return;
    }

    const loadBook = async () => {
      try {
        setIsLoading(true);
        setError("");
        const details = await getBookDetails(bookId);
        setBook(details);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load this book.");
      } finally {
        setIsLoading(false);
      }
    };

    if (bookId) {
      void loadBook();
    }
  }, [bookId, router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const canChat = useMemo(() => book?.status === "ready", [book?.status]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || !bookId || !canChat || isSending) {
      return;
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmedQuestion,
    };
    const typingMessageId = `assistant-${Date.now()}`;

    setMessages((current) => [
      ...current,
      userMessage,
      {
        id: typingMessageId,
        role: "assistant",
        content: "",
        isTyping: true,
      },
    ]);
    setQuestion("");
    setIsSending(true);
    setError("");

    try {
      const { answer } = await askBook(bookId, trimmedQuestion);
      setMessages((current) =>
        current.map((message) =>
          message.id === typingMessageId
            ? {
                ...message,
                content: answer,
                isTyping: false,
              }
            : message
        )
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to get an answer right now.";
      setError(message);
      setMessages((current) =>
        current.map((entry) =>
          entry.id === typingMessageId
            ? {
                ...entry,
                content: `Error: ${message}`,
                isTyping: false,
              }
            : entry
        )
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-950 px-6 py-10 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-gray-300 transition hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>
        </div>

        {isLoading ? (
          <div className="flex min-h-[420px] items-center justify-center rounded-3xl border border-white/10 bg-gray-900/50">
            <LoaderCircle className="h-8 w-8 animate-spin text-indigo-300" />
          </div>
        ) : book ? (
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <aside className="rounded-3xl border border-white/10 bg-gray-900/70 p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-indigo-300">Book details</p>
              <h1 className="mt-4 text-3xl font-bold text-white">{book.title}</h1>
              <dl className="mt-6 space-y-4 text-sm text-gray-300">
                <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
                  <dt className="text-gray-500">Status</dt>
                  <dd className="capitalize text-white">{book.status}</dd>
                </div>
                <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
                  <dt className="text-gray-500">Format</dt>
                  <dd className="text-white">{(book.format || book.file_name?.split(".").pop() || "file").toUpperCase()}</dd>
                </div>
                <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
                  <dt className="text-gray-500">Added</dt>
                  <dd className="text-white">{formatDate(book.created_at)}</dd>
                </div>
                {book.author ? (
                  <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
                    <dt className="text-gray-500">Author</dt>
                    <dd className="text-white">{book.author}</dd>
                  </div>
                ) : null}
                {typeof book.pages === "number" ? (
                  <div className="flex items-center justify-between gap-4 pb-1">
                    <dt className="text-gray-500">Pages</dt>
                    <dd className="text-white">{book.pages}</dd>
                  </div>
                ) : null}
              </dl>

              {!canChat ? (
                <div className="mt-6 rounded-2xl border border-yellow-400/20 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-100">
                  This book is still processing. Return to the dashboard and wait for the status to become ready before chatting.
                </div>
              ) : null}
            </aside>

            <section className="flex min-h-[70vh] flex-col rounded-3xl border border-white/10 bg-gray-900/70">
              <div className="border-b border-white/10 px-6 py-5">
                <h2 className="text-xl font-semibold text-white">Chat with this book</h2>
                <p className="mt-1 text-sm text-gray-400">Ask for explanations, summaries, comparisons, and revision prompts.</p>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
                {messages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    role={message.role}
                    content={message.content}
                    isTyping={message.isTyping}
                  />
                ))}
                <div ref={bottomRef} />
              </div>

              <div className="border-t border-white/10 px-6 py-5">
                {error ? <p className="mb-3 text-sm text-red-300">{error}</p> : null}
                <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
                  <textarea
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    placeholder={canChat ? "Ask a question about this book..." : "Chat becomes available when processing is complete."}
                    rows={3}
                    disabled={!canChat || isSending}
                    className="min-h-[76px] flex-1 rounded-2xl border border-white/10 bg-gray-950 px-4 py-3 text-white outline-none transition placeholder:text-gray-500 focus:border-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                  <button
                    type="submit"
                    disabled={!canChat || isSending || !question.trim()}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-500 px-5 py-3 font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <SendHorizonal className="h-4 w-4" />}
                    Send
                  </button>
                </form>
              </div>
            </section>
          </div>
        ) : (
          <div className="rounded-3xl border border-red-400/20 bg-red-500/10 px-5 py-4 text-sm text-red-200">
            {error || "Book not found."}
          </div>
        )}
      </div>
    </main>
  );
}
