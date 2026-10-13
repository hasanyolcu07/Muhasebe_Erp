import { test, describe } from "node:test";
import assert from "node:assert";
import { Decimal, roundMoney, calculateInvoiceTotalsExact, validateJournalVoucher, buildIntegratedTransaction } from "../lib/financialMath";
import { lookupChartOfAccounts, formatCoaDisplay } from "../services/coaApi";
import tdhpSeed from "../data/tdhp_seed.json";

describe("FAZ 8 — E2E Muhasebe Akışı, Hesap Planı ve Form Doğrulama Testleri", () => {
  // BÖLÜM 1: Tekdüzen Hesap Planı (TDHP) Standartları ve Arama
  describe("1. Tekdüzen Hesap Planı (TDHP) Yapısı ve Doğrulama", () => {
    test("1.1. TDHP temel ana hesap sınıfları (1..7) eksiksiz mevcut olmalı", () => {
      const coaList = tdhpSeed as Array<{ code: string; name: string }>;
      assert.ok(coaList.length > 100, "TDHP hesap sayısı en az 100 olmalı");

      // Ana sınıfların varlığı
      const classes = ["1", "2", "3", "4", "5", "6", "7"];
      for (const cl of classes) {
        assert.ok(
          coaList.some((item) => item.code === cl),
          `TDHP Sınıf ${cl} hesap planında mevcut olmalı`
        );
      }

      // Standart ana hesaplar: 100 Kasa, 102 Banka, 120 Alıcılar, 320 Satıcılar, 391 Hesaplanan KDV, 600 Satışlar
      const standardCodes = ["100", "102", "120", "320", "391", "600"];
      for (const code of standardCodes) {
        assert.ok(
          coaList.some((item) => item.code === code),
          `TDHP Ana Hesap ${code} mevcut olmalı`
        );
      }
    });

    test("1.2. formatCoaDisplay hesap kodu ve adını doğru formatlamalı", () => {
      assert.strictEqual(
        formatCoaDisplay({ id: 1, code: "100", name: "KASA" }),
        "100 — KASA"
      );
      assert.strictEqual(
        formatCoaDisplay({ id: 2, code: "120.01", name: "ALICILAR (YURTİÇİ)" }),
        "120.01 — ALICILAR (YURTİÇİ)"
      );
      assert.strictEqual(formatCoaDisplay(null), "");
      assert.strictEqual(formatCoaDisplay(undefined), "");
    });

    test("1.3. lookupChartOfAccounts filtreleme ve limit kurallarına uygun çalışmalı", async () => {
      // "KASA" araması
      const kasaAccounts = await lookupChartOfAccounts("KASA", 5);
      assert.ok(kasaAccounts.length > 0);
      assert.ok(kasaAccounts.some((a) => a.code.startsWith("100") || a.name.includes("KASA")));

      // "600" araması
      const satisAccounts = await lookupChartOfAccounts("600", 5);
      assert.ok(satisAccounts.length > 0);
      assert.ok(satisAccounts.some((a) => a.code.startsWith("600")));
    });
  });

  // BÖLÜM 2: Form Hataları ve Doğrulama (Form Validations)
  describe("2. Finansal Form Hataları ve Doğrulama Kuralları", () => {
    test("2.1. Fatura satırında negatif miktar, negatif fiyat veya tanımsız vergi oranı engellenmeli", () => {
      function validateInvoiceLine(line: { qty: number; unit_price: number; tax_rate: number }): string[] {
        const errors: string[] = [];
        if (line.qty <= 0) errors.push("Miktar 0'dan büyük olmalıdır.");
        if (line.unit_price < 0) errors.push("Birim fiyat negatif olamaz.");
        const validTaxRates = [0, 1, 10, 20];
        if (!validTaxRates.includes(line.tax_rate)) {
          errors.push(`Geçersiz KDV oranı: %${line.tax_rate}. Yalnızca %0, %1, %10, %20 kabul edilir.`);
        }
        return errors;
      }

      // Geçerli satır
      const valid = validateInvoiceLine({ qty: 10, unit_price: 150, tax_rate: 20 });
      assert.strictEqual(valid.length, 0);

      // Negatif miktar
      const negQty = validateInvoiceLine({ qty: -5, unit_price: 150, tax_rate: 20 });
      assert.ok(negQty.some((e) => e.includes("Miktar 0'dan büyük olmalıdır")));

      // Negatif birim fiyat
      const negPrice = validateInvoiceLine({ qty: 10, unit_price: -50, tax_rate: 20 });
      assert.ok(negPrice.some((e) => e.includes("Birim fiyat negatif olamaz")));

      // Geçersiz KDV oranı (%18 eski veya rastgele %15)
      const invalidVat = validateInvoiceLine({ qty: 10, unit_price: 150, tax_rate: 15 });
      assert.ok(invalidVat.some((e) => e.includes("Geçersiz KDV oranı")));
    });

    test("2.2. Fiş başlığında zorunlu alanlar (Tarih, Şube, Fiş Türü) boş olamaz", () => {
      function validateVoucherHeader(header: {
        date?: string | null;
        branch_code?: string | null;
        voucher_type?: string | null;
      }): string[] {
        const errors: string[] = [];
        if (!header.date || !/^\d{4}-\d{2}-\d{2}$/.test(header.date)) {
          errors.push("Geçerli bir fiş tarihi (YYYY-AA-GG) zorunludur.");
        }
        if (!header.branch_code || header.branch_code.trim() === "") {
          errors.push("Şube seçimi zorunludur.");
        }
        if (!header.voucher_type || header.voucher_type.trim() === "") {
          errors.push("Fiş türü (MAHSUP, TAHSIL, TEDIYE) zorunludur.");
        }
        return errors;
      }

      const validHeader = validateVoucherHeader({
        date: "2026-10-15",
        branch_code: "MERKEZ",
        voucher_type: "MAHSUP",
      });
      assert.strictEqual(validHeader.length, 0);

      const invalidHeader = validateVoucherHeader({
        date: "gecersiz-tarih",
        branch_code: "",
        voucher_type: null,
      });
      assert.strictEqual(invalidHeader.length, 3);
    });
  });

  // BÖLÜM 3: E2E Entegre Finansal İşlem Akışı (Fatura → Cari → Stok → Yevmiye → Rapor)
  describe("3. E2E: Fatura → Cari → Stok → Muhasebe → Mizan Entegrasyon Akışı", () => {
    test("3.1. Uçtan Uca Satış Faturası ve Otomatik Yevmiye & Stok & Cari Mutabakatı", () => {
      // 1. Fatura hesaplama: 50 adet mamul x 2.000 TL = 100.000 TL Matrah + %20 KDV (20.000 TL) = 120.000 TL
      const invoiceCalculation = calculateInvoiceTotalsExact([
        { qty: 50, unit_price: 2000, tax_rate: 20 },
      ]);

      assert.strictEqual(invoiceCalculation.subtotal, 100000);
      assert.strictEqual(invoiceCalculation.taxTotal, 20000);
      assert.strictEqual(invoiceCalculation.grandTotal, 120000);

      // 2. Entegre Transaction Oluşturma
      const tx = buildIntegratedTransaction({
        invoice_no: "FAT-2026-00000889",
        account_code: "120.01.005",
        account_title: "Anadolu Sanayi ve Ticaret A.Ş.",
        subtotal: invoiceCalculation.subtotal,
        tax_total: invoiceCalculation.taxTotal,
        grand_total: invoiceCalculation.grandTotal,
        direction: "SATIS",
        stock_lines: [{ stock_code: "MAMUL-A", qty: 50, unit_price: 2000 }],
      });

      // 3. Cari Doğrulaması: Müşteriye 120.000 TL Borç kaydı düşmeli
      assert.strictEqual(tx.customerTx.account_code, "120.01.005");
      assert.strictEqual(tx.customerTx.debit, 120000);
      assert.strictEqual(tx.customerTx.credit, 0);

      // 4. Stok Doğrulaması: 50 adet çıkış hareketi
      assert.strictEqual(tx.stockMovements.length, 1);
      assert.strictEqual(tx.stockMovements[0].stock_code, "MAMUL-A");
      assert.strictEqual(tx.stockMovements[0].qty, 50);
      assert.strictEqual(tx.stockMovements[0].direction, "CIKIS");

      // 5. Yevmiye Fişi Dengesi:
      // Borç: 120 Alıcılar (120.000 TL)
      // Alacak: 600 Satışlar (100.000 TL) + 391 KDV (20.000 TL) = 120.000 TL
      assert.strictEqual(tx.journalVoucher.isBalanced, true);
      assert.strictEqual(tx.journalVoucher.totalDebit, 120000);
      assert.strictEqual(tx.journalVoucher.totalCredit, 120000);
      assert.strictEqual(tx.journalVoucher.lines.length, 3);

      // 6. Mizan / Rapor Doğrulaması (Trial Balance Reconciliation)
      let totalMizanBorc = new Decimal(0);
      let totalMizanAlacak = new Decimal(0);

      for (const line of tx.journalVoucher.lines) {
        totalMizanBorc = totalMizanBorc.plus(line.debit);
        totalMizanAlacak = totalMizanAlacak.plus(line.credit);
      }

      assert.strictEqual(totalMizanBorc.toNumber(), 120000);
      assert.strictEqual(totalMizanAlacak.toNumber(), 120000);
      assert.strictEqual(totalMizanBorc.minus(totalMizanAlacak).abs().toNumber(), 0);
    });

    test("3.2. Fatura İptali / İadesi durumunda eksiksiz Ters Kayıt (Reversal) üretilmeli", () => {
      // Orijinal Yevmiye Fişi Satırları
      const originalLines = [
        { coa_code: "120.01.005", debit: 120000, credit: 0, desc: "Fatura Alacağı" },
        { coa_code: "600.01.001", debit: 0, credit: 100000, desc: "Yurtiçi Satış" },
        { coa_code: "391.01.020", debit: 0, credit: 20000, desc: "Hesaplanan KDV" },
      ];

      // Ters kayıt oluşturma: Borç ve Alacak yer değiştirir
      const reversalLines = originalLines.map((l) => ({
        coa_code: l.coa_code,
        debit: l.credit,
        credit: l.debit,
        description: `İPTAL / TERS KAYIT — ${l.desc}`,
      }));

      const reversalVoucher = validateJournalVoucher({
        status: "POSTED",
        voucher_date: "2026-10-16",
        lines: reversalLines,
      });

      assert.strictEqual(reversalVoucher.valid, true);
      assert.strictEqual(reversalVoucher.totalDebit.toNumber(), 120000);
      assert.strictEqual(reversalVoucher.totalCredit.toNumber(), 120000);

      // Kümülatif Net Bakiye Kontrolü: Orijinal + Ters Kayıt = 0 TL
      const netBalances: Record<string, Decimal> = {};
      for (const line of [...originalLines, ...reversalLines]) {
        if (!netBalances[line.coa_code]) netBalances[line.coa_code] = new Decimal(0);
        netBalances[line.coa_code] = netBalances[line.coa_code].plus(line.debit).minus(line.credit);
      }

      for (const [acc, bal] of Object.entries(netBalances)) {
        assert.strictEqual(
          bal.toNumber(),
          0,
          `Hesap ${acc} iptal sonrası net bakiyesi tam 0 olmalıdır`
        );
      }
    });
  });
});
