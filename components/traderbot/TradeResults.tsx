import { TradeResult } from "@/types/trade";
import { formatMoney, formatNumber, formatPercent } from "@/lib/formatter";

type Props = {
  result: TradeResult | null;
};

export default function TradeResults({ result }: Props) {
  return (
    <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
      <h2 className="text-xl font-semibold mb-6">Trade Plan</h2>

      {!result ? (
        <p className="text-slate-400">
          Fill entry, stop, account size and risk % to calculate.
        </p>
      ) : (
        <div className="space-y-4">
          {result.warnings.length > 0 && (
            <div className="space-y-2 rounded-lg border border-red-700 bg-red-950 p-4 text-red-200">
              {result.warnings.map((warning, index) => (
                <p key={index}>{warning}</p>
              ))}
            </div>
          )}

          <Result label="Trade Score" value={`${result.tradeScore}/100`} />
          <Result label="Take Profit" value={formatNumber(result.takeProfit)} />
          <Result label="Risk Points" value={formatNumber(result.riskPoints)} />
          <Result label="Risk Ticks" value={formatNumber(result.riskTicks)} />
          <Result label="Risk per Unit" value={formatMoney(result.riskDollarsPerUnit)} />
          <Result label="Max Risk Allowed" value={formatMoney(result.maxRiskDollars)} />
          <Result label="Suggested Quantity" value={String(result.suggestedQuantity)} />
          <Result label="Selected Quantity" value={String(result.selectedQuantity)} />
          <Result label="Total Risk $" value={formatMoney(result.totalRiskDollars)} />
          <Result label="Total Risk %" value={formatPercent(result.totalRiskPercent)} />
          <Result label="Target Profit $" value={formatMoney(result.targetProfitDollars)} />
          <Result label="Risk/Reward" value={result.riskReward} />
        </div>
      )}
    </section>
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