"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type Contract = "STOCK" | "MES" | "ES" | "MNQ" | "NQ";
export type TradingMode = "paper" | "live";

export type UserSettings = {
  default_contract: Contract;
  default_risk: number;
  default_reward: number;
  account_size: number;
  default_quantity: number;
  trading_mode: TradingMode;
  timezone: string;
};

const defaultSettings: UserSettings = {
  default_contract: "STOCK",
  default_risk: 1,
  default_reward: 2,
  account_size: 500,
  default_quantity: 1,
  trading_mode: "paper",
  timezone: "America/Edmonton",
};

export function useUserSettings() {
  const [settings, setSettings] =
    useState<UserSettings>(defaultSettings);

  const [loadingSettings, setLoadingSettings] = useState(true);
  const [settingsError, setSettingsError] =
    useState<string | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      setLoadingSettings(true);
      setSettingsError(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setLoadingSettings(false);
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
        console.error("Settings loading error:", error);
        setSettingsError(error.message);
        setLoadingSettings(false);
        return;
      }

      if (data) {
        setSettings({
          default_contract:
            (data.default_contract as Contract) ||
            defaultSettings.default_contract,

          default_risk:
            Number(data.default_risk) ||
            defaultSettings.default_risk,

          default_reward:
            Number(data.default_reward) ||
            defaultSettings.default_reward,

          account_size:
            Number(data.account_size) ||
            defaultSettings.account_size,

          default_quantity:
            Number(data.default_quantity) ||
            defaultSettings.default_quantity,

          trading_mode:
            (data.trading_mode as TradingMode) ||
            defaultSettings.trading_mode,

          timezone:
            data.timezone || defaultSettings.timezone,
        });
      }

      setLoadingSettings(false);
    };

    loadSettings();
  }, []);

  return {
    settings,
    loadingSettings,
    settingsError,
  };
}