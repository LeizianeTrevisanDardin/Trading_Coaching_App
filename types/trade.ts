import { ContractSymbol } from "./contract";

export type Direction = "long" | "short";

export type TradeInput = {
  contract: ContractSymbol;
  direction: Direction;
  entry: number;
  stop: number;
  reward: number;
  accountSize: number;
  riskPercent: number;
  quantity?: number;
};

export type TradeResult = {
  riskPoints: number;
  riskTicks: number;
  riskDollarsPerUnit: number;
  maxRiskDollars: number;
  suggestedQuantity: number;
  selectedQuantity: number;
  totalRiskDollars: number;
  totalRiskPercent: number;
  takeProfit: number;
  targetProfitDollars: number;
  riskReward: string;
  tradeScore: number;
  warnings: string[]; 
};