import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateGrossToNet } from "../modules/personel/services/payrollCalculator";
import { payrollSetFromDegerler } from "../lib/mevzuatYil";
import { mevzuatYilPlani } from "../lib/mevzuatYil";
import { bordroGiderHesabi, buildPayrollDraftLines, uretimPersonel } from "../server/services/bordroFis.logic";
import { bildirimUygun, ihbarTutari, kidemTutari, oncekiDonem, yillikIzinGunu } from "../server/services/bordroHak.logic";

const ORNEK: Record<string, string> = {
  "sgk.isci.oran": "0.1",
  "sgk.isveren.oran": "0.2",
  "sgk.issizlik.isci.oran": "0.01",
  "sgk.issizlik.isveren.oran": "0.02",
  "sgk.taban": "3000",
  "sgk.tavan": "9000",
  "gv.dilim.1.oran": "0.1",
  "gv.dilim.1.ust": "100000",
  "gv.dilim.2.oran": "0.2",
  "gv.dilim.2.ust": "200000",
  "gv.dilim.3.oran": "0.3",
  "gv.dilim.3.ust": "300000",
  "gv.dilim.4.oran": "0.35",
  "gv.dilim.4.ust": "400000",
  "gv.dilim.5.oran": "0.4",
  "damga.oran": "0.001",
  "asgari_ucret.brut": "3000",
};

describe("bordro ve SGK", () => {
  it("eksik günde SGK tavanı çalışılan güne iner", () => {
    const parameters = payrollSetFromDegerler(2026, "Deneme kararı", ORNEK);
    const hesap = calculateGrossToNet({
      grossWage: 20000,
      period: "2026-06",
      workedDays: 15,
      parameters,
      has5510Discount: false,
    });
    assert.equal(hesap.grossTotal, 10000);
    assert.equal(hesap.sgkBase, 4500);
  });

  it("ocak dışı önceki dönem ister, fiş 7/B üretimde 791 kullanır", () => {
    assert.equal(oncekiDonem("2026-01"), null);
    assert.equal(oncekiDonem("2026-02"), "2026-01");
    assert.equal(bordroGiderHesabi(false, "7B"), "770");
    assert.equal(bordroGiderHesabi(true, "7B"), "791");
    assert.equal(bordroGiderHesabi(true, "7A"), "720");
    assert.equal(uretimPersonel({ departman: "Üretim" }, ""), true);
    assert.equal(uretimPersonel({ departman: "üretim" }, ""), true);
    assert.equal(uretimPersonel({}, "URETIM"), true);
    assert.equal(uretimPersonel({ departman: "Muhasebe" }, ""), false);
    const satirlar = buildPayrollDraftLines(
      { brut: 1000, sgkIsci: 100, issizlik: 10, sgkIsveren: 200, gelirVergisi: 50, damga: 10, net: 830 },
      "791",
    );
    assert.equal(satirlar[0].code, "791");
    const borc = satirlar.reduce((t, s) => t + s.debit, 0);
    const alacak = satirlar.reduce((t, s) => t + s.credit, 0);
    assert.equal(borc.toFixed(2), alacak.toFixed(2));
    assert.equal(satirlar.some((s) => s.code === "360.01"), false);
  });

  it("izin, kıdem ve ihbar formülü hak kararı vermez", () => {
    assert.equal(yillikIzinGunu(200, null), 0);
    assert.equal(yillikIzinGunu(400, null), 14);
    assert.equal(yillikIzinGunu(400, 17), 20);
    assert.equal(yillikIzinGunu(6 * 365, null), 20);
    assert.equal(yillikIzinGunu(15 * 365, 40), 26);
    assert.equal(kidemTutari(200, "10000", "3000").tutar, "0.00");
    assert.equal(kidemTutari(365, "10000", "3000").tutar, "3000.00");
    assert.match(kidemTutari(365, "1000", "5000").uyari, /hak/);
    assert.equal(ihbarTutari(100, "3000").hafta, 2);
    assert.equal(ihbarTutari(100, "3000").tutar, "1400.00");
    assert.equal(ihbarTutari(200, "3000").hafta, 4);
  });

  it("bildirim süresi verilen güne bakar ve gün parametresi tam sayı ister", () => {
    const baslama = new Date(2026, 3, 10);
    assert.equal(bildirimUygun(baslama, new Date(2026, 3, 9), 1, "once"), true);
    assert.equal(bildirimUygun(baslama, new Date(2026, 3, 10), 1, "once"), false);
    const cikis = new Date(2026, 3, 1);
    assert.equal(bildirimUygun(cikis, new Date(2026, 3, 8), 10, "sonra"), true);
    assert.equal(bildirimUygun(cikis, new Date(2026, 3, 20), 10, "sonra"), false);
    const plan = mevzuatYilPlani(2026, "Deneme kararı", [{ anahtar: "sgk.ise_giris.once_gun", deger: "1" }]);
    assert.equal(plan.yazilacak[0].deger, "1");
    assert.throws(() => mevzuatYilPlani(2026, "Deneme kararı", [{ anahtar: "sgk.isten_cikis.gun", deger: "1.5" }]));
  });
});
