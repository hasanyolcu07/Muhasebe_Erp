import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  amortismanGiderHesabi,
  amortismanTutari,
  cekFisi,
  cekHesabi,
  hammaddeFisi,
  kurFarkiFisi,
  nakitFisi,
  sarfMiktari,
  sarfTutari,
} from "../server/services/finansDonem.logic";

function denk(satirlar: Array<{ borc: string; alacak: string }>) {
  const borc = satirlar.reduce((t, s) => t + Number(s.borc), 0);
  const alacak = satirlar.reduce((t, s) => t + Number(s.alacak), 0);
  assert.equal(borc.toFixed(2), alacak.toFixed(2));
}

describe("kasa banka çek demirbaş maliyet", () => {
  it("tahsilat 100 borç 120 alacak, virman 102 borç 100 alacak", () => {
    const tahsil = nakitFisi("TAHSILAT", "100", "120", "250.00");
    assert.equal(tahsil[0].hesap, "100");
    assert.equal(tahsil[0].borc, "250.00");
    assert.equal(tahsil[1].hesap, "120");
    denk(tahsil);
    const virman = nakitFisi("VIRMAN", "100", "102", "80");
    assert.equal(virman[0].hesap, "102");
    assert.equal(virman[1].hesap, "100");
    denk(virman);
  });

  it("alınan çek 101, senet 121, verilen senet 321, verilen çek 103", () => {
    assert.equal(cekHesabi("CEK", "ALINAN"), "101");
    assert.equal(cekHesabi("SENET", "ALINAN"), "121");
    assert.equal(cekHesabi("SENET", "VERILEN"), "321");
    assert.equal(cekHesabi("CEK", "VERILEN"), "103");
    const giris = cekFisi("GIRIS", "101", "102", "1000");
    assert.equal(giris.find((s) => s.borc !== "0.00")?.hesap, "101");
    const odeme = cekFisi("ODEME", "103", "102", "1000");
    assert.equal(odeme.find((s) => s.hesap === "103")?.borc, "1000.00");
    denk(giris);
    denk(odeme);
  });

  it("normal ve azalan amortisman oranı kullanıcıdan gelir, 7/B gider 796", () => {
    assert.equal(amortismanTutari("1000", "0", "0.20", "NORMAL").tutar, "200.00");
    assert.equal(amortismanTutari("1000", "200", "0.20", "NORMAL").tutar, "200.00");
    assert.equal(amortismanTutari("1000", "200", "0.20", "AZALAN").tutar, "160.00");
    assert.equal(amortismanGiderHesabi("7B", true), "796");
    assert.equal(amortismanGiderHesabi("7A", true), "730");
    assert.equal(amortismanGiderHesabi("7A", false), "770");
    assert.throws(() => amortismanTutari("1000", "0", "2", "AZALAN"));
  });

  it("kur artışı 646, kur azalışı 656", () => {
    const artis = kurFarkiFisi("102", "100", "30", "32", true);
    assert.equal(artis.find((s) => s.hesap === "646")?.alacak, "200.00");
    const azalis = kurFarkiFisi("320", "100", "30", "32", false);
    assert.equal(azalis.find((s) => s.hesap === "656")?.borc, "200.00");
    denk(artis);
    denk(azalis);
  });

  it("çivi reçetesi fireyi miktara katar, 7/B fişi 790/150", () => {
    assert.equal(sarfMiktari("10", "5"), "10.5000");
    assert.equal(sarfTutari("10.5000", "4"), "42.00");
    const fis = hammaddeFisi("7B", "42");
    assert.equal(fis.satirlar.some((s) => s.hesap.startsWith("71")), false);
    assert.equal(fis.satirlar.find((s) => s.hesap === "790")?.borc, "42.00");
    assert.equal(fis.satirlar.find((s) => s.hesap === "150")?.alacak, "42.00");
    assert.equal(fis.satirlar.some((s) => s.hesap === "798" || s.hesap === "152"), false);
    const yediA = hammaddeFisi("7A", "42");
    assert.equal(yediA.satirlar.some((s) => s.hesap === "710"), true);
    denk(yediA.satirlar);
  });
});
