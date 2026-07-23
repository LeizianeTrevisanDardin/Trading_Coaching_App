"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type Analysis = {
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
  trade_status: string | null;
  result_r: number | null;
  pnl: number | null;
  notes: string | null;
  created_at: string;
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

  useEffect(() => {
    const loadAnalysis = async () => {
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
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (error) {
        alert(error.message);
        console.error(error);
      } else {
        setAnalysis(data);
        setTradeStatus(data.trade_status || "pending");
        setResultR(data.result_r?.toString() || "");
        setPnl(data.pnl?.toString() || "");
        setNotes(data.notes || "");
      }

      setLoading(false);
    };

    loadAnalysis();
  }, [id, router]);

  const handleSaveResult = async () => {
    if (!analysis) return;

    setSaving(true);

    const { error } = await supabase
      .from("trade_screenshots")
      .update({
        trade_status: tradeStatus,
        result_r: resultR ? Number(resultR) : null,
        pnl: pnl ? Number(pnl) : null,
        notes,
      })
      .eq("id", analysis.id);

    if (error) {
      alert(error.message);
      console.error(error);
      setSaving(false);
      return;
    }

    alert("Trade result saved successfully!");
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!analysis) return;

    const confirmDelete = confirm(
      "Are you sure you want to delete this analysis?"
    );

    if (!confirmDelete) return;

    const { error } = await supabase
      .from("trade_screenshots")
      .delete()
      .eq("id", analysis.id);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Analysis deleted successfully.");
    router.push("/analytics");
  };

  if (loading) {
    return (
      <section className="min-h-screen bg-gray-950 p-6 text-white">
        <p>Loading analysis...</p>
      </section>
    );
  }

  if (!analysis) {
    return (
      <section className="min-h-screen bg-gray-950 p-6 text-white">
        <p>Analysis not found.</p>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-gray-950 p-6 text-white">
      <div className="mx-auto max-w-6xl space-y-6">
        <Link href="/analytics" className="text-blue-400 hover:text-blue-300">
          ← Back to Analytics
        </Link>

        <div>
          <h1 className="text-4xl font-bold">
            {analysis.symbol || "Analysis"}
          </h1>

          <p className="text-gray-400">
            {analysis.timeframe || "No timeframe"} •{" "}
            {new Date(analysis.created_at).toLocaleString("en-CA")}
          </p>
        </div>

        {analysis.image_url && (
          <img
            src={analysis.image_url}
            alt="Trading analysis screenshot"
            className="w-full rounded-2xl border border-gray-800"
          />
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
            <p className="text-gray-400">Score</p>
            <h2 className="text-4xl font-bold">
              {analysis.score ?? 0}/100
            </h2>
          </div>

          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
            <p className="text-gray-400">Entry</p>
            <h2 className="text-3xl font-bold">
              {analysis.entry_price ?? "—"}
            </h2>
          </div>

          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
            <p className="text-gray-400">Stop Loss</p>
            <h2 className="text-3xl font-bold">
              {analysis.stop_loss ?? "—"}
            </h2>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 rounded-2xl border border-gray-800 bg-gray-900 p-5">
            <h2 className="text-2xl font-bold">Price Action</h2>

            <p>Trend: {analysis.trend || "Not provided"}</p>
            <p>Direction: {analysis.direction || "Not provided"}</p>
            <p>Swing High: {analysis.swing_high ?? "—"}</p>
            <p>Swing Low: {analysis.swing_low ?? "—"}</p>
            <p>Breakout: {analysis.breakout ? "Yes" : "No"}</p>
            <p>Retest: {analysis.retest ? "Yes" : "No"}</p>
            <p>Candle Signal: {analysis.candle_signal || "Not provided"}</p>
          </div>

          <div className="space-y-2 rounded-2xl border border-gray-800 bg-gray-900 p-5">
            <h2 className="text-2xl font-bold">Trade Plan</h2>

            <p>Entry: {analysis.entry_price ?? "—"}</p>
            <p>Stop Loss: {analysis.stop_loss ?? "—"}</p>
            <p>Target: {analysis.target_price ?? "—"}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
          <h2 className="mb-3 text-2xl font-bold">TraderBot Analysis</h2>

          <p className="leading-relaxed text-gray-300">
            {analysis.bot_analysis || "No AI analysis available."}
          </p>
        </div>

        <div className="mx-auto mt-12 max-w-3xl space-y-4 rounded-2xl border border-gray-800 bg-gray-900 p-5">
          <h2 className="text-2xl font-bold">Trade Result</h2>

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
              className="min-h-28 w-full rounded-xl border border-gray-700 bg-gray-800 p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Write your observations and lessons learned"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>

          <button
            type="button"
            onClick={handleSaveResult}
            disabled={saving}
            className="w-full rounded-xl bg-blue-600 px-5 py-3 font-bold hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Trade Result"}
          </button>

          <div className="flex justify-end pt-6">
            <button
              type="button"
              onClick={handleDelete}
              className="rounded-xl bg-red-600 px-5 py-3 font-bold hover:bg-red-700"
            >
              🗑️ Delete Analysis
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}