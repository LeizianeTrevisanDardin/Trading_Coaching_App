"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Direction = "long" | "short" | "wait";

type ScreenshotAnalysis = {
  id: string;
  user_id: string;
  image_url: string | null;
  symbol: string | null;
  timeframe: string | null;
  trend: string | null;
  swing_high: number | null;
  swing_low: number | null;
  breakout: boolean | null;
  retest: boolean | null;
  candle_signal: string | null;
  direction: Direction | null;
  entry_price: number | null;
  stop_loss: number | null;
  target_price: number | null;
  score: number | null;
  bot_analysis: string | null;
  created_at: string;
};

type ContractData = {
  contract: "STOCK" | "MES" | "ES" | "MNQ" | "NQ";
  pointValue: number;
  tickSize: number;
};

const contractSettings: Record<string, ContractData> = {
  MES: {
    contract: "MES",
    pointValue: 5,
    tickSize: 0.25,
  },
  ES: {
    contract: "ES",
    pointValue: 50,
    tickSize: 0.25,
  },
  MNQ: {
    contract: "MNQ",
    pointValue: 2,
    tickSize: 0.25,
  },
  NQ: {
    contract: "NQ",
    pointValue: 20,
    tickSize: 0.25,
  },
};

export default function AnalyticsPage() {
  const router = useRouter();

  const [analyses, setAnalyses] = useState<ScreenshotAnalysis[]>([]);
  const [journalScreenshotIds, setJournalScreenshotIds] = useState<string[]>(
    []
  );

  const [loading, setLoading] = useState(true);
  const [addingToJournal, setAddingToJournal] = useState<string | null>(null);

  useEffect(() => {
    const loadAnalyses = async () => {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push("/login");
        return;
      }

      const [
        { data: analysesData, error: analysesError },
        { data: journalTrades, error: journalError },
      ] = await Promise.all([
        supabase
          .from("trade_screenshots")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),

        supabase
          .from("trades")
          .select("screenshot_id")
          .eq("user_id", user.id)
          .not("screenshot_id", "is", null),
      ]);

      if (analysesError) {
        console.error(analysesError);
        alert(analysesError.message);
      } else {
        setAnalyses(analysesData ?? []);
      }

      if (journalError) {
        console.error(journalError);
      } else {
        const screenshotIds =
          journalTrades
            ?.map((trade) => trade.screenshot_id)
            .filter((id): id is string => Boolean(id)) ?? [];

        setJournalScreenshotIds(screenshotIds);
      }

      setLoading(false);
    };

    loadAnalyses();
  }, [router]);

  const handleAddToJournal = async (analysis: ScreenshotAnalysis) => {
    if (journalScreenshotIds.includes(analysis.id)) {
      return;
    }

    if (
      analysis.direction !== "long" &&
      analysis.direction !== "short"
    ) {
      alert(
        "This analysis must have a Long or Short direction before it can be added to the Journal."
      );
      return;
    }

    if (
      analysis.entry_price === null ||
      analysis.stop_loss === null ||
      analysis.target_price === null
    ) {
      alert(
        "Entry price, stop loss, and target price are required before adding this analysis to the Journal."
      );
      return;
    }

    const entry = Number(analysis.entry_price);
    const stop = Number(analysis.stop_loss);
    const target = Number(analysis.target_price);

    const riskPoints = Math.abs(entry - stop);
    const rewardPoints = Math.abs(target - entry);

    if (riskPoints <= 0) {
      alert("Entry price and stop loss cannot be the same.");
      return;
    }

    if (analysis.direction === "long" && stop >= entry) {
      alert(
        "For a Long trade, the stop loss must be below the entry price."
      );
      return;
    }

    if (analysis.direction === "short" && stop <= entry) {
      alert(
        "For a Short trade, the stop loss must be above the entry price."
      );
      return;
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      alert("You need to sign in first.");
      router.push("/login");
      return;
    }

    setAddingToJournal(analysis.id);

    const symbol = analysis.symbol?.trim().toUpperCase() || "STOCK";

    const contractData =
      contractSettings[symbol] || {
        contract: "STOCK" as const,
        pointValue: 1,
        tickSize: 0.01,
      };

    const quantity = 1;
    const riskReward = rewardPoints / riskPoints;
    const riskTicks = riskPoints / contractData.tickSize;

    const riskDollars =
      riskPoints * contractData.pointValue * quantity;

    const targetProfit =
      rewardPoints * contractData.pointValue * quantity;

    const journalNotes = [
      `Original symbol: ${symbol}`,
      `AI Score: ${analysis.score ?? 0}/100`,
      analysis.bot_analysis || "",
    ]
      .filter(Boolean)
      .join("\n\n");

    const { error } = await supabase.from("trades").insert({
      user_id: user.id,
      screenshot_id: analysis.id,
      contract: contractData.contract,
      direction: analysis.direction,
      entry,
      stop_loss: stop,
      take_profit: target,
      reward: Number(riskReward.toFixed(2)),
      quantity,
      risk_points: riskPoints,
      risk_ticks: riskTicks,
      risk_dollars: riskDollars,
      target_profit: targetProfit,
      status: "planned",
      notes: journalNotes,
    });

    setAddingToJournal(null);

    if (error) {
      console.error(error);

      if (error.code === "23505") {
        setJournalScreenshotIds((current) => [
          ...new Set([...current, analysis.id]),
        ]);

        alert("This analysis has already been added to the Journal.");
        return;
      }

      alert(error.message);
      return;
    }

    setJournalScreenshotIds((current) => [
      ...new Set([...current, analysis.id]),
    ]);

    alert("Analysis added to the Journal successfully!");
  };

  const handleRemoveFromJournal = async (
  analysis: ScreenshotAnalysis
) => {
  const confirmRemove = confirm(
    "Are you sure you want to remove this analysis from the Journal?"
  );

  if (!confirmRemove) return;

  setAddingToJournal(analysis.id);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    setAddingToJournal(null);
    alert("You need to sign in first.");
    router.push("/login");
    return;
  }

  const { error } = await supabase
    .from("trades")
    .delete()
    .eq("user_id", user.id)
    .eq("screenshot_id", analysis.id);

  setAddingToJournal(null);

  if (error) {
    console.error(error);
    alert(error.message);
    return;
  }

  setJournalScreenshotIds((current) =>
    current.filter((id) => id !== analysis.id)
  );

  alert("Analysis removed from the Journal successfully.");
};

  const total = analyses.length;

  const averageScore =
    total > 0
      ? Math.round(
          analyses.reduce(
            (sum, item) => sum + (item.score ?? 0),
            0
          ) / total
        )
      : 0;

  const goodSetups = analyses.filter(
    (item) => (item.score ?? 0) >= 75
  ).length;

  const waitSetups = analyses.filter(
    (item) => item.direction === "wait"
  ).length;

  return (
    <section className="min-h-screen bg-gray-950 p-6 text-white">
      <div className="mx-auto max-w-7xl space-y-8">
        <div>
          <h1 className="text-4xl font-bold">Analytics</h1>

          <p className="mt-2 text-gray-400">
            Review your saved TraderBot analyses and add qualified setups
            to your trading journal.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <StatCard label="Total Analyses" value={String(total)} />

          <StatCard
            label="Average Score"
            value={`${averageScore}/100`}
          />

          <StatCard
            label="High-Quality Setups"
            value={String(goodSetups)}
          />

          <StatCard
            label="Wait Signals"
            value={String(waitSetups)}
          />
        </div>

        {loading && (
          <p className="text-gray-400">Loading analyses...</p>
        )}

        {!loading && analyses.length === 0 && (
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
            <p className="text-gray-400">
              No analyses have been saved yet.
            </p>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {analyses.map((item) => {
            const alreadyAdded = journalScreenshotIds.includes(item.id);
            const isAdding = addingToJournal === item.id;

            return (
              <article
                key={item.id}
                className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900"
              >
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt="Trading analysis screenshot"
                    className="h-56 w-full border-b border-gray-800 object-cover"
                  />
                ) : (
                  <div className="flex h-56 items-center justify-center border-b border-gray-800 bg-gray-900 text-gray-500">
                    No screenshot available
                  </div>
                )}

                <div className="space-y-4 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-xl font-bold">
                      {item.symbol || "Unknown Symbol"}
                    </h2>

                    <span className="shrink-0 rounded-full bg-blue-600 px-3 py-1 text-sm font-bold">
                      {item.score ?? 0}/100
                    </span>
                  </div>

                  <p className="text-sm text-gray-400">
                    {item.timeframe || "No timeframe"} •{" "}
                    {new Date(item.created_at).toLocaleString("en-CA")}
                  </p>

                  <div className="grid grid-cols-2 gap-3 text-sm text-gray-300">
                    <Detail
                      label="Trend"
                      value={formatTrend(item.trend)}
                    />

                    <Detail
                      label="Direction"
                      value={formatDirection(item.direction)}
                    />

                    <Detail
                      label="Swing High"
                      value={formatPrice(item.swing_high)}
                    />

                    <Detail
                      label="Swing Low"
                      value={formatPrice(item.swing_low)}
                    />

                    <Detail
                      label="Breakout"
                      value={item.breakout ? "Yes" : "No"}
                    />

                    <Detail
                      label="Retest"
                      value={item.retest ? "Yes" : "No"}
                    />

                    <Detail
                      label="Entry"
                      value={formatPrice(item.entry_price)}
                    />

                    <Detail
                      label="Stop Loss"
                      value={formatPrice(item.stop_loss)}
                    />

                    <Detail
                      label="Target"
                      value={formatPrice(item.target_price)}
                    />

                    <Detail
                      label="Candle"
                      value={formatCandleSignal(item.candle_signal)}
                    />
                  </div>

                  {item.bot_analysis && (
                    <p className="line-clamp-4 whitespace-pre-line text-sm leading-relaxed text-gray-300">
                      {item.bot_analysis}
                    </p>
                  )}

                  <div className="grid gap-3 pt-2 sm:grid-cols-2">
                    <Link
                      href={`/analytics/${item.id}`}
                      className="rounded-xl bg-gray-800 py-3 text-center font-semibold transition hover:bg-gray-700"
                    >
                      👁 Open Analysis
                    </Link>

                    <button
                      type="button"
                      onClick={() =>
                        alreadyAdded
                          ? handleRemoveFromJournal(item)
                          : handleAddToJournal(item)
                      }
                      disabled={isAdding}
                      className={`rounded-xl px-3 py-3 font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                        alreadyAdded
                          ? "bg-red-600 text-white hover:bg-red-700"
                          : "bg-blue-600 text-white hover:bg-blue-700"
                      }`}
                    >
                      {isAdding
                        ? alreadyAdded
                          ? "Removing..."
                          : "Adding..."
                        : alreadyAdded
                        ? " Remove from Journal"
                        : " Add to Journal"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
      <p className="text-gray-400">{label}</p>
      <h2 className="mt-1 text-3xl font-bold">{value}</h2>
    </div>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <span className="text-gray-500">{label}: </span>
      <span>{value}</span>
    </div>
  );
}

function formatPrice(value: number | null) {
  if (value === null || value === undefined) {
    return "—";
  }

  return Number(value).toString();
}

function formatDirection(direction: Direction | null) {
  if (direction === "long") return "Long";
  if (direction === "short") return "Short";
  if (direction === "wait") return "Wait";

  return "Not provided";
}

function formatTrend(trend: string | null) {
  const labels: Record<string, string> = {
    alta: "Uptrend",
    baixa: "Downtrend",
    consolidacao: "Consolidation",
    uptrend: "Uptrend",
    downtrend: "Downtrend",
    consolidation: "Consolidation",
  };

  if (!trend) return "Not provided";

  return labels[trend] || trend;
}

function formatCandleSignal(signal: string | null) {
  const labels: Record<string, string> = {
    forca: "Strength",
    rejeicao: "Rejection",
    indecisao: "Indecision",
    strength: "Strength",
    rejection: "Rejection",
    indecision: "Indecision",
  };

  if (!signal) return "Not provided";

  return labels[signal] || signal;
}