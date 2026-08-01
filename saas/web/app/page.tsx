import Link from "next/link";
import { ArrowRight, BookOpenText, BrainCircuit, Upload } from "lucide-react";

const tiers = [
  {
    name: "Free",
    price: "$0",
    description: "Perfect for trying BookSkill with your current reading list.",
    features: ["2 books", "50 questions / month", "Fast text extraction"],
  },
  {
    name: "Student",
    price: "$5/mo",
    description: "Built for semester-long study workflows and exam prep.",
    features: ["10 books", "500 questions / month", "Priority processing"],
    featured: true,
  },
  {
    name: "Pro",
    price: "$15/mo",
    description: "For power users building a searchable AI library.",
    features: ["50 books", "Unlimited questions", "Best extraction quality"],
  },
];

const steps = [
  {
    title: "Upload your material",
    description: "Drop in PDFs, EPUBs, DOCX files, and notes. BookSkill ingests them in minutes.",
    icon: Upload,
  },
  {
    title: "Let AI structure the content",
    description: "We process chapters, concepts, and context so you can ask focused questions later.",
    icon: BookOpenText,
  },
  {
    title: "Study through conversation",
    description: "Ask for summaries, explanations, quizzes, and citations based on the source text.",
    icon: BrainCircuit,
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-950">
      <section className="mx-auto flex max-w-6xl flex-col gap-16 px-6 py-10 lg:px-8">
        <header className="flex items-center justify-between rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-gray-300 backdrop-blur">
          <span className="font-semibold tracking-wide text-white">BookSkill</span>
          <nav className="flex items-center gap-5">
            <a href="#how-it-works" className="transition hover:text-white">
              How it works
            </a>
            <a href="#pricing" className="transition hover:text-white">
              Pricing
            </a>
          </nav>
        </header>

        <div className="grid gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div className="space-y-8">
            <div className="inline-flex rounded-full border border-indigo-400/30 bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-200">
              AI-powered reading, revision, and note retrieval
            </div>
            <div className="space-y-5">
              <h1 className="max-w-3xl text-5xl font-bold tracking-tight text-white sm:text-6xl">
                Turn any book into your AI study partner
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-gray-300">
                Upload PDF, EPUB, DOCX, TXT, or Markdown files and chat with an AI that understands your books, lecture notes, and study guides.
              </p>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row">
              <Link
                href="/auth/signin"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-500 px-6 py-3 font-semibold text-white transition hover:bg-indigo-400"
              >
                Get Started Free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-6 py-3 font-semibold text-white transition hover:bg-white/10"
              >
                See how it works
              </a>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-500/20 via-purple-500/10 to-gray-900 p-6 shadow-glow">
            <div className="space-y-4 rounded-2xl border border-white/10 bg-gray-950/80 p-6">
              <div className="flex items-center justify-between text-sm text-gray-400">
                <span>Live study workflow</span>
                <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-emerald-300">Ready to chat</span>
              </div>
              <div className="space-y-3 text-sm text-gray-300">
                <div className="rounded-2xl bg-gray-900 p-4">
                  <p className="font-medium text-white">Biochemistry Chapter 4.pdf</p>
                  <p className="mt-2 text-gray-400">“Summarize glycolysis in 5 bullet points and give me two quiz questions.”</p>
                </div>
                <div className="ml-auto max-w-xs rounded-2xl bg-indigo-500 px-4 py-3 text-white">
                  BookSkill prepares a concise breakdown, quiz prompts, and grounded answers from the uploaded text.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="border-y border-white/10 bg-white/[0.02]">
        <div className="mx-auto max-w-6xl px-6 py-20 lg:px-8">
          <div className="max-w-2xl space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-indigo-300">How it works</p>
            <h2 className="text-3xl font-semibold text-white sm:text-4xl">A focused workflow for reading, revision, and retrieval</h2>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {steps.map(({ title, description, icon: Icon }) => (
              <div key={title} className="rounded-3xl border border-white/10 bg-gray-900/70 p-6">
                <div className="mb-5 inline-flex rounded-2xl bg-indigo-500/15 p-3 text-indigo-300">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold text-white">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-gray-400">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-6xl px-6 py-20 lg:px-8">
        <div className="max-w-2xl space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-indigo-300">Pricing</p>
          <h2 className="text-3xl font-semibold text-white sm:text-4xl">Simple plans for every stage of learning</h2>
        </div>
        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`rounded-3xl border p-6 ${
                tier.featured
                  ? "border-indigo-400/40 bg-indigo-500/10 shadow-glow"
                  : "border-white/10 bg-gray-900/70"
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-semibold text-white">{tier.name}</h3>
                {tier.featured ? (
                  <span className="rounded-full bg-indigo-400/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-200">
                    Most Popular
                  </span>
                ) : null}
              </div>
              <p className="mt-4 text-4xl font-bold text-white">{tier.price}</p>
              <p className="mt-3 text-sm leading-7 text-gray-400">{tier.description}</p>
              <ul className="mt-6 space-y-3 text-sm text-gray-200">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <span className="h-2 w-2 rounded-full bg-indigo-300" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-white/10 px-6 py-8 text-center text-sm text-gray-500 lg:px-8">
        © {new Date().getFullYear()} BookSkill. Turn reading into conversation.
      </footer>
    </main>
  );
}
