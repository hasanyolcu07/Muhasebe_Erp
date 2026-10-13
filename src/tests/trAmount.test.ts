import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatAmountTyping, formatTrAmount, parseTrAmount } from "../lib/trAmount";

function typeDigits(value: string): string {
  let text = "";
  let cursor = 0;
  for (const ch of value) {
    const raw = text.slice(0, cursor) + ch + text.slice(cursor);
    const next = formatAmountTyping(raw, cursor + 1);
    text = next.text;
    cursor = next.cursor;
  }
  return text;
}

describe("türkçe tutar girişi", () => {
  it("milyon yazılırken binlik ve kuruş gösterir", () => {
    assert.equal(typeDigits("1000000"), "1.000.000,00");
    assert.equal(typeDigits("1000000,5"), "1.000.000,50");
    assert.equal(parseTrAmount("1.000.000,50"), 1000000.5);
    assert.equal(formatTrAmount(1000000), "1.000.000,00");
  });

  it("yapıştırılan Türkçe ve noktalı tutarı aynı sayıya çevirir", () => {
    assert.equal(parseTrAmount("1.250,50"), 1250.5);
    assert.equal(parseTrAmount("1250.50"), 1250.5);
    assert.equal(parseTrAmount("1000000,00"), 1000000);
  });
});
