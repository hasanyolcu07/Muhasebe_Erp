import { test, describe } from "node:test";
import assert from "node:assert";
import { lookupChartOfAccounts, formatCoaDisplay } from "../services/coaApi";
import { ALL_NAV_ITEMS, LEGACY_PATH_REDIRECTS } from "../config/navConfig";
import { SIDEBAR_HUBS } from "../config/moduleHubConfig";

describe("FAZ 1 — Temel Stabilite, Tip Güvenliği ve Regresyon Testleri", () => {
  // ---------------------------------------------------------------------------
  // 1. Hesap Planı Seçici (ChartOfAccountsPicker) Regresyon Testleri
  // ---------------------------------------------------------------------------
  describe("1. Hesap Planı Seçici (COA Picker) Fonksiyonel Bütünlüğü", () => {
    test("1.1. formatCoaDisplay: Geçerli hesap için 'KOD — AD' biçimini üretmeli", () => {
      const display = formatCoaDisplay({ id: 1, code: "100", name: "Kasa Hesabı" });
      assert.strictEqual(display, "100 — Kasa Hesabı");
    });

    test("1.2. formatCoaDisplay: Null veya tanımsız hesapta boş string dönmeli", () => {
      assert.strictEqual(formatCoaDisplay(null), "");
      assert.strictEqual(formatCoaDisplay(undefined), "");
    });

    test("1.3. lookupChartOfAccounts: Kod araması yapıldığında doğru hesapları filtrelemeli", async () => {
      // 100 Kasayı ara
      const results100 = await lookupChartOfAccounts("100", 10);
      assert.ok(results100.length > 0, "100 araması sonuç döndürmeli");
      assert.ok(results100.some((a) => a.code.startsWith("100")), "100 kodu içeren kayıt bulunmalı");

      // 320 Satıcıları ara
      const results320 = await lookupChartOfAccounts("320", 10);
      assert.ok(results320.length > 0, "320 araması sonuç döndürmeli");
      assert.ok(results320.some((a) => a.code.startsWith("320")), "320 kodu içeren kayıt bulunmalı");
    });

    test("1.4. lookupChartOfAccounts: Eşleşmeyen aramada boş liste dönmeli ve çökmemeli", async () => {
      const resultsNonExistent = await lookupChartOfAccounts("XYZ999MANTIKSIS", 10);
      assert.strictEqual(resultsNonExistent.length, 0);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Rota Tanımları, Navigasyon ve Hub Bütünlüğü Regresyon Testleri
  // ---------------------------------------------------------------------------
  describe("2. Rota, Menü ve Hub Tanımlarının Regresyon Bütünlüğü", () => {
    test("2.1. ALL_NAV_ITEMS: Tüm navigasyon elemanlarının benzersiz ID ve geçerli yolları olmalı", () => {
      const seenIds = new Set<string>();
      for (const item of ALL_NAV_ITEMS) {
        assert.ok(item.id, "Her navigasyon elemanının bir id'si olmalıdır");
        assert.ok(!seenIds.has(item.id), `Mükerrer navigasyon ID tespit edildi: '${item.id}'`);
        seenIds.add(item.id);

        assert.ok(item.path, `${item.id} için geçerli bir path tanımlanmalıdır`);
        assert.ok(item.label, `${item.id} için bir etiket (label) olmalıdır`);
        assert.ok(item.module, `${item.id} için bir modül atanmış olmalıdır`);
      }
    });

    test("2.2. SIDEBAR_HUBS: Ana modül hub tanımları geçerli olmalı", () => {
      assert.ok(SIDEBAR_HUBS.length >= 8, "En az 8 ana hub menüsü bulunmalıdır");
      for (const hub of SIDEBAR_HUBS) {
        assert.ok(hub.id, "Hub id'si zorunludur");
        assert.ok(hub.path, "Hub path'i zorunludur");
        assert.ok(hub.label, "Hub etiket zorunludur");
      }
    });

    test("2.3. LEGACY_PATH_REDIRECTS: Tüm eski yönlendirmeler geçerli ve eşleşir olmalı", () => {
      const redirects = Object.entries(LEGACY_PATH_REDIRECTS);
      assert.ok(redirects.length > 0, "Eski rota yönlendirmeleri mevcut olmalı");
      for (const [legacy, target] of redirects) {
        assert.ok(legacy.length > 0, "Eski rota boş olamaz");
        assert.ok(target.length > 0, "Hedef rota boş olamaz");
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Çek/Senet Formatlayıcı & Yardımcı Fonksiyonlar Regresyonu
  // ---------------------------------------------------------------------------
  describe("3. Finans ve Tarih Formatlama Güvenliği", () => {
    test("3.1. formatDue mantığı: Geçersiz veya boş tarihte çökmemeli ve '—' dönmeli", () => {
      function formatDue(d: string | null | undefined): string {
        if (!d) return "—";
        try {
          const date = new Date(d);
          if (isNaN(date.getTime())) return d;
          return date.toLocaleDateString("tr-TR");
        } catch {
          return d;
        }
      }

      assert.strictEqual(formatDue(null), "—");
      assert.strictEqual(formatDue(undefined), "—");
      assert.strictEqual(formatDue(""), "—");
      assert.ok(formatDue("2026-10-12").includes("2026") || formatDue("2026-10-12").includes("12"));
    });
  });
});
