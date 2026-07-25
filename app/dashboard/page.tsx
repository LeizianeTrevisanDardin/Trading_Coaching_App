"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type Trade = {
  status: "planned" | "win" | "loss" | "breakeven";
  pnl: number | null;
  risk_dollars: number | null;
  created_at: string;
};

type DashboardStats = {
  pnl: number;
  tradesToday: number;
  winRate: number;
  riskUsed: number;
};

const initialStats: DashboardStats = {
  pnl: 0,
  tradesToday: 0,
  winRate: 0,
  riskUsed: 0,
};

export default function DashboardPage() {
  const router = useRouter();

  const [stats, setStats] = useState<DashboardStats>(initialStats);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push("/login");
        return;
      }

      const now = new Date();

      const startOfToday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      );

      const startOfTomorrow = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1
      );

      const { data, error } = await supabase
        .from("trades")
        .select("status, pnl, risk_dollars, created_at")
        .eq("user_id", user.id)
        .gte("created_at", startOfToday.toISOString())
        .lt("created_at", startOfTomorrow.toISOString());

      if (error) {
        console.error("Dashboard error:", error);
        setLoading(false);
        return;
      }

      const trades = (data ?? []) as Trade[];

      const completedTrades = trades.filter(
        (trade) => trade.status !== "planned"
      );

      const wins = completedTrades.filter(
        (trade) => trade.status === "win"
      ).length;

      const totalPnl = completedTrades.reduce(
        (total, trade) => total + Number(trade.pnl ?? 0),
        0
      );

      const totalRisk = trades.reduce(
        (total, trade) => total + Number(trade.risk_dollars ?? 0),
        0
      );

      const winRate =
        completedTrades.length > 0
          ? (wins / completedTrades.length) * 100
          : 0;

      setStats({
        pnl: totalPnl,
        tradesToday: trades.length,
        winRate,
        riskUsed: totalRisk,
      });

      setLoading(false);
    };

    loadDashboard();
  }, [router]);

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-white">
      <div className="mx-auto max-w-7xl space-y-8">
        <div>
          <h1 className="text-4xl font-bold">Dashboard</h1>

          <p className="mt-2 text-slate-400">
            Track your daily trading performance and risk.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card
            label="Today's P&L"
            value={
              loading
                ? "Loading..."
                : formatCurrency(stats.pnl)
            }
            positive={stats.pnl > 0}
            negative={stats.pnl < 0}
          />

          <Card
            label="Trades Today"
            value={loading ? "..." : String(stats.tradesToday)}
          />

          <Card
            label="Win Rate"
            value={
              loading
                ? "..."
                : `${stats.winRate.toFixed(1)}%`
            }
            positive={stats.winRate > 0}
          />

          <Card
            label="Risk Used Today"
            value={
              loading
                ? "Loading..."
                : formatCurrency(stats.riskUsed)
            }
          />
        </div>
      </div>
    </main>
  );
}

type CardProps = {
  label: string;
  value: string;
  positive?: boolean;
  negative?: boolean;
};

function Card({
  label,
  value,
  positive = false,
  negative = false,
}: CardProps) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
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

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(value) || 0);
}