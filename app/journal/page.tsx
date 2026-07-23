"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type TradeStatus = "planned" | "win" | "loss" | "breakeven";

type Trade = {
  id: string;
  contract: string;
  direction: "long" | "short";
  entry: number;
  stop_loss: number;
  take_profit: number;
  reward: number;
  quantity: number;
  risk_dollars: number;
  target_profit: number;
  status: TradeStatus;
  pnl?: number | null;
  result_r?: number | null;
  notes?: string | null;
  created_at: string;
};

export default function JournalPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | TradeStatus>("all");

  useEffect(() => {
    const fetchTrades = async () => {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("trades")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
        alert(error.message);
        setLoading(false);
        return;
      }

      setTrades(data ?? []);
      setLoading(false);
    };

    fetchTrades();
  }, []);

  const filteredTrades = useMemo(() => {
    if (filter === "all") {
      return trades;
    }

    return trades.filter((trade) => trade.status === filter);
  }, [trades, filter]);

  const stats = useMemo(() => {
    const completedTrades = trades.filter(
      (trade) => trade.status !== "planned"
    );

    const wins = completedTrades.filter(
      (trade) => trade.status === "win"
    ).length;

    const losses = completedTrades.filter(
      (trade) => trade.status === "loss"
    ).length;

    const breakeven = completedTrades.filter(
      (trade) => trade.status === "breakeven"
    ).length;

    const totalPnl = completedTrades.reduce(
      (total, trade) => total + Number(trade.pnl ?? 0),
      0
    );

    const totalR = completedTrades.reduce(
      (total, trade) => total + Number(trade.result_r ?? 0),
      0
    );

    const winRate =
      completedTrades.length > 0
        ? (wins / completedTrades.length) * 100
        : 0;

    return {
      total: trades.length,
      completed: completedTrades.length,
      wins,
      losses,
      breakeven,
      totalPnl,
      totalR,
      winRate,
    };
  }, [trades]);

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Trading Journal</h1>

          <p className="mt-2 text-slate-400">
            Review your trades, performance, risk, and lessons learned.
          </p>
        </div>

        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Trades"
            value={String(stats.total)}
          />

          <StatCard
            label="Win Rate"
            value={`${stats.winRate.toFixed(1)}%`}
          />

          <StatCard
            label="Total P&L"
            value={formatCurrency(stats.totalPnl)}
            positive={stats.totalPnl > 0}
            negative={stats.totalPnl < 0}
          />

          <StatCard
            label="Total Result"
            value={`${stats.totalR.toFixed(2)}R`}
            positive={stats.totalR > 0}
            negative={stats.totalR < 0}
          />
        </section>

        <section className="mb-8 grid gap-4 sm:grid-cols-3">
          <MiniStat
            label="Wins"
            value={stats.wins}
            textClassName="text-green-400"
          />

          <MiniStat
            label="Losses"
            value={stats.losses}
            textClassName="text-red-400"
          />

          <MiniStat
            label="Breakeven"
            value={stats.breakeven}
            textClassName="text-yellow-400"
          />
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900">
          <div className="flex flex-col gap-4 border-b border-slate-800 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Trade History</h2>

              <p className="mt-1 text-sm text-slate-400">
                Your saved and completed trades.
              </p>
            </div>

            <select
              value={filter}
              onChange={(event) =>
                setFilter(
                  event.target.value as "all" | TradeStatus
                )
              }
              className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white outline-none focus:border-blue-500"
            >
              <option value="all">All Trades</option>
              <option value="planned">Planned</option>
              <option value="win">Wins</option>
              <option value="loss">Losses</option>
              <option value="breakeven">Breakeven</option>
            </select>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-400">
              Loading journal...
            </div>
          ) : filteredTrades.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-lg font-semibold">
                No trades found.
              </p>

              <p className="mt-2 text-slate-400">
                Save a trade in the Trade Planner to see it here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {filteredTrades.map((trade) => (
                <TradeCard key={trade.id} trade={trade} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function TradeCard({ trade }: { trade: Trade }) {
  const directionLabel =
    trade.direction === "long" ? "Long" : "Short";

  return (
    <article className="p-5 transition hover:bg-slate-800/40">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-xl font-bold">
              {trade.contract}
            </h3>

            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                trade.direction === "long"
                  ? "bg-green-500/10 text-green-400"
                  : "bg-red-500/10 text-red-400"
              }`}
            >
              {directionLabel}
            </span>

            <StatusBadge status={trade.status} />
          </div>

          <p className="mt-2 text-sm text-slate-400">
            {new Date(trade.created_at).toLocaleString("en-CA")}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4 lg:min-w-[620px]">
          <TradeValue
            label="Entry"
            value={Number(trade.entry).toFixed(2)}
          />

          <TradeValue
            label="Stop"
            value={Number(trade.stop_loss).toFixed(2)}
          />

          <TradeValue
            label="Target"
            value={Number(trade.take_profit).toFixed(2)}
          />

          <TradeValue
            label="Quantity"
            value={String(trade.quantity)}
          />

          <TradeValue
            label="Risk"
            value={formatCurrency(trade.risk_dollars)}
          />

          <TradeValue
            label="Planned Reward"
            value={`1:${trade.reward}`}
          />

          <TradeValue
            label="Result"
            value={
              trade.pnl == null
                ? "Pending"
                : formatCurrency(trade.pnl)
            }
          />

          <TradeValue
            label="Result in R"
            value={
              trade.result_r == null
                ? "Pending"
                : `${Number(trade.result_r).toFixed(2)}R`
            }
          />
        </div>
      </div>

      {trade.notes && (
        <div className="mt-5 rounded-xl bg-slate-800 p-4">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Notes
          </p>

          <p className="text-slate-300">{trade.notes}</p>
        </div>
      )}
    </article>
  );
}

function StatusBadge({ status }: { status: TradeStatus }) {
  const styles: Record<TradeStatus, string> = {
    planned: "bg-blue-500/10 text-blue-400",
    win: "bg-green-500/10 text-green-400",
    loss: "bg-red-500/10 text-red-400",
    breakeven: "bg-yellow-500/10 text-yellow-400",
  };

  const labels: Record<TradeStatus, string> = {
    planned: "Planned",
    win: "Win",
    loss: "Loss",
    breakeven: "Breakeven",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-bold ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function StatCard({
  label,
  value,
  positive = false,
  negative = false,
}: {
  label: string;
  value: string;
  positive?: boolean;
  negative?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-sm text-slate-400">{label}</p>

      <p
        className={`mt-2 text-3xl font-bold ${
          positive
            ? "text-green-400"
            : negative
            ? "text-red-400"
            : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function MiniStat({
  label,
  value,
  textClassName,
}: {
  label: string;
  value: number;
  textClassName: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 p-4">
      <span className="text-slate-400">{label}</span>

      <span className={`text-xl font-bold ${textClassName}`}>
        {value}
      </span>
    </div>
  );
}

function TradeValue({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-1 font-semibold text-slate-200">
        {value}
      </p>
    </div>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "USD",
  }).format(Number(value) || 0);
}