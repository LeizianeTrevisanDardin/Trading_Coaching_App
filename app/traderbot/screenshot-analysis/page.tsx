"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type Trend = "uptrend" | "downtrend" | "consolidation";
type Direction = "long" | "short" | "wait";
type CandleSignal = "strength" | "rejection" | "indecision";

type CaptureMoment =
  | "pre_trade"
  | "after_entry"
  | "in_trade"
  | "post_trade";

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

  const analysis = useMemo(() => {
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

  const handleSave = async () => {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
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
        alert(uploadError.message);
        setLoading(false);
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
      score: analysis.score,
      bot_analysis: analysis.text,
    };

    const { error } = await supabase
      .from("trade_screenshots")
      .insert(newScreenshot);

    if (error) {
      console.error(error);
      alert(error.message);
      setLoading(false);
      return;
    }

    alert("Analysis saved successfully!");
    router.push("/analytics");
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

            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 p-3 font-bold transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Saving Analysis..."
                : "Save Analysis"}
            </button>
          </div>

          <div className="space-y-5 rounded-2xl border border-gray-800 bg-gray-900 p-5">
            <h2 className="text-2xl font-bold">
              TraderBot Analysis
            </h2>

            <div>
              <div className="text-5xl font-bold">
                {analysis.score}/100
              </div>

              <p className="mt-2 text-lg">
                {analysis.decision}
              </p>

              <p className="mt-1 font-semibold text-blue-400">
                📌 Setup Type: {analysis.setupType}
              </p>

              <p className="mt-2 font-semibold text-purple-400">
                {analysis.modeAdvice}
              </p>

              <p className="mt-3 leading-relaxed text-gray-300">
                {analysis.aiSummary}
              </p>

              {analysis.managementAdvice && (
                <div className="mt-4 rounded-xl border border-orange-500/40 bg-orange-500/10 p-4">
                  <h3 className="font-bold text-orange-300">
                    🛡️ Trade Management
                  </h3>

                  <p className="mt-2 leading-relaxed text-orange-100">
                    {analysis.managementAdvice}
                  </p>
                </div>
              )}
            </div>

            <div className="h-3 w-full rounded-full bg-gray-800">
              <div
                className="h-3 rounded-full bg-blue-600 transition-all"
                style={{
                  width: `${analysis.score}%`,
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              {Object.entries(
                analysis.breakdown
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

              {analysis.positives.length > 0 ? (
                <ul className="list-inside list-disc space-y-1 text-gray-300">
                  {analysis.positives.map(
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

              {analysis.warnings.length > 0 ? (
                <ul className="list-inside list-disc space-y-1 text-gray-300">
                  {analysis.warnings.map(
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

            <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
              <h3 className="font-bold text-blue-300">
                📚 Trading Lesson
              </h3>

              <p className="mt-2 leading-relaxed text-blue-100">
                {analysis.lesson}
              </p>
            </div>

            {analysis.rr > 0 && (
              <div className="flex items-center justify-between rounded-xl bg-gray-800 p-4">
                <span className="text-gray-400">
                  Risk-to-Reward
                </span>

                <span className="text-lg font-bold">
                  1:{analysis.rr.toFixed(2)}
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
    </section>
  );
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