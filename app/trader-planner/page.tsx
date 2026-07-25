"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Contract,
  useUserSettings,
} from "@/hooks/useUserSettings";

type Direction = "long" | "short";

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

const contracts: Record<
  Contract,
  { pointValue: number; tickSize: number }
> = {
  STOCK: { pointValue: 1, tickSize: 0.01 },
  MES: { pointValue: 5, tickSize: 0.25 },
  ES: { pointValue: 50, tickSize: 0.25 },
  MNQ: { pointValue: 2, tickSize: 0.25 },
  NQ: { pointValue: 20, tickSize: 0.25 },
};

export default function TraderBotPage() {
  const {
    settings,
    loadingSettings,
    settingsError,
  } = useUserSettings();

  const [contract, setContract] =
    useState<Contract>("STOCK");

  const [direction, setDirection] =
    useState<Direction>("long");

  const [entryPrice, setEntryPrice] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [reward, setReward] = useState(2);
  const [quantity, setQuantity] = useState("1");
  const [accountSize, setAccountSize] = useState("500");
  const [riskPercent, setRiskPercent] = useState("1");

  const [settingsApplied, setSettingsApplied] =
    useState(false);

  const [saving, setSaving] = useState(false);
  const [dialog, setDialog] =
    useState<DialogState>(initialDialog);

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
    if (loadingSettings || settingsApplied) {
      return;
    }

    setContract(settings.default_contract);
    setReward(settings.default_reward);
    setAccountSize(String(settings.account_size));
    setRiskPercent(String(settings.default_risk));
    setQuantity(String(settings.default_quantity));

    setSettingsApplied(true);
  }, [
    loadingSettings,
    settings,
    settingsApplied,
  ]);

  const result = useMemo(() => {
    const entry = Number(entryPrice);
    const stop = Number(stopLoss);
    const account = Number(accountSize);
    const riskPct = Number(riskPercent);

    if (
      !Number.isFinite(entry) ||
      !Number.isFinite(stop) ||
      !Number.isFinite(account) ||
      !Number.isFinite(riskPct) ||
      entry <= 0 ||
      stop <= 0 ||
      account <= 0 ||
      riskPct <= 0
    ) {
      return null;
    }

    const riskPoints =
      direction === "long"
        ? entry - stop
        : stop - entry;

    if (riskPoints <= 0) {
      return null;
    }

    const pointValue = contracts[contract].pointValue;
    const tickSize = contracts[contract].tickSize;

    const riskTicks = riskPoints / tickSize;
    const riskPerUnit = riskPoints * pointValue;
    const maxRiskDollars = account * (riskPct / 100);

    const suggestedQuantity =
      riskPerUnit > 0
        ? Math.floor(maxRiskDollars / riskPerUnit)
        : 0;

    const parsedQuantity = Number(quantity);

    const selectedQuantity =
      quantity.trim() === "" ||
      Number.isNaN(parsedQuantity)
        ? suggestedQuantity
        : Math.floor(parsedQuantity);

    const totalRisk = riskPerUnit * selectedQuantity;
    const totalRiskPercent = (totalRisk / account) * 100;

    const takeProfit =
      direction === "long"
        ? entry + riskPoints * reward
        : entry - riskPoints * reward;

    const targetProfit = totalRisk * reward;

    return {
      entry,
      stop,
      takeProfit,
      riskPoints,
      riskTicks,
      riskPerUnit,
      maxRiskDollars,
      suggestedQuantity,
      selectedQuantity,
      totalRisk,
      totalRiskPercent,
      targetProfit,
      warning:
        suggestedQuantity < 1
          ? "Risk is too high for your account size."
          : selectedQuantity < 1
          ? "Quantity must be at least 1."
          : totalRiskPercent > riskPct
          ? "Selected quantity is above your risk limit."
          : "",
    };
  }, [
    contract,
    direction,
    entryPrice,
    stopLoss,
    reward,
    quantity,
    accountSize,
    riskPercent,
  ]);

  const handleSaveTrade = async () => {
    if (!result) {
      showDialog(
        "warning",
        "Incomplete Trade",
        "Enter valid trade information before saving."
      );
      return;
    }

    if (result.selectedQuantity < 1) {
      showDialog(
        "warning",
        "Invalid Quantity",
        "Quantity must be at least 1."
      );
      return;
    }

    setSaving(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setSaving(false);

      showDialog(
        "error",
        "Sign-In Required",
        "You need to sign in before saving a trade."
      );

      return;
    }

    const { error } = await supabase
      .from("trades")
      .insert({
        user_id: user.id,
        contract,
        direction,
        entry: result.entry,
        stop_loss: result.stop,
        take_profit: result.takeProfit,
        reward,
        quantity: result.selectedQuantity,
        risk_points: result.riskPoints,
        risk_ticks: result.riskTicks,
        risk_dollars: result.totalRisk,
        target_profit: result.targetProfit,
        status: "planned",
      });

    setSaving(false);

    if (error) {
      console.error(error);

      showDialog(
        "error",
        "Could Not Save Trade",
        error.message
      );

      return;
    }

    showDialog(
      "success",
      "Trade Saved",
      "The trade was added to your Journal successfully."
    );
  };

  return (
    <main className="min-h-screen bg-slate-950 p-4 text-white sm:p-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-2 text-3xl font-bold">
          TraderBot AI
        </h1>

        <p className="mb-8 text-slate-400">
          Trade Planner and Risk Calculator
        </p>

        {loadingSettings && (
          <div className="mb-6 rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 text-blue-200">
            Loading your saved trading preferences...
          </div>
        )}

        {settingsError && (
          <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-200">
            Your saved settings could not be loaded. The Planner is using the default values.
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="mb-6 text-xl font-semibold">
              Trade Setup
            </h2>

            <div className="space-y-4">
              <Field label="Contract">
                <select
                  value={contract}
                  onChange={(event) =>
                    setContract(
                      event.target.value as Contract
                    )
                  }
                  className="input"
                >
                  <option value="STOCK">
                    Stock / Shares
                  </option>
                  <option value="MES">MES</option>
                  <option value="ES">ES</option>
                  <option value="MNQ">MNQ</option>
                  <option value="NQ">NQ</option>
                </select>
              </Field>

              <Field label="Direction">
                <select
                  value={direction}
                  onChange={(event) =>
                    setDirection(
                      event.target.value as Direction
                    )
                  }
                  className="input"
                >
                  <option value="long">Long</option>
                  <option value="short">Short</option>
                </select>
              </Field>

              <Field label="Entry Price">
                <input
                  type="number"
                  step="any"
                  value={entryPrice}
                  onChange={(event) =>
                    setEntryPrice(event.target.value)
                  }
                  placeholder="Example: 30165"
                  className="input"
                />
              </Field>

              <Field label="Stop Loss">
                <input
                  type="number"
                  step="any"
                  value={stopLoss}
                  onChange={(event) =>
                    setStopLoss(event.target.value)
                  }
                  placeholder={
                    direction === "long"
                      ? "Below entry"
                      : "Above entry"
                  }
                  className="input"
                />
              </Field>

              <Field label="Risk-to-Reward">
                <select
                  value={reward}
                  onChange={(event) =>
                    setReward(Number(event.target.value))
                  }
                  className="input"
                >
                  <option value={1}>1:1</option>
                  <option value={1.5}>1:1.5</option>
                  <option value={2}>1:2</option>
                  <option value={2.5}>1:2.5</option>
                  <option value={3}>1:3</option>
                  <option value={4}>1:4</option>
                </select>
              </Field>

              <Field label="Account Size">
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={accountSize}
                  onChange={(event) =>
                    setAccountSize(event.target.value)
                  }
                  placeholder="Example: 500"
                  className="input"
                />
              </Field>

              <Field label="Risk Percentage">
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={riskPercent}
                  onChange={(event) =>
                    setRiskPercent(event.target.value)
                  }
                  placeholder="Example: 1"
                  className="input"
                />
              </Field>

              <Field label="Quantity">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={quantity}
                  onChange={(event) =>
                    setQuantity(event.target.value)
                  }
                  placeholder="Leave empty to use the suggested quantity"
                  className="input"
                />
              </Field>
            </div>
          </section>

          <div>
            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <h2 className="mb-6 text-xl font-semibold">
                Trade Plan
              </h2>

              {!result ? (
                <p className="text-slate-400">
                  Enter the entry price, stop loss, account size,
                  and risk percentage to generate a trade plan.
                </p>
              ) : (
                <div className="space-y-4">
                  {result.warning && (
                    <div className="rounded-lg border border-red-700 bg-red-950 p-4 text-red-200">
                      {result.warning}
                    </div>
                  )}

                  <Result
                    label="Entry"
                    value={result.entry.toFixed(2)}
                  />

                  <Result
                    label="Stop Loss"
                    value={result.stop.toFixed(2)}
                  />

                  <Result
                    label="Take Profit"
                    value={result.takeProfit.toFixed(2)}
                  />

                  <Result
                    label="Risk Points"
                    value={result.riskPoints.toFixed(2)}
                  />

                  <Result
                    label="Risk Ticks"
                    value={result.riskTicks.toFixed(0)}
                  />

                  <Result
                    label="Risk per Unit"
                    value={formatCurrency(
                      result.riskPerUnit
                    )}
                  />

                  <Result
                    label="Maximum Risk Allowed"
                    value={formatCurrency(
                      result.maxRiskDollars
                    )}
                  />

                  <Result
                    label="Suggested Quantity"
                    value={String(
                      result.suggestedQuantity
                    )}
                  />

                  <Result
                    label="Selected Quantity"
                    value={String(
                      result.selectedQuantity
                    )}
                  />

                  <Result
                    label="Total Risk"
                    value={formatCurrency(result.totalRisk)}
                  />

                  <Result
                    label="Total Risk Percentage"
                    value={`${result.totalRiskPercent.toFixed(
                      2
                    )}%`}
                  />

                  <Result
                    label="Target Profit"
                    value={formatCurrency(
                      result.targetProfit
                    )}
                  />

                  <Result
                    label="Risk-to-Reward"
                    value={`1:${reward}`}
                  />
                </div>
              )}
            </section>

            <button
              type="button"
              onClick={handleSaveTrade}
              disabled={
                !result ||
                saving ||
                Boolean(result?.warning)
              }
              className="mt-6 w-full rounded-lg bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-700"
            >
              {saving ? "Saving..." : "Save Trade"}
            </button>
          </div>
        </div>
      </div>

      <FeedbackDialog
        dialog={dialog}
        onClose={closeDialog}
      />
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm text-slate-400">
        {label}
      </label>

      {children}
    </div>
  );
}

function Result({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg bg-slate-800 p-4">
      <span className="text-slate-400">{label}</span>

      <span className="text-right text-lg font-bold">
        {value}
      </span>
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
              className={`text-xl font-bold ${currentStyle.titleClass}`}
            >
              {dialog.title}
            </h2>

            <p className="mt-2 leading-relaxed text-slate-300">
              {dialog.message}
            </p>
          </div>
        </div>

        <div className="mt-7 flex justify-end">
          <button
            type="button"
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

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(value) || 0);
}