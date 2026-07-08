"use client";

import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Direction = "long" | "short";
type Contract = "STOCK" | "MES" | "ES" | "MNQ" | "NQ";

const contracts = {
  STOCK: { pointValue: 1, tickSize: 0.01 },
  MES: { pointValue: 5, tickSize: 0.25 },
  ES: { pointValue: 50, tickSize: 0.25 },
  MNQ: { pointValue: 2, tickSize: 0.25 },
  NQ: { pointValue: 20, tickSize: 0.25 },
};

export default function TraderBotPage() {
  const [contract, setContract] = useState<Contract>("MES");
  const [direction, setDirection] = useState<Direction>("long");
  const [entryPrice, setEntryPrice] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [reward, setReward] = useState(2);
  const [quantity, setQuantity] = useState("");
  const [accountSize, setAccountSize] = useState("500");
  const [riskPercent, setRiskPercent] = useState("1");

  const result = useMemo(() => {
    const entry = Number(entryPrice);
    const stop = Number(stopLoss);
    const account = Number(accountSize);
    const riskPct = Number(riskPercent);

    if (!entry || !stop || !account || !riskPct) return null;

    const riskPoints = direction === "long" ? entry - stop : stop - entry;
    if (riskPoints <= 0) return null;

    const pointValue = contracts[contract].pointValue;
    const tickSize = contracts[contract].tickSize;

    const riskTicks = riskPoints / tickSize;
    const riskPerUnit = riskPoints * pointValue;
    const maxRiskDollars = account * (riskPct / 100);
    const suggestedQuantity = Math.floor(maxRiskDollars / riskPerUnit);

    const parsedQuantity = Number(quantity);
    const selectedQuantity =
      quantity.trim() === "" || Number.isNaN(parsedQuantity)
        ? suggestedQuantity
        : parsedQuantity;

    const totalRisk = riskPerUnit * selectedQuantity;
    const totalRiskPercent = (totalRisk / account) * 100;

    const takeProfit =
      direction === "long"
        ? entry + riskPoints * reward
        : entry - riskPoints * reward;

    const targetProfit = totalRisk * reward;

    return {
      entry,
      stop,
      takeProfit,
      riskPoints,
      riskTicks,
      riskPerUnit,
      maxRiskDollars,
      suggestedQuantity,
      selectedQuantity,
      totalRisk,
      totalRiskPercent,
      targetProfit,
      warning:
        suggestedQuantity < 1
          ? "Risk is too high for your account size."
          : totalRiskPercent > riskPct
          ? "Selected quantity is above your risk limit."
          : "",
    };
  }, [contract, direction, entryPrice, stopLoss, reward, quantity, accountSize, riskPercent]);

  const handleSaveTrade = async () => {
    if (!result) return;

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      alert("You need to sign in first.");
      return;
    }

    const { error } = await supabase.from("trades").insert({
      user_id: user.id,
      contract,
      direction,
      entry: result.entry,
      stop_loss: result.stop,
      take_profit: result.takeProfit,
      reward,
      quantity: result.selectedQuantity,
      risk_points: result.riskPoints,
      risk_ticks: result.riskTicks,
      risk_dollars: result.totalRisk,
      target_profit: result.targetProfit,
      status: "planned",
    });

    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }

    alert("Trade saved successfully!");
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">TraderBot AI</h1>
        <p className="text-slate-400 mb-8">Trade Planner + Risk Calculator</p>

        <div className="grid md:grid-cols-2 gap-6">
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-xl font-semibold mb-6">Trade Setup</h2>

            <div className="space-y-4">
              <Field label="Contract">
                <select value={contract} onChange={(e) => setContract(e.target.value as Contract)} className="input">
                  <option value="STOCK">Stock / Shares</option>
                  <option value="MES">MES</option>
                  <option value="ES">ES</option>
                  <option value="MNQ">MNQ</option>
                  <option value="NQ">NQ</option>
                </select>
              </Field>

              <Field label="Direction">
                <select value={direction} onChange={(e) => setDirection(e.target.value as Direction)} className="input">
                  <option value="long">Long</option>
                  <option value="short">Short</option>
                </select>
              </Field>

              <Field label="Entry Price">
                <input value={entryPrice} onChange={(e) => setEntryPrice(e.target.value)} placeholder="Ex: 30165" className="input" />
              </Field>

              <Field label="Stop Loss">
                <input value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} placeholder={direction === "long" ? "Below entry" : "Above entry"} className="input" />
              </Field>

              <Field label="Reward">
                <select value={reward} onChange={(e) => setReward(Number(e.target.value))} className="input">
                  <option value={1}>1:1</option>
                  <option value={2}>1:2</option>
                  <option value={3}>1:3</option>
                  <option value={4}>1:4</option>
                </select>
              </Field>

              <Field label="Account Size">
                <input value={accountSize} onChange={(e) => setAccountSize(e.target.value)} placeholder="Ex: 500" className="input" />
              </Field>

              <Field label="Risk %">
                <input value={riskPercent} onChange={(e) => setRiskPercent(e.target.value)} placeholder="Ex: 1" className="input" />
              </Field>

              <Field label="Quantity">
                <input value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="Empty = suggested quantity" className="input" />
              </Field>
            </div>
          </section>

          <div>
            <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-xl font-semibold mb-6">Trade Plan</h2>

              {!result ? (
                <p className="text-slate-400">Preencha Entry, Stop, Account Size e Risk %.</p>
              ) : (
                <div className="space-y-4">
                  {result.warning && (
                    <div className="bg-red-950 border border-red-700 text-red-200 p-4 rounded-lg">
                      {result.warning}
                    </div>
                  )}

                  <Result label="Entry" value={result.entry.toFixed(2)} />
                  <Result label="Stop Loss" value={result.stop.toFixed(2)} />
                  <Result label="Take Profit" value={result.takeProfit.toFixed(2)} />
                  <Result label="Risk Points" value={result.riskPoints.toFixed(2)} />
                  <Result label="Risk Ticks" value={result.riskTicks.toFixed(0)} />
                  <Result label="Risk per Unit" value={`$${result.riskPerUnit.toFixed(2)}`} />
                  <Result label="Max Risk Allowed" value={`$${result.maxRiskDollars.toFixed(2)}`} />
                  <Result label="Suggested Quantity" value={String(result.suggestedQuantity)} />
                  <Result label="Selected Quantity" value={String(result.selectedQuantity)} />
                  <Result label="Total Risk $" value={`$${result.totalRisk.toFixed(2)}`} />
                  <Result label="Total Risk %" value={`${result.totalRiskPercent.toFixed(2)}%`} />
                  <Result label="Target Profit $" value={`$${result.targetProfit.toFixed(2)}`} />
                  <Result label="Risk/Reward" value={`1:${reward}`} />
                </div>
              )}
            </section>

            <button
              onClick={handleSaveTrade}
              disabled={!result}
              className="w-full mt-6 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg"
            >
              Save Trade
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm text-slate-400 mb-1">{label}</label>
      {children}
    </div>
  );
}

function Result({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center bg-slate-800 rounded-lg p-4">
      <span className="text-slate-400">{label}</span>
      <span className="font-bold text-lg">{value}</span>
    </div>
  );
}