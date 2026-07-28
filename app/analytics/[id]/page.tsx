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

type DialogType = "success" | "error" | "warning" | "info";

type DialogState = {
  open: boolean;
  type: DialogType;
  title: string;
  message: string;
};

const initialDialog: DialogState = {
  open: false,
  type: "info",
  title: "",
  message: "",
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
  const [dialog, setDialog] = useState<DialogState>(initialDialog);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const showDialog = (
    type: DialogType,
    title: string,
    message: string
  ) => {
    setDialog({
      open: true,
      type,
      title,
      message,
    });
  };

  const closeDialog = () => {
    setDialog((current) => ({
      ...current,
      open: false,
    }));
  };

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
        showDialog(
          "error",
          "Could Not Load Analysis",
          error.message
        );
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
      showDialog(
        "warning",
        "Direction Required",
        "Select Long or Short before adding this analysis to the Journal."
      );
      return;
    }

    if (
      analysis.entry_price === null ||
      analysis.stop_loss === null ||
      analysis.target_price === null
    ) {
      showDialog(
        "warning",
        "Trade Prices Required",
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
      showDialog(
        "warning",
        "Invalid Risk",
        "Entry price and stop loss cannot be the same."
      );
      return;
    }

    if (
      analysis.direction === "long" &&
      stop >= entry
    ) {
      showDialog(
        "warning",
        "Invalid Long Setup",
        "For a Long trade, the stop loss must be below the entry price."
      );
      return;
    }

    if (
      analysis.direction === "short" &&
      stop <= entry
    ) {
      showDialog(
        "warning",
        "Invalid Short Setup",
        "For a Short trade, the stop loss must be above the entry price."
      );
      return;
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      showDialog(
        "error",
        "Sign-In Required",
        "You need to sign in first."
      );
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

        showDialog(
          "info",
          "Already in Journal",
          "This analysis has already been added to your Journal."
        );

        return;
      }

      showDialog(
        "error",
        "Could Not Add Analysis",
        error.message
      );
      return;
    }

    setAlreadyInJournal(true);

    showDialog(
      "success",
      "Added to Journal",
      "The analysis was added to your Journal successfully."
    );
  };

  const handleSaveResult = async () => {
    if (!analysis) return;

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      showDialog(
        "error",
        "Sign-In Required",
        "You need to sign in before saving the trade result."
      );
      router.push("/login");
      return;
    }

    if (
      tradeStatus !== "winner" &&
      tradeStatus !== "loser" &&
      tradeStatus !== "breakeven"
    ) {
      showDialog(
        "warning",
        "Trade Status Required",
        "Select Winner, Loser, or Breakeven before saving."
      );
      return;
    }

    if (
      analysis.direction !== "long" &&
      analysis.direction !== "short"
    ) {
      showDialog(
        "warning",
        "Direction Required",
        "This analysis must have a Long or Short direction."
      );
      return;
    }

    if (
      analysis.entry_price === null ||
      analysis.stop_loss === null ||
      analysis.target_price === null
    ) {
      showDialog(
        "warning",
        "Trade Prices Required",
        "Entry price, stop loss, and target price are required."
      );
      return;
    }

    const parsedResultR =
      resultR.trim() === "" ? null : Number(resultR);

    const parsedPnl =
      pnl.trim() === "" ? null : Number(pnl);

    if (
      parsedResultR !== null &&
      !Number.isFinite(parsedResultR)
    ) {
      showDialog(
        "warning",
        "Invalid Result in R",
        "Enter a valid number for Result in R."
      );
      return;
    }

    if (
      parsedPnl !== null &&
      !Number.isFinite(parsedPnl)
    ) {
      showDialog(
        "warning",
        "Invalid P&L",
        "Enter a valid number for Profit and Loss."
      );
      return;
    }

    setSaving(true);

    try {
      const normalizedResultR =
        tradeStatus === "loser"
          ? parsedResultR === null
            ? null
            : -Math.abs(parsedResultR)
          : tradeStatus === "breakeven"
          ? 0
          : parsedResultR === null
          ? null
          : Math.abs(parsedResultR);

      const normalizedPnl =
        tradeStatus === "loser"
          ? parsedPnl === null
            ? null
            : -Math.abs(parsedPnl)
          : tradeStatus === "breakeven"
          ? 0
          : parsedPnl === null
          ? null
          : Math.abs(parsedPnl);

      const journalStatus: "win" | "loss" | "breakeven" =
        tradeStatus === "winner"
          ? "win"
          : tradeStatus === "loser"
          ? "loss"
          : "breakeven";

      const entry = Number(analysis.entry_price);
      const stop = Number(analysis.stop_loss);
      const target = Number(analysis.target_price);

      const riskPoints = Math.abs(entry - stop);
      const rewardPoints = Math.abs(target - entry);

      if (riskPoints <= 0) {
        showDialog(
          "warning",
          "Invalid Risk",
          "Entry price and stop loss cannot be the same."
        );
        return;
      }

      if (analysis.direction === "long" && stop >= entry) {
        showDialog(
          "warning",
          "Invalid Long Setup",
          "For a Long trade, the stop loss must be below the entry price."
        );
        return;
      }

      if (analysis.direction === "long" && target <= entry) {
        showDialog(
          "warning",
          "Invalid Long Target",
          "For a Long trade, the target must be above the entry price."
        );
        return;
      }

      if (analysis.direction === "short" && stop <= entry) {
        showDialog(
          "warning",
          "Invalid Short Setup",
          "For a Short trade, the stop loss must be above the entry price."
        );
        return;
      }

      if (analysis.direction === "short" && target >= entry) {
        showDialog(
          "warning",
          "Invalid Short Target",
          "For a Short trade, the target must be below the entry price."
        );
        return;
      }

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
        riskPoints * contractData.pointValue * quantity;
      const targetProfit =
        rewardPoints * contractData.pointValue * quantity;

      const journalNotes = [
        `Original symbol: ${symbol}`,
        `AI Score: ${analysis.score ?? 0}/100`,
        analysis.bot_analysis || "",
        notes.trim(),
      ]
        .filter(Boolean)
        .join("\n\n");

      const completedAt = new Date().toISOString();

      const { error: analysisError } = await supabase
        .from("trade_screenshots")
        .update({
          trade_status: tradeStatus,
          result_r: normalizedResultR,
          pnl: normalizedPnl,
          notes: notes.trim() || null,
        })
        .eq("id", analysis.id)
        .eq("user_id", user.id);

      if (analysisError) {
        console.error("Analysis update error:", analysisError);
        showDialog(
          "error",
          "Could Not Save Analysis",
          analysisError.message
        );
        return;
      }

      const { data: existingTrade, error: existingTradeError } =
        await supabase
          .from("trades")
          .select("id")
          .eq("user_id", user.id)
          .eq("screenshot_id", analysis.id)
          .maybeSingle();

      if (existingTradeError) {
        console.error("Journal lookup error:", existingTradeError);
        showDialog(
          "error",
          "Could Not Check Journal",
          existingTradeError.message
        );
        return;
      }

      if (existingTrade) {
        const { error: updateError } = await supabase
          .from("trades")
          .update({
            status: journalStatus,
            result_r: normalizedResultR,
            pnl: normalizedPnl,
            notes: journalNotes,
            completed_at: completedAt,
          })
          .eq("id", existingTrade.id)
          .eq("user_id", user.id);

        if (updateError) {
          console.error("Journal update error:", updateError);
          showDialog(
            "error",
            "Journal Update Failed",
            updateError.message
          );
          return;
        }
      } else {
        const { error: insertError } = await supabase
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
            status: journalStatus,
            result_r: normalizedResultR,
            pnl: normalizedPnl,
            notes: journalNotes,
            completed_at: completedAt,
          });

        if (insertError) {
          console.error("Journal insert error:", insertError);
          showDialog(
            "error",
            "Could Not Add to Journal",
            insertError.message
          );
          return;
        }
      }

      setAnalysis((current) =>
        current
          ? {
              ...current,
              trade_status: tradeStatus,
              result_r: normalizedResultR,
              pnl: normalizedPnl,
              notes: notes.trim() || null,
            }
          : current
      );

      setResultR(
        normalizedResultR === null
          ? ""
          : String(normalizedResultR)
      );
      setPnl(
        normalizedPnl === null ? "" : String(normalizedPnl)
      );
      setAlreadyInJournal(true);

      showDialog(
        "success",
        "Trade Result Saved",
        "The result was saved and synchronized with the Journal and Dashboard."
      );

      router.refresh();
    } catch (error) {
      console.error("Unexpected save error:", error);

      showDialog(
        "error",
        "Could Not Save Result",
        error instanceof Error
          ? error.message
          : "An unexpected error occurred."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!analysis) return;

    setDeleteDialogOpen(false);

    if (alreadyInJournal) {
      const { error: journalDeleteError } = await supabase
        .from("trades")
        .delete()
        .eq("screenshot_id", analysis.id);

      if (journalDeleteError) {
        console.error(journalDeleteError);
        showDialog(
          "error",
          "Could Not Delete Journal Trade",
          journalDeleteError.message
        );
        return;
      }
    }

    const { error } = await supabase
      .from("trade_screenshots")
      .delete()
      .eq("id", analysis.id);

    if (error) {
      console.error(error);
      showDialog(
        "error",
        "Could Not Delete Analysis",
        error.message
      );
      return;
    }

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
    <section className="min-h-screen bg-gray-950 px-4 py-6 text-white sm:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/analytics"
            className="text-blue-400 transition hover:text-blue-300"
          >
            ← Back to Analytics
          </Link>

          <button
            type="button"
            onClick={handleAddToJournal}
            disabled={alreadyInJournal || addingToJournal}
            className="rounded-xl bg-blue-600 px-5 py-3 font-bold transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-green-900 disabled:text-green-300"
          >
            {alreadyInJournal
              ? "✓ Added to Journal"
              : addingToJournal
              ? "Adding..."
              : "Add to Journal"}
          </button>
        </div>

        <div>
          <h1 className="text-3xl font-bold sm:text-4xl">
            {analysis.symbol || "Analysis"}
          </h1>

          <p className="mt-1 text-gray-400">
            {analysis.timeframe || "No timeframe"} •{" "}
            {new Date(analysis.created_at).toLocaleString("en-CA")}
          </p>
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
          <div className="lg:sticky lg:top-6">
            {analysis.image_url ? (
              <div className="max-h-[calc(100vh-3rem)] overflow-auto rounded-2xl border border-gray-800 bg-gray-900 shadow-xl shadow-black/20">
                <img
                  src={analysis.image_url}
                  alt="Trading analysis screenshot"
                  className="h-auto w-full object-contain"
                />
              </div>
            ) : (
              <div className="flex min-h-64 items-center justify-center rounded-2xl border border-dashed border-gray-700 bg-gray-900 p-6 text-center text-gray-400">
                No screenshot available.
              </div>
            )}
          </div>

          <div className="max-h-none space-y-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto lg:pr-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <InfoCard
                label="Score"
                value={`${analysis.score ?? 0}/100`}
              />

              <InfoCard
                label="Entry"
                value={formatPrice(analysis.entry_price)}
              />

              <InfoCard
                label="Stop Loss"
                value={formatPrice(analysis.stop_loss)}
              />

              <InfoCard
                label="Target"
                value={formatPrice(analysis.target_price)}
              />
            </div>

            <div className="space-y-2 rounded-2xl border border-gray-800 bg-gray-900 p-5">
              <h2 className="mb-4 text-2xl font-bold">Price Action</h2>

              <DetailRow
                label="Trend"
                value={formatTrend(analysis.trend)}
              />

              <DetailRow
                label="Direction"
                value={formatDirection(analysis.direction)}
              />

              <DetailRow
                label="Swing High"
                value={formatPrice(analysis.swing_high)}
              />

              <DetailRow
                label="Swing Low"
                value={formatPrice(analysis.swing_low)}
              />

              <DetailRow
                label="Breakout"
                value={analysis.breakout ? "Yes" : "No"}
              />

              <DetailRow
                label="Retest"
                value={analysis.retest ? "Yes" : "No"}
              />

              <DetailRow
                label="Candle Signal"
                value={formatCandleSignal(analysis.candle_signal)}
              />
            </div>

            <div className="space-y-2 rounded-2xl border border-gray-800 bg-gray-900 p-5">
              <h2 className="mb-4 text-2xl font-bold">Trade Plan</h2>

              <DetailRow
                label="Entry"
                value={formatPrice(analysis.entry_price)}
              />

              <DetailRow
                label="Stop Loss"
                value={formatPrice(analysis.stop_loss)}
              />

              <DetailRow
                label="Target"
                value={formatPrice(analysis.target_price)}
              />
            </div>

            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
              <h2 className="mb-3 text-2xl font-bold">
                TraderBot Analysis
              </h2>

              <p className="whitespace-pre-line leading-relaxed text-gray-300">
                {analysis.bot_analysis || "No AI analysis available."}
              </p>
            </div>

            <div className="space-y-4 rounded-2xl border border-gray-800 bg-gray-900 p-5">
              <h2 className="text-2xl font-bold">Trade Result</h2>

              {!alreadyInJournal && (
                <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-yellow-200">
                  Saving the result will automatically add this analysis to the
                  Journal.
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
                  onChange={(event) => setTradeStatus(event.target.value)}
                >
                  <option value="pending">Not traded yet</option>
                  <option value="winner">Winner</option>
                  <option value="loser">Loser</option>
                  <option value="breakeven">Breakeven</option>
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
                  onChange={(event) => setResultR(event.target.value)}
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
                  onChange={(event) => setPnl(event.target.value)}
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
                  className="min-h-32 w-full resize-y rounded-xl border border-gray-700 bg-gray-800 p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Write your observations and lessons learned"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                />
              </div>

              <button
                type="button"
                onClick={handleSaveResult}
                disabled={saving}
                className="w-full rounded-xl bg-blue-600 px-5 py-3 font-bold transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Trade Result"}
              </button>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteDialogOpen(true)}
                  className="rounded-xl bg-red-600 px-5 py-3 font-bold transition hover:bg-red-700"
                >
                  🗑️ Delete Analysis
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <FeedbackDialog dialog={dialog} onClose={closeDialog} />

      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Analysis?"
        message={
          alreadyInJournal
            ? "This analysis and its connected Journal trade will be permanently deleted."
            : "This analysis will be permanently deleted."
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onCancel={() => setDeleteDialogOpen(false)}
        onConfirm={handleDelete}
      />
    </section>
  );
}

