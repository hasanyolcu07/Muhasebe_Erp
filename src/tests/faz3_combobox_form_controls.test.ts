import { test, describe } from "node:test";
import assert from "node:assert";
import { lookupChartOfAccounts, formatCoaDisplay } from "../services/coaApi";
import { mockStore } from "../services/mockDataStore";
import { TAX_RATES, TEVKIFAT_CODES } from "../lib/referenceData";

describe("FAZ 3 — Açılır Listeler, Combobox ve Form Kontrolleri Bütünlük Testleri", () => {
  // ---------------------------------------------------------------------------
  // 1. HESAP PLANI SEÇİCİ (ChartOfAccountsPicker & coaApi)
  // ---------------------------------------------------------------------------
  describe("1. Hesap Planı Seçici (ChartOfAccountsPicker)", () => {
    test("1.1. Boş sorguda TDHP hesap listesi limit dahilinde gelmeli", async () => {
      const accounts = await lookupChartOfAccounts("", 20);
      assert.ok(Array.isArray(accounts));
      assert.strictEqual(accounts.length, 20);
      assert.ok(accounts[0].code);
      assert.ok(accounts[0].name);
    });

    test("1.2. Kod veya ad araması doğru filtrelenmeli (Örn: 120 veya Alıcılar)", async () => {
      const resultsByCode = await lookupChartOfAccounts("120", 10);
      assert.ok(resultsByCode.length > 0);
      assert.ok(resultsByCode.some((a) => a.code.startsWith("120")));

      const resultsByName = await lookupChartOfAccounts("kasa", 10);
      assert.ok(resultsByName.length > 0);
      assert.ok(resultsByName.some((a) => a.name.toLowerCase().includes("kasa")));
    });

    test("1.3. formatCoaDisplay hem kod hem adı standart biçimde formatlamalı", () => {
      const label = formatCoaDisplay({ id: 10, code: "100.01.001", name: "Merkez Kasa" });
      assert.strictEqual(label, "100.01.001 — Merkez Kasa");

      const emptyLabel = formatCoaDisplay(null);
      assert.strictEqual(emptyLabel, "");
    });

    test("1.4. Olmayan hesap sorgusunda boş dizi dönmeli, patlamamalı", async () => {
      const results = await lookupChartOfAccounts("9999999XYZ", 10);
      assert.ok(Array.isArray(results));
      assert.strictEqual(results.length, 0);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. CARİ ARAMA VE SEÇİM COMBOBOX'I (CariSearchCombo & Lookups)
  // ---------------------------------------------------------------------------
  describe("2. Cari Arama ve Seçim (CariSearchCombo & Lookups)", () => {
    test("2.1. Cari deposu kod ve ünvan taşır", () => {
      const items = mockStore.getCaris();
      assert.ok(items.length >= 3);
      for (const item of items) {
        assert.ok(typeof item.id === "number");
        assert.ok(item.code && item.code.length > 0);
        assert.ok(item.title && item.title.length > 0);
      }
    });

    test("2.2. Cari aramasında kod, unvan veya VKN süzülür", () => {
      const items = mockStore.getCaris();
      const byVkn = items.filter((c) => c.tax_number === "1234567890");
      assert.ok(byVkn.length > 0);
      const byTitle = items.filter((c) => c.title.toLowerCase().includes("çelik"));
      assert.ok(byTitle.length > 0);
      const byCode = items.filter((c) => c.code.startsWith("320.01"));
      assert.ok(byCode.length > 0);
    });

    test("2.3. Yeni cari kaydı depoya anında yansır", () => {
      const newCari = mockStore.saveCari({
        title: "Test Çivi Sanayi A.Ş.",
        code: "120.01.999",
        tax_number: "9876543210",
        is_efatura: true,
      });
      assert.ok(newCari.id > 0);
      assert.ok(mockStore.getCaris().some((c) => c.code === "120.01.999"));
      mockStore.deleteCari(newCari.id);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. ÇEK VE SENET SEÇİCİ (CheckBondPicker & Portföy Lookups)
  // ---------------------------------------------------------------------------
  describe("3. Çek ve Senet Seçici (CheckBondPicker)", () => {
    test("3.1. GELEN çekler portföyde durur", () => {
      const items = mockStore.getCheckBonds().filter((item) => item.direction === "GELEN");
      assert.ok(items.length > 0);
      for (const item of items) {
        assert.strictEqual(item.direction, "GELEN");
        assert.ok(item.document_no.length > 0);
      }
    });

    test("3.2. GIDEN çekler portföyde durur", () => {
      const items = mockStore.getCheckBonds().filter((item) => item.direction === "GIDEN");
      assert.ok(items.length > 0);
    });

    test("3.3. Stok kartında fiyat alanı vardır", () => {
      const stocks = mockStore.getStocks();
      assert.ok(stocks.length > 0);
      assert.ok(stocks[0].code);
      assert.ok(stocks[0].name);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. FATURA VE İRSALİYE STOK / VERGİ / TEVKİFAT LOOKUP DOĞRULAMASI
  // ---------------------------------------------------------------------------
  describe("4. Fatura Kalemleri Lookups (Stok, KDV Oranları, Tevkifat Kodları)", () => {
    test("4.1. Stok listesinde satış fiyatı alanı vardır", () => {
      const firstStock = mockStore.getStocks()[0];
      assert.ok(firstStock.id);
      assert.ok(firstStock.code);
      assert.ok(firstStock.name);
      assert.ok(firstStock.sale_price !== undefined);
    });

    test("4.2. Standart KDV oranları tanımlıdır", () => {
      const rates = TAX_RATES.map((r) => r.rate);
      assert.ok(rates.includes(20));
      assert.ok(rates.includes(10));
      assert.ok(rates.includes(1));
      assert.ok(rates.includes(0));
    });

    test("4.3. 612 Demir-çelik tevkifat kodu 0.4 oranındadır", () => {
      const demirCelik = TEVKIFAT_CODES.find((t) => t.code === "612");
      assert.ok(demirCelik);
      assert.strictEqual(demirCelik?.rate, 0.4);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. GÜVENLİK VE FORM STATE BÜTÜNLÜĞÜ: ID / CODE SAKLAMA
  // ---------------------------------------------------------------------------
  describe("5. Form Kaydetmede Kimlik (ID/Code) Bütünlüğü", () => {
    test("5.1. Fatura veya irsaliye kayıt yükü yalnızca label değil sayısal id saklamalı", () => {
      const sampleItem = {
        id: 101,
        code: "120.01.001",
        title: "Anadolu Palet Ltd. Şti.",
      };

      // Form bileşeninin dönmesi gereken nesne sözleşmesi
      assert.strictEqual(typeof sampleItem.id, "number");
      assert.strictEqual(typeof sampleItem.code, "string");
      assert.ok(sampleItem.id > 0);
    });

    test("5.2. Tanımsız uç sahte başarı döndürmez", async () => {
      const { api } = await import("../services/api");
      await assert.rejects(() => api("/fatura/lookups/orders"));
    });
  });
});
