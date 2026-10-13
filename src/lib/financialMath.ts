import Decimal from "decimal.js-light";

Decimal.set({
  precision: 20,
  rounding: Decimal.ROUND_HALF_UP,
});

export { Decimal };

/**
 * Sayısal veya string girdiyi güvenli bir Decimal nesnesine dönüştürür.
 */
export function toDecimal(val: number | string | Decimal | null | undefined): Decimal {
  if (val === null || val === undefined || val === "") {
    return new Decimal(0);
  }
  if (val instanceof Decimal) {
    return val;
  }
  try {
    return new Decimal(String(val).replace(/,/g, ""));
  } catch {
    return new Decimal(0);
  }
}

/**
 * Finansal standart 2 hane yarım yukarı yuvarlama (ROUND_HALF_UP)
 */
export function roundMoney(val: Decimal | number | string, decimals = 2): Decimal {
  return toDecimal(val).toDecimalPlaces(decimals, Decimal.ROUND_HALF_UP);
}

/**
 * Kesin para formatlama (Türkçe para formatı: 1.250,50 ₺)
 */
export function formatMoneyExact(val: Decimal | number | string, currency = "₺"): string {
  const dec = roundMoney(val);
  const parts = dec.toFixed(2).split(".");
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const decPart = parts[1];
  return `${intPart},${decPart} ${currency}`;
}

/**
 * Borç ve alacak toplamlarının eşitliğini kuruş toleransıyla (0.00) doğrular.
 */
export function isBalanced(
  totalDebit: number | string | Decimal,
  totalCredit: number | string | Decimal,
  tolerance = 0.001
): boolean {
  const d = roundMoney(totalDebit);
  const c = roundMoney(totalCredit);
  return d.minus(c).abs().lessThanOrEqualTo(tolerance);
}

/**
 * Kademeli iskonto hesaplayıcı (yüzde 1, yüzde 2, yüzde 3)
 */
export function applyCascadeDiscount(
  amount: Decimal | number | string,
  pcts: Array<number | string | Decimal>
): { remaining: Decimal; totalDiscount: Decimal } {
  let rem = toDecimal(amount);
  let totalDisc = new Decimal(0);

  for (const pct of pcts) {
    const p = toDecimal(pct);
    if (p.greaterThan(0)) {
      const disc = rem.times(p).dividedBy(100);
      totalDisc = totalDisc.plus(disc);
      rem = rem.minus(disc);
    }
  }

  return {
    remaining: rem.greaterThan(0) ? rem : new Decimal(0),
    totalDiscount: totalDisc,
  };
}

export type InvoiceLineInput = {
  qty: number | string | Decimal;
  unit_price: number | string | Decimal;
  discount_pct?: number | string | Decimal;
  discount_pct_2?: number | string | Decimal;
  discount_pct_3?: number | string | Decimal;
  discount_amount?: number | string | Decimal;
  tax_rate?: number | string | Decimal;
};

export type InvoiceTotalsResult = {
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  tevkifat: number;
  grandTotal: number;
  taxByRate: Record<string, number>;
  // Kesin Decimal referansları
  subtotalDec: Decimal;
  discountTotalDec: Decimal;
  taxTotalDec: Decimal;
  tevkifatDec: Decimal;
  grandTotalDec: Decimal;
};

/**
 * Fatura dip toplamlarını kesin Decimal ile kuruş hatasız hesaplar.
 */
