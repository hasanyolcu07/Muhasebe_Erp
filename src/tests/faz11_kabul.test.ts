import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { branchWithinCompany } from "../server/security/branchScope";
import { redactForLog, PublicError } from "../server/security/publicError";
import { validateUploadFile, formatCsvExport } from "../lib/fileValidation";
import { roleAllows } from "../server/security/moduleAccess";
import { getPermissionsForRole } from "../server/controllers/auth.controller";
import { buildPayrollDraftLines } from "../server/services/bordroFis.logic";
import { validateEdefter } from "../server/services/edefter.logic";
import { processDocumentFile } from "../modules/yevmiye/services/ocrProcessingService";

describe("FAZ 11 kabul", () => {
  test("başka şirketin şubesi reddedilir; boş istek kendi şubesine düşer", () => {
    assert.equal(branchWithinCompany([4, 5], ""), 4);
    assert.throws(() => branchWithinCompany([4], 99), (error: unknown) => {
      assert.ok(error instanceof PublicError);
      assert.equal((error as PublicError).status, 403);
      return true;
    });
  });

  test("hata günlüğü TCKN, şifre ve bağlantı dizesini maskeler", () => {
    const text = redactForLog(
      "postgresql://tabia:gizli@127.0.0.1/db password=TabiaSifre bearer abc.def tckn 10000000001",
    );
    assert.equal(text.includes("10000000001"), false);
    assert.equal(text.includes("TabiaSifre"), false);
    assert.equal(text.includes("postgresql://tabia"), false);
    assert.match(text, /\[tckn\]/);
    assert.match(text, /password=\[gizli\]/);
  });

  test("yürütülebilir ve boş dosya yüklenemez; formül CSV hücresi nötrlenir", () => {
    assert.equal(validateUploadFile({ name: "zararli.exe", size: 10 }).valid, false);
    assert.equal(validateUploadFile({ name: "bos.xml", size: 0 }).valid, false);
    assert.equal(validateUploadFile({ name: "fatura.xml", size: 20 }).valid, true);
    assert.match(formatCsvExport(["tutar"], [["=1+1"]]), /'=1\+1/);
  });

  test("depo sorumlusu finans göremez; bordro taslak satırları dengelidir", () => {
    assert.equal(roleAllows(getPermissionsForRole("DEPO_SORUMLUSU"), "finans", "view"), false);
    const lines = buildPayrollDraftLines({
      brut: 1000,
      sgkIsci: 140,
      issizlik: 10,
      sgkIsveren: 155,
      gelirVergisi: 127.5,
      damga: 7.59,
      net: 714.91,
    });
    const borc = lines.reduce((sum, line) => sum + line.debit, 0);
    const alacak = lines.reduce((sum, line) => sum + line.credit, 0);
    assert.equal(Math.round(borc * 100), Math.round(alacak * 100));
  });

  test("boş e-Defter dönemi hazır sayılmaz", () => {
    const result = validateEdefter([], false);
    assert.equal(result.ok, false);
  });

  test("OCR anahtarsız PDF kesin fatura ve fiş üretmez", async () => {
    const previous = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    try {
      const result = await processDocumentFile({
        name: "belge.pdf",
        size: 128,
        type: "application/pdf",
        text: async () => "",
      } as File);
      assert.equal(result.success, false);
      assert.equal(result.data, undefined);
      assert.equal(result.service_status, "NOT_CONFIGURED");
    } finally {
      if (previous) process.env.GEMINI_API_KEY = previous;
    }
  });

  test("hesap planı içe aktarma mükerrer kodu atlar", () => {
    const source = fs.readFileSync("prisma/seed.ts", "utf8");
    assert.match(source, /skipDuplicates:\s*true/);
  });
});
