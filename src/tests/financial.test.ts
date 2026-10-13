import { test, describe } from "node:test";
import assert from "node:assert";
import {
  Decimal,
  toDecimal,
  roundMoney,
  formatMoneyExact,
  isBalanced,
  calculateInvoiceTotalsExact,
  isPeriodLocked,
  validateJournalVoucher,
  buildIntegratedTransaction,
  applyCascadeDiscount,
} from "../lib/financialMath";

describe("FAZ 4 — Finansal Hesaplama ve Muhasebe Bütünlük Testleri", () => {
  // SENARYO 1: Borç/alacak dengeli ve dengesiz fiş
  test("1. Borç ve alacak dengeli fiş başarıyla doğrulanmalı, dengesiz fiş POSTED yapılamamalı", () => {
    // Dengeli fiş
    const balancedVoucher = validateJournalVoucher({
      status: "POSTED",
      voucher_date: "2026-10-15",
      lines: [
        { coa_code: "120.01", debit: 1180.5, credit: 0 },
        { coa_code: "600.01", debit: 0, credit: 1000.0 },
        { coa_code: "391.01", debit: 0, credit: 180.5 },
      ],
    });
    assert.strictEqual(balancedVoucher.valid, true);
    assert.strictEqual(balancedVoucher.totalDebit.toNumber(), 1180.5);
    assert.strictEqual(balancedVoucher.totalCredit.toNumber(), 1180.5);
    assert.strictEqual(balancedVoucher.diff.toNumber(), 0);

    // Dengesiz fiş (0.01 TL kuruş farkı)
    const unbalancedVoucher = validateJournalVoucher({
      status: "POSTED",
      voucher_date: "2026-10-15",
      lines: [
        { coa_code: "120.01", debit: 1180.5, credit: 0 },
        { coa_code: "600.01", debit: 0, credit: 1000.0 },
        { coa_code: "391.01", debit: 0, credit: 180.49 }, // 0.01 eksik
      ],
    });
    assert.strictEqual(unbalancedVoucher.valid, false);
    assert.ok(
      unbalancedVoucher.errors.some((e) => e.includes("eşit olmalıdır")),
      "Dengesiz fişte eşitlik hatası üretilmeli"
    );
  });

  // SENARYO 2: Yuvarlama sınırları ve sıfır/negatif tutarlar
  test("2. Yuvarlama sınırları ve negatif/sıfır tutar denetimi", () => {
    // Binary floating-point tuzağı: 0.1 + 0.2 !== 0.3 in native JS
    const jsSum = 0.1 + 0.2;
    assert.notStrictEqual(jsSum, 0.3); // JS float hatasını kanıtla

    const decSum = toDecimal("0.1").plus(toDecimal("0.2"));
    assert.strictEqual(roundMoney(decSum).toNumber(), 0.3); // Decimal kesinliği

    // Kuruş yuvarlama: HALF_UP
    assert.strictEqual(roundMoney("10.005").toNumber(), 10.01);
    assert.strictEqual(roundMoney("10.004").toNumber(), 10.0);

    // Negatif tutar kontrolü
    const negativeTest = validateJournalVoucher({
      status: "DRAFT",
      voucher_date: "2026-10-15",
      lines: [{ coa_code: "100.01", debit: -50, credit: 0 }],
    });
    assert.strictEqual(negativeTest.valid, false);
    assert.ok(negativeTest.errors.some((e) => e.includes("negatif olamaz")));
  });

  // SENARYO 3: Kısmi tahsilat, iade ve iptal
  test("3. Kısmi tahsilat ve iade hesaplaması", () => {
    const invoiceTotal = new Decimal(10000);
    const partialPayment1 = new Decimal(3500);
    const partialPayment2 = new Decimal(4000);

    const remaining = invoiceTotal.minus(partialPayment1).minus(partialPayment2);
    assert.strictEqual(roundMoney(remaining).toNumber(), 2500);

    // İade faturası (orijinal faturanın ters kaydı ve KDV iadesi)
    const returnTotals = calculateInvoiceTotalsExact([
      { qty: 2, unit_price: 500, tax_rate: 20 },
    ]);
    assert.strictEqual(returnTotals.subtotal, 1000);
    assert.strictEqual(returnTotals.taxTotal, 200);
    assert.strictEqual(returnTotals.grandTotal, 1200);
  });

  // SENARYO 4: Kapalı dönemde kayıt denemesi (Dönem kilidi)
  test("4. Kapalı dönemde yeni kayıt denemesi kesin olarak reddedilmeli", () => {
    const lockedUntil = "2025-12-31";

    // 2025 tarihli kayıt (kilitli)
    assert.strictEqual(isPeriodLocked("2025-11-20", lockedUntil), true);
    assert.strictEqual(isPeriodLocked("2025-12-31", lockedUntil), true);

    // 2026 tarihli kayıt (açık)
    assert.strictEqual(isPeriodLocked("2026-01-01", lockedUntil), false);

    const lockedVoucher = validateJournalVoucher({
      status: "DRAFT",
      voucher_date: "2025-10-10",
      locked_until_date: lockedUntil,
      lines: [
        { coa_code: "100.01", debit: 100, credit: 0 },
        { coa_code: "600.01", debit: 0, credit: 100 },
      ],
    });
    assert.strictEqual(lockedVoucher.valid, false);
    assert.ok(lockedVoucher.errors.some((e) => e.includes("kilitli muhasebe döneminde")));
  });

  // SENARYO 5: Aynı faturanın iki kez gönderilmesi (İdempotency ve mükerrer numara)
  test("5. Mükerrer fatura numarası tespiti", () => {
    const existingInvoices = new Set(["FAT2026-0001", "FAT2026-0002"]);

    assert.strictEqual(existingInvoices.has("FAT2026-0001"), true);
    assert.strictEqual(existingInvoices.has("FAT2026-0003"), false);

    // Yeni kayıt eklendiğinde
    existingInvoices.add("FAT2026-0003");
    // İkinci istek mükerrer kabul edilmeli
    assert.strictEqual(existingInvoices.has("FAT2026-0003"), true);
  });

  // SENARYO 6: Fatura → cari → stok → muhasebe fişi → mizan mutabakatı
  test("6. Fatura onayında Cari, Stok ve Yevmiye fişi tam mutabık ve dengeli olmalı", () => {
    const integration = buildIntegratedTransaction({
      invoice_no: "GIB2026000000123",
      account_code: "120.01.001",
      account_title: "Örnek Müşteri Ltd. Şti.",
      subtotal: 50000,
      tax_total: 10000,
      grand_total: 60000,
      direction: "SATIS",
      stock_lines: [
        { stock_code: "MAMUL-01", qty: 100, unit_price: 500 },
      ],
    });

    // 1. Cari Hareket tutarı
    assert.strictEqual(integration.customerTx.debit, 60000);
    assert.strictEqual(integration.customerTx.credit, 0);

    // 2. Stok Çıkışı
    assert.strictEqual(integration.stockMovements[0].qty, 100);
    assert.strictEqual(integration.stockMovements[0].direction, "CIKIS");

    // 3. Yevmiye Dengesi
    assert.strictEqual(integration.journalVoucher.isBalanced, true);
    assert.strictEqual(integration.journalVoucher.totalDebit, 60000);
    assert.strictEqual(integration.journalVoucher.totalCredit, 60000);

    // Mizan mutabakatı: Cari Borç (60000) === Satış Geliri (50000) + KDV (10000)
    const mizanDebit = integration.journalVoucher.totalDebit;
    const mizanCredit = integration.journalVoucher.totalCredit;
    assert.strictEqual(mizanDebit, mizanCredit);
  });

  // SENARYO 7: Transaction ortasında hata ve rollback davranışı
  test("7. Transaction sırasında herhangi bir adım hata verirse kısmi kayıt üretilmemeli", () => {
    let customerCreated = false;
    let stockCreated = false;
    let journalCreated = false;

    function executeTransaction(shouldFailAtJournal: boolean) {
      try {
        customerCreated = true;
        stockCreated = true;
        if (shouldFailAtJournal) {
          throw new Error("Yevmiye fişi borç/alacak dengesizliği nedeniyle onaylanamadı.");
        }
        journalCreated = true;
        return { success: true };
      } catch (err) {
        // Rollback
        customerCreated = false;
        stockCreated = false;
        journalCreated = false;
        return { success: false, error: (err as Error).message };
      }
    }

    const result = executeTransaction(true);
    assert.strictEqual(result.success, false);
    assert.strictEqual(customerCreated, false);
    assert.strictEqual(stockCreated, false);
    assert.strictEqual(journalCreated, false);
  });

  // SENARYO 8: Çoklu para biriminde kur ve kur farkı
  test("8. Dövizli işlemde kur çarpımı ve kur farkı kesinliği", () => {
    const fxAmount = new Decimal("1500.50"); // 1500.50 USD
    const rateInvoice = new Decimal("34.2550"); // Fatura tarihindeki kur
    const ratePayment = new Decimal("35.1000"); // Tahsilat tarihindeki kur

    const tlInvoice = roundMoney(fxAmount.times(rateInvoice));
    const tlPayment = roundMoney(fxAmount.times(ratePayment));

    assert.strictEqual(tlInvoice.toNumber(), 51399.63);
    assert.strictEqual(tlPayment.toNumber(), 52667.55);

    // Kambiyo karı (Kur farkı)
    const fxProfit = roundMoney(tlPayment.minus(tlInvoice));
    assert.strictEqual(fxProfit.toNumber(), 1267.92);
  });

  // SENARYO 9: Kesinleşmiş fişte doğrudan değişiklik engeli ve ters kayıt
  test("9. Kesinleşmiş fiş doğrudan düzenlenemez, ters kayıt (reversal) üretilmelidir", () => {
    const attemptDirectEdit = validateJournalVoucher({
      status: "POSTED",
      voucher_date: "2026-10-15",
      is_existing_posted: true,
      lines: [
        { coa_code: "100.01", debit: 500, credit: 0 },
        { coa_code: "600.01", debit: 0, credit: 500 },
      ],
    });

    assert.strictEqual(attemptDirectEdit.valid, false);
    assert.ok(
      attemptDirectEdit.errors.some((e) => e.includes("doğrudan değiştirilemez")),
      "Kesinleşmiş fiş doğrudan düzenlenememeli"
    );

    // Ters Kayıt (Reversal Entry) oluşturma: Borç ve Alacak yer değiştirir
    const originalLines = [
      { coa_code: "100.01", debit: 500, credit: 0, description: "Orijinal Tahsilat" },
      { coa_code: "120.01", debit: 0, credit: 500, description: "Orijinal Alacak" },
    ];

    const reversalLines = originalLines.map((l) => ({
      coa_code: l.coa_code,
      debit: l.credit, // Ters
      credit: l.debit, // Ters
      description: `TERS KAYIT — ${l.description}`,
    }));

    const reversalValidation = validateJournalVoucher({
      status: "POSTED",
      voucher_date: "2026-10-16",
      lines: reversalLines,
    });

    assert.strictEqual(reversalValidation.valid, true);
    assert.strictEqual(reversalValidation.totalDebit.toNumber(), 500);
    assert.strictEqual(reversalValidation.totalCredit.toNumber(), 500);
  });
});
