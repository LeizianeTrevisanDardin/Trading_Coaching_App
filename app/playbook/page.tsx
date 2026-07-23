"use client";

import { useMemo, useState } from "react";

export default function PlaybookPage() {
  const [open, setOpen] = useState("8000");
  const [high, setHigh] = useState("8015");
  const [low, setLow] = useState("7992");
  const [close, setClose] = useState("8012");

  const candle = useMemo(() => {
    const o = Number(open);
    const h = Number(high);
    const l = Number(low);
    const c = Number(close);

    if (!o || !h || !l || !c) return null;

    if (h < Math.max(o, c) || l > Math.min(o, c) || h <= l) {
      return null;
    }

    const isGreen = c > o;
    const isRed = c < o;
    const winner = isGreen
      ? "Buyers"
      : isRed
      ? "Sellers"
      : "Indecision";

    const range = h - l;
    const chartHeight = 320;

    const y = (price: number) =>
      ((h - price) / range) * chartHeight + 20;

    return {
      open: o,
      high: h,
      low: l,
      close: c,
      isGreen,
      isRed,
      winner,
      yOpen: y(o),
      yHigh: y(h),
      yLow: y(l),
      yClose: y(c),
      bodyTop: y(Math.max(o, c)),
      bodyBottom: y(Math.min(o, c)),
      bodyHeight: Math.max(Math.abs(y(o) - y(c)), 6),
      upperWick: h - Math.max(o, c),
      lowerWick: Math.min(o, c) - l,
      bodyPoints: Math.abs(c - o),
    };
  }, [open, high, low, close]);

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-white">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-2 text-3xl font-bold">Playbook</h1>

        <p className="mb-8 text-slate-400">
          Candle Academy: learn price action by building candlesticks
          with Open, High, Low, and Close values.
        </p>

        <div className="grid gap-6 md:grid-cols-2">
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="mb-6 text-xl font-semibold">
              Candle Builder
            </h2>

            <div className="space-y-4">
              <Field label="Open">
                <input
                  className="input"
                  value={open}
                  onChange={(e) => setOpen(e.target.value)}
                />
              </Field>

              <Field label="High">
                <input
                  className="input"
                  value={high}
                  onChange={(e) => setHigh(e.target.value)}
                />
              </Field>

              <Field label="Low">
                <input
                  className="input"
                  value={low}
                  onChange={(e) => setLow(e.target.value)}
                />
              </Field>

              <Field label="Close">
                <input
                  className="input"
                  value={close}
                  onChange={(e) => setClose(e.target.value)}
                />
              </Field>
            </div>

            {!candle && (
              <p className="mt-4 text-sm text-red-300">
                Please check the values. High must be the highest price
                and Low must be the lowest price.
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="mb-6 text-xl font-semibold">
              Generated Candle
            </h2>

            {candle && (
              <div className="flex flex-col items-center">
                <svg
                  width="260"
                  height="380"
                  className="rounded-xl border border-slate-800 bg-slate-950"
                >
                  <line
                    x1="130"
                    x2="130"
                    y1={candle.yHigh}
                    y2={candle.yLow}
                    stroke="white"
                    strokeWidth="4"
                  />

                  <rect
                    x="95"
                    y={candle.bodyTop}
                    width="70"
                    height={candle.bodyHeight}
                    rx="4"
                    fill={
                      candle.isGreen
                        ? "#22c55e"
                        : candle.isRed
                        ? "#ef4444"
                        : "#94a3b8"
                    }
                    stroke="white"
                    strokeWidth="2"
                  />

                  <Text
                    x={25}
                    y={candle.yHigh + 5}
                    color="#3b82f6"
                  >
                    High {candle.high}
                  </Text>

                  <Text
                    x={25}
                    y={candle.yLow + 5}
                    color="#ef4444"
                  >
                    Low {candle.low}
                  </Text>

                  <Text
                    x={170}
                    y={candle.yOpen + 5}
                    color="#22c55e"
                  >
                    Open {candle.open}
                  </Text>

                  <Text
                    x={170}
                    y={candle.yClose + 5}
                    color="#fb923c"
                  >
                    Close {candle.close}
                  </Text>
                </svg>

                <div className="mt-6 w-full space-y-3">
                  <Result
                    label="Candle Color"
                    value={
                      candle.isGreen
                        ? "Green"
                        : candle.isRed
                        ? "Red"
                        : "Neutral"
                    }
                  />

                  <Result
                    label="Winner"
                    value={candle.winner}
                  />

                  <Result
                    label="Body Points"
                    value={candle.bodyPoints.toFixed(2)}
                  />

                  <Result
                    label="Upper Wick"
                    value={candle.upperWick.toFixed(2)}
                  />

                  <Result
                    label="Lower Wick"
                    value={candle.lowerWick.toFixed(2)}
                  />
                </div>

                <div className="mt-6 rounded-xl bg-slate-800 p-4 text-slate-300">
                  {candle.isGreen
                    ? "Buyers won because the price closed above the opening price."
                    : candle.isRed
                    ? "Sellers won because the price closed below the opening price."
                    : "The candle shows indecision because the opening and closing prices are nearly the same."}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
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
    <div className="flex items-center justify-between rounded-lg bg-slate-800 p-4">
      <span className="text-slate-400">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}

function Text({
  x,
  y,
  color,
  children,
}: {
  x: number;
  y: number;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <text
      x={x}
      y={y}
      fill={color}
      fontSize="13"
      fontWeight="bold"
    >
      {children}
    </text>
  );
}