export function calculateInvoiceTotalsExact(
  lines: InvoiceLineInput[],
  vatIncluded = false,
  footerDiscountPct: number | string | Decimal = 0,
  tevkifatRate: number | string | Decimal = 0,
  footerDiscountPct2: number | string | Decimal = 0,
  footerDiscountPct3: number | string | Decimal = 0
): InvoiceTotalsResult {
  let subtotalDec = new Decimal(0);
  let discountTotalDec = new Decimal(0);
  let taxTotalDec = new Decimal(0);
  const taxByRateDec: Record<string, Decimal> = {};

  const footerPcts = [footerDiscountPct, footerDiscountPct2, footerDiscountPct3];

  for (const ln of lines) {
    const qty = toDecimal(ln.qty);
    const unitPrice = toDecimal(ln.unit_price);
    const gross = qty.times(unitPrice);

    // Satır içi kademeli iskonto
    const lineDisc = applyCascadeDiscount(gross, [
      ln.discount_pct || 0,
      ln.discount_pct_2 || 0,
      ln.discount_pct_3 || 0,
    ]);

    let lineSub = lineDisc.remaining;
    let disc = lineDisc.totalDiscount;

    const extraDisc = toDecimal(ln.discount_amount);
    if (extraDisc.greaterThan(0)) {
      disc = disc.plus(extraDisc);
      const subAfterDisc = lineSub.minus(extraDisc);
      lineSub = subAfterDisc.greaterThan(0) ? subAfterDisc : new Decimal(0);
    }

    // Dip iskonto kademesi
    const footerDisc = applyCascadeDiscount(lineSub, footerPcts);
    lineSub = footerDisc.remaining;
    disc = disc.plus(footerDisc.totalDiscount);

    const rate = toDecimal(ln.tax_rate ?? 20);
    let tax = new Decimal(0);
    let net = lineSub;

    if (vatIncluded) {
      const divisor = new Decimal(1).plus(rate.dividedBy(100));
      net = lineSub.dividedBy(divisor);
      tax = lineSub.minus(net);
    } else {
      tax = net.times(rate).dividedBy(100);
    }

    // Yuvarlama
    const netRounded = roundMoney(net);
    const taxRounded = roundMoney(tax);
    const discRounded = roundMoney(disc);

    subtotalDec = subtotalDec.plus(netRounded);
    discountTotalDec = discountTotalDec.plus(discRounded);
    taxTotalDec = taxTotalDec.plus(taxRounded);

    const rateKey = rate.toString();
    taxByRateDec[rateKey] = (taxByRateDec[rateKey] || new Decimal(0)).plus(taxRounded);
  }

  const tevRate = toDecimal(tevkifatRate);
  let tevkifatDec = new Decimal(0);
  if (tevRate.greaterThan(0)) {
    tevkifatDec = roundMoney(taxTotalDec.times(tevRate).dividedBy(100));
  }

  const grandTotalDec = roundMoney(subtotalDec.plus(taxTotalDec).minus(tevkifatDec));

  const taxByRate: Record<string, number> = {};
  for (const [k, v] of Object.entries(taxByRateDec)) {
    taxByRate[k] = v.toNumber();
  }

  return {
    subtotal: subtotalDec.toNumber(),
    discountTotal: discountTotalDec.toNumber(),
    taxTotal: taxTotalDec.toNumber(),
    tevkifat: tevkifatDec.toNumber(),
    grandTotal: grandTotalDec.toNumber(),
    taxByRate,
    subtotalDec,
    discountTotalDec,
    taxTotalDec,
    tevkifatDec,
    grandTotalDec,
  };
}

/**
 * Dönem kilidi kontrolü:
 * İşlem tarihi kilit tarihinden önce veya eşitse kural gereği işlem engellenir.
 */
export function isPeriodLocked(
  transactionDate: string,
  lockedUntilDate: string | null | undefined
): boolean {
  if (!lockedUntilDate) return false;
  const tx = new Date(transactionDate).getTime();
  const lock = new Date(lockedUntilDate).getTime();
  if (Number.isNaN(tx) || Number.isNaN(lock)) return false;
  return tx <= lock;
}

export type JournalStatus = "DRAFT" | "APPROVED" | "POSTED" | "CANCELLED" | "REVERSED";

export type JournalValidationInput = {
  status: JournalStatus;
  lines: Array<{
    coa_code: string;
    debit: number | string | Decimal;
    credit: number | string | Decimal;
    description?: string;
  }>;
  voucher_date: string;
  locked_until_date?: string | null;
  allow_unbalanced?: boolean;
  is_existing_posted?: boolean;
};

/**
 * Yevmiye fişi muhasebe bütünlük kurallarını doğrular.
 */
