"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Direction = "long" | "short" | "wait";
type DialogType = "success" | "error" | "warning" | "info";

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

type DialogState = {
  open: boolean;
  type: DialogType;
  title: string;
  message: string;
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

const initialDialog: DialogState = {
  open: false,
  type: "info",
  title: "",
  message: "",
};

export default function AnalyticsPage() {
  const router = useRouter();

  const [analyses, setAnalyses] = useState<ScreenshotAnalysis[]>([]);
  const [journalScreenshotIds, setJournalScreenshotIds] = useState<string[]>(
    []
  );

  const [loading, setLoading] = useState(true);
  const [addingToJournal, setAddingToJournal] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState>(initialDialog);
  const [removeCandidate, setRemoveCandidate] =
    useState<ScreenshotAnalysis | null>(null);

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
    const loadAnalyses = async () => {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setLoading(false);
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

        showDialog(
          "error",
          "Could not load analyses",
          analysesError.message
        );
      } else {
        setAnalyses(analysesData ?? []);
      }

      if (journalError) {
        console.error(journalError);

        showDialog(
          "error",
          "Could not load Journal status",
          journalError.message
        );
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

  const handleAddToJournal = async (
    analysis: ScreenshotAnalysis
  ) => {
    if (journalScreenshotIds.includes(analysis.id)) {
      showDialog(
        "info",
        "Already in Journal",
        "This analysis has already been added to your Journal."
      );
      return;
    }

    if (
      analysis.direction !== "long" &&
      analysis.direction !== "short"
    ) {
      showDialog(
        "warning",
        "Direction required",
        "This analysis must have a Long or Short direction before it can be added to the Journal."
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
        "Trade prices required",
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
        "Invalid risk",
        "Entry price and stop loss cannot be the same."
      );
      return;
    }

    if (analysis.direction === "long" && stop >= entry) {
      showDialog(
        "warning",
        "Invalid Long setup",
        "For a Long trade, the stop loss must be below the entry price."
      );
      return;
    }

    if (analysis.direction === "long" && target <= entry) {
      showDialog(
        "warning",
        "Invalid Long target",
        "For a Long trade, the target price must be above the entry price."
      );
      return;
    }

    if (analysis.direction === "short" && stop <= entry) {
      showDialog(
        "warning",
        "Invalid Short setup",
        "For a Short trade, the stop loss must be above the entry price."
      );
      return;
    }

    if (analysis.direction === "short" && target >= entry) {
      showDialog(
        "warning",
        "Invalid Short target",
        "For a Short trade, the target price must be below the entry price."
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
        "Sign-in required",
        "You need to sign in before adding an analysis to the Journal."
      );
      router.push("/login");
      return;
    }

    setAddingToJournal(analysis.id);

    try {
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

      if (error) {
        console.error(error);

        if (error.code === "23505") {
          setJournalScreenshotIds((current) => [
            ...new Set([...current, analysis.id]),
          ]);

          showDialog(
            "info",
            "Already in Journal",
            "This analysis has already been added to your Journal."
          );
          return;
        }

        showDialog(
          "error",
          "Could not add analysis",
          error.message
        );
        return;
      }

      setJournalScreenshotIds((current) => [
        ...new Set([...current, analysis.id]),
      ]);

      showDialog(
        "success",
        "Added to Journal",
        "The analysis was added to your Journal successfully."
      );
    } catch (error) {
      console.error(error);

      const message =
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.";

      showDialog(
        "error",
        "Could not add analysis",
        message
      );
    } finally {
      setAddingToJournal(null);
    }
  };


  const handleRemoveFromJournal = async () => {
    if (!removeCandidate) {
      return;
    }

    const analysis = removeCandidate;
    setRemoveCandidate(null);
    setAddingToJournal(analysis.id);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        showDialog(
          "error",
          "Sign-in required",
          "You need to sign in before removing an analysis from the Journal."
        );
        router.push("/login");
        return;
      }

      const { error } = await supabase
        .from("trades")
        .delete()
        .eq("user_id", user.id)
        .eq("screenshot_id", analysis.id);

      if (error) {
        console.error(error);

        showDialog(
          "error",
          "Could not remove analysis",
          error.message
        );
        return;
      }

      setJournalScreenshotIds((current) =>
        current.filter((id) => id !== analysis.id)
      );

      showDialog(
        "success",
        "Removed from Journal",
        "The analysis was removed from your Journal successfully."
      );
    } catch (error) {
      console.error(error);

      const message =
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.";

      showDialog(
        "error",
        "Could not remove analysis",
        message
      );
    } finally {
      setAddingToJournal(null);
    }
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
            Review your saved TraderBot analyses and add qualified
            setups to your trading journal.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <StatCard
            label="Total Analyses"
            value={String(total)}
          />

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
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
            <p className="text-gray-400">
              Loading analyses...
            </p>
          </div>
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
            const alreadyAdded =
              journalScreenshotIds.includes(item.id);

            const isAdding =
              addingToJournal === item.id;

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
                    {new Date(
                      item.created_at
                    ).toLocaleString("en-CA")}
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
                      value={formatCandleSignal(
                        item.candle_signal
                      )}
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
                      onClick={() => {
                        if (alreadyAdded) {
                          setRemoveCandidate(item);
                          return;
                        }

                        handleAddToJournal(item);
                      }}
                      disabled={isAdding}
                      className={`rounded-xl px-3 py-3 font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                        alreadyAdded
                          ? "bg-red-600 hover:bg-red-700"
                          : "bg-blue-600 hover:bg-blue-700"
                      }`}
                    >
                      {isAdding
                        ? alreadyAdded
                          ? "Removing..."
                          : "Adding..."
                        : alreadyAdded
                        ? "Remove from Journal"
                        : "Add to Journal"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <FeedbackDialog
        dialog={dialog}
        onClose={closeDialog}
      />

      <ConfirmDialog
        open={Boolean(removeCandidate)}
        title="Remove from Journal?"
        message="This analysis will be removed from your Journal. The saved Analytics analysis will remain available."
        confirmLabel="Remove"
        cancelLabel="Cancel"
        onCancel={() => setRemoveCandidate(null)}
        onConfirm={handleRemoveFromJournal}
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
  if (!open) {
    return null;
  }

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
  if (!dialog.open) {
    return null;
  }

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