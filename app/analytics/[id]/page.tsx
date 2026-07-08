"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, useParams } from "next/navigation";
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

  const handleDelete = async () => {
  if (!analysis) return;

  const confirmDelete = confirm(
    "Tem certeza que deseja excluir esta análise?"
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

  alert("Análise excluída.");

  router.push("/analytics");
};

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

  if (loading) {
    return (
      <section className="min-h-screen bg-gray-950 text-white p-6">
        <p>Carregando análise...</p>
      </section>
    );
  }

  if (!analysis) {
    return (
      <section className="min-h-screen bg-gray-950 text-white p-6">
        <p>Análise não encontrada.</p>
      </section>
    );
  }

  const handleSaveResult = async () => {
  setSaving(true);

  const { error } = await supabase
    .from("trade_screenshots")
    .update({
      trade_status: tradeStatus,
      result_r: resultR ? Number(resultR) : null,
      pnl: pnl ? Number(pnl) : null,
      notes,
    })
    .eq("id", analysis?.id);

  if (error) {
    alert(error.message);
    console.error(error);
    setSaving(false);
    return;
  }

  alert("Resultado salvo!");
  setSaving(false);
};

  return (
    <section className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <Link href="/analytics" className="text-blue-400">
          ← Voltar para Analytics
        </Link>

        <div>
          <h1 className="text-4xl font-bold">
            {analysis.symbol || "Análise"}
          </h1>
          <p className="text-gray-400">
            {analysis.timeframe} •{" "}
            {new Date(analysis.created_at).toLocaleString()}
          </p>
        </div>

        {analysis.image_url && (
          <img
            src={analysis.image_url}
            alt="Screenshot da análise"
            className="w-full rounded-2xl border border-gray-800"
          />
        )}

        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <p className="text-gray-400">Score</p>
            <h2 className="text-4xl font-bold">{analysis.score}/100</h2>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <p className="text-gray-400">Entrada</p>
            <h2 className="text-3xl font-bold">{analysis.entry_price}</h2>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <p className="text-gray-400">Stop</p>
            <h2 className="text-3xl font-bold">{analysis.stop_loss}</h2>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-2">
            <h2 className="text-2xl font-bold">Price Action</h2>
            <p>Trend: {analysis.trend}</p>
            <p>Direção: {analysis.direction}</p>
            <p>Swing High: {analysis.swing_high}</p>
            <p>Swing Low: {analysis.swing_low}</p>
            <p>Breakout: {analysis.breakout ? "Sim" : "Não"}</p>
            <p>Reteste: {analysis.retest ? "Sim" : "Não"}</p>
            <p>Candle: {analysis.candle_signal}</p>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-2">
            <h2 className="text-2xl font-bold">Plano</h2>
            <p>Entrada: {analysis.entry_price}</p>
            <p>Stop Loss: {analysis.stop_loss}</p>
            <p>Alvo: {analysis.target_price}</p>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h2 className="text-2xl font-bold mb-3">Análise do TraderBot</h2>
          <p className="text-gray-300 leading-relaxed">
            {analysis.bot_analysis}
          </p>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4 max-w-3xl mx-auto mt-30  ">
        <h2 className="text-2xl font-bold">Resultado da Trade</h2>

        <select
            className="w-full p-3 rounded bg-gray-800"
            value={tradeStatus}
            onChange={(e) => setTradeStatus(e.target.value)}
        >
            <option value="pending">Ainda não operada</option>
            <option value="winner">Winner</option>
            <option value="loser">Loser</option>
        </select>

        <input
            className="w-full p-3 rounded-xl bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Resultado em R. Ex: 2 ou -1"
            value={resultR}
            onChange={(e) => setResultR(e.target.value)}
        />

        <input
            className="w-full p-3 rounded-xl bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="PnL em dólares. Ex: 120 ou -50"
            value={pnl}
            onChange={(e) => setPnl(e.target.value)}
        />

        <textarea
            className="w-full p-3 rounded bg-gray-800 min-h-28"
            placeholder="Observações / lições aprendidas"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
        />

        <button
            onClick={handleSaveResult}
            disabled={saving}
            className="w-full bg-blue-600 hover:bg-blue-700 rounded-xl px-5 py-3 font-bold"
            >
            {saving ? "Salvando..." : "Salvar Resultado"}
            </button>

            <div className="flex justify-end pt-6">
            <button
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 px-5 py-3 rounded-xl font-bold"
            >
              🗑️ Excluir análise
            </button>
          </div>
        </div>
    </section>
  );
}