export function validateJournalVoucher(voucher: JournalValidationInput): {
  valid: boolean;
  errors: string[];
  totalDebit: Decimal;
  totalCredit: Decimal;
  diff: Decimal;
} {
  const errors: string[] = [];

  // 1. Dönem kilidi
  if (isPeriodLocked(voucher.voucher_date, voucher.locked_until_date)) {
    errors.push(`Kayıt tarihi (${voucher.voucher_date}) kilitli muhasebe döneminde yer almaktadır. İşlem yapılamaz.`);
  }

  // 2. Kesinleşmiş kayıt sessizce değiştirilemez
  if (voucher.is_existing_posted) {
    errors.push("Kesinleşmiş (POSTED) muhasebe fişi doğrudan değiştirilemez; düzeltme fişi veya ters kayıt oluşturulmalıdır.");
  }

  // 3. Satır kontrolü
  if (!voucher.lines || voucher.lines.length === 0) {
    errors.push("Fiş en az bir hesap satırı içermelidir.");
  }

  let totalDebit = new Decimal(0);
  let totalCredit = new Decimal(0);

  voucher.lines?.forEach((line, idx) => {
    const d = roundMoney(line.debit);
    const c = roundMoney(line.credit);

    if (!line.coa_code || line.coa_code.trim() === "") {
      errors.push(`Satır ${idx + 1}: Hesap kodu boş olamaz.`);
    }

    if (d.lessThan(0) || c.lessThan(0)) {
      errors.push(`Satır ${idx + 1}: Borç veya alacak tutarı negatif olamaz.`);
    }

    if (d.greaterThan(0) && c.greaterThan(0)) {
      errors.push(`Satır ${idx + 1}: Aynı satırda hem borç hem alacak tutarı bulunamaz.`);
    }

    totalDebit = totalDebit.plus(d);
    totalCredit = totalCredit.plus(c);
  });

  const diff = roundMoney(totalDebit.minus(totalCredit));
  const balanced = diff.abs().lessThanOrEqualTo(0.001);

  // 4. Kesinleşmiş fişte borç = alacak zorunluluğu
  if (voucher.status === "POSTED" && !balanced) {
    errors.push(`Kesinleşmiş fişte borç toplamı (${formatMoneyExact(totalDebit)}) ile alacak toplamı (${formatMoneyExact(totalCredit)}) eşit olmalıdır. Fark: ${formatMoneyExact(diff)}`);
  }

  // 5. Onaylı veya taslakta dengesizlik izni yoksa
  if (!voucher.allow_unbalanced && !balanced) {
    errors.push(`Fiş dengesizdir. Borç: ${formatMoneyExact(totalDebit)}, Alacak: ${formatMoneyExact(totalCredit)}, Fark: ${formatMoneyExact(diff)}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    totalDebit,
    totalCredit,
    diff,
  };
}

/**
 * Fatura onayında Fatura -> Cari Hareket -> Stok Hareket -> Yevmiye Fişi
 * zincirleme mutabakat simülasyonu ve atomik bütünlük doğrulaması
 */
export function buildIntegratedTransaction(invoice: {
  invoice_no: string;
  account_code: string;
  account_title: string;
  grand_total: number;
  subtotal: number;
  tax_total: number;
  direction: "SATIS" | "ALIS";
  stock_lines: Array<{ stock_code: string; qty: number; unit_price: number }>;
}) {
  const isSale = invoice.direction === "SATIS";

  // 1. Cari Hareket
  const customerTx = {
    doc_no: invoice.invoice_no,
    account_code: invoice.account_code,
    debit: isSale ? invoice.grand_total : 0,
    credit: isSale ? 0 : invoice.grand_total,
    description: `${isSale ? "Satış" : "Alış"} Faturası: ${invoice.invoice_no}`,
  };

  // 2. Stok Hareketleri
  const stockMovements = invoice.stock_lines.map((sl) => ({
    doc_no: invoice.invoice_no,
    stock_code: sl.stock_code,
    direction: isSale ? "CIKIS" : "GIRIS",
    qty: sl.qty,
    unit_price: sl.unit_price,
    total_amount: roundMoney(toDecimal(sl.qty).times(toDecimal(sl.unit_price))).toNumber(),
  }));

  // 3. Yevmiye Fişi
  const journalLines = isSale
    ? [
        // Borç: 120 Alıcılar
        { coa_code: "120.01", debit: invoice.grand_total, credit: 0, description: `${invoice.account_title} Fatura Borcu` },
        // Alacak: 600 Yurtiçi Satışlar
        { coa_code: "600.01", debit: 0, credit: invoice.subtotal, description: "Yurtiçi Satış Geliri" },
        // Alacak: 391 Hesaplanan KDV
        { coa_code: "391.01", debit: 0, credit: invoice.tax_total, description: "Hesaplanan KDV" },
      ]
    : [
        // Borç: 153 Ticari Mallar
        { coa_code: "153.01", debit: invoice.subtotal, credit: 0, description: "Mal Alış Bedeli" },
        // Borç: 191 İndirilecek KDV
        { coa_code: "191.01", debit: invoice.tax_total, credit: 0, description: "İndirilecek KDV" },
        // Alacak: 320 Satıcılar
        { coa_code: "320.01", debit: 0, credit: invoice.grand_total, description: `${invoice.account_title} Fatura Alacağı` },
      ];

  const validation = validateJournalVoucher({
    status: "POSTED",
    lines: journalLines,
    voucher_date: new Date().toISOString().slice(0, 10),
  });

  return {
    customerTx,
    stockMovements,
    journalVoucher: {
      voucher_no: `YEV-${invoice.invoice_no}`,
      lines: journalLines,
      isBalanced: validation.valid,
      totalDebit: validation.totalDebit.toNumber(),
      totalCredit: validation.totalCredit.toNumber(),
    },
  };
}