function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm"
      role="presentation"
      onClick={onCancel}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md rounded-3xl border border-gray-700 bg-gray-900 p-6 shadow-2xl shadow-black/50"
      >
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-2xl font-bold text-red-400 ring-1 ring-red-500/30">
            !
          </div>

          <div className="min-w-0 flex-1">
            <h2
              id="confirm-dialog-title"
              className="text-xl font-bold text-white"
            >
              {title}
            </h2>

            <p
              id="confirm-dialog-message"
              className="mt-2 leading-relaxed text-gray-300"
            >
              {message}
            </p>
          </div>
        </div>

        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl bg-gray-800 px-6 py-2.5 font-semibold text-white transition hover:bg-gray-700"
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            autoFocus
            onClick={onConfirm}
            className="rounded-xl bg-red-600 px-6 py-2.5 font-semibold text-white transition hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-900"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function FeedbackDialog({
  dialog,
  onClose,
}: {
  dialog: DialogState;
  onClose: () => void;
}) {
  if (!dialog.open) return null;

  const styles: Record<
    DialogType,
    {
      icon: string;
      iconClass: string;
      buttonClass: string;
      titleClass: string;
    }
  > = {
    success: {
      icon: "✓",
      iconClass:
        "bg-emerald-500/15 text-emerald-400 ring-emerald-500/30",
      buttonClass:
        "bg-emerald-600 hover:bg-emerald-500 focus:ring-emerald-500",
      titleClass: "text-emerald-300",
    },
    error: {
      icon: "!",
      iconClass:
        "bg-red-500/15 text-red-400 ring-red-500/30",
      buttonClass:
        "bg-red-600 hover:bg-red-500 focus:ring-red-500",
      titleClass: "text-red-300",
    },
    warning: {
      icon: "!",
      iconClass:
        "bg-amber-500/15 text-amber-400 ring-amber-500/30",
      buttonClass:
        "bg-amber-600 hover:bg-amber-500 focus:ring-amber-500",
      titleClass: "text-amber-300",
    },
    info: {
      icon: "i",
      iconClass:
        "bg-blue-500/15 text-blue-400 ring-blue-500/30",
      buttonClass:
        "bg-blue-600 hover:bg-blue-500 focus:ring-blue-500",
      titleClass: "text-blue-300",
    },
  };

  const currentStyle = styles[dialog.type];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-dialog-title"
        aria-describedby="feedback-dialog-message"
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md rounded-3xl border border-gray-700 bg-gray-900 p-6 shadow-2xl shadow-black/50"
      >
        <div className="flex items-start gap-4">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-2xl font-bold ring-1 ${currentStyle.iconClass}`}
          >
            {currentStyle.icon}
          </div>

          <div className="min-w-0 flex-1">
            <h2
              id="feedback-dialog-title"
              className={`text-xl font-bold ${currentStyle.titleClass}`}
            >
              {dialog.title}
            </h2>

            <p
              id="feedback-dialog-message"
              className="mt-2 leading-relaxed text-gray-300"
            >
              {dialog.message}
            </p>
          </div>
        </div>

        <div className="mt-7 flex justify-end">
          <button
            type="button"
            autoFocus
            onClick={onClose}
            className={`rounded-xl px-6 py-2.5 font-semibold text-white transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 ${currentStyle.buttonClass}`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
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