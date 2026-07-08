import { CONTRACTS } from "./contracts";
import { TradeInput, TradeResult } from "@/types/trade";

const MAX_RECOMMENDED_RISK_PERCENT = 2;

export function calculateTrade(input: TradeInput): TradeResult | null {
  const contract = CONTRACTS[input.contract];

  if (!input.entry || !input.stop || !input.accountSize || !input.riskPercent) {
    return null;
  }

  const riskPoints =
    input.direction === "long"
      ? input.entry - input.stop
      : input.stop - input.entry;

  if (riskPoints <= 0) {
    return null;
  }

  const riskTicks = riskPoints / contract.tickSize;
  const riskDollarsPerUnit = riskPoints * contract.pointValue;

  const maxRiskDollars = input.accountSize * (input.riskPercent / 100);

  const suggestedQuantity = Math.max(
    0,
    Math.floor(maxRiskDollars / riskDollarsPerUnit)
  );

  const selectedQuantity = input.quantity && input.quantity > 0
    ? input.quantity
    : suggestedQuantity;

  const totalRiskDollars = riskDollarsPerUnit * selectedQuantity;
  const totalRiskPercent = (totalRiskDollars / input.accountSize) * 100;

  const takeProfit =
    input.direction === "long"
      ? input.entry + riskPoints * input.reward
      : input.entry - riskPoints * input.reward;

  const targetProfitDollars = totalRiskDollars * input.reward;

  let tradeScore = 100;
  const warnings: string[] = [];

  if (suggestedQuantity < 1) {
    tradeScore -= 40;
    warnings.push("Risk too high for your account size at this stop distance.");
  }

  if (totalRiskPercent > input.riskPercent) {
    tradeScore -= 25;
    warnings.push("Selected quantity puts you above your risk limit.");
  }

  if (input.riskPercent > MAX_RECOMMENDED_RISK_PERCENT) {
    tradeScore -= 20;
    warnings.push(
      `You're risking ${input.riskPercent}% per trade — most professional traders cap this at ${MAX_RECOMMENDED_RISK_PERCENT}%.`
    );
  }

  if (input.reward < 2) {
    tradeScore -= 15;
    warnings.push("Reward multiple below 2R — consider a better entry or wider target.");
  }

  if (riskTicks < 2) {
    tradeScore -= 10;
    warnings.push("Stop is very tight — risk of noise-driven stop-out.");
  }

  tradeScore = Math.max(0, Math.min(100, tradeScore));

  return {
    riskPoints,
    riskTicks,
    riskDollarsPerUnit,
    maxRiskDollars,
    suggestedQuantity,
    selectedQuantity,
    totalRiskDollars,
    totalRiskPercent,
    takeProfit,
    targetProfitDollars,
    riskReward: `1:${input.reward}`,
    tradeScore,
    warnings,
  };
}