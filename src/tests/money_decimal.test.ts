import assert from "node:assert/strict";
import test from "node:test";
import { addMoney, kurusOf, money } from "../server/money";
import { comparePartners } from "../server/services/kobi.logic";
import { moduleForPath, roleAllows } from "../server/security/moduleAccess";
import { getPermissionsForRole } from "../server/controllers/auth.controller";

test("0.1 ve 0.2 toplamı kuruşta 0.30 olur", () => {
  assert.equal(addMoney([0.1, 0.2]).toFixed(2), "0.30");
  assert.equal(kurusOf("1.005"), 101);
  assert.equal(money("1000.5").toFixed(2), "1000.50");
});

test("ortaklık payı float çarpım kullanmaz", () => {
  const rows = comparePartners(
    [{ id: 1, ad: "A", rol: "Ortak", hisseOran: 60, sermaye: 600 }],
    250,
    1000,
  );
  assert.equal(rows[0].giderPayi, 150);
  assert.equal(rows[0].fark, 450);
  assert.equal(rows[0].stopaj, 60);
  assert.equal(rows[0].netOdeme, 540);
});

test("tanımsız modül yolu rol tablosunda yoktur", () => {
  assert.equal(moduleForPath("/bilinmeyen/kayit"), null);
  const depo = getPermissionsForRole("DEPO_SORUMLUSU");
  assert.equal(roleAllows(depo, "personel", "view"), false);
  assert.equal(roleAllows(depo, "stok", "view"), true);
});
