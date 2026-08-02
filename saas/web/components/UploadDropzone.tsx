"use client";

import { useRef, useState } from "react";
import clsx from "clsx";
import { CloudUpload, FileText } from "lucide-react";

interface UploadDropzoneProps {
  file: File | null;
  onFileSelect: (file: File | null) => void;
  accept?: string;
  maxSizeMB?: number;
}

export default function UploadDropzone({
  file,
  onFileSelect,
  accept = ".pdf,.epub,.docx,.txt,.md",
  maxSizeMB = 50,
}: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = (nextFile: File | undefined) => {
    onFileSelect(nextFile ?? null);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        setIsDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
        handleFile(event.dataTransfer.files?.[0]);
      }}
      className={clsx(
        "group flex cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed px-6 py-12 text-center transition",
        isDragging
          ? "border-indigo-400 bg-indigo-500/10 shadow-glow"
          : "border-white/15 bg-white/[0.03] hover:border-indigo-300/60 hover:bg-white/[0.05]"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(event) => handleFile(event.target.files?.[0])}
      />

      <div className="mb-4 rounded-2xl bg-indigo-500/15 p-4 text-indigo-300">
        <CloudUpload className="h-8 w-8" />
      </div>
      <h3 className="text-xl font-semibold text-white">Drag and drop your book</h3>
      <p className="mt-2 max-w-xl text-sm leading-6 text-gray-400">
        Upload PDF, EPUB, DOCX, TXT, or Markdown files up to {maxSizeMB}MB, or click to browse from your device.
      </p>

      <div className="mt-6 rounded-2xl border border-white/10 bg-gray-950/70 px-4 py-3 text-sm text-gray-300">
        {file ? (
          <span className="inline-flex items-center gap-2 text-white">
            <FileText className="h-4 w-4 text-indigo-300" />
            {file.name}
          </span>
        ) : (
          <span>Accepted formats: PDF, EPUB, DOCX, TXT, MD</span>
        )}
      </div>
    </div>
  );
}
