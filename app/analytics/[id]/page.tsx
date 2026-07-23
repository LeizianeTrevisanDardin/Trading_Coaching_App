"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type Direction = "long" | "short" | "wait";

type Analysis = {
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
  trade_status: string | null;
  result_r: number | null;
  pnl: number | null;
  notes: string | null;
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

export default function AnalysisDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);

  const [tradeStatus, setTradeStatus] = useState("pending");
  const [resultR, setResultR] = useState("");
  const [pnl, setPnl] = useState("");
  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [addingToJournal, setAddingToJournal] = useState(false);
  const [alreadyInJournal, setAlreadyInJournal] = useState(false);

  useEffect(() => {
    const loadAnalysis = async () => {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("trade_screenshots")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (error) {
        console.error(error);
        alert(error.message);
        setLoading(false);
        return;
      }

      setAnalysis(data);
      setTradeStatus(data.trade_status || "pending");
      setResultR(data.result_r?.toString() || "");
      setPnl(data.pnl?.toString() || "");
      setNotes(data.notes || "");

      const { data: existingTrade, error: tradeError } =
        await supabase
          .from("trades")
          .select("id")
          .eq("user_id", user.id)
          .eq("screenshot_id", id)
          .maybeSingle();

      if (tradeError) {
        console.error(
          "Error checking Journal:",
          tradeError
        );
      }

      setAlreadyInJournal(Boolean(existingTrade));
      setLoading(false);
    };

    loadAnalysis();
  }, [id, router]);

  const handleAddToJournal = async () => {
    if (!analysis || alreadyInJournal) return;

    if (
      analysis.direction !== "long" &&
      analysis.direction !== "short"
    ) {
      alert(
        "Select Long or Short before adding this analysis to the Journal."
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
      alert(
        "Entry price and stop loss cannot be the same."
      );
      return;
    }

    if (
      analysis.direction === "long" &&
      stop >= entry
    ) {
      alert(
        "For a Long trade, the stop loss must be below the entry price."
      );
      return;
    }

    if (
      analysis.direction === "short" &&
      stop <= entry
    ) {
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

    setAddingToJournal(true);

    const symbol =
      analysis.symbol?.trim().toUpperCase() || "STOCK";

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
      riskPoints *
      contractData.pointValue *
      quantity;

    const targetProfit =
      rewardPoints *
      contractData.pointValue *
      quantity;

    const journalNotes = [
      `Original symbol: ${symbol}`,
      `AI Score: ${analysis.score ?? 0}/100`,
      analysis.bot_analysis || "",
    ]
      .filter(Boolean)
      .join("\n\n");

    const { error } = await supabase
      .from("trades")
      .insert({
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

    setAddingToJournal(false);

    if (error) {
      console.error(error);

      if (error.code === "23505") {
        setAlreadyInJournal(true);

        alert(
          "This analysis has already been added to the Journal."
        );

        return;
      }

      alert(error.message);
      return;
    }

    setAlreadyInJournal(true);

    alert(
      "Analysis added to the Journal successfully!"
    );
  };

  const handleSaveResult = async () => {
    if (!analysis) return;

    setSaving(true);

    const { error } = await supabase
      .from("trade_screenshots")
      .update({
        trade_status: tradeStatus,
        result_r: resultR
          ? Number(resultR)
          : null,
        pnl: pnl ? Number(pnl) : null,
        notes,
      })
      .eq("id", analysis.id);

    if (error) {
      console.error(error);
      alert(error.message);
      setSaving(false);
      return;
    }

    /*
      If this analysis has already been added to the Journal,
      update its result there as well.
    */
    if (alreadyInJournal) {
      const journalStatus =
        tradeStatus === "winner"
          ? "win"
          : tradeStatus === "loser"
          ? "loss"
          : tradeStatus === "breakeven"
          ? "breakeven"
          : "planned";

      const { error: journalError } = await supabase
        .from("trades")
        .update({
          status: journalStatus,
          result_r: resultR
            ? Number(resultR)
            : null,
          pnl: pnl ? Number(pnl) : null,
          notes,
        })
        .eq("screenshot_id", analysis.id);

      if (journalError) {
        console.error(
          "Journal update error:",
          journalError
        );

        alert(
          `The analysis was saved, but the Journal could not be updated: ${journalError.message}`
        );

        setSaving(false);
        return;
      }
    }

    setAnalysis((current) =>
      current
        ? {
            ...current,
            trade_status: tradeStatus,
            result_r: resultR
              ? Number(resultR)
              : null,
            pnl: pnl ? Number(pnl) : null,
            notes,
          }
        : current
    );

    alert("Trade result saved successfully!");
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!analysis) return;

    const confirmDelete = confirm(
      "Are you sure you want to delete this analysis?"
    );

    if (!confirmDelete) return;

    /*
      Prevents a foreign-key error if this analysis
      has already been added to the Journal.
    */
    if (alreadyInJournal) {
      const deleteJournalTrade = confirm(
        "This analysis is connected to a Journal trade. Delete the Journal trade too?"
      );

      if (!deleteJournalTrade) return;

      const { error: journalDeleteError } =
        await supabase
          .from("trades")
          .delete()
          .eq("screenshot_id", analysis.id);

      if (journalDeleteError) {
        console.error(journalDeleteError);
        alert(journalDeleteError.message);
        return;
      }
    }

    const { error } = await supabase
      .from("trade_screenshots")
      .delete()
      .eq("id", analysis.id);

    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }

    alert("Analysis deleted successfully.");
    router.push("/analytics");
  };

  if (loading) {
    return (
      <section className="min-h-screen bg-gray-950 p-6 text-white">
        <div className="mx-auto max-w-6xl">
          <p className="text-gray-400">
            Loading analysis...
          </p>
        </div>
      </section>
    );
  }

  if (!analysis) {
    return (
      <section className="min-h-screen bg-gray-950 p-6 text-white">
        <div className="mx-auto max-w-6xl">
          <p>Analysis not found.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-gray-950 p-6 text-white">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/analytics"
            className="text-blue-400 hover:text-blue-300"
          >
            ← Back to Analytics
          </Link>

          <button
            type="button"
            onClick={handleAddToJournal}
            disabled={
              alreadyInJournal || addingToJournal
            }
            className="rounded-xl bg-blue-600 px-5 py-3 font-bold transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-green-900 disabled:text-green-300"
          >
            {alreadyInJournal
              ? "✓ Added to Journal"
              : addingToJournal
              ? "Adding..."
              : "⭐ Add to Journal"}
          </button>
        </div>

        <div>
          <h1 className="text-4xl font-bold">
            {analysis.symbol || "Analysis"}
          </h1>

          <p className="mt-1 text-gray-400">
            {analysis.timeframe || "No timeframe"} •{" "}
            {new Date(
              analysis.created_at
            ).toLocaleString("en-CA")}
          </p>
        </div>

        {analysis.image_url && (
          <img
            src={analysis.image_url}
            alt="Trading analysis screenshot"
            className="w-full rounded-2xl border border-gray-800"
          />
        )}

        <div className="grid gap-4 md:grid-cols-4">
          <InfoCard
            label="Score"
            value={`${analysis.score ?? 0}/100`}
          />

          <InfoCard
            label="Entry"
            value={formatPrice(
              analysis.entry_price
            )}
          />

          <InfoCard
            label="Stop Loss"
            value={formatPrice(
              analysis.stop_loss
            )}
          />

          <InfoCard
            label="Target"
            value={formatPrice(
              analysis.target_price
            )}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 rounded-2xl border border-gray-800 bg-gray-900 p-5">
            <h2 className="mb-4 text-2xl font-bold">
              Price Action
            </h2>

            <DetailRow
              label="Trend"
              value={formatTrend(analysis.trend)}
            />

            <DetailRow
              label="Direction"
              value={formatDirection(
                analysis.direction
              )}
            />

            <DetailRow
              label="Swing High"
              value={formatPrice(
                analysis.swing_high
              )}
            />

            <DetailRow
              label="Swing Low"
              value={formatPrice(
                analysis.swing_low
              )}
            />

            <DetailRow
              label="Breakout"
              value={
                analysis.breakout ? "Yes" : "No"
              }
            />

            <DetailRow
              label="Retest"
              value={
                analysis.retest ? "Yes" : "No"
              }
            />

            <DetailRow
              label="Candle Signal"
              value={formatCandleSignal(
                analysis.candle_signal
              )}
            />
          </div>

          <div className="space-y-2 rounded-2xl border border-gray-800 bg-gray-900 p-5">
            <h2 className="mb-4 text-2xl font-bold">
              Trade Plan
            </h2>

            <DetailRow
              label="Entry"
              value={formatPrice(
                analysis.entry_price
              )}
            />

            <DetailRow
              label="Stop Loss"
              value={formatPrice(
                analysis.stop_loss
              )}
            />

            <DetailRow
              label="Target"
              value={formatPrice(
                analysis.target_price
              )}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
          <h2 className="mb-3 text-2xl font-bold">
            TraderBot Analysis
          </h2>

          <p className="whitespace-pre-line leading-relaxed text-gray-300">
            {analysis.bot_analysis ||
              "No AI analysis available."}
          </p>
        </div>

        <div className="mx-auto mt-12 max-w-3xl space-y-4 rounded-2xl border border-gray-800 bg-gray-900 p-5">
          <h2 className="text-2xl font-bold">
            Trade Result
          </h2>

          {!alreadyInJournal && (
            <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-yellow-200">
              Add this analysis to the Journal so
              future results can be synchronized.
            </div>
          )}

          <div>
            <label
              htmlFor="tradeStatus"
              className="mb-2 block text-sm text-gray-300"
            >
              Trade status
            </label>

            <select
              id="tradeStatus"
              className="w-full rounded-xl border border-gray-700 bg-gray-800 p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={tradeStatus}
              onChange={(event) =>
                setTradeStatus(event.target.value)
              }
            >
              <option value="pending">
                Not traded yet
              </option>

              <option value="winner">
                Winner
              </option>

              <option value="loser">
                Loser
              </option>

              <option value="breakeven">
                Breakeven
              </option>
            </select>
          </div>

          <div>
            <label
              htmlFor="resultR"
              className="mb-2 block text-sm text-gray-300"
            >
              Result in R
            </label>

            <input
              id="resultR"
              type="number"
              step="any"
              className="w-full rounded-xl border border-gray-700 bg-gray-800 p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Example: 2 or -1"
              value={resultR}
              onChange={(event) =>
                setResultR(event.target.value)
              }
            />
          </div>

          <div>
            <label
              htmlFor="pnl"
              className="mb-2 block text-sm text-gray-300"
            >
              Profit and loss
            </label>

            <input
              id="pnl"
              type="number"
              step="any"
              className="w-full rounded-xl border border-gray-700 bg-gray-800 p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Example: 120 or -50"
              value={pnl}
              onChange={(event) =>
                setPnl(event.target.value)
              }
            />
          </div>

          <div>
            <label
              htmlFor="notes"
              className="mb-2 block text-sm text-gray-300"
            >
              Notes and lessons learned
            </label>

            <textarea
              id="notes"
              className="min-h-32 w-full rounded-xl border border-gray-700 bg-gray-800 p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Write your observations and lessons learned"
              value={notes}
              onChange={(event) =>
                setNotes(event.target.value)
              }
            />
          </div>

          <button
            type="button"
            onClick={handleSaveResult}
            disabled={saving}
            className="w-full rounded-xl bg-blue-600 px-5 py-3 font-bold transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving
              ? "Saving..."
              : "Save Trade Result"}
          </button>

          <div className="flex justify-end pt-6">
            <button
              type="button"
              onClick={handleDelete}
              className="rounded-xl bg-red-600 px-5 py-3 font-bold transition hover:bg-red-700"
            >
              🗑️ Delete Analysis
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function InfoCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
      <p className="text-gray-400">{label}</p>

      <h2 className="mt-1 text-3xl font-bold">
        {value}
      </h2>
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg bg-gray-800/50 p-3">
      <span className="text-gray-400">
        {label}
      </span>

      <span className="text-right font-semibold">
        {value}
      </span>
    </div>
  );
}

function formatPrice(value: number | null) {
  if (value === null || value === undefined) {
    return "—";
  }

  return Number(value).toString();
}

function formatDirection(
  direction: Direction | null
) {
  if (direction === "long") return "Long";
  if (direction === "short") return "Short";
  if (direction === "wait") return "Wait";

  return "Not provided";
}

function formatTrend(trend: string | null) {
  const trendLabels: Record<string, string> = {
    alta: "Uptrend",
    baixa: "Downtrend",
    consolidacao: "Consolidation",
    uptrend: "Uptrend",
    downtrend: "Downtrend",
    consolidation: "Consolidation",
  };

  if (!trend) return "Not provided";

  return trendLabels[trend] || trend;
}

function formatCandleSignal(
  signal: string | null
) {
  const signalLabels: Record<string, string> = {
    forca: "Strength Candle",
    rejeicao: "Rejection Candle",
    indecisao: "Indecision Candle",
    strength: "Strength Candle",
    rejection: "Rejection Candle",
    indecision: "Indecision Candle",
  };

  if (!signal) return "Not provided";

  return signalLabels[signal] || signal;
}