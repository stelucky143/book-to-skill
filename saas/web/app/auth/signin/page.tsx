"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { ArrowLeft, LoaderCircle, LogIn, UserPlus } from "lucide-react";
import { authenticate, getToken } from "@/lib/api";

const tabs = [
  { id: "signin", label: "Sign In", icon: LogIn },
  { id: "register", label: "Register", icon: UserPlus },
] as const;

type AuthMode = (typeof tabs)[number]["id"];

export default function SignInPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (getToken()) {
      router.replace("/dashboard");
    }
  }, [router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const { token } = await authenticate(mode, email, password);
      localStorage.setItem("bookskill_token", token);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-950 px-6 py-10">
      <div className="w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/10 bg-gray-900/70 shadow-glow lg:grid lg:grid-cols-[0.95fr_1.05fr]">
        <div className="border-b border-white/10 bg-gradient-to-br from-indigo-500/20 via-purple-500/10 to-gray-900 p-8 lg:border-b-0 lg:border-r">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-300 transition hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
          <div className="mt-10 space-y-5">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-indigo-300">BookSkill</p>
            <h1 className="text-4xl font-bold tracking-tight text-white">Sign in to start chatting with your books</h1>
            <p className="max-w-md text-base leading-7 text-gray-300">
              Build a searchable AI reading workspace for coursework, research, and personal knowledge.
            </p>
          </div>
        </div>

        <div className="p-8 sm:p-10">
          <div className="grid grid-cols-2 gap-3 rounded-2xl border border-white/10 bg-gray-950/70 p-2">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setMode(id)}
                className={clsx(
                  "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition",
                  mode === id ? "bg-indigo-500 text-white" : "text-gray-400 hover:bg-white/5 hover:text-white"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-gray-200">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="w-full rounded-2xl border border-white/10 bg-gray-950 px-4 py-3 text-white outline-none transition placeholder:text-gray-500 focus:border-indigo-400"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-gray-200">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                className="w-full rounded-2xl border border-white/10 bg-gray-950 px-4 py-3 text-white outline-none transition placeholder:text-gray-500 focus:border-indigo-400"
                placeholder="••••••••"
              />
            </div>

            {error ? <p className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p> : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-500 px-4 py-3 font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? <LoaderCircle className="h-5 w-5 animate-spin" /> : null}
              {mode === "signin" ? "Sign In" : "Create Account"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
