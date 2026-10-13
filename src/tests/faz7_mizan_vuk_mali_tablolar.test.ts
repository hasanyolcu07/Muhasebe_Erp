import { test, describe } from "node:test";
import assert from "node:assert";
import {
  computeMizan,
  computeMuavin,
  computeBilanco,
  computeGelirTablosu,
  computeNakitAkis,
  computeYonetimKarZarar,
  getAiMaliTabloAnalysis,
} from "../modules/yevmiye/services/maliTabloEngine";
import { mockStore } from "../services/mockDataStore";
import { toDecimal, roundMoney } from "../lib/financialMath";

describe("FAZ 7 — Mizan ve VUK Mali Tabloları Kabul Testleri", () => {
  // ---------------------------------------------------------------------------
  // 1. GENEL MİZAN VE DENGELİ FİŞ ETKİSİ
  // ---------------------------------------------------------------------------
  describe("1. Genel Mizan ve Çift Kayıt Bütünlüğü (VUK / TDHP)", () => {
    test("1.1. Genel Mizan gerçek yevmiye fişlerinden dinamik üretilmeli ve Borç = Alacak denk olmalı", () => {
      const res = computeMizan("genel-mizan", { status: "POSTED" });

      assert.strictEqual(res.meta.report_key, "genel-mizan");
      assert.strictEqual(res.meta.is_official_vuk, true);
      assert.ok(res.rows.length > 0, "Mizan en az 1 hesap satırı içermeli");

      // Mizan toplam borç ve alacak hareketlerinin tam eşitliği
      const totalDebitCard = res.meta.kpi_cards.find((k) => k.key === "total_debit");
      const totalCreditCard = res.meta.kpi_cards.find((k) => k.key === "total_credit");
      assert.ok(totalDebitCard && totalCreditCard);
      assert.strictEqual(
        totalDebitCard.value,
        totalCreditCard.value,
        "Mizan toplam borç ve alacak kuruşu kuruşuna eşit olmalı"
      );

      assert.strictEqual(res.meta.is_balanced, true);
      assert.strictEqual(res.meta.imbalance_amount, 0);

      // Borç bakiyeler toplamı = Alacak bakiyeler toplamı
      let sumDebitBal = toDecimal(0);
      let sumCreditBal = toDecimal(0);
      for (const row of res.rows as any[]) {
        sumDebitBal = sumDebitBal.plus(toDecimal(row.debit_balance));
        sumCreditBal = sumCreditBal.plus(toDecimal(row.credit_balance));
      }
      assert.strictEqual(
        roundMoney(sumDebitBal).toNumber(),
        roundMoney(sumCreditBal).toNumber(),
        "Mizan borç bakiyeler toplamı alacak bakiyeler toplamına eşit olmalı"
      );
    });

    test("1.2. Yeni dengeli yevmiye fişi eklendiğinde mizana anında yansımalı ve denklik bozulmamalı", () => {
      const initial = computeMizan("genel-mizan", { status: "POSTED" });
      const initialTotalDebit = Number(
        initial.meta.kpi_cards.find((k) => k.key === "total_debit")?.value || 0
      );

      // Yeni dengeli fiş ekle: 100 Kasa Borç 25.000 TL, 120 Alıcılar Alacak 25.000 TL
      const newVoucher = {
        voucher_no: "YEV-TEST-FAZ7-01",
        voucher_date: "2026-03-15",
        description: "FAZ 7 Test Tahsilat Fişi",
        lines: [
          { line_no: 1, coa_code: "100.01", coa_name: "Merkez Kasa", debit: 25000, credit: 0 },
          { line_no: 2, coa_code: "120.01", coa_name: "Alıcılar", debit: 0, credit: 25000 },
        ],
      };
      const created = mockStore.saveVoucher(newVoucher);
      assert.ok(created.id);

      try {
        const after = computeMizan("genel-mizan", { status: "POSTED" });
        const afterTotalDebit = Number(
          after.meta.kpi_cards.find((k) => k.key === "total_debit")?.value || 0
        );

        assert.strictEqual(
          afterTotalDebit,
          initialTotalDebit + 25000,
          "Mizan borç toplamı 25.000 TL artmalı"
        );
        assert.strictEqual(after.meta.is_balanced, true);
        assert.strictEqual(after.meta.imbalance_amount, 0);
      } finally {
        // Test fişini temizle
        mockStore.deleteVoucher(created.id);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 2. TARİH FİLTRESİ VE AÇILIŞ/DEVİR BAKİYESİ MANTIĞI
  // ---------------------------------------------------------------------------
  describe("2. Tarih Filtresi ve İki Tarih Arası Devir Mantığı", () => {
    test("2.1. Başlangıç tarihinden önceki hareketler 'Devir Borç/Alacak' sütunlarına ayrılmalı", () => {
      // 2026-01-10 sonrasını sorgula (2026-01-02 açılış fişi devire gitmeli)
      const res = computeMizan("iki-tarih-mizan", {
        date_from: "2026-01-10",
        date_to: "2026-12-31",
      });

      const kasaRow = (res.rows as any[]).find((r) => r.code === "100.01");
      assert.ok(kasaRow, "100.01 kasa hesabı bulunmalı");
      // Açılış fişinde 50.000 TL kasa borç kaydı vardı (2026-01-02 < 2026-01-10)
      assert.strictEqual(
        kasaRow.opening_debit,
        50000,
        "2026-01-10 öncesi hareket devir borcuna yazılmalı"
      );
      assert.strictEqual(kasaRow.opening_credit, 0);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. KESİN MİZAN VE GELİR/GİDER HESAPLARININ KAPANMA DAVRANIŞI
  // ---------------------------------------------------------------------------
  describe("3. Kesin Mizan ve Dönem Kapanış Kuralları", () => {
    test("3.1. Kesin Mizanda yalnızca 1-5 Bilanço hesapları yer almalı, 6'lı gelir/gider hesapları bakiye vermemeli", () => {
      const res = computeMizan("kesin-mizan", { status: "POSTED" });

      assert.strictEqual(res.meta.report_key, "kesin-mizan");
      assert.ok(res.rows.length > 0);

      // Kesin mizanda hiçbir 6'lı veya 7'li hesap satırı yer almamalıdır
      const hasIncomeAccounts = (res.rows as any[]).some(
        (r) => r.code.startsWith("6") || r.code.startsWith("7")
      );
      assert.strictEqual(
        hasIncomeAccounts,
        false,
        "Kesin mizanda 6 ve 7 ile başlayan hesaplar kesinlikle yer alamaz"
      );

      // Sadece 1-5 hesapları yer almalı
      const allBalanceSheet = (res.rows as any[]).every((r) =>
        ["1", "2", "3", "4", "5"].some((p) => r.code.startsWith(p))
      );
      assert.strictEqual(allBalanceSheet, true, "Yalnızca 1-5 Bilanço hesapları yer almalıdır");
    });
  });

  // ---------------------------------------------------------------------------
  // 4. BİLANÇO: AKTİF = PASİF + ÖZ KAYNAK VE EŞİTLİK DENETİMİ
  // ---------------------------------------------------------------------------
  describe("4. Bilanço Aktif/Pasif Denklik Kontrolü (VUK Resmî)", () => {
    test("4.1. Bilanço Aktif Toplamı ile Pasif + Öz Kaynaklar kuruşu kuruşuna denk olmalı", () => {
      const bilanco = computeBilanco({ status: "POSTED" });

      assert.strictEqual(bilanco.meta.report_key, "bilanco");
      assert.strictEqual(bilanco.meta.is_official_vuk, true);

      const assets = Number(
        bilanco.meta.kpi_cards.find((k) => k.key === "total_assets")?.value || 0
      );
      const liabilitiesEquity = Number(
        bilanco.meta.kpi_cards.find((k) => k.key === "total_liabilities_equity")?.value || 0
      );

      assert.ok(assets > 0, "Aktif toplamı sıfırdan büyük olmalı");
      assert.strictEqual(
        assets,
        liabilitiesEquity,
        "Bilanço Aktif toplamı Pasif + Öz Kaynak toplamına eşit olmalı"
      );
      assert.strictEqual(bilanco.meta.is_balanced, true);
      assert.strictEqual(bilanco.meta.imbalance_amount, 0);
    });

    test("4.2. Dengesiz fiş varsa Bilanço hatayı gizlemeden açıkça bildirmeli (is_balanced: false)", () => {
      // Dengesiz taslak fiş ekle (Borç 10.000, Alacak 0)
      const unbalanced = {
        voucher_no: "YEV-DENGESIZ-TEST",
        voucher_date: "2026-03-20",
        description: "Bilinçli Dengesiz Fiş Testi",
        status: "DRAFT",
        allow_unbalanced: true,
        lines: [
          { line_no: 1, coa_code: "100.01", coa_name: "Merkez Kasa", debit: 10000, credit: 0 },
        ],
      };
      const created = mockStore.saveVoucher(unbalanced);

      try {
        const bilanco = computeBilanco({ status: "ALL" });
        assert.strictEqual(
          bilanco.meta.is_balanced,
          false,
          "Dengesiz fiş varken bilanço denk kabul edilemez"
        );
        assert.strictEqual(bilanco.meta.imbalance_amount, 10000);
      } finally {
        mockStore.deleteVoucher(created.id);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 5. GELİR TABLOSU VE DÖNEM NET KÂRI
  // ---------------------------------------------------------------------------
  describe("5. Gelir Tablosu VUK Hiyerarşisi ve Kâr Hesaplaması", () => {
    test("5.1. Gelir tablosu Brüt Satışlar (600), Net Satışlar ve Faaliyet Kârını doğru hesaplamalı", () => {
      const res = computeGelirTablosu({ status: "POSTED" });

      assert.strictEqual(res.meta.report_key, "gelir-tablosu");
      assert.strictEqual(res.meta.is_official_vuk, true);

      const netSales = Number(res.meta.kpi_cards.find((k) => k.key === "net_sales")?.value || 0);
      const grossProfit = Number(
        res.meta.kpi_cards.find((k) => k.key === "gross_profit")?.value || 0
      );
      const netProfit = Number(res.meta.kpi_cards.find((k) => k.key === "net_profit")?.value || 0);

      assert.ok(netSales >= 60000, "Mevcut yevmiye kayıtlarında en az 60.000 TL satış olmalı");
      assert.strictEqual(grossProfit, netSales, "Maliyet kaydı yoksa brüt kâr net satışa eşit olmalı");
      assert.ok(netProfit > 0, "Dönem net kârı pozitif hesaplanmalı");
    });
  });

  // ---------------------------------------------------------------------------
  // 6. VUK RESMÎ RAPORLAR İLE YÖNETİM RAPORLARININ AYRIMI
  // ---------------------------------------------------------------------------
  describe("6. Resmî VUK Mali Tabloları ile Yönetim Raporlarının Net Ayrımı", () => {
    test("6.1. Bilanço ve Gelir Tablosu 'is_official_vuk: true', Nakit Akış ve Kâr-Zarar 'is_official_vuk: false' olmalı", () => {
      const bilanco = computeBilanco();
      const gelir = computeGelirTablosu();
      const nakit = computeNakitAkis();
      const yonetimPnl = computeYonetimKarZarar();

      // VUK Resmî
      assert.strictEqual(bilanco.meta.is_official_vuk, true);
      assert.strictEqual(gelir.meta.is_official_vuk, true);

      // Yönetim (Resmî Değil)
      assert.strictEqual(nakit.meta.is_official_vuk, false);
      assert.ok(nakit.meta.subtitle?.includes("YÖNETİM RAPORUDUR"));
      assert.strictEqual(yonetimPnl.meta.is_official_vuk, false);
      assert.ok(yonetimPnl.meta.subtitle?.includes("YÖNETİM RAPORUDUR"));
    });
  });

  // ---------------------------------------------------------------------------
  // 7. MUAVİN DEFTER VE DRILL-DOWN MUTABAKATI
  // ---------------------------------------------------------------------------
  describe("7. Muavin Defter ve Kaynak Yevmiye Mutabakatı", () => {
    test("7.1. 100.01 kasa hesabı muavin ekstresi açılış fişini ve bakiye yönünü doğru göstermeli", () => {
      const res = computeMuavin({ account_code: "100.01", status: "POSTED" });

      assert.strictEqual(res.meta.report_key, "muavin");
      assert.ok(res.rows.length >= 1);

      const firstLine = res.rows[0] as any;
      assert.strictEqual(firstLine.code, "100.01");
      assert.ok(firstLine.debit > 0);
      assert.strictEqual(firstLine.balance_type, "BORÇ");
      assert.ok(firstLine.voucher_no);
    });
  });

  // ---------------------------------------------------------------------------
  // 8. AI MALİ TABLO YORUMU GÜVENLİK VE GERÇEK VERİ İLKESİ
  // ---------------------------------------------------------------------------
  describe("8. AI Mali Tablo Analizi Güvenliği (Kural 8 & 9)", () => {
    test("8.1. AI analizi sadece gerçek Bilanço ve Gelir tablosundan türetilmeli, sahte/örnek veri kullanmamalı", () => {
      const aiRes = getAiMaliTabloAnalysis("bilanco", { status: "POSTED" });

      assert.ok(aiRes.analysis_text.includes("Toplam Aktif Büyüklüğü"));
      assert.ok(aiRes.financial_ratios.length >= 4);

      // Oranlarda Brüt Kâr Marjı ve Çalışma Sermayesi yer almalı
      const marginRatio = aiRes.financial_ratios.find((r) => r.name.includes("Brüt Kâr"));
      assert.ok(marginRatio);
      assert.ok(marginRatio.value.includes("%"));

      // Servis durumu şeffaf gösterilmeli
      assert.ok(aiRes.service_status.includes("Motoru"));
      assert.strictEqual(aiRes.is_ai_live, false); // Dış LLM çağrısı olmadan deterministic motor devrede
    });
  });
});
