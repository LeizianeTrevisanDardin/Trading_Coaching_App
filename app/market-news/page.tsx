import EconomicCalendar from "@/components/traderbot/EconomicCalendar";
import MarketNewsCard from "@/components/traderbot/MarketNewsCard";
import {
  AlertTriangle,
  CalendarDays,
  Newspaper,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";

export default function MarketNewsPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-3xl bg-slate-950 p-6 text-white shadow-lg sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 text-sm font-semibold text-blue-300">
                <Newspaper className="h-5 w-5" />

                <span>TradeBot Market Center</span>
              </div>

              <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                Today&apos;s Market News
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                Review today&apos;s economic events and market headlines before
                planning trades on NQ, MNQ, ES or MES.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <TrendingUp className="h-5 w-5 text-emerald-300" />

                <p className="mt-3 text-xs font-medium uppercase tracking-wide text-slate-400">
                  Focus
                </p>

                <p className="mt-1 font-bold text-white">
                  NQ / MNQ
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <ShieldAlert className="h-5 w-5 text-amber-300" />

                <p className="mt-3 text-xs font-medium uppercase tracking-wide text-slate-400">
                  Purpose
                </p>

                <p className="mt-1 font-bold text-white">
                  Risk awareness
                </p>
              </div>
            </div>
          </div>
        </header>

        <section className="my-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />

            <div>
              <h2 className="font-bold text-amber-900">
                News can increase volatility
              </h2>

              <p className="mt-1 text-sm leading-6 text-amber-800">
                News and economic events help you understand market conditions,
                but they are not automatic buy or sell signals. Wait for
                confirmation from your trading strategy before entering a
                position.
              </p>
            </div>
          </div>
        </section>

        <section className="mb-6">
          <div className="mb-3 flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-slate-700" />

            <h2 className="text-lg font-bold text-slate-950">
              Today&apos;s Economic Events
            </h2>
          </div>

          <EconomicCalendar />
        </section>

        <section>
          <MarketNewsCard />
        </section>

        <footer className="mt-6 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-center">
          <p className="text-xs leading-5 text-slate-500">
            Market information may be delayed. The economic calendar is
            currently using demonstration data. Always verify important events
            with an official source before placing a trade.
          </p>
        </footer>
      </div>
    </main>
  );
}