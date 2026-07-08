"use client";

import { ContractSymbol } from "@/types/contract";
import { Direction } from "@/types/trade";

type Props = {
  contract: ContractSymbol;
  setContract: (value: ContractSymbol) => void;
  direction: Direction;
  setDirection: (value: Direction) => void;
  entry: string;
  setEntry: (value: string) => void;
  stop: string;
  setStop: (value: string) => void;
  reward: number;
  setReward: (value: number) => void;
  accountSize: string;
  setAccountSize: (value: string) => void;
  riskPercent: string;
  setRiskPercent: (value: string) => void;
  quantity: string;
  setQuantity: (value: string) => void;
};

export default function TradeForm(props: Props) {
  return (
    <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
      <h2 className="text-xl font-semibold mb-6">Trade Setup</h2>

      <div className="space-y-4">
        <Field label="Contract">
          <select
            value={props.contract}
            onChange={(e) => props.setContract(e.target.value as ContractSymbol)}
            className="input"
          >
            <option value="STOCK">Stock / Shares</option>
            <option value="MES">MES</option>
            <option value="ES">ES</option>
            <option value="MNQ">MNQ</option>
            <option value="NQ">NQ</option>
          </select>
        </Field>

        <Field label="Direction">
          <select
            value={props.direction}
            onChange={(e) => props.setDirection(e.target.value as Direction)}
            className="input"
          >
            <option value="long">Long</option>
            <option value="short">Short</option>
          </select>
        </Field>

        <Field label="Entry Price">
          <input
            value={props.entry}
            onChange={(e) => props.setEntry(e.target.value)}
            placeholder="Ex: 300.47"
            className="input"
          />
        </Field>

        <Field label="Stop Loss">
          <input
            value={props.stop}
            onChange={(e) => props.setStop(e.target.value)}
            placeholder={props.direction === "long" ? "Below entry" : "Above entry"}
            className="input"
          />
        </Field>

        <Field label="Reward">
          <select
            value={props.reward}
            onChange={(e) => props.setReward(Number(e.target.value))}
            className="input"
          >
            <option value={1}>1:1</option>
            <option value={2}>1:2</option>
            <option value={3}>1:3</option>
            <option value={4}>1:4</option>
          </select>
        </Field>

        <Field label="Account Size">
          <input
            value={props.accountSize}
            onChange={(e) => props.setAccountSize(e.target.value)}
            placeholder="Ex: 500"
            className="input"
          />
        </Field>

        <Field label="Risk %">
          <input
            value={props.riskPercent}
            onChange={(e) => props.setRiskPercent(e.target.value)}
            placeholder="Ex: 1"
            className="input"
          />
        </Field>

        <Field label="Quantity - optional">
          <input
            value={props.quantity}
            onChange={(e) => props.setQuantity(e.target.value)}
            placeholder="Leave empty for suggested quantity"
            className="input"
          />
        </Field>
      </div>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm text-slate-400 mb-1">{label}</label>
      {children}
    </div>
  );
}