import { ContractConfig, ContractSymbol } from "@/types/contract";

export const CONTRACTS: Record<ContractSymbol, ContractConfig> = {
  STOCK: {
    symbol: "STOCK",
    name: "Stock / Shares",
    tickSize: 0.01,
    pointValue: 1,
    type: "stock",
  },
  MES: {
    symbol: "MES",
    name: "Micro E-mini S&P 500",
    tickSize: 0.25,
    pointValue: 5,
    type: "future",
  },
  ES: {
    symbol: "ES",
    name: "E-mini S&P 500",
    tickSize: 0.25,
    pointValue: 50,
    type: "future",
  },
  MNQ: {
    symbol: "MNQ",
    name: "Micro E-mini Nasdaq",
    tickSize: 0.25,
    pointValue: 2,
    type: "future",
  },
  NQ: {
    symbol: "NQ",
    name: "E-mini Nasdaq",
    tickSize: 0.25,
    pointValue: 20,
    type: "future",
  },
};