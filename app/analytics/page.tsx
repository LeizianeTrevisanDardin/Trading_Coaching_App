"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

type ScreenshotAnalysis = {
  id: string;
  image_url: string | null;
  symbol: string | null;
  timeframe: string | null;
  trend: string | null;
  swing_high: number | null;
  swing_low: number | null;
  breakout: boolean | null;
  retest: boolean | null;
  candle_signal: string | null;
  direction: string | null;
  entry_price: number | null;
  stop_loss: number | null;
  target_price: number | null;
  score: number | null;
  bot_analysis: string | null;
  created_at: string;
};

export default function AnalyticsPage() {
  const router = useRouter();

  const [analyses, setAnalyses] = useState<ScreenshotAnalysis[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAnalyses = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("trade_screenshots")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
        alert(error.message);
      } else {
        setAnalyses(data || []);
      }

      setLoading(false);
    };

    loadAnalyses();
  }, [router]);

  const total = analyses.length;

  const averageScore =
    total > 0
      ? Math.round(
          analyses.reduce((sum, item) => sum + (item.score || 0), 0) / total
        )
      : 0;

  const goodSetups = analyses.filter(
    (item) => (item.score || 0) >= 75
  ).length;

  const waitSetups = analyses.filter(
    (item) => item.direction === "wait"
  ).length;

  return (
    <section className="min-h-screen bg-gray-950 p-6 text-white">
      <div className="mx-auto max-w-7xl space-y-8">
        <div>
          <h1 className="text-4xl font-bold">Analytics</h1>

          <p className="text-gray-400">
            Your saved TraderBot analyses are displayed here.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
            <p className="text-gray-400">Total Analyses</p>

            <h2 className="text-3xl font-bold">{total}</h2>
          </div>

          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
            <p className="text-gray-400">Average Score</p>

            <h2 className="text-3xl font-bold">{averageScore}/100</h2>
          </div>

          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
            <p className="text-gray-400">High-Quality Setups</p>

            <h2 className="text-3xl font-bold">{goodSetups}</h2>
          </div>

          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
            <p className="text-gray-400">Wait Signals</p>

            <h2 className="text-3xl font-bold">{waitSetups}</h2>
          </div>
        </div>

        {loading && (
          <p className="text-gray-400">Loading analyses...</p>
        )}

        {!loading && analyses.length === 0 && (
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
            <p className="text-gray-400">
              No analyses have been saved yet.
            </p>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {analyses.map((item) => (
            <div
              key={item.id}
              className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900"
            >
              {item.image_url && (
                <img
                  src={item.image_url}
                  alt="Trading analysis screenshot"
                  className="h-56 w-full border-b border-gray-800 object-cover"
                />
              )}

              <div className="space-y-3 p-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold">
                    {item.symbol || "Unknown Symbol"}
                  </h2>

                  <span className="rounded-full bg-blue-600 px-3 py-1 text-sm font-bold">
                    {item.score || 0}/100
                  </span>
                </div>

                <p className="text-sm text-gray-400">
                  {item.timeframe} •{" "}
                  {new Date(item.created_at).toLocaleString("en-CA")}
                </p>

                <div className="grid grid-cols-2 gap-2 text-sm text-gray-300">
                  <p>Trend: {item.trend}</p>
                  <p>Direction: {item.direction}</p>
                  <p>Swing High: {item.swing_high}</p>
                  <p>Swing Low: {item.swing_low}</p>
                  <p>Breakout: {item.breakout ? "Yes" : "No"}</p>
                  <p>Retest: {item.retest ? "Yes" : "No"}</p>
                  <p>Entry: {item.entry_price}</p>
                  <p>Stop Loss: {item.stop_loss}</p>
                  <p>Target: {item.target_price}</p>
                  <p>Candle: {item.candle_signal}</p>
                </div>

                <p className="text-sm leading-relaxed text-gray-300">
                  {item.bot_analysis}
                </p>

                <div className="pt-2">
                  <Link
                    href={`/analytics/${item.id}`}
                    className="block w-full rounded-xl bg-blue-600 py-3 text-center font-semibold transition hover:bg-blue-700"
                  >
                    👁 View Full Analysis
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}