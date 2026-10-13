import { test, describe } from "node:test";
import assert from "node:assert";
import { YevmiyeController } from "../server/controllers/yevmiye.controller";

describe("Yevmiye Controller & Prisma Çift Kayıt Kuralı Testleri", () => {
  test("1. Dengesiz Fiş (Borç !== Alacak) kesinlikle 422 ile reddedilmeli", async () => {
    let responseStatus = 0;
    let responseJson: any = null;

    const mockReq: any = {
      body: {
        fisNo: "YEV-TEST-001",
        tarih: "2026-10-09",
        aciklama: "Dengesiz çivi satış mahsubu",
        satirlar: [
          {
            satirNo: 1,
            hesapKodu: "120.01",
            aciklama: "Alıcılar",
            borc: 15000.0,
            alacak: 0,
          },
          {
            satirNo: 2,
            hesapKodu: "600.01",
            aciklama: "Yurtiçi Satışlar",
            borc: 0,
            alacak: 14500.0, // 500 TL eksik!
          },
        ],
      },
      user: { id: 1 },
      ip: "127.0.0.1",
      headers: {},
    };

    const mockRes: any = {
      status(code: number) {
        responseStatus = code;
        return this;
      },
      json(data: any) {
        responseJson = data;
        return this;
      },
    };

    await YevmiyeController.create(mockReq, mockRes);

    assert.strictEqual(responseStatus, 422);
    assert.strictEqual(responseJson?.success, false);
    assert.strictEqual(responseJson?.error, "VUK/TMS Çift Kayıt İlkesi İhlali");
  });

  test("2. Hatalı Zod girdisi (satır sayısı < 2 veya negatif tutar) 400 dönmeli", async () => {
    let responseStatus = 0;
    let responseJson: any = null;

    const mockReq: any = {
      body: {
        fisNo: "YEV-TEST-002",
        tarih: "2026-10-09",
        aciklama: "Eksik satırlı fiş",
        satirlar: [
          {
            satirNo: 1,
            hesapKodu: "100",
            aciklama: "Kasa",
            borc: -500, // Negatif tutar geçersiz
            alacak: 0,
          },
        ],
      },
      user: { id: 1 },
      ip: "127.0.0.1",
      headers: {},
    };

    const mockRes: any = {
      status(code: number) {
        responseStatus = code;
        return this;
      },
      json(data: any) {
        responseJson = data;
        return this;
      },
    };

    await YevmiyeController.create(mockReq, mockRes);

    assert.strictEqual(responseStatus, 400);
    assert.strictEqual(responseJson?.success, false);
    assert.strictEqual(responseJson?.error, "Girdi doğrulama hatası");
  });

  test("3. Geçersiz ID ile getById çağrısı 400 dönmeli", async () => {
    let responseStatus = 0;
    const mockReq: any = { params: { id: "gecersiz-id" } };
    const mockRes: any = {
      status(code: number) {
        responseStatus = code;
        return this;
      },
      json() {
        return this;
      },
    };

    await YevmiyeController.getById(mockReq, mockRes);
    assert.strictEqual(responseStatus, 400);
  });
});
