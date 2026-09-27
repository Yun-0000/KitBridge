export function formatUsd(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(Math.round(cents));
  const dollars = Math.floor(abs / 100);
  const rem = abs % 100;
  return `${sign}$${dollars}.${rem.toString().padStart(2, "0")}`;
}

export function dollarsToCents(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100);
}

export function centsToDollars(cents: number): number {
  return Math.round(cents) / 100;
}

export function parseInteger(raw: string): number | null {
  const t = raw.trim();
  if (!/^-?\d+$/.test(t)) return null;
  const n = Number(t);
  if (!Number.isSafeInteger(n)) return null;
  return n;
}

/** Commit a numeric draft on blur. Empty becomes 0. Junk keeps the previous value. */
export function commitIntegerDraft(raw: string, fallback: number): number {
  const trimmed = raw.trim();
  if (trimmed === "") return 0;
  const parsed = parseInteger(trimmed);
  if (parsed === null || parsed < 0) return fallback;
  return parsed;
}

/** Commit a dollar draft on blur. Empty becomes $0. Out-of-range keeps the previous cents. */
export function commitMoneyDraft(raw: string, fallbackCents: number, maxCents: number): number {
  const trimmed = raw.trim();
  if (trimmed === "") return 0;
  if (!/^\d+(\.\d{0,2})?$/.test(trimmed)) return fallbackCents;
  const cents = dollarsToCents(Number(trimmed));
  if (!Number.isInteger(cents) || cents < 0 || cents > maxCents) return fallbackCents;
  return cents;
}
