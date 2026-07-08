"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type Trend = "alta" | "baixa" | "consolidacao";
type Direction = "long" | "short" | "wait";
type CandleSignal = "forca" | "rejeicao" | "indecisao";
type CaptureMoment = "pre_trade" | "after_entry" | "in_trade" | "post_trade";

export default function ScreenshotAnalysisPage() {
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [symbol, setSymbol] = useState("");
  const [timeframe, setTimeframe] = useState("1m");
  const [captureMoment, setCaptureMoment] = useState<CaptureMoment>("pre_trade");
  const [trend, setTrend] = useState<Trend>("alta");
  const [swingHigh, setSwingHigh] = useState("");
  const [swingLow, setSwingLow] = useState("");
  const [breakout, setBreakout] = useState(false);
  const [retest, setRetest] = useState(false);
  const [candleSignal, setCandleSignal] = useState<CandleSignal>("forca");
  const [direction, setDirection] = useState<Direction>("wait");
  const [entryPrice, setEntryPrice] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) router.push("/login");
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
      modeAdvice = "📸 Pré-trade: avaliando se o setup merece entrada.";
    }

    if (captureMoment === "after_entry") {
      modeAdvice = "📈 Após entrada: avaliando se a operação ainda respeita o plano.";
    }

    if (captureMoment === "in_trade") {
      modeAdvice = "🛡️ Durante a trade: foco em proteger o risco e respeitar o stop.";
    }

    if (captureMoment === "post_trade") {
      modeAdvice = "📚 Pós-trade: revisão para aprender com a operação.";
    }

    if (trend === "alta" && direction === "long") {
      breakdown.trend = 20;
      positives.push("Tendência de alta combina com entrada Long.");
    }

    if (trend === "baixa" && direction === "short") {
      breakdown.trend = 20;
      positives.push("Tendência de baixa combina com entrada Short.");
    }

    if (direction === "wait") {
      warnings.push("Direção está como Aguardar, então o setup ainda não é uma entrada confirmada.");
    }

    if (trend === "consolidacao") {
      breakdown.trend = -10;
      warnings.push("Mercado em consolidação aumenta o risco.");
    }

    if (swingHigh && swingLow) {
      breakdown.structure = 15;
      positives.push("Estrutura com Swing High e Swing Low definidos.");
    } else {
      warnings.push("Swing High ou Swing Low ainda não foram preenchidos.");
    }

    if (breakout) {
      breakdown.breakout = 20;
      positives.push("Breakout confirmado.");
    } else {
      warnings.push("Ainda não houve breakout confirmado.");
    }

    if (retest) {
      breakdown.retest = 20;
      positives.push("Reteste confirmado, entrada mais conservadora.");
    } else if (breakout && candleSignal === "forca") {
      breakdown.retest = 5;
      warnings.push("Sem reteste: setup mais agressivo, estilo breakout de continuação.");
    } else {
      breakdown.retest = -10;
      warnings.push("Sem reteste e sem confirmação forte, entrada mais arriscada.");
    }

    if (candleSignal === "forca") {
      breakdown.candle = 15;
      positives.push("Candle de força confirma pressão na direção da operação.");
    }

    if (candleSignal === "rejeicao") {
      breakdown.candle = 10;
      positives.push("Candle de rejeição mostra defesa de preço.");
    }

    if (candleSignal === "indecisao") {
      breakdown.candle = -10;
      warnings.push("Candle de indecisão reduz a confiança.");
    }

    const entry = Number(entryPrice);
    const stop = Number(stopLoss);
    const target = Number(targetPrice);

    let rr = 0;

    if (entry && stop && target) {
      const risk = Math.abs(entry - stop);
      const reward = Math.abs(target - entry);

      rr = reward / risk;

      if (rr >= 2) {
        breakdown.riskReward = 15;
        positives.push(`Risco/retorno bom: ${rr.toFixed(2)}R.`);
      } else if (rr >= 1.5) {
        breakdown.riskReward = 5;
        warnings.push(`Risco/retorno aceitável, mas não ideal: ${rr.toFixed(2)}R.`);
      } else {
        breakdown.riskReward = -15;
        warnings.push(`Risco/retorno fraco: ${rr.toFixed(2)}R.`);
      }
    } else {
      warnings.push("Entrada, stop ou alvo ainda não preenchidos.");
    }

    score =
      breakdown.trend +
      breakdown.structure +
      breakdown.breakout +
      breakdown.retest +
      breakdown.candle +
      breakdown.riskReward;

    score = Math.max(0, Math.min(100, score));

    let setupType = "Setup indefinido";

    if (breakout && retest) setupType = "Breakout + Reteste";
    else if (breakout && !retest && candleSignal === "forca") setupType = "Breakout de Continuação";
    else if (!breakout && candleSignal === "rejeicao") setupType = "Rejeição / possível reversão";

    let decision = "⏳ Aguardar";

    if (score >= 75) {
        decision =
            captureMoment === "in_trade"
            ? "🛡️ Trade válida, mas precisa gestão"
            : "✅ Setup forte";
        }
    else if (score >= 50) decision = "🟡 Setup válido, mas precisa cuidado";
    else decision = "❌ Melhor evitar";

    let managementAdvice = "";

        if (captureMoment === "in_trade") {
        if (retest && breakout && direction === "long") {
            managementAdvice =
            "Gestão: a operação ainda depende da defesa do suporte/reteste. Não aumente posição. Não mova o stop para baixo. Aguarde confirmação acima da região do reteste.";
        }

        if (rr > 0 && rr < 2) {
            warnings.push(
            `Como a trade está em andamento e o RR é ${rr.toFixed(
                2
            )}R, a nota foi reduzida porque o risco/retorno está abaixo do ideal.`
            );

            score -= 10;
        }

        if (score > 90) {
            score = 88;
        }
        }

        let aiSummary = "";

        if (score >= 75) {
        aiSummary = "Setup de qualidade, com boa estrutura de Price Action.";
        } else if (score >= 50) {
        aiSummary = "Setup válido, mas ainda possui pontos de atenção.";
        } else {
        aiSummary = "Setup fraco. Melhor evitar ou aguardar nova confirmação.";
        }

        let lesson = "";

        if (captureMoment === "in_trade") {
        lesson =
            "Mesmo um bom setup pode falhar. O mais importante é respeitar o stop e não aumentar risco durante a operação.";
        } else if (captureMoment === "pre_trade") {
        lesson =
            "A melhor entrada costuma acontecer quando tendência, estrutura, reteste e risco/retorno estão alinhados.";
        } else {
        lesson =
            "Revise se você seguiu o plano e se a entrada respeitou sua estratégia.";
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
  text: `${decision}. ${modeAdvice} Tipo: ${setupType}. ${aiSummary} Pontos positivos: ${positives.join(
    " "
  )} Pontos de atenção: ${warnings.join(" ")} Lição: ${lesson}`,
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
      router.push("/login");
      setLoading(false);
      return;
    }

    let imageUrl = "";

    if (file) {
      const fileName = `${user.id}/${Date.now()}-${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("trade-screenshots")
        .upload(fileName, file);

      if (uploadError) {
        alert(uploadError.message);
        console.error(uploadError);
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
      symbol,
      timeframe,
      capture_moment: captureMoment,
      trend,
      swing_high: swingHigh ? Number(swingHigh) : null,
      swing_low: swingLow ? Number(swingLow) : null,
      breakout,
      retest,
      candle_signal: candleSignal,
      direction,
      entry_price: entryPrice ? Number(entryPrice) : null,
      stop_loss: stopLoss ? Number(stopLoss) : null,
      target_price: targetPrice ? Number(targetPrice) : null,
      score: analysis.score,
      bot_analysis: analysis.text,
    };

    const { error } = await supabase
      .from("trade_screenshots")
      .insert(newScreenshot);

    if (error) {
      alert(error.message);
      console.error(error);
      setLoading(false);
      return;
    }

    alert("Análise salva com sucesso!");
    router.push("/analytics");
    setLoading(false);
  };


  
return (
  <section className="min-h-screen bg-gray-950 text-white p-6">
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Análise por Screenshot</h1>
        <p className="text-gray-400">
          Envie o print do gráfico e preencha os pontos principais do Price Action.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full"
          />

          <input
            className="w-full p-3 rounded bg-gray-800"
            placeholder="Símbolo. Ex: AAPL, TSLA, SPY, MES"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
          />

          <input
            className="w-full p-3 rounded bg-gray-800"
            placeholder="Timeframe. Ex: 1m, 5m"
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
          />

          <select
            className="w-full p-3 rounded bg-gray-800"
            value={captureMoment}
            onChange={(e) => setCaptureMoment(e.target.value as CaptureMoment)}
          >
            <option value="pre_trade">Antes da entrada</option>
            <option value="after_entry">Após a entrada</option>
            <option value="in_trade">Durante a operação</option>
            <option value="post_trade">Após encerramento</option>
          </select>

          <select
            className="w-full p-3 rounded bg-gray-800"
            value={trend}
            onChange={(e) => setTrend(e.target.value as Trend)}
          >
            <option value="alta">Tendência de Alta</option>
            <option value="baixa">Tendência de Baixa</option>
            <option value="consolidacao">Consolidação</option>
          </select>

          <select
            className="w-full p-3 rounded bg-gray-800"
            value={direction}
            onChange={(e) => setDirection(e.target.value as Direction)}
          >
            <option value="wait">Aguardar</option>
            <option value="long">Long / Compra</option>
            <option value="short">Short / Venda</option>
          </select>

          <input
            className="w-full p-3 rounded bg-gray-800"
            placeholder="Swing High"
            value={swingHigh}
            onChange={(e) => setSwingHigh(e.target.value)}
          />

          <input
            className="w-full p-3 rounded bg-gray-800"
            placeholder="Swing Low"
            value={swingLow}
            onChange={(e) => setSwingLow(e.target.value)}
          />

          <label className="flex gap-2">
            <input
              type="checkbox"
              checked={breakout}
              onChange={(e) => setBreakout(e.target.checked)}
            />
            Teve breakout?
          </label>

          <label className="flex gap-2">
            <input
              type="checkbox"
              checked={retest}
              onChange={(e) => setRetest(e.target.checked)}
            />
            Teve reteste?
          </label>

          <select
            className="w-full p-3 rounded bg-gray-800"
            value={candleSignal}
            onChange={(e) => setCandleSignal(e.target.value as CandleSignal)}
          >
            <option value="forca">Candle de força</option>
            <option value="rejeicao">Candle de rejeição</option>
            <option value="indecisao">Candle de indecisão</option>
          </select>

          <input
            className="w-full p-3 rounded bg-gray-800"
            placeholder="Entrada"
            value={entryPrice}
            onChange={(e) => setEntryPrice(e.target.value)}
          />

          <input
            className="w-full p-3 rounded bg-gray-800"
            placeholder="Stop Loss"
            value={stopLoss}
            onChange={(e) => setStopLoss(e.target.value)}
          />

          <input
            className="w-full p-3 rounded bg-gray-800"
            placeholder="Alvo"
            value={targetPrice}
            onChange={(e) => setTargetPrice(e.target.value)}
          />

          <button
            onClick={handleSave}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 rounded-xl p-3 font-bold"
          >
            {loading ? "Salvando..." : "Salvar Análise"}
          </button>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-5">
          <h2 className="text-2xl font-bold">Resultado do TraderBot</h2>

          <div>
            <div className="text-5xl font-bold">{analysis.score}/100</div>

            <p className="text-lg mt-2">{analysis.decision}</p>

            <p className="text-blue-400 font-semibold mt-1">
              📌 Setup: {analysis.setupType}
            </p>

            <p className="text-purple-400 font-semibold mt-2">
              {analysis.modeAdvice}
            </p>

            {analysis.managementAdvice && (
              <div className="mt-4 rounded-xl border border-orange-500/40 bg-orange-500/10 p-4">
                <h3 className="font-bold text-orange-300">
                  🛡️ Gestão da Trade
                </h3>

                <p className="text-orange-100 mt-2 leading-relaxed">
                  {analysis.managementAdvice}
                </p>
              </div>
            )}
          </div>

          <div className="w-full bg-gray-800 rounded-full h-3">
            <div
              className="bg-blue-600 h-3 rounded-full"
              style={{ width: `${analysis.score}%` }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            {Object.entries(analysis.breakdown).map(([key, value]) => (
              <div key={key} className="bg-gray-800 rounded-xl p-3">
                <p className="text-gray-400 capitalize">{key}</p>
                <p>{value} pts</p>
              </div>
            ))}
          </div>

          <div>
            <h3 className="font-bold text-green-400 mb-2">
              🟢 Pontos positivos
            </h3>

            {analysis.positives.length > 0 ? (
              <ul className="list-disc list-inside text-gray-300 space-y-1">
                {analysis.positives.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-400">Nenhum ponto positivo ainda.</p>
            )}
          </div>

          <div>
            <h3 className="font-bold text-yellow-400 mb-2">
              ⚠️ Pontos de atenção
            </h3>

            {analysis.warnings.length > 0 ? (
              <ul className="list-disc list-inside text-gray-300 space-y-1">
                {analysis.warnings.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-400">Nenhum alerta no momento.</p>
            )}
          </div>

          {file && (
            <img
              src={URL.createObjectURL(file)}
              alt="Screenshot do gráfico"
              className="rounded-xl border border-gray-700 mt-4"
            />
          )}
        </div>
      </div>
    </div>
  </section>
);
}