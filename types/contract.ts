export type ContractSymbol = "STOCK" | "MES" | "ES" | "MNQ" | "NQ";

export type ContractConfig = {
  symbol: ContractSymbol;
  name: string;
  tickSize: number;
  pointValue: number;
  type: "stock" | "future";
};