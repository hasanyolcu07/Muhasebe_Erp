import { test, describe } from "node:test";
import assert from "node:assert";
import jwt from "jsonwebtoken";
import { AuthController, LoginInputSchema, getPermissionsForRole } from "../server/controllers/auth.controller";
import { authenticate, authorize, type AuthUserPayload } from "../server/middleware/auth.middleware";

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret-key-at-least-32-characters";
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "test-jwt-refresh-secret-key-32-chars-x";
process.env.AUTH_SKIP_DB = "1";
process.env.NODE_ENV = "test";

const TEST_JWT_SECRET = process.env.JWT_SECRET;

describe("Güvenlik ve Kimlik Doğrulama (Auth) Katmanı Testleri", () => {
  // ---------------------------------------------------------------------------
  // 1. Zod Doğrulama ve Giriş Güvenliği
  // ---------------------------------------------------------------------------
  describe("1. Girdi Doğrulama ve Zod Güvenlik Kontrolleri", () => {
    test("1.1. Boş kimlik bilgisi veya boş şifre ile giriş isteği Zod tarafından reddedilmeli", () => {
      const emptyCheck = LoginInputSchema.safeParse({ password: "" });
      assert.strictEqual(emptyCheck.success, false);

      const noUserCheck = LoginInputSchema.safeParse({ password: "SecretPassword1!" });
      assert.strictEqual(noUserCheck.success, false);

      const validCheck = LoginInputSchema.safeParse({
        username: "muhasebe_uzmani",
        password: "GucluSifre2026!",
      });
      assert.strictEqual(validCheck.success, true);
    });

    test("1.2. VKN veya E-posta ile giriş girdi formatı kabul edilmeli", () => {
      const emailCheck = LoginInputSchema.safeParse({
        email: "smmm@tabiaerp.com",
        password: "GucluSifre2026!",
      });
      assert.strictEqual(emailCheck.success, true);

      const vknCheck = LoginInputSchema.safeParse({
        vkn: "1234567890",
        password: "GucluSifre2026!",
      });
      assert.strictEqual(vknCheck.success, true);
    });

    test("1.3. Controller geçersiz girişte HTTP 400 ve hata detayları dönmeli", async () => {
      let status = 0;
      let body: any = null;

      const mockReq: any = {
        body: { password: "" },
        headers: {},
      };
      const mockRes: any = {
        status(code: number) {
          status = code;
          return this;
        },
        json(data: any) {
          body = data;
          return this;
        },
      };

      await AuthController.login(mockReq, mockRes);
      assert.strictEqual(status, 400);
      assert.strictEqual(body?.success, false);
      assert.strictEqual(body?.error, "Girdi doğrulama hatası");
    });
  });

  // ---------------------------------------------------------------------------
  // 2. JWT Üretimi, Refresh Token ve Rol Tabanlı İzinler
  // ---------------------------------------------------------------------------
  describe("2. JWT Token Üretimi, Refresh ve Rol Yetkileri", () => {
    test("2.1. getPermissionsForRole her role uygun granüler yetki matrisi sağlamalı", () => {
      const adminPerms = getPermissionsForRole("ADMIN");
      assert.deepStrictEqual(adminPerms["*"], ["*"]);

      const muhasebePerms = getPermissionsForRole("MUHASEBE_UZMANI");
      assert.ok(muhasebePerms.yevmiye.includes("create"));
      assert.ok(muhasebePerms.cari.includes("view"));
      assert.strictEqual(muhasebePerms.depo, undefined);

      const depoPerms = getPermissionsForRole("DEPO_SORUMLUSU");
      assert.ok(depoPerms.stok.includes("transfer"));
      assert.strictEqual(depoPerms.yevmiye, undefined);
    });

    test("2.2. Sabit geliştirme şifresi ile giriş kapalı olmalı", async () => {
      let status = 0;
      let body: any = null;

      const mockReq: any = {
        body: {
          username: "admin",
          password: "Admin123!",
        },
        headers: {},
        ip: "127.0.0.1",
      };
      const mockRes: any = {
        status(code: number) {
          status = code;
          return this;
        },
        json(data: any) {
          body = data;
          return this;
        },
      };

      await AuthController.login(mockReq, mockRes);

      assert.strictEqual(status, 401);
      assert.strictEqual(body?.success, false);
      assert.strictEqual(body?.error, "Yetkisiz Erişim");
    });

    test("2.3. Hatalı şifre ile giriş kesinlikle 401 Unauthorized dönmeli", async () => {
      let status = 0;
      let body: any = null;

      const mockReq: any = {
        body: {
          username: "admin",
          password: "YanlisParola123!",
        },
        headers: {},
        ip: "127.0.0.1",
      };
      const mockRes: any = {
        status(code: number) {
          status = code;
          return this;
        },
        json(data: any) {
          body = data;
          return this;
        },
      };

      await AuthController.login(mockReq, mockRes);

      assert.strictEqual(status, 401);
      assert.strictEqual(body?.success, false);
      assert.strictEqual(body?.error, "Yetkisiz Erişim");
    });
  });

  // ---------------------------------------------------------------------------
  // 3. auth.middleware.ts — authenticate & authorize Doğrulaması
  // ---------------------------------------------------------------------------
  describe("3. auth.middleware (authenticate & authorize) Güvenlik Doğrulaması", () => {
    test("3.1. Authorization başlığı olmayan istekler authenticate tarafından 401 ile engellenmeli", () => {
      let status = 0;
      let body: any = null;
      let nextCalled = false;

      const mockReq: any = { headers: {} };
      const mockRes: any = {
        status(code: number) {
          status = code;
          return this;
        },
        json(data: any) {
          body = data;
          return this;
        },
      };
      const mockNext = () => {
        nextCalled = true;
      };

      authenticate(mockReq, mockRes, mockNext);

      assert.strictEqual(nextCalled, false);
      assert.strictEqual(status, 401);
      assert.strictEqual(body?.error, "Yetkisiz Erişim");
    });

    test("3.2. Sahte veya bozuk JWT token taşıyan istekler authenticate tarafından 401 ile engellenmeli", () => {
      let status = 0;
      let body: any = null;
      let nextCalled = false;

      const mockReq: any = {
        headers: {
          authorization: "Bearer sahte.ve.gecersiz.token",
        },
      };
      const mockRes: any = {
        status(code: number) {
          status = code;
          return this;
        },
        json(data: any) {
          body = data;
          return this;
        },
      };
      const mockNext = () => {
        nextCalled = true;
      };

      authenticate(mockReq, mockRes, mockNext);

      assert.strictEqual(nextCalled, false);
      assert.strictEqual(status, 401);
      assert.strictEqual(body?.error, "Geçersiz Belirteç");
    });

    test("3.3. Geçerli JWT token ile gelen istek authenticate tarafından onaylanmalı ve req.user atanmalı", () => {
      let nextCalled = false;

      const validPayload: AuthUserPayload = {
        userId: 42,
        id: 42,
        email: "smmm.ahmet@tabiaerp.com",
        username: "smmm_ahmet",
        role: "MUHASEBE_UZMANI",
        fullName: "Ahmet Yılmaz (SMMM)",
      };

      const validToken = jwt.sign(validPayload, TEST_JWT_SECRET, { expiresIn: "1h" });

      const mockReq: any = {
        headers: {
          authorization: `Bearer ${validToken}`,
        },
      };
      const mockRes: any = {};
      const mockNext = () => {
        nextCalled = true;
      };

      authenticate(mockReq, mockRes, mockNext);

      assert.strictEqual(nextCalled, true);
      assert.strictEqual(mockReq.user?.userId, 42);
      assert.strictEqual(mockReq.user?.username, "smmm_ahmet");
      assert.strictEqual(mockReq.user?.role, "MUHASEBE_UZMANI");
    });

    test("3.4. authorize middleware: Yetkili roller (ADMIN veya MUHASEBE_UZMANI) yevmiye kaydı işlemine erişebilmeli", () => {
      let nextCalled = false;
      const middleware = authorize(["ADMIN", "MUHASEBE_UZMANI"]);

      const mockReq: any = {
        user: {
          userId: 10,
          role: "MUHASEBE_UZMANI",
        },
      };
      const mockRes: any = {};
      const mockNext = () => {
        nextCalled = true;
      };

      middleware(mockReq, mockRes, mockNext);
      assert.strictEqual(nextCalled, true, "MUHASEBE_UZMANI yevmiye kaydına erişebilmeli");
    });

    test("3.5. authorize middleware: Yetkisiz rol (DEPO_SORUMLUSU) yevmiye kaydına erişmeye çalıştığında 403 Forbidden almalı", () => {
      let status = 0;
      let body: any = null;
      let nextCalled = false;

      const middleware = authorize(["ADMIN", "MUHASEBE_UZMANI"]);

      const mockReq: any = {
        user: {
          userId: 25,
          role: "DEPO_SORUMLUSU", // Yevmiye yetkisi yok!
        },
      };
      const mockRes: any = {
        status(code: number) {
          status = code;
          return this;
        },
        json(data: any) {
          body = data;
          return this;
        },
      };
      const mockNext = () => {
        nextCalled = true;
      };

      middleware(mockReq, mockRes, mockNext);

      assert.strictEqual(nextCalled, false);
      assert.strictEqual(status, 403);
      assert.strictEqual(body?.error, "Yetersiz Yetki");
      assert.ok(body?.message.includes("Gerekli yetkili roller"));
    });
  });
});
