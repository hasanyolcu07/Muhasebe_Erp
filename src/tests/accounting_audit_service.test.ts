import { test, describe } from "node:test";
import assert from "node:assert";
import { Prisma } from "@prisma/client";
import { YevmiyeService } from "../server/services/yevmiye.service";
import {
  CariService,
  validateTR_IBAN,
  VergiNoZodSchema,
  IbanZodSchema,
  CariKartInputSchema,
} from "../server/services/cari.service";
import { registerAuditMiddleware, runWithAuditContext } from "../server/audit/prismaAuditMiddleware";

describe("Muhasebe Motoru, Denetim İzi (Audit Trail) & Validasyon Testleri", () => {
  // ---------------------------------------------------------------------------
  // 1. YEVMİYE FİŞİ SERVİSİ VE ÇİFT KAYIT VALİDASYONU (TMS / VUK)
  // ---------------------------------------------------------------------------
  describe("1. Yevmiye Fişi Validasyonu (YevmiyeService)", () => {
    test("1.1. Toplam borç !== toplam alacak durumunda kesin hata fırlatmalı", async () => {
      const dengesizFis = {
        fisNo: "YEV-2026-00101",
        tarih: "2026-10-09",
        aciklama: "Dengesiz filmaşin hammadde alış fişi",
        satirlar: [
          {
            satirNo: 1,
            hesapKodu: "150.01.001",
            aciklama: "Filmaşin Demir Hammadde",
            borc: 100000.0,
            alacak: 0,
          },
          {
            satirNo: 2,
            hesapKodu: "320.01.001",
            aciklama: "Tedarikçi A.Ş.",
            borc: 0,
            alacak: 99500.0, // 500 TL eksik!
          },
        ],
      };

      await assert.rejects(
        async () => {
          await YevmiyeService.validateYevmiyeFisi(dengesizFis, null);
        },
        {
          name: "Error",
          message: "Muhasebe kuralı ihlali: Borç ve Alacak toplamları eşit olmalıdır.",
        }
      );
    });

    test("1.2. Geçersiz tarih formatı girildiğinde hata fırlatmalı", async () => {
      const gecersizTarihliFis = {
        fisNo: "YEV-2026-00102",
        tarih: "gecersiz-tarih-2026",
        aciklama: "Geçersiz tarihli yevmiye fişi",
        satirlar: [
          {
            satirNo: 1,
            hesapKodu: "100",
            aciklama: "Kasa",
            borc: 5000,
            alacak: 0,
          },
          {
            satirNo: 2,
            hesapKodu: "600",
            aciklama: "Satış",
            borc: 0,
            alacak: 5000,
          },
        ],
      };

      await assert.rejects(
        async () => {
          await YevmiyeService.validateYevmiyeFisi(gecersizTarihliFis, null);
        },
        /Geçersiz tarih formatı/
      );
    });

    test("1.3. Fiş numarası veritabanında mükerrer ise hata fırlatmalı", async () => {
      // Mock Prisma Client: Belirtilen fiş numarasını bulmuş gibi davranır
      const mockPrisma = {
        yevmiyeKaydi: {
          findUnique: async ({ where }: any) => {
            if (where.fisNo === "YEV-2026-MEVCUT") {
              return { id: 10, fisNo: "YEV-2026-MEVCUT" };
            }
            return null;
          },
        },
      };

      const mukerrerFis = {
        fisNo: "YEV-2026-MEVCUT",
        tarih: "2026-10-09",
        aciklama: "Mükerrer fiş denemesi",
        satirlar: [
          {
            satirNo: 1,
            hesapKodu: "100",
            aciklama: "Kasa",
            borc: 1000,
            alacak: 0,
          },
          {
            satirNo: 2,
            hesapKodu: "120.01",
            aciklama: "Alıcılar",
            borc: 0,
            alacak: 1000,
          },
        ],
      };

      await assert.rejects(
        async () => {
          await YevmiyeService.validateYevmiyeFisi(mukerrerFis, mockPrisma);
        },
        /'YEV-2026-MEVCUT' numaralı yevmiye fişi sistemde zaten mevcuttur/
      );
    });

    test("1.4. Dengeli fiş kuruş hassasiyetinde doğru hesaplanmalı ve onaylanmalı", async () => {
      const dengeliFis = {
        fisNo: "YEV-2026-00104",
        tarih: "2026-10-09T10:30:00Z",
        aciklama: "Çivi mamul üretimi yansıtma kaydı",
        satirlar: [
          {
            satirNo: 1,
            hesapKodu: "152.01.001",
            aciklama: "Palet Çivisi Coil Nails 2.5x60",
            borc: 125430.75,
            alacak: 0,
          },
          {
            satirNo: 2,
            hesapKodu: "710.01.001",
            aciklama: "Direkt İlk Madde ve Malzeme Gideri",
            borc: 0,
            alacak: 125430.75,
          },
        ],
      };

      const result = await YevmiyeService.validateYevmiyeFisi(dengeliFis, null);
      assert.strictEqual(result.isValid, true);
      assert.strictEqual(result.toplamBorc, 125430.75);
      assert.strictEqual(result.toplamAlacak, 125430.75);
      assert.strictEqual(result.satirSayisi, 2);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. CARİ KART SERVİSİ: VKN, TCKN VE IBAN DOĞRULAMASI
  // ---------------------------------------------------------------------------
  describe("2. Cari Kart Validasyonu (CariService & Zod)", () => {
    test("2.1. validateTR_IBAN: Geçerli TR IBAN Mod-97 kuralıyla onaylanmalı", () => {
      // Standart bilinen geçerli test IBAN'ları
      // Format: TR + 2 basamak + 22 basamak = 26 karakter
      // Örnek geçerli IBAN (TCMB test algoritmasına uygun)
      const validIban1 = "TR33 0006 1005 1978 6457 8413 26";
      const validIban2 = "TR520006200000012990000001"; // Garanti test formatı (26 karakter)

      assert.strictEqual(validateTR_IBAN(validIban1), true);
      assert.strictEqual(validateTR_IBAN(validIban2), true);
    });

    test("2.2. validateTR_IBAN: Hatalı kontrol hanesi veya eksik uzunluk reddedilmeli", () => {
      // Kontrol basamağı bozuk
      const corruptIban = "TR33 0006 1005 1978 6457 8413 99";
      assert.strictEqual(validateTR_IBAN(corruptIban), false);

      // Eksik hane (25 hane)
      const shortIban = "TR33000610051978645784132";
      assert.strictEqual(validateTR_IBAN(shortIban), false);

      // Başka ülke kodu
      const deIban = "DE89370400440532013000";
      assert.strictEqual(validateTR_IBAN(deIban), false);
    });

    test("2.3. VergiNoZodSchema: 10 haneli VKN veya 11 haneli TCKN algoritmik ayrımı", () => {
      // 10 haneli geçerli VKN (Modül 10)
      const validVkn = "1234567890";
      const vknResult = VergiNoZodSchema.safeParse(validVkn);
      assert.strictEqual(vknResult.success, true);

      // 11 haneli geçerli TCKN
      const validTckn = "10000000146";
      const tcknResult = VergiNoZodSchema.safeParse(validTckn);
      assert.strictEqual(tcknResult.success, true);

      // Hatalı VKN (rastgele 10 hane)
      const invalidVkn = "1111111111";
      const invalidVknResult = VergiNoZodSchema.safeParse(invalidVkn);
      assert.strictEqual(invalidVknResult.success, false);

      // Sıfır ile başlayan geçersiz TCKN
      const invalidTckn = "01234567890";
      const invalidTcknResult = VergiNoZodSchema.safeParse(invalidTckn);
      assert.strictEqual(invalidTcknResult.success, false);
    });

    test("2.4. CariKartInputSchema: Eksiksiz ve geçerli cari kart onaylanmalı", () => {
      const validCari = {
        kod: "120.01.001",
        ad: "Anadolu Palet ve Ambalaj San. Tic. Ltd. Şti.",
        vergiNo: "1234567890",
        vergiDairesi: "Marmara Kurumlar",
        iban: "TR33 0006 1005 1978 6457 8413 26",
        bakiye: 0,
        telefon: "0212 555 1234",
        eposta: "muhasebe@anadolupalet.com",
        isActive: true,
      };

      const result = CariKartInputSchema.safeParse(validCari);
      assert.strictEqual(result.success, true);
    });

    test("2.5. CariKartInputSchema: Hatalı IBAN ile gelen cari kart reddedilmeli", () => {
      const invalidCari = {
        kod: "320.01.001",
        ad: "Demir Çelik Filmaşin Tedarik Ltd.",
        vergiNo: "1234567890",
        iban: "TR99 0000 0000 0000 0000 0000 99", // Sahte/Geçersiz IBAN
      };

      const result = CariKartInputSchema.safeParse(invalidCari);
      assert.strictEqual(result.success, false);
      const errMsg = (result as any).error?.issues?.[0]?.message || (result as any).error?.errors?.[0]?.message || "";
      assert.ok(errMsg.includes("IBAN"));
    });
  });

  // ---------------------------------------------------------------------------
  // 3. PRISMA DENETİM İZİ (AUDIT LOG) MIDDLEWARE / INTERCEPTOR TESTİ
  // ---------------------------------------------------------------------------
  describe("3. Prisma Audit Log Middleware & Interceptor", () => {
    test("3.1. CariKart create işlemi otomatik AuditLog INSERT kaydı üretmeli", async () => {
      let auditCreated: any = null;
      let nextCalled = false;

      // Mock Prisma Client
      const mockPrisma: any = {
        $use(fn: any) {
          this.middleware = fn;
        },
        auditLog: {
          create: async ({ data }: any) => {
            auditCreated = data;
            return { id: "log-uuid-1", ...data };
          },
        },
      };

      registerAuditMiddleware(mockPrisma);

      // CariKart oluşturma isteğini simüle et
      const params = {
        model: "CariKart",
        action: "create",
        args: {
          data: {
            kod: "120.01.050",
            ad: "Örnek Palet Müşterisi",
            vergiNo: "1234567890",
          },
        },
      };

      const next = async (p: any) => {
        nextCalled = true;
        return { id: 101, ...p.args.data };
      };

      // Asenkron denetim bağlamında (AuditContext) middleware'i çağır
      await runWithAuditContext({ userId: 99, ip: "192.168.1.100" }, async () => {
        await mockPrisma.middleware(params, next);
      });

      assert.strictEqual(nextCalled, true);
      assert.ok(auditCreated, "AuditLog kaydı oluşturulmuş olmalı");
      assert.strictEqual(auditCreated.tabloAdi, "cari_kartlar");
      assert.strictEqual(auditCreated.islemTipi, "INSERT");
      assert.strictEqual(auditCreated.kullaniciId, 99);
      assert.strictEqual(auditCreated.ipAdresi, "192.168.1.100");
      assert.strictEqual(auditCreated.yeniVeri?.kod, "120.01.050");
    });

    test("3.2. YevmiyeKaydi delete işlemi otomatik AuditLog DELETE kaydı üretmeli", async () => {
      let auditCreated: any = null;

      const mockPrisma: any = {
        $use(fn: any) {
          this.middleware = fn;
        },
        yevmiyeKaydi: {
          findUnique: async () => ({
            id: 55,
            fisNo: "YEV-2026-SILINECEK",
            toplamBorc: 25000,
          }),
        },
        auditLog: {
          create: async ({ data }: any) => {
            auditCreated = data;
            return { id: "log-uuid-2", ...data };
          },
        },
      };

      registerAuditMiddleware(mockPrisma);

      const params = {
        model: "YevmiyeKaydi",
        action: "delete",
        args: {
          where: { id: 55 },
        },
      };

      const next = async () => ({ id: 55 });

      await runWithAuditContext({ userId: 7, ip: "10.0.0.5" }, async () => {
        await mockPrisma.middleware(params, next);
      });

      assert.ok(auditCreated, "AuditLog kaydı oluşturulmuş olmalı");
      assert.strictEqual(auditCreated.tabloAdi, "yevmiye_kayitlari");
      assert.strictEqual(auditCreated.islemTipi, "DELETE");
      assert.strictEqual(auditCreated.kullaniciId, 7);
      assert.strictEqual(auditCreated.ipAdresi, "10.0.0.5");
      assert.strictEqual(auditCreated.eskiVeri?.fisNo, "YEV-2026-SILINECEK");
      assert.ok(auditCreated.yeniVeri === null || auditCreated.yeniVeri === Prisma.JsonNull || !auditCreated.yeniVeri);
    });

    test("3.3. AuditLog modelinin kendisi sonsuz döngüye girmeden pas geçilmeli", async () => {
      let auditCreated = false;
      let nextCalled = false;

      const mockPrisma: any = {
        $use(fn: any) {
          this.middleware = fn;
        },
        auditLog: {
          create: async () => {
            auditCreated = true;
          },
        },
      };

      registerAuditMiddleware(mockPrisma);

      const params = {
        model: "AuditLog",
        action: "create",
        args: {},
      };

      const next = async () => {
        nextCalled = true;
        return { id: 1 };
      };

      await mockPrisma.middleware(params, next);

      assert.strictEqual(nextCalled, true);
      assert.strictEqual(auditCreated, false, "AuditLog kendi işleminde yeni log üretmemeli");
    });
  });
});
