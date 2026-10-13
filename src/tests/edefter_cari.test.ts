import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { journalHash, shouldRevise, validateEdefter, type EdefterVoucher } from "../server/services/edefter.logic";

const denk: EdefterVoucher = {
  fisNo: "YEV-1",
  tarih: "2026-10-01",
  aciklama: "Açılış",
  toplamBorc: 100,
  toplamAlacak: 100,
  lines: [
    { hesapKodu: "100", borc: 100, alacak: 0, aciklama: "Kasa" },
    { hesapKodu: "500", borc: 0, alacak: 100, aciklama: "Sermaye" },
  ],
};

describe("e-defter hazırlama", () => {
  it("boş dönemde paket üretilmez", () => {
    const result = validateEdefter([], false);
    assert.equal(result.ok, false);
    assert.match(result.errors[0], /yevmiye fişi yok/);
  });

  it("dengesiz fişi ve eksik hesap kodunu reddeder", () => {
    const result = validateEdefter([
      {
        ...denk,
        toplamAlacak: 90,
        lines: [
          { hesapKodu: "", borc: 100, alacak: 0, aciklama: "Eksik" },
          { hesapKodu: "500", borc: 0, alacak: 90, aciklama: "Sermaye" },
        ],
      },
    ], true);
    assert.equal(result.ok, false);
    assert.equal(result.errors.some((item) => item.includes("denk değil")), true);
    assert.equal(result.errors.some((item) => item.includes("hesap kodu")), true);
    assert.equal(result.warnings.some((item) => item.includes("kilitli")), true);
  });

  it("aynı dönemi onaysız ikinci kez ezmez", () => {
    const blocked = shouldRevise(1, false);
    assert.equal(blocked.create, false);
    assert.match(blocked.error || "", /revizyon/);
    const allowed = shouldRevise(1, true);
    assert.equal(allowed.create, true);
  });

  it("aynı fişin özeti aynı hash değerini verir", () => {
    assert.equal(journalHash([denk]), journalHash([denk]));
    assert.notEqual(journalHash([denk]), journalHash([{ ...denk, toplamBorc: 101 }]));
  });
});
