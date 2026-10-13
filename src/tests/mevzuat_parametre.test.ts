import assert from "node:assert/strict";
import test from "node:test";
import { PublicError } from "../server/security/publicError";
import { parametreSec, type ParametreSatir } from "../server/mevzuat/parametre";
import { MEVZUAT_SEED_TASLAK, mevzuatSeedYazilabilir } from "../../prisma/mevzuat.seed";

const ORNEK: ParametreSatir[] = [
  {
    anahtar: "kdv.oran.genel",
    deger: "0.11",
    gecerlilikBaslangic: "2020-01-01",
    gecerlilikBitis: "2020-12-31",
  },
  {
    anahtar: "kdv.oran.genel",
    deger: "0.22",
    gecerlilikBaslangic: "2021-01-01",
    gecerlilikBitis: "2021-12-31",
  },
];

test("tarihe göre doğru deneme değeri gelir", () => {
  assert.equal(parametreSec(ORNEK, "kdv.oran.genel", "2020-06-15").toFixed(2), "0.11");
  assert.equal(parametreSec(ORNEK, "kdv.oran.genel", "2021-01-01").toFixed(2), "0.22");
  assert.equal(parametreSec(ORNEK, "kdv.oran.genel", "2020-12-31").toFixed(2), "0.11");
});

test("parametre yoksa hata verir", () => {
  assert.throws(
    () => parametreSec(ORNEK, "kdv.oran.genel", "2022-01-01"),
    (error: unknown) => error instanceof PublicError && error.status === 422,
  );
  assert.throws(
    () => parametreSec(ORNEK, "kidem.tavan", "2021-01-01"),
    (error: unknown) => error instanceof PublicError && error.status === 422,
  );
});

test("çakışan aralık ve bozuk tarih reddedilir", () => {
  const cakisik: ParametreSatir[] = [
    ...ORNEK,
    { anahtar: "kdv.oran.genel", deger: "0.33", gecerlilikBaslangic: "2021-06-01", gecerlilikBitis: "2021-12-31" },
  ];
  assert.throws(() => parametreSec(cakisik, "kdv.oran.genel", "2021-07-01"), PublicError);
  assert.throws(() => parametreSec(ORNEK, "kdv.oran.genel", "15.06.2020"), PublicError);
});

test("seed resmi değer yazmaz", () => {
  assert.equal(mevzuatSeedYazilabilir(), false);
  assert.ok(MEVZUAT_SEED_TASLAK.length >= 20);
  assert.ok(MEVZUAT_SEED_TASLAK.every((satir) => satir.deger === null));
  assert.ok(MEVZUAT_SEED_TASLAK.every((satir) => satir.aciklama.includes("TODO(MEVZUAT-DOGRULA)")));
});
