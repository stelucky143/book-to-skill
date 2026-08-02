import clsx from "clsx";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  isTyping?: boolean;
}

export default function ChatMessage({ role, content, isTyping = false }: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <div className={clsx("flex w-full", isUser ? "justify-end" : "justify-start")}>
      <div
        className={clsx(
          "max-w-3xl rounded-3xl px-4 py-3 shadow-sm",
          isUser ? "bg-indigo-500 text-white" : "border border-white/10 bg-gray-900 text-gray-100"
        )}
      >
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-white/70">
          {isUser ? "You" : "BookSkill AI"}
        </p>
        {isTyping ? (
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <span className="h-2 w-2 animate-bounce rounded-full bg-current [animation-delay:-0.2s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-current [animation-delay:-0.1s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-current" />
          </div>
        ) : (
          <p className="whitespace-pre-wrap break-words text-sm leading-7">{content}</p>
        )}
      </div>
    </div>
  );
}
