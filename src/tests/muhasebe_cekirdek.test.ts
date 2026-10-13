import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { altHesapAnaKodu, hesapFiseUygun, kilitliSeviye } from "../server/muhasebe/thpKilit.logic";
import { fisTarihiUygun, sonrakiFisNo, tersKayitTarihi } from "../server/muhasebe/yevmiyeNo.logic";
import { defterRaporu } from "../server/muhasebe/defterRapor.logic";

describe("muhasebe çekirdeği", () => {
  it("ana hesap kilitlenir, alt hesap ana koda bağlanır", () => {
    assert.equal(kilitliSeviye("ANA"), true);
    assert.equal(kilitliSeviye("MUAVIN"), false);
    assert.equal(altHesapAnaKodu("100.01"), "100");
    assert.equal(altHesapAnaKodu("100"), null);
    assert.equal(altHesapAnaKodu("10"), null);
  });

  it("7/B şirkette 710 reddedilir, 120 ve 791 kabul edilir", () => {
    assert.match(hesapFiseUygun("10", "7B") || "", /THP/);
    assert.match(hesapFiseUygun("710", "7B") || "", /7\/B/);
    assert.equal(hesapFiseUygun("791", "7B"), null);
    assert.equal(hesapFiseUygun("120", "7B"), null);
    assert.equal(hesapFiseUygun("710", "7A"), null);
  });

  it("fiş numarası yıl içinde boşluksuz artar ve eski tarihe izin vermez", () => {
    assert.equal(sonrakiFisNo(2026, ["FTR-1", "YEV-2026-00002", "KAPANIS-2026"]), "YEV-2026-00003");
    assert.equal(sonrakiFisNo(2026, []), "YEV-2026-00001");
    const son = new Date(2026, 2, 15);
    assert.equal(fisTarihiUygun(son, new Date(2026, 2, 15)), true);
    assert.equal(fisTarihiUygun(son, new Date(2026, 2, 10)), false);
    assert.equal(tersKayitTarihi(new Date(2026, 1, 1), son, false), null);
    assert.equal(tersKayitTarihi(new Date(2026, 1, 1), son, true)?.getDate(), 15);
    assert.equal(tersKayitTarihi(new Date(2026, 3, 1), son, true)?.getMonth(), 3);
  });

  it("mizan, bilanço ve gelir tablosu kesin satırları çift saymaz", () => {
    const hareketler = [
      { fisNo: "YEV-2026-00001", tarih: "2026-01-05", hesapKodu: "120", aciklama: "Satış", borc: "120.00", alacak: "0.00" },
      { fisNo: "YEV-2026-00001", tarih: "2026-01-05", hesapKodu: "600", aciklama: "Satış", borc: "0.00", alacak: "100.00" },
      { fisNo: "YEV-2026-00001", tarih: "2026-01-05", hesapKodu: "391", aciklama: "KDV", borc: "0.00", alacak: "20.00" },
      { fisNo: "YEV-2026-00001", tarih: "2026-01-05", hesapKodu: "120.01", aciklama: "Alt", borc: "10.00", alacak: "0.00" },
      { fisNo: "YEV-2026-00001", tarih: "2026-01-05", hesapKodu: "600", aciklama: "Alt karşılık", borc: "0.00", alacak: "10.00" },
      { fisNo: "YEV-2026-00002", tarih: "2026-02-01", hesapKodu: "791", aciklama: "Ücret", borc: "40.00", alacak: "0.00" },
      { fisNo: "YEV-2026-00002", tarih: "2026-02-01", hesapKodu: "100", aciklama: "Kasa", borc: "0.00", alacak: "40.00" },
      { fisNo: "KAPANIS-2026", tarih: "2026-12-31", hesapKodu: "600", aciklama: "Kapanış", borc: "110.00", alacak: "0.00" },
      { fisNo: "KAPANIS-2026", tarih: "2026-12-31", hesapKodu: "690", aciklama: "Kapanış", borc: "0.00", alacak: "110.00" },
    ];
    const mizan = defterRaporu("mizan", hareketler);
    assert.equal(mizan.toplamBorc, mizan.toplamAlacak);
    const yuzYirmi = mizan.satirlar.find((satir) => satir.hesapKodu === "120");
    const alt = mizan.satirlar.find((satir) => satir.hesapKodu === "120.01");
    assert.equal(yuzYirmi?.borc, "120.00");
    assert.equal(alt?.borc, "10.00");
    const bilanco = defterRaporu("bilanco", hareketler);
    assert.equal(bilanco.satirlar.some((satir) => satir.hesapKodu === "600"), false);
    assert.equal(bilanco.satirlar.some((satir) => satir.hesapKodu === "120"), true);
    const gelir = defterRaporu("gelir", hareketler);
    assert.equal(gelir.satirlar.some((satir) => satir.hesapKodu === "600"), true);
    assert.equal(gelir.satirlar.some((satir) => satir.hesapKodu === "690"), false);
    assert.equal(gelir.giderCesitleri.some((satir) => satir.hesapKodu === "791"), true);
    assert.equal(gelir.toplamAlacak, "110.00");
  });
});
