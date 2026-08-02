"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { ArrowLeft, LoaderCircle } from "lucide-react";
import UploadDropzone from "@/components/UploadDropzone";
import { getToken, uploadBook } from "@/lib/api";

const acceptedExtensions = ["pdf", "epub", "docx", "txt", "md"];
const maxFileSizeBytes = 50 * 1024 * 1024;

const extractionModes = [
  {
    id: "text",
    label: "Text-heavy book (faster)",
    description: "Optimized for standard prose, notes, and general nonfiction.",
  },
  {
    id: "technical",
    label: "Technical book (code/tables)",
    description: "Use when preserving code blocks, tables, and structured layouts matters more.",
  },
] as const;

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [slug, setSlug] = useState("");
  const [mode, setMode] = useState<(typeof extractionModes)[number]["id"]>("text");
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/auth/signin");
    }
  }, [router]);

  const fileDetails = useMemo(() => {
    if (!file) {
      return null;
    }

    return `${(file.size / (1024 * 1024)).toFixed(1)} MB · ${file.name.split(".").pop()?.toUpperCase() ?? "FILE"}`;
  }, [file]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!file) {
      setError("Please choose a file to upload.");
      return;
    }

    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!extension || !acceptedExtensions.includes(extension)) {
      setError("Unsupported file type. Please upload PDF, EPUB, DOCX, TXT, or MD files.");
      return;
    }

    if (file.size > maxFileSizeBytes) {
      setError("File is too large. The maximum size is 50MB.");
      return;
    }

    try {
      setIsSubmitting(true);
      setProgress(0);
      setStatus("Uploading your book...");

      await uploadBook({
        file,
        extractionMode: mode,
        slug: slug.trim() || undefined,
        onProgress: (nextProgress) => {
          setProgress(nextProgress);
          setStatus(nextProgress >= 100 ? "Processing book..." : `Uploading... ${nextProgress}%`);
        },
      });

      setProgress(100);
      setStatus("Upload complete. Redirecting to dashboard...");
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-950 px-6 py-10 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-gray-300 transition hover:text-white">
              <ArrowLeft className="h-4 w-4" />
              Back to dashboard
            </Link>
            <h1 className="mt-4 text-3xl font-bold text-white">Upload a new book</h1>
            <p className="mt-2 text-gray-400">Bring in study guides, textbooks, and notes, then chat with them after processing finishes.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 rounded-[2rem] border border-white/10 bg-gray-900/70 p-6 sm:p-8">
          <UploadDropzone file={file} onFileSelect={setFile} />

          {fileDetails ? <p className="text-sm text-gray-400">Selected file: {fileDetails}</p> : null}

          <div className="grid gap-4 md:grid-cols-2">
            {extractionModes.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setMode(option.id)}
                className={clsx(
                  "rounded-3xl border p-5 text-left transition",
                  mode === option.id
                    ? "border-indigo-400 bg-indigo-500/10 shadow-glow"
                    : "border-white/10 bg-gray-950/70 hover:border-white/20"
                )}
              >
                <p className="text-lg font-semibold text-white">{option.label}</p>
                <p className="mt-2 text-sm leading-6 text-gray-400">{option.description}</p>
              </button>
            ))}
          </div>

          <div>
            <label htmlFor="slug" className="mb-2 block text-sm font-medium text-gray-200">
              Custom slug <span className="text-gray-500">(optional)</span>
            </label>
            <input
              id="slug"
              type="text"
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              placeholder="my-operating-systems-notes"
              className="w-full rounded-2xl border border-white/10 bg-gray-950 px-4 py-3 text-white outline-none transition placeholder:text-gray-500 focus:border-indigo-400"
            />
          </div>

          {error ? <p className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p> : null}

          {(status || isSubmitting) ? (
            <div className="rounded-3xl border border-white/10 bg-gray-950/70 p-4">
              <div className="mb-3 flex items-center gap-3 text-sm text-gray-200">
                {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin text-indigo-300" /> : null}
                <span>{status || "Preparing upload..."}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-purple-400 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-semibold text-white transition hover:bg-white/10"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-500 px-5 py-3 font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              Upload book
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
