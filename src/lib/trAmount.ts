/** Türkçe tutar: 1000000,50 yazılırken 1.000.000,50 görünür. */

export function parseTrAmount(input: string): number {
  let s = input.trim().replace(/\s/g, "");
  if (!s || s === "-" || s === ",") return 0;
  const neg = s.startsWith("-");
  s = s.replace(/-/g, "");
  if (s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, "");
  } else if (!/^\d+\.\d{1,2}$/.test(s)) {
    s = s.replace(/\./g, "");
  }
  const n = Number(`${neg ? "-" : ""}${s}`);
  return Number.isFinite(n) ? n : 0;
}

export function formatTrAmount(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return "";
  const sign = value < 0 ? "-" : "";
  const [intRaw, dec = ""] = Math.abs(value).toFixed(decimals).split(".");
  const grouped = intRaw.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return decimals > 0 ? `${sign}${grouped},${dec}` : `${sign}${grouped}`;
}

export function formatAmountTyping(raw: string, cursor: number, decimals = 2): { text: string; cursor: number } {
  if (!raw.trim()) return { text: "", cursor: 0 };
  const caret = Math.max(0, Math.min(cursor, raw.length));
  const before = raw.slice(0, caret);
  const neg = /^\s*-/.test(raw);
  const cleaned = raw.replace(/\./g, "").replace(/[^\d,]/g, "");
  if (!cleaned.replace(/,/g, "")) return { text: neg ? "-" : "", cursor: neg ? 1 : 0 };

  const commaAt = cleaned.indexOf(",");
  const intDigits = (commaAt === -1 ? cleaned : cleaned.slice(0, commaAt)).replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  const decDigits = (commaAt === -1 ? "" : cleaned.slice(commaAt + 1).replace(/\D/g, "")).slice(0, decimals);
  const intBody = intDigits || "0";
  const grouped = intBody.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const text = `${neg ? "-" : ""}${grouped},${decDigits.padEnd(decimals, "0")}`;
  const sign = neg ? 1 : 0;

  if (before.includes(",")) {
    const decBefore = before.slice(before.indexOf(",") + 1).replace(/\D/g, "").length;
    return { text, cursor: sign + grouped.length + 1 + Math.min(decBefore, decimals) };
  }

  const digitsBefore = before.replace(/\./g, "").replace(/\D/g, "").length;
  const target = Math.min(digitsBefore, intBody.length);
  if (target === 0) return { text, cursor: sign };
  let seen = 0;
  let pos = sign;
  for (let i = 0; i < grouped.length; i += 1) {
    if (/\d/.test(grouped[i])) seen += 1;
    pos = sign + i + 1;
    if (seen >= target) break;
  }
  return { text, cursor: pos };
}
