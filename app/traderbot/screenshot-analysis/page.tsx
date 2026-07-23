"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

type Trend = "uptrend" | "downtrend" | "consolidation";
type Direction = "long" | "short" | "wait";
type CandleSignal = "strength" | "rejection" | "indecision";

type CaptureMoment =
  | "pre_trade"
  | "after_entry"
  | "in_trade"
  | "post_trade";

type DialogType = "success" | "error";

type DialogState = {
  open: boolean;
  type: DialogType;
  title: string;
  message: string;
};

type GeminiDecision =
  | "SETUP_CONFIRMED"
  | "WAIT_FOR_CONFIRMATION"
  | "SETUP_INVALID";

type GeminiTradeAnalysis = {
  score: number;
  decision: GeminiDecision;
  setupType: string;
  summary: string;
  positives: string[];
  warnings: string[];
  confirmationsMissing: string[];
  riskAssessment: string;
  managementAdvice: string;
  lesson: string;
};

type AnalyzeTradeResponse = {
  analysis: GeminiTradeAnalysis;
  calculations: {
    riskPoints: number;
    rewardPoints: number;
    riskReward: number;
  };
};

type ExtractedField<T> = {
  value: T | null;
  confidence: number;
  needsAttention: boolean;
  note: string;
};

type ScreenshotExtraction = {
  symbol: ExtractedField<string>;
  timeframe: ExtractedField<string>;
  marketTrend: ExtractedField<Trend>;
  direction: ExtractedField<Direction>;
  swingHigh: ExtractedField<number>;
  swingLow: ExtractedField<number>;
  breakout: ExtractedField<boolean>;
  retest: ExtractedField<boolean>;
  candleSignal: ExtractedField<CandleSignal>;
  entryPrice: ExtractedField<number>;
  stopLoss: ExtractedField<number>;
  targetPrice: ExtractedField<number>;
  screenshotMoment: ExtractedField<CaptureMoment>;
  generalWarnings: string[];
};

type ExtractScreenshotResponse = {
  extraction: ScreenshotExtraction;
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Could not read the selected image."));
        return;
      }

      const base64 = reader.result.split(",")[1];

      if (!base64) {
        reject(new Error("Could not convert the image to Base64."));
        return;
      }

      resolve(base64);
    };

    reader.onerror = () => {
      reject(new Error("Could not read the selected image."));
    };

    reader.readAsDataURL(file);
  });
}

