"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type TradeStatus = "planned" | "win" | "loss" | "breakeven";
type DialogType = "success" | "error" | "warning" | "info";

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

export default function JournalPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | TradeStatus>("all");

  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [deletingTrade, setDeletingTrade] = useState<Trade | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [dialog, setDialog] = useState<DialogState>(initialDialog);

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
    const fetchTrades = async () => {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        showDialog(
          "error",
          "Sign-In Required",
          "You need to sign in to view your Journal."
        );
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
        showDialog(
          "error",
          "Could Not Load Journal",
          error.message
        );
        setLoading(false);
        return;
      }

      setTrades((data ?? []) as Trade[]);
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
      wins,
      losses,
      breakeven,
      totalPnl,
      totalR,
      winRate,
    };
  }, [trades]);

  const handleUpdateTrade = async (
    status: TradeStatus,
    pnl: string,
    resultR: string,
    notes: string
  ) => {
    if (!editingTrade) return;

    const parsedPnl = pnl.trim() === "" ? null : Number(pnl);
    const parsedResultR =
      resultR.trim() === "" ? null : Number(resultR);

    if (parsedPnl !== null && Number.isNaN(parsedPnl)) {
      showDialog(
        "warning",
        "Invalid P&L",
        "Enter a valid number for Profit and Loss."
      );
      return;
    }

    if (parsedResultR !== null && Number.isNaN(parsedResultR)) {
      showDialog(
        "warning",
        "Invalid Result in R",
        "Enter a valid number for Result in R."
      );
      return;
    }

    setSavingEdit(true);

    const { data, error } = await supabase
      .from("trades")
      .update({
        status,
        pnl: parsedPnl,
        result_r: parsedResultR,
        notes: notes.trim() || null,
      })
      .eq("id", editingTrade.id)
      .select("*")
      .single();

    setSavingEdit(false);

    if (error) {
      console.error(error);
      showDialog(
        "error",
        "Could Not Update Trade",
        error.message
      );
      return;
    }

    setTrades((current) =>
      current.map((trade) =>
        trade.id === editingTrade.id
          ? (data as Trade)
          : trade
      )
    );

    setEditingTrade(null);

    showDialog(
      "success",
      "Trade Updated",
      "The Journal trade was updated successfully."
    );
  };

  const handleDeleteTrade = async () => {
    if (!deletingTrade) return;

    setDeleting(true);

    const { error } = await supabase
      .from("trades")
      .delete()
      .eq("id", deletingTrade.id);

    setDeleting(false);

    if (error) {
      console.error(error);
      showDialog(
        "error",
        "Could Not Delete Trade",
        error.message
      );
      return;
    }

    setTrades((current) =>
      current.filter((trade) => trade.id !== deletingTrade.id)
    );

    setDeletingTrade(null);

    showDialog(
      "success",
      "Trade Deleted",
      "The trade was removed from your Journal. Its original Analytics analysis was not deleted."
    );
  };

  return (
    <main className="min-h-screen bg-slate-950 p-4 text-white sm:p-8">
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

        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
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
                Save a trade in the Trade Planner or Analytics to see it here.
              </p>
            </div>
          ) : (
            <div className="max-h-[650px] divide-y divide-slate-800 overflow-y-auto">
              {filteredTrades.map((trade) => (
                <TradeCard
                  key={trade.id}
                  trade={trade}
                  onEdit={() => setEditingTrade(trade)}
                  onDelete={() => setDeletingTrade(trade)}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {editingTrade && (
        <EditTradeModal
          key={editingTrade.id}
          trade={editingTrade}
          saving={savingEdit}
          onClose={() => setEditingTrade(null)}
          onSave={handleUpdateTrade}
        />
      )}

      <ConfirmDialog
        open={Boolean(deletingTrade)}
        title="Delete Trade?"
        message="This trade will be removed only from your Journal. The original analysis will remain available in Analytics."
        confirmLabel={deleting ? "Deleting..." : "Delete"}
        cancelLabel="Cancel"
        disabled={deleting}
        onCancel={() => {
          if (!deleting) {
            setDeletingTrade(null);
          }
        }}
        onConfirm={handleDeleteTrade}
      />

      <FeedbackDialog
        dialog={dialog}
        onClose={closeDialog}
      />
    </main>
  );
}

function TradeCard({
  trade,
  onEdit,
  onDelete,
}: {
  trade: Trade;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const directionLabel =
    trade.direction === "long" ? "Long" : "Short";

  return (
    <article className="p-5 transition hover:bg-slate-800/40">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
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

          <p className="whitespace-pre-line text-slate-300">
            {trade.notes}
          </p>
        </div>
      )}

      <div className="mt-5 flex justify-end gap-3">
        <button
          type="button"
          onClick={onEdit}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold transition hover:bg-blue-500"
        >
          Edit
        </button>

        <button
          type="button"
          onClick={onDelete}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold transition hover:bg-red-500"
        >
          Delete
        </button>
      </div>
    </article>
  );
}

function EditTradeModal({
  trade,
  saving,
  onClose,
  onSave,
}: {
  trade: Trade;
  saving: boolean;
  onClose: () => void;
  onSave: (
    status: TradeStatus,
    pnl: string,
    resultR: string,
    notes: string
  ) => void;
}) {
  const [status, setStatus] = useState<TradeStatus>(trade.status);
  const [pnl, setPnl] = useState(
    trade.pnl?.toString() ?? ""
  );
  const [resultR, setResultR] = useState(
    trade.result_r?.toString() ?? ""
  );
  const [notes, setNotes] = useState(
    trade.notes ?? ""
  );

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm"
      role="presentation"
      onClick={() => {
        if (!saving) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-trade-title"
        onClick={(event) => event.stopPropagation()}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"
      >
        <h2
          id="edit-trade-title"
          className="text-2xl font-bold"
        >
          Edit Trade
        </h2>

        <p className="mt-1 text-sm text-slate-400">
          {trade.contract} •{" "}
          {new Date(trade.created_at).toLocaleString("en-CA")}
        </p>

        <div className="mt-5 space-y-4">
          <div>
            <label
              htmlFor="edit-status"
              className="mb-2 block text-sm text-slate-300"
            >
              Status
            </label>

            <select
              id="edit-status"
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as TradeStatus)
              }
              className="w-full rounded-xl border border-slate-700 bg-slate-800 p-3 outline-none focus:border-blue-500"
            >
              <option value="planned">Planned</option>
              <option value="win">Win</option>
              <option value="loss">Loss</option>
              <option value="breakeven">Breakeven</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="edit-pnl"
              className="mb-2 block text-sm text-slate-300"
            >
              Profit and Loss
            </label>

            <input
              id="edit-pnl"
              type="number"
              step="any"
              value={pnl}
              onChange={(event) => setPnl(event.target.value)}
              placeholder="Example: 120 or -50"
              className="w-full rounded-xl border border-slate-700 bg-slate-800 p-3 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="edit-result-r"
              className="mb-2 block text-sm text-slate-300"
            >
              Result in R
            </label>

            <input
              id="edit-result-r"
              type="number"
              step="any"
              value={resultR}
              onChange={(event) => setResultR(event.target.value)}
              placeholder="Example: 2 or -1"
              className="w-full rounded-xl border border-slate-700 bg-slate-800 p-3 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="edit-notes"
              className="mb-2 block text-sm text-slate-300"
            >
              Notes and lessons learned
            </label>

            <textarea
              id="edit-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="min-h-32 w-full rounded-xl border border-slate-700 bg-slate-800 p-3 outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl bg-slate-700 px-5 py-2.5 font-semibold transition hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={() =>
              onSave(status, pnl, resultR, notes)
            }
            className="rounded-xl bg-emerald-600 px-5 py-2.5 font-semibold transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  disabled,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  disabled?: boolean;
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
        className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"
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
              className="mt-2 leading-relaxed text-slate-300"
            >
              {message}
            </p>
          </div>
        </div>

        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={disabled}
            className="rounded-xl bg-slate-800 px-6 py-2.5 font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={disabled}
            className="rounded-xl bg-red-600 px-6 py-2.5 font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
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
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-dialog-title"
        aria-describedby="feedback-dialog-message"
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"
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
              className="mt-2 leading-relaxed text-slate-300"
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
            className={`rounded-xl px-6 py-2.5 font-semibold text-white transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 ${currentStyle.buttonClass}`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
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
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(value) || 0);
}