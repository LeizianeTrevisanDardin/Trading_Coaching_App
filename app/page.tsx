import Link from "next/link";
import {
  Bot,
  Calculator,
  ChartNoAxesCombined,
  ClipboardCheck,
  NotebookPen,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";

const features = [
  {
    icon: Calculator,
    title: "Risk Calculator",
    description:
      "Calculate position size, stop-loss risk, target profit, points, ticks, and risk-to-reward before entering a trade.",
  },
  {
    icon: ClipboardCheck,
    title: "Trade Planner",
    description:
      "Create a structured trading plan with contract, direction, entry price, stop loss, target, quantity, and notes.",
  },
  {
    icon: Sparkles,
    title: "Screenshot Analysis",
    description:
      "Upload a chart screenshot and review trend, breakout, retest, setup quality, risk-to-reward, and trade management.",
  },
  {
    icon: NotebookPen,
    title: "Trading Journal",
    description:
      "Save your trades, results, screenshots, observations, mistakes, and lessons learned in one organized place.",
  },
  {
    icon: ChartNoAxesCombined,
    title: "Performance Analytics",
    description:
      "Review your trading history, setup quality, consistency, recurring mistakes, and overall progress.",
  },
  {
    icon: Target,
    title: "Personal Playbook",
    description:
      "Build and follow your own trading rules, strategy checklists, entry confirmations, and risk-management guidelines.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Hero */}
      <section className="border-b border-slate-800">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:items-center lg:px-10 lg:py-28">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-300">
              <Bot size={18} />
              Trading Planner and AI Coaching Platform
            </div>

            <h1 className="max-w-3xl text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
              Plan smarter trades.
              <span className="block text-blue-400">
                Improve your discipline.
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
              TraderBot AI is a full-stack trading platform created to help
              futures traders plan trades, calculate risk, analyze chart
              screenshots, record results, and learn from every decision.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/login"
                className="rounded-xl bg-blue-600 px-6 py-3 text-center font-semibold text-white transition hover:bg-blue-700"
              >
                Access the App
              </Link>

              <Link
                href="/signup"
                className="rounded-xl border border-slate-700 px-6 py-3 text-center font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-900"
              >
                Create an Account
              </Link>
            </div>
          </div>

          {/* Project preview card */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl shadow-blue-950/20 sm:p-8">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600/20 text-blue-400">
                  <Bot size={26} />
                </div>

                <div>
                  <p className="font-semibold">TraderBot AI</p>
                  <p className="text-sm text-slate-400">
                    Trading workflow platform
                  </p>
                </div>
              </div>

              <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                LIVE
              </span>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                <p className="text-sm text-slate-400">Planned workflow</p>
                <p className="mt-2 text-xl font-semibold">
                  Plan → Execute → Journal → Review
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                  <p className="text-sm text-slate-400">Risk control</p>
                  <p className="mt-2 font-semibold text-blue-400">
                    Position sizing
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                  <p className="text-sm text-slate-400">Trade review</p>
                  <p className="mt-2 font-semibold text-blue-400">
                    AI-assisted feedback
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                <div className="mb-3 flex items-center gap-2">
                  <ShieldCheck size={19} className="text-emerald-400" />
                  <p className="font-semibold">Built for consistency</p>
                </div>

                <p className="text-sm leading-6 text-slate-400">
                  Every feature is designed to encourage preparation, risk
                  awareness, structured execution, and post-trade review.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About */}
      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10">
        <div className="max-w-3xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-blue-400">
            About the project
          </p>

          <h2 className="text-3xl font-bold sm:text-4xl">
            A complete workflow for better trading decisions
          </h2>

          <p className="mt-5 leading-8 text-slate-300">
            TraderBot AI was created as a personal trading tool and a
            full-stack portfolio project. It combines planning, risk
            management, trade journaling, screenshot analysis, analytics, and
            personal trading rules in one application.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <article
                key={feature.title}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:-translate-y-1 hover:border-blue-500/50"
              >
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600/15 text-blue-400">
                  <Icon size={22} />
                </div>

                <h3 className="text-xl font-semibold">{feature.title}</h3>

                <p className="mt-3 leading-7 text-slate-400">
                  {feature.description}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-slate-800 bg-slate-900/40">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10">
          <div className="text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-blue-400">
              Trading workflow
            </p>

            <h2 className="text-3xl font-bold sm:text-4xl">
              From preparation to improvement
            </h2>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                number: "01",
                title: "Plan",
                text: "Define the setup, entry, stop loss, target, and trade direction.",
              },
              {
                number: "02",
                title: "Calculate",
                text: "Review risk in dollars, points, ticks, quantity, and expected reward.",
              },
              {
                number: "03",
                title: "Journal",
                text: "Save the result, screenshot, notes, emotions, and observations.",
              },
              {
                number: "04",
                title: "Improve",
                text: "Use analysis and performance data to identify patterns and mistakes.",
              },
            ].map((step) => (
              <div
                key={step.number}
                className="rounded-2xl border border-slate-800 bg-slate-950 p-6"
              >
                <span className="text-sm font-bold text-blue-400">
                  {step.number}
                </span>

                <h3 className="mt-4 text-xl font-semibold">{step.title}</h3>

                <p className="mt-3 leading-7 text-slate-400">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Technologies */}
      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-7 sm:p-10">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-blue-400">
                Technology
              </p>

              <h2 className="text-3xl font-bold">Built with a modern stack</h2>

              <p className="mt-5 leading-8 text-slate-300">
                The project demonstrates full-stack development, responsive
                design, authentication, database integration, protected user
                data, reusable components, and modern application
                architecture.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {[
                "Next.js",
                "React",
                "TypeScript",
                "Tailwind CSS",
                "Supabase",
                "PostgreSQL",
                "Supabase Auth",
                "Supabase Storage",
              ].map((technology) => (
                <span
                  key={technology}
                  className="rounded-full border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-medium text-slate-300"
                >
                  {technology}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-5 pb-20 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl rounded-3xl border border-blue-500/30 bg-blue-600/10 px-6 py-14 text-center sm:px-10">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Build discipline before risking capital
          </h2>

          <p className="mx-auto mt-4 max-w-2xl leading-8 text-slate-300">
            Use a structured process to plan your trades, manage risk, record
            your decisions, and improve your trading habits.
          </p>

          <Link
            href="/login"
            className="mt-8 inline-block rounded-xl bg-blue-600 px-7 py-3 font-semibold text-white transition hover:bg-blue-700"
          >
            Open TraderBot AI
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-800 px-5 py-8 text-center text-sm text-slate-500">
        TraderBot AI · Built by Leiziane Trevisan Dardin
      </footer>
    </main>
  );
}