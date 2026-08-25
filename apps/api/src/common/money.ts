export function money(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

export function lineAmount(kg: number, unit: number): number {
  return money(kg * unit);
}
