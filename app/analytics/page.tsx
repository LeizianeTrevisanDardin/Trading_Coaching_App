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

  const goodSetups = analyses.filter((item) => (item.score || 0) >= 75).length;

  const waitSetups = analyses.filter((item) => item.direction === "wait").length;

  return (
    <section className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold">Analytics</h1>
          <p className="text-gray-400">
            Aqui aparecem suas análises salvas pelo TraderBot.
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <p className="text-gray-400">Total de análises</p>
            <h2 className="text-3xl font-bold">{total}</h2>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <p className="text-gray-400">Score médio</p>
            <h2 className="text-3xl font-bold">{averageScore}/100</h2>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <p className="text-gray-400">Boas operações</p>
            <h2 className="text-3xl font-bold">{goodSetups}</h2>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <p className="text-gray-400">Aguardar</p>
            <h2 className="text-3xl font-bold">{waitSetups}</h2>
          </div>
        </div>

        {loading && <p className="text-gray-400">Carregando análises...</p>}

        {!loading && analyses.length === 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <p className="text-gray-400">
              Nenhuma análise salva ainda.
            </p>
          </div>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {analyses.map((item) => (
            <div
              key={item.id}
              className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden"
            >
              {item.image_url && (
                <img
                  src={item.image_url}
                  alt="Screenshot da análise"
                  className="w-full h-56 object-cover border-b border-gray-800"
                />
              )}

              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold">
                    {item.symbol || "Sem símbolo"}
                  </h2>

                  <span className="bg-blue-600 px-3 py-1 rounded-full text-sm font-bold">
                    {item.score || 0}/100
                  </span>
                </div>

                <p className="text-gray-400 text-sm">
                  {item.timeframe} • {new Date(item.created_at).toLocaleString()}
                </p>

                <div className="grid grid-cols-2 gap-2 text-sm text-gray-300">
                  <p>Trend: {item.trend}</p>
                  <p>Direção: {item.direction}</p>
                  <p>Swing High: {item.swing_high}</p>
                  <p>Swing Low: {item.swing_low}</p>
                  <p>Breakout: {item.breakout ? "Sim" : "Não"}</p>
                  <p>Reteste: {item.retest ? "Sim" : "Não"}</p>
                  <p>Entrada: {item.entry_price}</p>
                  <p>Stop: {item.stop_loss}</p>
                  <p>Alvo: {item.target_price}</p>
                  <p>Candle: {item.candle_signal}</p>
                </div>

                <p className="text-gray-300 text-sm leading-relaxed">
                  {item.bot_analysis}
                </p>

                <div className="pt-2">
                <Link
                  href={`/analytics/${item.id}`}
                  className="block w-full text-center bg-blue-600 hover:bg-blue-700 transition rounded-xl py-3 font-semibold"
                >
                  👁 Abrir análise completa
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