export function formatMoney(value: number) {
  return `$${value.toFixed(2)}`;
}

export function formatNumber(value: number, decimals = 2) {
  return value.toFixed(decimals);
}

export function formatPercent(value: number) {
  return `${value.toFixed(2)}%`;
}