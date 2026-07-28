"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type TradeStatus =
  | "planned"
  | "win"
  | "loss"
  | "breakeven";

type Trade = {
  status: TradeStatus | null;
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

  const [stats, setStats] =
    useState<DashboardStats>(initialStats);

  const [loading, setLoading] = useState(true);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadDashboard = async () => {
      try {
        if (mounted) {
          setLoading(true);
          setErrorMessage(null);
        }

        // Verifica primeiro se existe uma sessão salva.
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          console.warn(
            "Could not read authentication session:",
            sessionError.message
          );

          if (mounted) {
            setErrorMessage(
              "Could not verify your authentication session."
            );
          }

          return;
        }

        // Não existe usuário logado.
        if (!session?.user) {
          router.replace("/login");
          return;
        }

        const userId = session.user.id;

        const now = new Date();

        const startOfToday = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          0,
          0,
          0,
          0
        );

        const startOfTomorrow = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() + 1,
          0,
          0,
          0,
          0
        );

        const { data, error } = await supabase
          .from("trades")
          .select(
            "status, pnl, risk_dollars, created_at"
          )
          .eq("user_id", userId)
          .gte(
            "created_at",
            startOfToday.toISOString()
          )
          .lt(
            "created_at",
            startOfTomorrow.toISOString()
          )
          .order("created_at", {
            ascending: false,
          });

        if (error) {
          console.error(
            "Dashboard load error:",
            error.message
          );

          if (mounted) {
            setErrorMessage(
              error.message ||
                "Could not load dashboard data."
            );

            setStats(initialStats);
          }

          return;
        }

        const trades = (data ?? []) as Trade[];

        // Trades que já receberam um resultado.
        const completedTrades = trades.filter(
          (trade) =>
            trade.status === "win" ||
            trade.status === "loss" ||
            trade.status === "breakeven"
        );

        const wins = completedTrades.filter(
          (trade) => trade.status === "win"
        ).length;

        const losses = completedTrades.filter(
          (trade) => trade.status === "loss"
        ).length;

        // Soma somente o P&L dos trades finalizados.
        const totalPnl = completedTrades.reduce(
          (total, trade) => {
            return total + Number(trade.pnl ?? 0);
          },
          0
        );

        // Soma o risco de todos os trades criados hoje.
        const totalRisk = trades.reduce(
          (total, trade) => {
            return (
              total +
              Math.abs(
                Number(trade.risk_dollars ?? 0)
              )
            );
          },
          0
        );

        // Breakeven não entra no cálculo do Win Rate.
        const winRateTrades = wins + losses;

        const winRate =
          winRateTrades > 0
            ? (wins / winRateTrades) * 100
            : 0;

        if (mounted) {
          setStats({
            pnl: totalPnl,

            // Conta todos os trades criados hoje,
            // incluindo planned.
            tradesToday: trades.length,

            winRate,
            riskUsed: totalRisk,
          });
        }
      } catch (error) {
        console.error(
          "Unexpected dashboard error:",
          error
        );

        if (mounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "An unexpected error occurred."
          );

          setStats(initialStats);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      mounted = false;
    };
  }, [router]);

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-white">
      <div className="mx-auto max-w-7xl space-y-8">
        <div>
          <h1 className="text-4xl font-bold">
            Dashboard
          </h1>

          <p className="mt-2 text-slate-400">
            Track your daily trading performance
            and risk.
          </p>
        </div>

        {errorMessage && (
          <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-red-300">
            <p className="font-semibold">
              Could not load Dashboard
            </p>

            <p className="mt-1 text-sm">
              {errorMessage}
            </p>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
            value={
              loading
                ? "..."
                : String(stats.tradesToday)
            }
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

        {!loading &&
          !errorMessage &&
          stats.tradesToday === 0 && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <p className="text-slate-300">
                No trades were found for today.
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Trades created today will appear
                here automatically.
              </p>
            </div>
          )}
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
      <p className="text-sm text-slate-400">
        {label}
      </p>

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