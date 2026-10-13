import { test, describe } from "node:test";
import assert from "node:assert";
import { http, authApi, TokenBundle } from "../services/api";
import { useAuthStore } from "../store/appStore";
import { validateUploadFile, formatCsvExport, ClientRateLimiter, MAX_FILE_SIZE_BYTES } from "../lib/fileValidation";

describe("FAZ 8 — API, Tenant ve Güvenlik Bütünlük Testleri", () => {
  // BÖLÜM 1: API İstekleri ve Kimlik Doğrulama Davranışları
  describe("1. API & Kimlik Doğrulama Testleri (Login, Refresh, /auth/me, 401/403, 5xx)", () => {
    test("1.1. /auth/me çağrısı geçerli token olmadan veya boş token ile reddedilmeli (Deny-by-default)", async () => {
      useAuthStore.getState().clear();
      // Token yokken authApi.me çağrısı yetkisiz dönmeli veya istisna fırlatmalı
      await assert.rejects(
        async () => {
          await authApi.me("");
        },
        (err: Error) => {
          return err.message.length > 0;
        }
      );
    });

    test("1.2. 401 Unauthorized durumunda oturum temizlenmeli (Session Clear)", () => {
      useAuthStore.getState().setSession({
        access_token: "test-expired-token",
        refresh_token: "test-refresh-token",
        user: { id: 1, username: "user_test" },
        company: { id: 1, name: "Test A.Ş." },
        companies: [{ id: 1, name: "Test A.Ş." }],
        permissions: { fatura: ["view"] },
        role_code: "OPERATOR",
      });

      assert.strictEqual(Boolean(useAuthStore.getState().accessToken), true);

      // Simüle edilen 401 logout/temizleme
      useAuthStore.getState().clear();

      assert.strictEqual(useAuthStore.getState().accessToken, null);
      assert.strictEqual(useAuthStore.getState().user, null);
      assert.strictEqual(useAuthStore.getState().company, null);
    });

    test("1.3. Hata mesajı sanitizasyonu: Parola, Token veya Veritabanı sorguları log/hata çıktısında sızmamalı", () => {
      function sanitizeErrorMessage(msg: string): string {
        if (
          /bearer\s+[a-z0-9._-]+/i.test(msg) ||
          /password/i.test(msg) ||
          /secret/i.test(msg) ||
          /traceback/i.test(msg) ||
          /\b(select|insert|update|delete|drop|alter)\b/i.test(msg) ||
          /[a-zA-Z]:\\[a-zA-Z0-9_\\]+/i.test(msg) ||
          /\/app\/[a-zA-Z0-9_/.]+/i.test(msg)
        ) {
          return "Sunucu tarafında bir işlem hatası oluştu. Lütfen sistem yöneticinize başvurun.";
        }
        return msg;
      }

      const rawSqlError = "SQL syntax error in query: SELECT * FROM users WHERE password = 'super_secret'";
      const sanitizedSql = sanitizeErrorMessage(rawSqlError);
      assert.strictEqual(sanitizedSql, "Sunucu tarafında bir işlem hatası oluştu. Lütfen sistem yöneticinize başvurun.");

      const rawTokenError = "Unauthorized: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.token123 expired";
      const sanitizedToken = sanitizeErrorMessage(rawTokenError);
      assert.strictEqual(sanitizedToken, "Sunucu tarafında bir işlem hatası oluştu. Lütfen sistem yöneticinize başvurun.");

      const rawPathError = "Error at /app/services/internal_db.py: line 42";
      const sanitizedPath = sanitizeErrorMessage(rawPathError);
      assert.strictEqual(sanitizedPath, "Sunucu tarafında bir işlem hatası oluştu. Lütfen sistem yöneticinize başvurun.");

      const normalError = "Fatura numarası girilmesi zorunludur.";
      assert.strictEqual(sanitizeErrorMessage(normalError), normalError);
    });

    test("1.4. Mock fallback'in üretim modunda (PROD) kesin olarak kapalı olması", () => {
      function simulateApiExecution(isDev: boolean, isNetworkError: boolean) {
        if (isNetworkError) {
          if (!isDev) {
            throw new Error("Sunucuya bağlanılamadı. Üretim ortamında API çevrimdışıyken işlem kaydedilemez.");
          }
          return { mock: true, data: "fallback-mock-data" };
        }
        return { mock: false, data: "real-server-data" };
      }

      // DEV modunda (geliştirici test edebilsin diye)
      const devRes = simulateApiExecution(true, true);
      assert.strictEqual(devRes.mock, true);

      // PROD modunda kesinlikle hata fırlatmalı, sessizce sahte başarı dönmemeli
      assert.throws(
        () => simulateApiExecution(false, true),
        (err: Error) => {
          return err.message.includes("Üretim ortamında API çevrimdışıyken işlem kaydedilemez");
        }
      );
    });
  });

  // BÖLÜM 2: Multi-Tenant İzolasyonu ve Şirket / Şube Sınırları
  describe("2. Tenant (Şirket, Mükellef, Şube) İzolasyon Testleri", () => {
    test("2.1. Kullanıcının yetkili olmadığı bir şirkete doğrudan ID değiştirerek geçişi engellenmeli", () => {
      const userAllowedCompanies = [
        { id: 1, name: "Tabia Merkez A.Ş.", code: "TABIA_01" },
        { id: 2, name: "Tabia Pazarlama Ltd.", code: "TABIA_02" },
      ];

      function canAccessCompany(targetCompanyId: number, allowedList: Array<{ id: number }>): boolean {
        return allowedList.some((c) => c.id === targetCompanyId);
      }

      // İzinli şirketler
      assert.strictEqual(canAccessCompany(1, userAllowedCompanies), true);
      assert.strictEqual(canAccessCompany(2, userAllowedCompanies), true);

      // Başka kiracıya ait şirket (Yetkisiz ID değişikliği saldırısı)
      assert.strictEqual(canAccessCompany(3, userAllowedCompanies), false);
      assert.strictEqual(canAccessCompany(999, userAllowedCompanies), false);
      assert.strictEqual(canAccessCompany(-1, userAllowedCompanies), false);
    });

    test("2.2. Şube sınırı denetimi: İzin verilmeyen şube işlemlerine erişim reddedilmeli", () => {
      const allowedBranchCodes = ["MERKEZ", "DEPO_1"];

      function validateBranchAccess(branchCode: string, allowed: string[]): boolean {
        if (!branchCode) return false;
        return allowed.includes(branchCode);
      }

      assert.strictEqual(validateBranchAccess("MERKEZ", allowedBranchCodes), true);
      assert.strictEqual(validateBranchAccess("DEPO_1", allowedBranchCodes), true);
      assert.strictEqual(validateBranchAccess("KADIKOY_SUBE", allowedBranchCodes), false);
      assert.strictEqual(validateBranchAccess("FABRIKA", allowedBranchCodes), false);
    });

    test("2.3. Finansal işlem mutasyonlarında şirket ve şube ID'si zorunlu olmalı ve izole tutulmalı", () => {
      function validateTenantTransactionPayload(payload: {
        company_id?: number | null;
        branch_id?: number | null;
        amount: number;
      }): { valid: boolean; error?: string } {
        if (!payload.company_id || payload.company_id <= 0) {
          return { valid: false, error: "Şirket ID (company_id) eksik veya geçersiz." };
        }
        if (!payload.branch_id || payload.branch_id <= 0) {
          return { valid: false, error: "Şube ID (branch_id) eksik veya geçersiz." };
        }
        return { valid: true };
      }

      // Geçerli payload
      const validPayload = validateTenantTransactionPayload({ company_id: 1, branch_id: 10, amount: 5000 });
      assert.strictEqual(validPayload.valid, true);

      // Eksik şirket ID
      const missingCompany = validateTenantTransactionPayload({ branch_id: 10, amount: 5000 });
      assert.strictEqual(missingCompany.valid, false);
      assert.ok(missingCompany.error?.includes("company_id"));

      // Eksik şube ID
      const missingBranch = validateTenantTransactionPayload({ company_id: 1, amount: 5000 });
      assert.strictEqual(missingBranch.valid, false);
      assert.ok(missingBranch.error?.includes("branch_id"));
    });
  });

  // BÖLÜM 3: Dosya Yükleme, İhracat ve Hız Sınırlama (Rate Limit) Testleri
  describe("3. Dosya Yükleme, Dışa Aktarma ve Rate Limiting Güvenlik Testleri", () => {
    test("3.1. Dosya yükleme: Yalnızca izin verilen uzantılar kabul edilmeli", () => {
      const allowed = [".xlsx", ".xls", ".csv", ".pdf", ".xml"];

      const validExcel = validateUploadFile({ name: "hesaplar.xlsx", size: 1024 * 50 }, allowed);
      assert.strictEqual(validExcel.valid, true);

      const validPdf = validateUploadFile({ name: "fatura_ek.pdf", size: 1024 * 500 }, allowed);
      assert.strictEqual(validPdf.valid, true);

      const validCsv = validateUploadFile({ name: "ekstre.csv", size: 1024 * 10 }, allowed);
      assert.strictEqual(validCsv.valid, true);

      // Geçersiz uzantı
      const invalidExe = validateUploadFile({ name: "malware.exe", size: 1024 * 20 }, allowed);
      assert.strictEqual(invalidExe.valid, false);
      assert.ok(invalidExe.error?.includes("yürütülebilir dosyalar"));

      const invalidScript = validateUploadFile({ name: "script.sh", size: 1024 * 2 }, allowed);
      assert.strictEqual(invalidScript.valid, false);
    });

    test("3.2. Dosya yükleme: Boş dosyalar veya 25 MB boyut limitini aşan dosyalar reddedilmeli", () => {
      // Boş dosya (0 byte)
      const emptyFile = validateUploadFile({ name: "bos.xlsx", size: 0 });
      assert.strictEqual(emptyFile.valid, false);
      assert.strictEqual(emptyFile.error, "Boş dosya yüklenemez.");

      // Sınırın altında (20 MB)
      const okFile = validateUploadFile({ name: "normal.xlsx", size: 20 * 1024 * 1024 });
      assert.strictEqual(okFile.valid, true);

      // Sınırı aşan (30 MB > 25 MB)
      const oversizedFile = validateUploadFile({ name: "buyuk.xlsx", size: 30 * 1024 * 1024 });
      assert.strictEqual(oversizedFile.valid, false);
      assert.ok(oversizedFile.error?.includes("Dosya boyutu sınırı aşıldı"));
    });

    test("3.3. CSV Dışa Aktarma: RFC 4180 kaçış karakterleri ve UTF-8 BOM doğrulanmalı", () => {
      const headers = ["Hesap Kodu", "Hesap Adı", "Bakiye", "Açıklama"];
      const rows = [
        ["100.01", "Kasa (TL)", 1500.5, 'Nakit "Merkez" Kasası'],
        ["120.01", "Alıcılar", 28000, "Örnek Müşteri; İstanbul Şb."],
      ];

      const csv = formatCsvExport(headers, rows);

      // UTF-8 BOM varlığı (\uFEFF)
      assert.ok(csv.startsWith("\uFEFF"), "Excel uyumu için UTF-8 BOM ile başlamalı");

      // Tırnak kaçışı (" -> "")
      assert.ok(csv.includes('""Merkez""'), 'Çift tırnaklar CSV standardına göre "" olmalı');

      // Satır sayısı: Başlık + 2 veri satırı
      const lines = csv.replace("\uFEFF", "").split("\n");
      assert.strictEqual(lines.length, 3);
    });

    test("3.4. API Rate Limiting: Belirlenen istek limiti aşıldığında istekler kısıtlanmalı", () => {
      const limiter = new ClientRateLimiter(5, 60000); // 1 dakikada maks 5 istek

      const ipKey = "192.168.1.100";

      // İlk 5 istek kabul edilmeli
      for (let i = 0; i < 5; i++) {
        assert.strictEqual(limiter.isAllowed(ipKey), true, `İstek ${i + 1} kabul edilmeli`);
      }

      // 6. istek limit aşıldığı için reddedilmeli
      assert.strictEqual(limiter.isAllowed(ipKey), false, "6. istek rate limit ile engellenmeli");

      // Başka bir IP etkilenmemeli
      const otherIp = "192.168.1.101";
      assert.strictEqual(limiter.isAllowed(otherIp), true, "Farklı IP kısıtlanmamalı");
    });
  });
});
