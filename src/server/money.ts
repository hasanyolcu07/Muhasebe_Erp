import { Decimal, roundMoney } from "../lib/financialMath";

/** Para tutarını 2 kuruş hanesine, yarım yukarı yuvarlayarak Decimal yapar. */
export function money(value: unknown): Decimal {
  if (value == null || value === "") return roundMoney(0);
  return roundMoney(String(value));
}

export function moneyNumber(value: unknown): number {
  return money(value).toNumber();
}

export function addMoney(values: unknown[]): Decimal {
  return values.reduce<Decimal>((sum, value) => sum.plus(money(value)), new Decimal(0));
}

/** Tam kuruş. Ara hesap float ile yapılmaz. */
export function kurusOf(value: unknown): number {
  return money(value).times(100).toNumber();
}
