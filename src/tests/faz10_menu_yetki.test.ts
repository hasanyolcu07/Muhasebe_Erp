import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { actionForMethod, moduleForPath, roleAllows } from "../server/security/moduleAccess";
import { buildPayrollDraftLines } from "../server/services/bordroFis.logic";
import { getPermissionsForRole } from "../server/controllers/auth.controller";

describe("modül yetkisi", () => {
  it("depo sorumlusu cari hareketini göremez", () => {
    const perms = getPermissionsForRole("DEPO_SORUMLUSU");
    assert.equal(moduleForPath("/cari-islemleri"), "finans");
    assert.equal(roleAllows(perms, "finans", actionForMethod("GET")), false);
    assert.equal(roleAllows(perms, "stok", "view"), true);
  });

  it("muhasebe bordro taslağı oluşturabilir, silemez", () => {
    const perms = getPermissionsForRole("MUHASEBE_UZMANI");
    assert.equal(roleAllows(perms, "personel", "create"), true);
    assert.equal(roleAllows(perms, "personel", "delete"), false);
  });
});

describe("bordro fiş taslağı", () => {
  it("satırlar denktir ve kesinleşmiş sayılmaz", () => {
    const lines = buildPayrollDraftLines({
      brut: 1000,
      sgkIsci: 140,
      issizlik: 10,
      sgkIsveren: 155,
      gelirVergisi: 127.5,
      damga: 7.59,
      net: 714.91,
    });
    const debit = lines.reduce((sum, line) => sum + Math.round(line.debit * 100), 0);
    const credit = lines.reduce((sum, line) => sum + Math.round(line.credit * 100), 0);
    assert.equal(debit, credit);
    assert.equal(lines.some((line) => line.code === "770"), true);
    assert.equal(lines.some((line) => line.code === "335"), true);
  });
});
