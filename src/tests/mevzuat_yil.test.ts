import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mevzuatYilPlani, payrollSetFromDegerler } from "../lib/mevzuatYil";
import { calculateGrossToNet } from "../modules/personel/services/payrollCalculator";

const ORNEK: Record<string, string> = {
  "sgk.isci.oran": "0.1",
  "sgk.isveren.oran": "0.2",
  "sgk.issizlik.isci.oran": "0.01",
  "sgk.issizlik.isveren.oran": "0.02",
  "sgk.taban": "1000",
  "sgk.tavan": "8000",
  "gv.dilim.1.oran": "0.1",
  "gv.dilim.1.ust": "1000",
  "gv.dilim.2.oran": "0.2",
  "gv.dilim.2.ust": "2000",
  "gv.dilim.3.oran": "0.3",
  "gv.dilim.3.ust": "3000",
  "gv.dilim.4.oran": "0.35",
  "gv.dilim.4.ust": "4000",
  "gv.dilim.5.oran": "0.4",
  "damga.oran": "0.001",
  "asgari_ucret.brut": "1000",
};

describe("yıl bazlı mevzuat kaydı", () => {
  it("değeri 1 Ocak ile 31 Aralık aralığına yazar", () => {
    const plan = mevzuatYilPlani(2026, "Test kararı", [{ anahtar: "kdv.oran.genel", deger: "0.11" }]);
    assert.equal(plan.baslangic, "2026-01-01");
    assert.equal(plan.bitis, "2026-12-31");
    assert.deepEqual(plan.yazilacak, [{ anahtar: "kdv.oran.genel", deger: "0.11" }]);
  });

  it("boş değeri o yılın satırından siler", () => {
    const plan = mevzuatYilPlani(2026, "", [{ anahtar: "kidem.tavan", deger: null }]);
    assert.deepEqual(plan.silinecek, ["kidem.tavan"]);
    assert.equal(plan.yazilacak.length, 0);
  });

  it("oran 1'i aşarsa reddeder", () => {
    assert.throws(() => mevzuatYilPlani(2026, "Test kararı", [{ anahtar: "damga.oran", deger: "1.5" }]), /aşamaz/);
  });

  it("eksik bordro anahtarında hesap kurmaz", () => {
    assert.throws(() => payrollSetFromDegerler(2031, "Test", { "sgk.isci.oran": "0.1" }), /eksik/);
  });

  it("kayıtlı yıl oranıyla brütten nete iner", () => {
    const set = payrollSetFromDegerler(2031, "Test kararı", ORNEK);
    const sonuc = calculateGrossToNet({
      grossWage: 1000,
      period: "2031-01",
      workedDays: 30,
      parameters: set,
      has5510Discount: false,
    });
    assert.equal(sonuc.sgkEmployeeShare, 100);
    assert.equal(set.sgk_5510_tesvik_orani, 0);
    assert.equal(set.valid_from, "2031-01-01");
  });
});
