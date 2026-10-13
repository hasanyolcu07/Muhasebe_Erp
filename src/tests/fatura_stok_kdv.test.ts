import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MockEBelgeAdapter } from "../server/ebelge/adapter";
import { birimDonustur } from "../server/services/birimDonusum";
import { faturaFisSatirlari, stokHesabi } from "../server/services/faturaFis.logic";
import { kdvBeyanHesapla } from "../server/services/kdvBeyan.logic";
import { fifoCikis, ortalamaCikis, ortalamaGiris, stokCikisKontrol } from "../server/services/stokDeger.logic";
import { mevzuatYilPlani } from "../lib/mevzuatYil";

describe("fatura yevmiye, KDV ve stok", () => {
  it("satış fişi 120, 600 ve 391 ile denktir", () => {
    const satirlar = faturaFisSatirlari({
      yon: "SATIS",
      belgeNo: "F-1",
      tevkifatOran: "0.5",
      kalemler: [{ matrah: "1000", kdv: "100", stokHesap: "153", maliyet: "400" }],
    });
    const borc = satirlar.reduce((sum, satir) => sum + Number(satir.borc), 0);
    const alacak = satirlar.reduce((sum, satir) => sum + Number(satir.alacak), 0);
    assert.equal(borc, alacak);
    assert.equal(satirlar.find((satir) => satir.hesapKodu === "120")?.borc, "1050.00");
    assert.equal(satirlar.find((satir) => satir.hesapKodu === "600")?.alacak, "1000.00");
    assert.equal(satirlar.find((satir) => satir.hesapKodu === "391")?.alacak, "50.00");
    assert.equal(satirlar.find((satir) => satir.hesapKodu === "621")?.borc, "400.00");
    assert.equal(satirlar.find((satir) => satir.hesapKodu === "153")?.alacak, "400.00");
  });

  it("alış fişinde 191 KDV'nin tamamını ve 360.01 tevkifatı yazar", () => {
    const satirlar = faturaFisSatirlari({
      yon: "ALIS",
      belgeNo: "A-1",
      tevkifatOran: "0.5",
      kalemler: [{ matrah: "1000", kdv: "100", stokHesap: "152", maliyet: null }],
    });
    assert.equal(satirlar.find((satir) => satir.hesapKodu === "191")?.borc, "100.00");
    assert.equal(satirlar.find((satir) => satir.hesapKodu === "360.01")?.alacak, "50.00");
    assert.equal(satirlar.find((satir) => satir.hesapKodu === "320")?.alacak, "1050.00");
    assert.equal(satirlar.find((satir) => satir.hesapKodu === "152")?.borc, "1000.00");
  });

  it("satış iadesi 610 kullanır", () => {
    const satirlar = faturaFisSatirlari({
      yon: "SATIS_IADE",
      belgeNo: "I-1",
      tevkifatOran: "0",
      kalemler: [{ matrah: "100", kdv: "10", stokHesap: null, maliyet: null }],
    });
    assert.equal(satirlar.find((satir) => satir.hesapKodu === "610")?.borc, "100.00");
    assert.equal(stokHesabi("TICARI_MAL", "MAMUL"), "153");
    assert.equal(stokHesabi("HAMMADDE", "HAMMADDE"), "150");
  });

  it("150 satışında maliyet hesabı olmadığı için fiş kurmaz", () => {
    assert.throws(
      () =>
        faturaFisSatirlari({
          yon: "SATIS",
          belgeNo: "H-1",
          tevkifatOran: "0",
          kalemler: [{ matrah: "10", kdv: "1", stokHesap: "150", maliyet: "10" }],
        }),
      /150 ve 151/,
    );
  });

  it("negatif stok ve FIFO ilk katmanı tüketir", () => {
    assert.throws(() => stokCikisKontrol("2", "3"), /Negatif/);
    const sonuc = fifoCikis(
      [
        { kalan: "2", birimMaliyet: "5" },
        { kalan: "4", birimMaliyet: "8" },
      ],
      "3",
    );
    assert.equal(sonuc.maliyet, "18.00");
    assert.equal(sonuc.kalanlar[0].kalan, "0.0000");
    assert.equal(sonuc.kalanlar[1].kalan, "3.0000");
  });

  it("ağırlıklı ortalama giriş ve çıkış yapar", () => {
    const birim = ortalamaGiris("10", "4", "10", "6");
    assert.equal(birim, "5.000000");
    assert.equal(ortalamaCikis("10", birim, "4"), "20.00");
  });

  it("kg, ton, adet ve bobin dönüşümü tanımlıdır", () => {
    assert.equal(birimDonustur("2", "TON", "KG"), "2000.0000");
    assert.equal(birimDonustur("1", "BOBIN", "ADET", "50"), "50.0000");
    assert.throws(() => birimDonustur("1", "KG", "ADET"), /katsayı yok/);
    assert.throws(() => birimDonustur("1", "BOBIN", "ADET"), /katsayısı/);
  });

  it("KDV beyanı 191, 391 ve 360.01 hareketinden çıkar", () => {
    const rapor = kdvBeyanHesapla({
      oncekiDevreden: "10",
      hareketler: [
        { hesapKodu: "191", borc: "40", alacak: "0" },
        { hesapKodu: "391", borc: "0", alacak: "70" },
        { hesapKodu: "360.01", borc: "0", alacak: "15" },
      ],
    });
    assert.equal(rapor.odenecek, "20.00");
    assert.equal(rapor.devreden, "0.00");
    assert.equal(rapor.tevkifat360, "15.00");
    assert.equal(rapor.tahakkukFisi, false);
  });

  it("mock e-belge GİB onayı üretmez", async () => {
    const sonuc = await new MockEBelgeAdapter().gonder({
      uuid: "11111111-1111-1111-1111-111111111111",
      id: "F-1",
      issueDate: "2026-03-01",
      invoiceTypeCode: "SATIS",
      profileId: "TEMELFATURA",
      documentCurrencyCode: "TRY",
      supplierVkn: "1234567890",
      customerVkn: "1234567890",
      taxExclusiveAmount: "100.00",
      taxAmount: "10.00",
      payableAmount: "110.00",
      lines: [
        {
          id: "1",
          name: "Tel",
          quantity: "1",
          unitCode: "KGM",
          priceAmount: "100.00",
          lineExtensionAmount: "100.00",
          taxPercent: "10",
          taxAmount: "10.00",
        },
      ],
    });
    assert.equal(sonuc.durum, "GONDERIM_BEKLIYOR");
    assert.equal(JSON.stringify(sonuc).includes("ONAY"), false);
  });

  it("tevkifat kodu parametre yılına yazılır", () => {
    const plan = mevzuatYilPlani(2026, "Test kararı", [{ anahtar: "kdv.tevkifat.612", deger: "0.4" }]);
    assert.equal(plan.yazilacak[0].anahtar, "kdv.tevkifat.612");
    assert.equal(plan.baslangic, "2026-01-01");
  });
});
