import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyLines,
  buildClosingLines,
  buildOpeningLines,
  closingVoucherNo,
  isBalanceSheet,
  openingVoucherNo,
} from "../server/services/yearEnd.logic";

const sample = [
  { code: "100", name: "Kasa", debit: 1000, credit: 0 },
  { code: "320", name: "Satıcılar", debit: 0, credit: 400 },
  { code: "600", name: "Yurtiçi Satışlar", debit: 0, credit: 1000 },
  { code: "770", name: "Genel Yönetim Giderleri", debit: 400, credit: 0 },
];

describe("yıl sonu kapanış ve devir", () => {
  it("kapanış fişi denk olur ve gelir ile maliyeti 590'a taşır", () => {
    const built = buildClosingLines(sample);
    assert.equal(built.error, null);
    const debit = built.lines.reduce((s, l) => s + l.debit, 0);
    const credit = built.lines.reduce((s, l) => s + l.credit, 0);
    assert.equal(debit, credit);
    assert.equal(built.lines.some((l) => l.code === "600" && l.debit === 1000), true);
    assert.equal(built.lines.some((l) => l.code === "770" && l.credit === 400), true);
    assert.equal(built.lines.some((l) => l.code === "590" && l.credit === 600), true);
    assert.equal(built.lines.some((l) => l.code === "100"), false);
  });

  it("açılış fişi yalnızca bilanço hesaplarını taşır", () => {
    const closed = applyLines(sample, buildClosingLines(sample).lines);
    const opening = buildOpeningLines(closed);
    assert.equal(opening.error, null);
    const codes = opening.lines.map((l) => l.code);
    assert.deepEqual(codes.sort(), ["100", "320", "590"]);
    assert.equal(opening.lines.every((l) => isBalanceSheet(l.code)), true);
    assert.equal(opening.lines.some((l) => l.code.startsWith("6") || l.code.startsWith("7")), false);
    const debit = opening.lines.reduce((s, l) => s + l.debit, 0);
    const credit = opening.lines.reduce((s, l) => s + l.credit, 0);
    assert.equal(debit, credit);
    assert.equal(debit, 1000);
  });

  it("aynı yılın kapanış numarası sabittir", () => {
    assert.equal(closingVoucherNo(2026), "KAPANIS-2026");
    assert.equal(openingVoucherNo(2026), "ACILIS-2027");
    assert.equal(closingVoucherNo(2026), closingVoucherNo(2026));
  });

  it("dengesiz defterde kapanış satırı üretmez", () => {
    const built = buildClosingLines([{ code: "100", name: "Kasa", debit: 10, credit: 0 }]);
    assert.equal(built.lines.length, 0);
    assert.match(built.error || "", /denk değil/);
  });

  it("zararı 591 hesabına yazar", () => {
    const built = buildClosingLines([
      { code: "100", name: "Kasa", debit: 50, credit: 0 },
      { code: "770", name: "Gider", debit: 50, credit: 0 },
      { code: "500", name: "Sermaye", debit: 0, credit: 100 },
    ]);
    assert.equal(built.error, null);
    assert.equal(built.lines.some((l) => l.code === "591" && l.debit === 50), true);
    const closed = applyLines(
      [
        { code: "100", name: "Kasa", debit: 50, credit: 0 },
        { code: "770", name: "Gider", debit: 50, credit: 0 },
        { code: "500", name: "Sermaye", debit: 0, credit: 100 },
      ],
      built.lines
    );
    const opening = buildOpeningLines(closed);
    assert.equal(opening.lines.some((l) => l.code === "770"), false);
    assert.equal(opening.lines.some((l) => l.code === "591"), true);
  });
});
