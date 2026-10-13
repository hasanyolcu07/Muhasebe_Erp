import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { payrollDraftFromEngine } from "../server/services/bordroHesap.logic";
import { productionCostDraft } from "../server/services/uretimMaliyet.logic";
import { PublicError } from "../server/security/publicError";
import { buildPayrollDraftLines } from "../server/services/bordroFis.logic";

describe("düz oran ve örnek maliyet düzeltmesi", () => {
  test("asgari ücrette ödenecek gelir vergisi sıfırdır ve düz %15 uygulanmaz", () => {
    const draft = payrollDraftFromEngine({ grossWage: 26005.5, period: "2026-03" });
    const flatTax = Math.round(26005.5 * 0.85 * 0.15 * 100) / 100;
    assert.equal(draft.gelirVergisi, 0);
    assert.notEqual(draft.gelirVergisi, flatTax);
    assert.match(draft.source, /2026/);
  });

  test("kümülatif matrah ikinci dilime geçince oran %20 olur", () => {
    const draft = payrollDraftFromEngine({
      grossWage: 50000,
      period: "2026-06",
      cumulativeTaxBasePrevious: 150000,
    });
    assert.equal(draft.topTaxRate, 0.2);
    assert.ok(draft.cumulative > 158000);
  });

  test("parametresi olmayan yıl hesaplanmaz", () => {
    assert.throws(() => payrollDraftFromEngine({ grossWage: 30000, period: "2030-01" }), (error: unknown) => {
      assert.ok(error instanceof PublicError);
      assert.equal((error as PublicError).status, 422);
      return true;
    });
  });

  test("bordro taslak satırları motor tutarlarıyla denktir", () => {
    const draft = payrollDraftFromEngine({ grossWage: 40000, period: "2026-02" });
    const lines = buildPayrollDraftLines(draft);
    const debit = lines.reduce((sum, line) => sum + Math.round(line.debit * 100), 0);
    const credit = lines.reduce((sum, line) => sum + Math.round(line.credit * 100), 0);
    assert.equal(debit, credit);
  });

  test("maliyet fişi girilen tutarla denk olur; 7/B ve negatif tutar yazılmaz", () => {
    const voucher = productionCostDraft({
      fisNo: "URT-TEST",
      tarih: "2026-10-12",
      mamulKodu: "CIVI",
      mamulAdi: "Çivi",
      hammadde: 100,
      iscilik: 40,
      genelUretim: 10,
      chart: "7A",
    });
    const debit = voucher.satirlar.reduce((sum, line) => sum + line.borc, 0);
    const credit = voucher.satirlar.reduce((sum, line) => sum + line.alacak, 0);
    assert.equal(debit, 150);
    assert.equal(credit, 150);
    assert.throws(() => productionCostDraft({
      fisNo: "URT-TEST",
      tarih: "2026-10-12",
      mamulKodu: "CIVI",
      mamulAdi: "Çivi",
      hammadde: 1,
      iscilik: 1,
      genelUretim: 1,
      chart: "7B",
    }), (error: unknown) => error instanceof PublicError);
    assert.throws(() => productionCostDraft({
      fisNo: "URT-TEST",
      tarih: "2026-10-12",
      mamulKodu: "CIVI",
      mamulAdi: "Çivi",
      hammadde: -1,
      iscilik: 1,
      genelUretim: 1,
      chart: "7A",
    }), (error: unknown) => error instanceof PublicError);
  });

  test("bordro ucu düz yüzde formülünü çağırmaz", () => {
    const source = fs.readFileSync("src/server/routes/erp.routes.ts", "utf8");
    assert.match(source, /payrollDraftFromEngine/);
    assert.equal(source.includes("matrah * 0.15"), false);
  });
});
