"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Contract = "STOCK" | "MES" | "ES" | "MNQ" | "NQ";
type TradingMode = "paper" | "live";
type DialogType = "success" | "error" | "warning" | "info";

type UserSettings = {
  default_contract: Contract;
  default_risk: number;
  default_reward: number;
  account_size: number;
  default_quantity: number;
  trading_mode: TradingMode;
  timezone: string;
};

type DialogState = {
  open: boolean;
  type: DialogType;
  title: string;
  message: string;
};

const initialSettings: UserSettings = {
  default_contract: "STOCK",
  default_risk: 1,
  default_reward: 2,
  account_size: 500,
  default_quantity: 1,
  trading_mode: "paper",
  timezone: "America/Edmonton",
};

const initialDialog: DialogState = {
  open: false,
  type: "info",
  title: "",
  message: "",
};

export default function SettingsPage() {
  const router = useRouter();

  const [settings, setSettings] =
    useState<UserSettings>(initialSettings);

  const [loading, setLoading] = useState(true);
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
    const loadSettings = async () => {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/login");
        return;
      }

      const { data, error } = await supabase
        .from("user_settings")
        .select(
          `
          default_contract,
          default_risk,
          default_reward,
          account_size,
          default_quantity,
          trading_mode,
          timezone
          `
        )
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error(error);

        showDialog(
          "error",
          "Could Not Load Settings",
          error.message
        );

        setLoading(false);
        return;
      }

      if (data) {
        setSettings({
          default_contract:
            (data.default_contract as Contract) || "STOCK",

          default_risk:
            Number(data.default_risk) || 1,

          default_reward:
            Number(data.default_reward) || 2,

          account_size:
            Number(data.account_size) || 500,

          default_quantity:
            Number(data.default_quantity) || 1,

          trading_mode:
            (data.trading_mode as TradingMode) || "paper",

          timezone:
            data.timezone || "America/Edmonton",
        });
      }

      setLoading(false);
    };

    loadSettings();
  }, [router]);

  const updateSetting = <Key extends keyof UserSettings>(
    key: Key,
    value: UserSettings[Key]
  ) => {
    setSettings((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleSave = async () => {
    if (settings.default_risk <= 0) {
      showDialog(
        "warning",
        "Invalid Risk",
        "Default risk must be greater than zero."
      );

      return;
    }

    if (settings.default_risk > 100) {
      showDialog(
        "warning",
        "Invalid Risk",
        "Default risk cannot be greater than 100%."
      );

      return;
    }

    if (settings.default_reward <= 0) {
      showDialog(
        "warning",
        "Invalid Risk-to-Reward",
        "Default reward must be greater than zero."
      );

      return;
    }

    if (settings.account_size <= 0) {
      showDialog(
        "warning",
        "Invalid Account Size",
        "Account size must be greater than zero."
      );

      return;
    }

    if (
      !Number.isInteger(settings.default_quantity) ||
      settings.default_quantity <= 0
    ) {
      showDialog(
        "warning",
        "Invalid Quantity",
        "Default quantity must be a whole number greater than zero."
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
      router.replace("/login");
      return;
    }

    const { error } = await supabase
      .from("user_settings")
      .upsert(
        {
          user_id: user.id,
          default_contract: settings.default_contract,
          default_risk: settings.default_risk,
          default_reward: settings.default_reward,
          account_size: settings.account_size,
          default_quantity: settings.default_quantity,
          trading_mode: settings.trading_mode,
          timezone: settings.timezone,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        }
      );

    setSaving(false);

    if (error) {
      console.error(error);

      showDialog(
        "error",
        "Could Not Save Settings",
        error.message
      );

      return;
    }

    showDialog(
      "success",
      "Settings Saved",
      "Your default trading preferences were saved successfully."
    );
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        <div className="mx-auto max-w-7xl">
          <p className="text-slate-400">
            Loading settings...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 p-4 text-white sm:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold">
            Settings
          </h1>

          <p className="mt-2 text-slate-400">
            Manage your default trading preferences.
          </p>
        </div>

        <div className="max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="space-y-5">
            <SettingField
              label="Default Contract"
              description="The contract selected automatically when you open the Trade Planner."
            >
              <select
                value={settings.default_contract}
                onChange={(event) =>
                  updateSetting(
                    "default_contract",
                    event.target.value as Contract
                  )
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-800 p-3 text-white outline-none focus:border-blue-500"
              >
                <option value="STOCK">STOCK</option>
                <option value="MES">MES</option>
                <option value="ES">ES</option>
                <option value="MNQ">MNQ</option>
                <option value="NQ">NQ</option>
              </select>
            </SettingField>

            <SettingField
              label="Default Risk"
              description="The percentage of your account you plan to risk on one trade."
            >
              <select
                value={settings.default_risk}
                onChange={(event) =>
                  updateSetting(
                    "default_risk",
                    Number(event.target.value)
                  )
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-800 p-3 text-white outline-none focus:border-blue-500"
              >
                <option value={0.25}>0.25%</option>
                <option value={0.5}>0.5%</option>
                <option value={1}>1%</option>
                <option value={1.5}>1.5%</option>
                <option value={2}>2%</option>
              </select>
            </SettingField>

            <SettingField
              label="Default Risk-to-Reward"
              description="The target reward used automatically in the Trade Planner."
            >
              <select
                value={settings.default_reward}
                onChange={(event) =>
                  updateSetting(
                    "default_reward",
                    Number(event.target.value)
                  )
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-800 p-3 text-white outline-none focus:border-blue-500"
              >
                <option value={1}>1:1</option>
                <option value={1.5}>1:1.5</option>
                <option value={2}>1:2</option>
                <option value={2.5}>1:2.5</option>
                <option value={3}>1:3</option>
                <option value={4}>1:4</option>
              </select>
            </SettingField>

            <SettingField
              label="Default Account Size"
              description="The account balance used for risk calculations."
            >
              <input
                type="number"
                min="1"
                step="0.01"
                value={settings.account_size}
                onChange={(event) =>
                  updateSetting(
                    "account_size",
                    Number(event.target.value)
                  )
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-800 p-3 text-white outline-none focus:border-blue-500"
              />
            </SettingField>

            <SettingField
              label="Default Quantity"
              description="The default number of shares or contracts."
            >
              <input
                type="number"
                min="1"
                step="1"
                value={settings.default_quantity}
                onChange={(event) =>
                  updateSetting(
                    "default_quantity",
                    Number(event.target.value)
                  )
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-800 p-3 text-white outline-none focus:border-blue-500"
              />
            </SettingField>

            <SettingField
              label="Trading Mode"
              description="Identifies whether you are practicing or trading with real money."
            >
              <select
                value={settings.trading_mode}
                onChange={(event) =>
                  updateSetting(
                    "trading_mode",
                    event.target.value as TradingMode
                  )
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-800 p-3 text-white outline-none focus:border-blue-500"
              >
                <option value="paper">
                  Paper Trading
                </option>

                <option value="live">
                  Live Trading
                </option>
              </select>
            </SettingField>

            <SettingField
              label="Timezone"
              description="Used for daily statistics and trade dates."
            >
              <select
                value={settings.timezone}
                onChange={(event) =>
                  updateSetting(
                    "timezone",
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-800 p-3 text-white outline-none focus:border-blue-500"
              >
                <option value="America/Edmonton">
                  Calgary / Edmonton
                </option>

                <option value="America/New_York">
                  New York
                </option>

                <option value="America/Chicago">
                  Chicago
                </option>

                <option value="America/Los_Angeles">
                  Los Angeles
                </option>

                <option value="America/Sao_Paulo">
                  São Paulo
                </option>
              </select>
            </SettingField>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="mt-7 w-full rounded-xl bg-blue-600 px-5 py-3 font-bold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>

      <FeedbackDialog
        dialog={dialog}
        onClose={closeDialog}
      />
    </main>
  );
}

function SettingField({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-slate-800 p-4">
      <label className="block font-semibold text-white">
        {label}
      </label>

      <p className="mb-3 mt-1 text-sm text-slate-400">
        {description}
      </p>

      {children}
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