export default function ScreenshotAnalysisPage() {
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [symbol, setSymbol] = useState("");
  const [timeframe, setTimeframe] = useState("1m");

  const [captureMoment, setCaptureMoment] =
    useState<CaptureMoment>("pre_trade");

  const [trend, setTrend] = useState<Trend>("uptrend");
  const [swingHigh, setSwingHigh] = useState("");
  const [swingLow, setSwingLow] = useState("");
  const [breakout, setBreakout] = useState(false);
  const [retest, setRetest] = useState(false);

  const [candleSignal, setCandleSignal] =
    useState<CandleSignal>("strength");

  const [direction, setDirection] =
    useState<Direction>("wait");

  const [entryPrice, setEntryPrice] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] =
    useState<GeminiTradeAnalysis | null>(null);
  const [aiRiskReward, setAiRiskReward] = useState<number | null>(null);
  const [analysisError, setAnalysisError] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extraction, setExtraction] =
    useState<ScreenshotExtraction | null>(null);
  const [extractionError, setExtractionError] = useState("");

  const [dialog, setDialog] = useState<DialogState>({
    open: false,
    type: "success",
    title: "",
    message: "",
  });

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
      }
    };

    checkUser();
  }, [router]);

  useEffect(() => {
    setExtraction(null);
    setExtractionError("");
  }, [file]);

  useEffect(() => {
    setAiAnalysis(null);
    setAiRiskReward(null);
    setAnalysisError("");
  }, [
    file,
    symbol,
    timeframe,
    captureMoment,
    trend,
    swingHigh,
    swingLow,
    breakout,
    retest,
    candleSignal,
    direction,
    entryPrice,
    stopLoss,
    targetPrice,
  ]);

  const localAnalysis = useMemo(() => {
    let score = 0;

    const positives: string[] = [];
    const warnings: string[] = [];

    const breakdown = {
      trend: 0,
      structure: 0,
      breakout: 0,
      retest: 0,
      candle: 0,
      riskReward: 0,
    };

    let modeAdvice = "";

    if (captureMoment === "pre_trade") {
      modeAdvice =
        "📸 Pre-trade: evaluating whether the setup is worth entering.";
    }

    if (captureMoment === "after_entry") {
      modeAdvice =
        "📈 After entry: evaluating whether the trade still follows the original plan.";
    }

    if (captureMoment === "in_trade") {
      modeAdvice =
        "🛡️ During the trade: focus on protecting your risk and respecting the stop loss.";
    }

    if (captureMoment === "post_trade") {
      modeAdvice =
        "📚 Post-trade: reviewing the trade to identify lessons and improvements.";
    }

    if (trend === "uptrend" && direction === "long") {
      breakdown.trend = 20;

      positives.push(
        "The uptrend supports the Long direction."
      );
    }

    if (trend === "downtrend" && direction === "short") {
      breakdown.trend = 20;

      positives.push(
        "The downtrend supports the Short direction."
      );
    }

    if (
      trend === "uptrend" &&
      direction === "short"
    ) {
      breakdown.trend = -10;

      warnings.push(
        "The Short direction is against the current uptrend."
      );
    }

    if (
      trend === "downtrend" &&
      direction === "long"
    ) {
      breakdown.trend = -10;

      warnings.push(
        "The Long direction is against the current downtrend."
      );
    }

    if (direction === "wait") {
      warnings.push(
        "Direction is set to Wait, so the setup is not yet a confirmed entry."
      );
    }

    if (trend === "consolidation") {
      breakdown.trend = -10;

      warnings.push(
        "Market consolidation increases the risk of false breakouts."
      );
    }

    if (swingHigh && swingLow) {
      breakdown.structure = 15;

      positives.push(
        "The market structure has defined Swing High and Swing Low levels."
      );
    } else {
      warnings.push(
        "Swing High or Swing Low has not been entered."
      );
    }

    if (breakout) {
      breakdown.breakout = 20;

      positives.push(
        "Breakout has been confirmed."
      );
    } else {
      warnings.push(
        "There is no confirmed breakout yet."
      );
    }

    if (retest) {
      breakdown.retest = 20;

      positives.push(
        "Retest confirmed, providing a more conservative entry."
      );
    } else if (
      breakout &&
      candleSignal === "strength"
    ) {
      breakdown.retest = 5;

      warnings.push(
        "There is no retest. This is a more aggressive continuation breakout setup."
      );
    } else {
      breakdown.retest = -10;

      warnings.push(
        "There is no retest or strong confirmation, making the entry riskier."
      );
    }

    if (candleSignal === "strength") {
      breakdown.candle = 15;

      positives.push(
        "A strong candle confirms pressure in the trade direction."
      );
    }

    if (candleSignal === "rejection") {
      breakdown.candle = 10;

      positives.push(
        "The rejection candle shows price defense at an important level."
      );
    }

    if (candleSignal === "indecision") {
      breakdown.candle = -10;

      warnings.push(
        "An indecision candle reduces confidence in the setup."
      );
    }

    const entry = Number(entryPrice);
    const stop = Number(stopLoss);
    const target = Number(targetPrice);

    let rr = 0;

    if (entry && stop && target) {
      const risk = Math.abs(entry - stop);
      const potentialReward = Math.abs(target - entry);

      if (risk > 0) {
        rr = potentialReward / risk;

        if (rr >= 2) {
          breakdown.riskReward = 15;

          positives.push(
            `Good risk-to-reward ratio: ${rr.toFixed(2)}R.`
          );
        } else if (rr >= 1.5) {
          breakdown.riskReward = 5;

          warnings.push(
            `The risk-to-reward ratio is acceptable but not ideal: ${rr.toFixed(
              2
            )}R.`
          );
        } else {
          breakdown.riskReward = -15;

          warnings.push(
            `Weak risk-to-reward ratio: ${rr.toFixed(2)}R.`
          );
        }
      } else {
        breakdown.riskReward = -15;

        warnings.push(
          "Entry and stop loss cannot be the same price."
        );
      }
    } else {
      warnings.push(
        "Entry price, stop loss, or target price has not been entered."
      );
    }

    score =
      breakdown.trend +
      breakdown.structure +
      breakdown.breakout +
      breakdown.retest +
      breakdown.candle +
      breakdown.riskReward;

    let managementAdvice = "";

    if (captureMoment === "in_trade") {
      if (
        retest &&
        breakout &&
        direction === "long"
      ) {
        managementAdvice =
          "Trade management: the setup still depends on buyers defending the support or retest area. Do not increase your position. Do not move your stop loss lower. Wait for confirmation above the retest area.";
      }

      if (
        retest &&
        breakout &&
        direction === "short"
      ) {
        managementAdvice =
          "Trade management: the setup still depends on sellers defending the resistance or retest area. Do not increase your position. Do not move your stop loss higher. Wait for confirmation below the retest area.";
      }

      if (rr > 0 && rr < 2) {
        warnings.push(
          `Because the trade is already active and the risk-to-reward ratio is ${rr.toFixed(
            2
          )}R, the score was reduced because the reward does not fully justify the risk.`
        );

        score -= 10;
      }

      if (score > 90) {
        score = 88;
      }
    }

    score = Math.max(0, Math.min(100, score));

    let setupType = "Undefined Setup";

    if (breakout && retest) {
      setupType = "Breakout and Retest";
    } else if (
      breakout &&
      !retest &&
      candleSignal === "strength"
    ) {
      setupType = "Continuation Breakout";
    } else if (
      !breakout &&
      candleSignal === "rejection"
    ) {
      setupType = "Rejection / Possible Reversal";
    }

    let decision = "⏳ Wait";

    if (score >= 75) {
      decision =
        captureMoment === "in_trade"
          ? "🛡️ Valid trade, but management is required"
          : "✅ Strong Setup";
    } else if (score >= 50) {
      decision =
        "🟡 Valid setup, but caution is required";
    } else {
      decision = "❌ Better to Avoid";
    }

    let aiSummary = "";

    if (score >= 75) {
      aiSummary =
        "This is a high-quality setup with strong Price Action structure.";
    } else if (score >= 50) {
      aiSummary =
        "This is a valid setup, but it still has important points of concern.";
    } else {
      aiSummary =
        "This is a weak setup. It may be better to avoid the trade or wait for additional confirmation.";
    }

    let lesson = "";

    if (captureMoment === "in_trade") {
      lesson =
        "Even a good setup can fail. The most important rule is to respect the stop loss and never increase risk while the trade is active.";
    } else if (captureMoment === "pre_trade") {
      lesson =
        "The best entries usually occur when trend, market structure, retest, confirmation, and risk-to-reward are aligned.";
    } else if (captureMoment === "after_entry") {
      lesson =
        "After entering, avoid changing the original plan because of fear or excitement. Manage the trade according to your predefined risk.";
    } else {
      lesson =
        "Review whether you followed your trading plan and whether the entry respected your strategy.";
    }

    return {
      score,
      decision,
      setupType,
      positives,
      warnings,
      breakdown,
      managementAdvice,
      rr,
      modeAdvice,
      aiSummary,
      lesson,
      text: `${decision}. ${modeAdvice} Setup type: ${setupType}. ${aiSummary} Strengths: ${positives.join(
        " "
      )} Warnings: ${warnings.join(
        " "
      )} Lesson: ${lesson}`,
    };
  }, [
    captureMoment,
    trend,
    direction,
    swingHigh,
    swingLow,
    breakout,
    retest,
    candleSignal,
    entryPrice,
    stopLoss,
    targetPrice,
  ]);

  const displayAnalysis = aiAnalysis
    ? {
        ...localAnalysis,
        score: aiAnalysis.score,
        decision:
          aiAnalysis.decision === "SETUP_CONFIRMED"
            ? "✅ Setup Confirmed"
            : aiAnalysis.decision === "WAIT_FOR_CONFIRMATION"
            ? "⏳ Wait for Confirmation"
            : "❌ Setup Invalid",
        setupType: aiAnalysis.setupType,
        positives: aiAnalysis.positives,
        warnings: aiAnalysis.warnings,
        managementAdvice: aiAnalysis.managementAdvice,
        rr: aiRiskReward ?? localAnalysis.rr,
        aiSummary: aiAnalysis.summary,
        lesson: aiAnalysis.lesson,
        confirmationsMissing: aiAnalysis.confirmationsMissing,
        riskAssessment: aiAnalysis.riskAssessment,
        text: `${aiAnalysis.decision}. Setup type: ${aiAnalysis.setupType}. ${aiAnalysis.summary} Strengths: ${aiAnalysis.positives.join(
          " "
        )} Warnings: ${aiAnalysis.warnings.join(
          " "
        )} Missing confirmations: ${aiAnalysis.confirmationsMissing.join(
          " "
        )} Risk assessment: ${aiAnalysis.riskAssessment} Management advice: ${aiAnalysis.managementAdvice} Lesson: ${aiAnalysis.lesson}`,
      }
    : {
        ...localAnalysis,
        confirmationsMissing: [] as string[],
        riskAssessment: "",
      };

  const handleAutoFill = async () => {
    setExtractionError("");
    setExtraction(null);

    if (!file) {
      setExtractionError(
        "Please upload a chart screenshot first."
      );
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setExtractionError(
        "Please use an image smaller than 5 MB."
      );
      return;
    }

    setExtracting(true);

    try {
      const imageBase64 = await fileToBase64(file);

      const { data, error } =
        await supabase.functions.invoke<ExtractScreenshotResponse>(
          "analyze-trade",
          {
            body: {
              mode: "extract",
              imageBase64,
              imageMimeType: file.type || "image/png",
            },
          }
        );

      if (error) {
        if (error instanceof FunctionsHttpError) {
          const errorBody = await error.context.json();

          const details = Array.isArray(errorBody?.details)
            ? errorBody.details.join(" ")
            : "";

          throw new Error(
            details ||
              errorBody?.error ||
              "The screenshot could not be interpreted."
          );
        }

        if (error instanceof FunctionsRelayError) {
          throw new Error(
            `Supabase relay error: ${error.message}`
          );
        }

        if (error instanceof FunctionsFetchError) {
          throw new Error(
            `Could not reach the function: ${error.message}`
          );
        }

        throw new Error(error.message);
      }

      if (!data?.extraction) {
        throw new Error(
          "The AI returned an invalid extraction response."
        );
      }

      const result = data.extraction;

      setExtraction(result);

      if (result.symbol.value) {
        setSymbol(result.symbol.value.toUpperCase());
      }

      if (result.timeframe.value) {
        setTimeframe(result.timeframe.value);
      }

      if (result.marketTrend.value) {
        setTrend(result.marketTrend.value);
      }

      if (result.direction.value) {
        setDirection(result.direction.value);
      }

      if (result.swingHigh.value !== null) {
        setSwingHigh(String(result.swingHigh.value));
      } else {
        setSwingHigh("");
      }

      if (result.swingLow.value !== null) {
        setSwingLow(String(result.swingLow.value));
      } else {
        setSwingLow("");
      }

      if (result.breakout.value !== null) {
        setBreakout(result.breakout.value);
      }

      if (result.retest.value !== null) {
        setRetest(result.retest.value);
      }

      if (result.candleSignal.value) {
        setCandleSignal(result.candleSignal.value);
      }

      if (result.entryPrice.value !== null) {
        setEntryPrice(String(result.entryPrice.value));
      } else {
        setEntryPrice("");
      }

      if (result.stopLoss.value !== null) {
        setStopLoss(String(result.stopLoss.value));
      } else {
        setStopLoss("");
      }

      if (result.targetPrice.value !== null) {
        setTargetPrice(String(result.targetPrice.value));
      } else {
        setTargetPrice("");
      }

      if (result.screenshotMoment.value) {
        setCaptureMoment(result.screenshotMoment.value);
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "An unexpected extraction error occurred.";

      setExtractionError(message);
    } finally {
      setExtracting(false);
    }
  };

  const handleAnalyzeTrade = async () => {
    setAnalysisError("");
    setAiAnalysis(null);
    setAiRiskReward(null);

    if (!file) {
      setAnalysisError("Please upload a chart screenshot.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setAnalysisError("Please use an image smaller than 5 MB.");
      return;
    }

    if (!symbol.trim()) {
      setAnalysisError("Please enter the symbol.");
      return;
    }

    if (direction === "wait") {
      setAnalysisError(
        "Choose Long or Short before requesting the AI analysis."
      );
      return;
    }

    const entry = Number(entryPrice);
    const stop = Number(stopLoss);
    const target = Number(targetPrice);

    if (
      !Number.isFinite(entry) ||
      !Number.isFinite(stop) ||
      !Number.isFinite(target)
    ) {
      setAnalysisError(
        "Enter valid Entry, Stop Loss, and Target prices."
      );
      return;
    }

    setAnalyzing(true);

    try {
      const imageBase64 = await fileToBase64(file);

      const strategyDetails = [
        breakout ? "Confirmed breakout" : "No confirmed breakout",
        retest ? "Confirmed retest" : "No confirmed retest",
        `Candle signal: ${candleSignal}`,
        swingHigh ? `Swing high: ${swingHigh}` : "",
        swingLow ? `Swing low: ${swingLow}` : "",
      ]
        .filter(Boolean)
        .join(". ");

      const { data, error } =
        await supabase.functions.invoke<AnalyzeTradeResponse>(
          "analyze-trade",
          {
            body: {
              mode: "analyze",
              symbol: symbol.trim().toUpperCase(),
              timeframe: timeframe.trim(),
              strategy: strategyDetails,
              direction,
              entryPrice: entry,
              stopLoss: stop,
              targetPrice: target,
              marketTrend: trend,
              screenshotMoment: captureMoment,
              imageBase64,
              imageMimeType: file.type || "image/png",
            },
          }
        );

     if (error) {
  if (error instanceof FunctionsHttpError) {
    const errorBody = await error.context.json();

    console.log("Function error body:", errorBody);

    const details = Array.isArray(errorBody?.details)
      ? errorBody.details.join(" ")
      : "";

    throw new Error(
      details ||
        errorBody?.error ||
        "The Edge Function returned an error."
    );
  }

  if (error instanceof FunctionsRelayError) {
    throw new Error(`Supabase relay error: ${error.message}`);
  }

  if (error instanceof FunctionsFetchError) {
    throw new Error(`Could not reach the function: ${error.message}`);
  }

  throw new Error(error.message);
}

if (!data?.analysis) {
  throw new Error("The AI returned an invalid response.");
}

setAiAnalysis(data.analysis);
setAiRiskReward(data.calculations?.riskReward ?? null);
} catch (error) {
  const message =
    error instanceof Error
      ? error.message
      : "An unexpected error occurred.";

  setAnalysisError(message);
} finally {
  setAnalyzing(false);
}
  };

  const handleSave = async () => {
    setLoading(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push("/login");
        return;
      }

      let imageUrl = "";

      if (file) {
        const safeFileName = file.name.replace(
          /[^a-zA-Z0-9._-]/g,
          "_"
        );

        const fileName = `${user.id}/${Date.now()}-${safeFileName}`;

        const { error: uploadError } =
          await supabase.storage
            .from("trade-screenshots")
            .upload(fileName, file);

        if (uploadError) {
          console.error(uploadError);

          setDialog({
            open: true,
            type: "error",
            title: "Upload Failed",
            message: uploadError.message,
          });

          return;
        }

        const { data } = supabase.storage
          .from("trade-screenshots")
          .getPublicUrl(fileName);

        imageUrl = data.publicUrl;
      }

      const newScreenshot = {
        user_id: user.id,
        image_url: imageUrl,
        symbol: symbol.trim().toUpperCase(),
        timeframe,
        capture_moment: captureMoment,
        trend,
        swing_high: swingHigh
          ? Number(swingHigh)
          : null,
        swing_low: swingLow
          ? Number(swingLow)
          : null,
        breakout,
        retest,
        candle_signal: candleSignal,
        direction,
        entry_price: entryPrice
          ? Number(entryPrice)
          : null,
        stop_loss: stopLoss
          ? Number(stopLoss)
          : null,
        target_price: targetPrice
          ? Number(targetPrice)
          : null,
        score: displayAnalysis.score,
        bot_analysis: displayAnalysis.text,
      };

      const { error } = await supabase
        .from("trade_screenshots")
        .insert(newScreenshot);

      if (error) {
        console.error(error);

        setDialog({
          open: true,
          type: "error",
          title: "Save Failed",
          message: error.message,
        });

        return;
      }

      setDialog({
        open: true,
        type: "success",
        title: "Analysis Saved",
        message: "Your analysis was saved successfully.",
      });
    } catch (error) {
      console.error(error);

      const message =
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.";

      setDialog({
        open: true,
        type: "error",
        title: "Save Failed",
        message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="min-h-screen bg-gray-950 p-6 text-white">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold">
            Screenshot Analysis
          </h1>

          <p className="mt-2 text-gray-400">
            Upload a screenshot of your chart and enter the
            key Price Action information.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4 rounded-2xl border border-gray-800 bg-gray-900 p-5">
            <div>
              <label className="mb-2 block text-sm text-gray-400">
                Chart Screenshot
              </label>

              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setFile(e.target.files?.[0] || null)
                }
                className="w-full text-sm text-gray-300"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-gray-400">
                Symbol
              </label>

              <input
                className="w-full rounded bg-gray-800 p-3"
                placeholder="Example: AAPL, TSLA, SPY, MES"
                value={symbol}
                onChange={(e) =>
                  setSymbol(e.target.value)
                }
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-gray-400">
                Timeframe
              </label>

              <input
                className="w-full rounded bg-gray-800 p-3"
                placeholder="Example: 1m, 5m, 15m"
                value={timeframe}
                onChange={(e) =>
                  setTimeframe(e.target.value)
                }
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-gray-400">
                Screenshot Moment
              </label>

              <select
                className="w-full rounded bg-gray-800 p-3"
                value={captureMoment}
                onChange={(e) =>
                  setCaptureMoment(
                    e.target.value as CaptureMoment
                  )
                }
              >
                <option value="pre_trade">
                  Before Entry
                </option>

                <option value="after_entry">
                  After Entry
                </option>

                <option value="in_trade">
                  During Trade
                </option>

                <option value="post_trade">
                  After Trade
                </option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm text-gray-400">
                Market Trend
              </label>

              <select
                className="w-full rounded bg-gray-800 p-3"
                value={trend}
                onChange={(e) =>
                  setTrend(e.target.value as Trend)
                }
              >
                <option value="uptrend">
                  Uptrend
                </option>

                <option value="downtrend">
                  Downtrend
                </option>

                <option value="consolidation">
                  Consolidation
                </option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm text-gray-400">
                Trade Direction
              </label>

              <select
                className="w-full rounded bg-gray-800 p-3"
                value={direction}
                onChange={(e) =>
                  setDirection(
                    e.target.value as Direction
                  )
                }
              >
                <option value="wait">
                  Wait
                </option>

                <option value="long">
                  Long / Buy
                </option>

                <option value="short">
                  Short / Sell
                </option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm text-gray-400">
                Swing High
              </label>

              <input
                type="number"
                step="any"
                className="w-full rounded bg-gray-800 p-3"
                placeholder="Enter the Swing High price"
                value={swingHigh}
                onChange={(e) =>
                  setSwingHigh(e.target.value)
                }
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-gray-400">
                Swing Low
              </label>

              <input
                type="number"
                step="any"
                className="w-full rounded bg-gray-800 p-3"
                placeholder="Enter the Swing Low price"
                value={swingLow}
                onChange={(e) =>
                  setSwingLow(e.target.value)
                }
              />
            </div>

            <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-gray-800 p-3">
              <input
                type="checkbox"
                checked={breakout}
                onChange={(e) =>
                  setBreakout(e.target.checked)
                }
                className="h-4 w-4"
              />

              <span>Was there a confirmed breakout?</span>
            </label>

            <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-gray-800 p-3">
              <input
                type="checkbox"
                checked={retest}
                onChange={(e) =>
                  setRetest(e.target.checked)
                }
                className="h-4 w-4"
              />

              <span>Was there a confirmed retest?</span>
            </label>

            <div>
              <label className="mb-1 block text-sm text-gray-400">
                Candle Signal
              </label>

              <select
                className="w-full rounded bg-gray-800 p-3"
                value={candleSignal}
                onChange={(e) =>
                  setCandleSignal(
                    e.target.value as CandleSignal
                  )
                }
              >
                <option value="strength">
                  Strength Candle
                </option>

                <option value="rejection">
                  Rejection Candle
                </option>

                <option value="indecision">
                  Indecision Candle
                </option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm text-gray-400">
                Entry Price
              </label>

              <input
                type="number"
                step="any"
                className="w-full rounded bg-gray-800 p-3"
                placeholder="Enter the planned or executed entry"
                value={entryPrice}
                onChange={(e) =>
                  setEntryPrice(e.target.value)
                }
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-gray-400">
                Stop Loss
              </label>

              <input
                type="number"
                step="any"
                className="w-full rounded bg-gray-800 p-3"
                placeholder="Enter the stop-loss price"
                value={stopLoss}
                onChange={(e) =>
                  setStopLoss(e.target.value)
                }
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-gray-400">
                Target Price
              </label>

              <input
                type="number"
                step="any"
                className="w-full rounded bg-gray-800 p-3"
                placeholder="Enter the target price"
                value={targetPrice}
                onChange={(e) =>
                  setTargetPrice(e.target.value)
                }
              />
            </div>

            {extractionError && (
              <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
                {extractionError}
              </div>
            )}

            <button
              type="button"
              onClick={handleAutoFill}
              disabled={extracting || analyzing || loading || !file}
              className="w-full rounded-xl bg-emerald-600 p-3 font-bold transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {extracting
                ? "Reading screenshot..."
                : "✨ Auto-fill from Screenshot"}
            </button>

            {extraction && (
              <ExtractionReview extraction={extraction} />
            )}

            {analysisError && (
              <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
                {analysisError}
              </div>
            )}

            <button
              type="button"
              onClick={handleAnalyzeTrade}
              disabled={extracting || analyzing || loading}
              className="w-full rounded-xl bg-purple-600 p-3 font-bold transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {analyzing
                ? "TraderBot is analyzing..."
                : "🤖 Analyze Trade"}
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={loading || analyzing || extracting}
              className="w-full rounded-xl bg-blue-600 p-3 font-bold transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Saving Analysis..."
                : "💾 Save Analysis"}
            </button>
          </div>

          <div className="space-y-5 rounded-2xl border border-gray-800 bg-gray-900 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-2xl font-bold">
                TraderBot Analysis
              </h2>

              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  aiAnalysis
                    ? "bg-purple-500/20 text-purple-200"
                    : "bg-gray-800 text-gray-400"
                }`}
              >
                {aiAnalysis ? "Gemini AI" : "Local preview"}
              </span>
            </div>

            <div>
              <div className="text-5xl font-bold">
                {displayAnalysis.score}/100
              </div>

              <p className="mt-2 text-lg">
                {displayAnalysis.decision}
              </p>

              <p className="mt-1 font-semibold text-blue-400">
                📌 Setup Type: {displayAnalysis.setupType}
              </p>

              <p className="mt-2 font-semibold text-purple-400">
                {displayAnalysis.modeAdvice}
              </p>

              <p className="mt-3 leading-relaxed text-gray-300">
                {displayAnalysis.aiSummary}
              </p>

              {displayAnalysis.managementAdvice && (
                <div className="mt-4 rounded-xl border border-orange-500/40 bg-orange-500/10 p-4">
                  <h3 className="font-bold text-orange-300">
                    🛡️ Trade Management
                  </h3>

                  <p className="mt-2 leading-relaxed text-orange-100">
                    {displayAnalysis.managementAdvice}
                  </p>
                </div>
              )}
            </div>

            <div className="h-3 w-full rounded-full bg-gray-800">
              <div
                className="h-3 rounded-full bg-blue-600 transition-all"
                style={{
                  width: `${displayAnalysis.score}%`,
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              {Object.entries(
                displayAnalysis.breakdown
              ).map(([key, value]) => (
                <div
                  key={key}
                  className="rounded-xl bg-gray-800 p-3"
                >
                  <p className="capitalize text-gray-400">
                    {formatBreakdownLabel(key)}
                  </p>

                  <p className="font-semibold">
                    {value} points
                  </p>
                </div>
              ))}
            </div>

            <div>
              <h3 className="mb-2 font-bold text-green-400">
                🟢 Strengths
              </h3>

              {displayAnalysis.positives.length > 0 ? (
                <ul className="list-inside list-disc space-y-1 text-gray-300">
                  {displayAnalysis.positives.map(
                    (item, index) => (
                      <li key={index}>{item}</li>
                    )
                  )}
                </ul>
              ) : (
                <p className="text-gray-400">
                  No strengths have been identified yet.
                </p>
              )}
            </div>

            <div>
              <h3 className="mb-2 font-bold text-yellow-400">
                ⚠️ Warnings
              </h3>

              {displayAnalysis.warnings.length > 0 ? (
                <ul className="list-inside list-disc space-y-1 text-gray-300">
                  {displayAnalysis.warnings.map(
                    (item, index) => (
                      <li key={index}>{item}</li>
                    )
                  )}
                </ul>
              ) : (
                <p className="text-gray-400">
                  No warnings at this time.
                </p>
              )}
            </div>

            {displayAnalysis.confirmationsMissing.length > 0 && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                <h3 className="font-bold text-amber-300">
                  🔎 Missing Confirmations
                </h3>

                <ul className="mt-2 list-inside list-disc space-y-1 text-amber-100">
                  {displayAnalysis.confirmationsMissing.map(
                    (item, index) => (
                      <li key={index}>{item}</li>
                    )
                  )}
                </ul>
              </div>
            )}

            {displayAnalysis.riskAssessment && (
              <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-4">
                <h3 className="font-bold text-cyan-300">
                  📊 Risk Assessment
                </h3>

                <p className="mt-2 leading-relaxed text-cyan-100">
                  {displayAnalysis.riskAssessment}
                </p>
              </div>
            )}

            <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
              <h3 className="font-bold text-blue-300">
                📚 Trading Lesson
              </h3>

              <p className="mt-2 leading-relaxed text-blue-100">
                {displayAnalysis.lesson}
              </p>
            </div>

            {displayAnalysis.rr > 0 && (
              <div className="flex items-center justify-between rounded-xl bg-gray-800 p-4">
                <span className="text-gray-400">
                  Risk-to-Reward
                </span>

                <span className="text-lg font-bold">
                  1:{displayAnalysis.rr.toFixed(2)}
                </span>
              </div>
            )}

            {file && (
              <img
                src={URL.createObjectURL(file)}
                alt="Uploaded trading chart"
                className="mt-4 w-full rounded-xl border border-gray-700"
              />
            )}
          </div>
        </div>
      </div>

      <SaveDialog
        dialog={dialog}
        onClose={() =>
          setDialog((current) => ({
            ...current,
            open: false,
          }))
        }
        onViewAnalytics={() => {
          setDialog((current) => ({
            ...current,
            open: false,
          }));

          router.push("/analytics");
        }}
      />
    </section>
  );
}

function SaveDialog({
  dialog,
  onClose,
  onViewAnalytics,
}: {
  dialog: DialogState;
  onClose: () => void;
  onViewAnalytics: () => void;
}) {
  if (!dialog.open) {
    return null;
  }

  const isSuccess = dialog.type === "success";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-dialog-title"
        aria-describedby="save-dialog-message"
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md rounded-3xl border border-gray-700 bg-gray-900 p-6 shadow-2xl shadow-black/50"
      >
        <div className="flex items-start gap-4">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-2xl font-bold ring-1 ${
              isSuccess
                ? "bg-emerald-500/15 text-emerald-400 ring-emerald-500/30"
                : "bg-red-500/15 text-red-400 ring-red-500/30"
            }`}
          >
            {isSuccess ? "✓" : "!"}
          </div>

          <div className="min-w-0 flex-1">
            <h2
              id="save-dialog-title"
              className={`text-xl font-bold ${
                isSuccess
                  ? "text-emerald-300"
                  : "text-red-300"
              }`}
            >
              {dialog.title}
            </h2>

            <p
              id="save-dialog-message"
              className="mt-2 leading-relaxed text-gray-300"
            >
              {dialog.message}
            </p>
          </div>
        </div>

        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-gray-800 px-5 py-2.5 font-semibold text-white transition hover:bg-gray-700"
          >
            Close
          </button>

          {isSuccess && (
            <button
              type="button"
              autoFocus
              onClick={onViewAnalytics}
              className="rounded-xl bg-emerald-600 px-5 py-2.5 font-semibold text-white transition hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-gray-900"
            >
              View Analytics
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ExtractionReview({
  extraction,
}: {
  extraction: ScreenshotExtraction;
}) {
  const fieldsNeedingAttention = Object.entries(extraction)
    .filter(([key]) => key !== "generalWarnings")
    .flatMap(([key, value]) => {
      if (
        typeof value !== "object" ||
        value === null ||
        !("needsAttention" in value)
      ) {
        return [];
      }

      const field = value as ExtractedField<unknown>;

      return field.needsAttention ? [[key, field] as const] : [];
    });

  const hasWarnings =
    fieldsNeedingAttention.length > 0 ||
    extraction.generalWarnings.length > 0;

  return (
    <div
      className={`rounded-xl border p-4 ${
        hasWarnings
          ? "border-amber-500/30 bg-amber-500/10"
          : "border-emerald-500/30 bg-emerald-500/10"
      }`}
    >
      <h3
        className={`font-bold ${
          hasWarnings ? "text-amber-300" : "text-emerald-300"
        }`}
      >
        {hasWarnings
          ? "⚠️ Review AI-filled fields"
          : "✅ AI-filled fields look clear"}
      </h3>

      <p
        className={`mt-1 text-sm ${
          hasWarnings ? "text-amber-100" : "text-emerald-100"
        }`}
      >
        The values remain editable. Review them before clicking
        Analyze Trade.
      </p>

      {fieldsNeedingAttention.length > 0 && (
        <div className="mt-3 space-y-2">
          {fieldsNeedingAttention.map(([key, field]) => (
            <div
              key={key}
              className="rounded-lg bg-black/20 p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold">
                  {formatExtractionLabel(key)}
                </span>

                <span className="text-xs">
                  {Math.round(field.confidence)}% confidence
                </span>
              </div>

              <p className="mt-1 text-sm text-amber-100">
                {field.note ||
                  "This value should be reviewed manually."}
              </p>
            </div>
          ))}
        </div>
      )}

      {extraction.generalWarnings.length > 0 && (
        <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-amber-100">
          {extraction.generalWarnings.map((warning, index) => (
            <li key={index}>{warning}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatExtractionLabel(key: string) {
  const labels: Record<string, string> = {
    symbol: "Symbol",
    timeframe: "Timeframe",
    marketTrend: "Market Trend",
    direction: "Trade Direction",
    swingHigh: "Swing High",
    swingLow: "Swing Low",
    breakout: "Breakout",
    retest: "Retest",
    candleSignal: "Candle Signal",
    entryPrice: "Entry Price",
    stopLoss: "Stop Loss",
    targetPrice: "Target Price",
    screenshotMoment: "Screenshot Moment",
  };

  return labels[key] ?? key;
}

function formatBreakdownLabel(key: string) {
  const labels: Record<string, string> = {
    trend: "Trend",
    structure: "Structure",
    breakout: "Breakout",
    retest: "Retest",
    candle: "Candle Signal",
    riskReward: "Risk-to-Reward",
  };

  return labels[key] ?? key;
}