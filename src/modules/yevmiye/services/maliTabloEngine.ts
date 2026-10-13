/**
 * FAZ 7 — Mizan ve VUK Mali Tabloları Hesaplama Motoru
 * Türkiye Muhasebe Standartları (VUK / MSUGT 1-15, Tekdüzen Hesap Planı TDHP)
 *
 * Kesin İlkeler:
 * 1. Sabit örnek tutar KULLANILMAZ; gerçek yevmiye kayıtları ve hesap planından dinamik üretilir.
 * 2. Mizan: Açılış/Devir, Dönem Borç/Alacak, Toplam Borç/Alacak ve Borç/Alacak Bakiye net hesaplanır.
 * 3. Bilanço: Aktif = Pasif + Öz Kaynak denklik denetimi yapılır; fark varsa saklanmadan kırmızı alarm verilir.
 * 4. VUK Resmî Mali Tablolar (Bilanço, Gelir Tablosu) ile Yönetim Raporları (Nakit Akış, Kâr-Zarar Özeti)
 *    açıkça ayrılır ve etiketlenir.
 * 5. Tüm parasal hesaplamalar financialMath (Decimal) ile kuruş kuruşuna yapılır.
 * 6. AI Mali Tablo Analizi yalnızca gerçek hesaplanan rakamları yorumlar; tablodaki verileri değiştiremez.
 */

import { toDecimal, roundMoney, type Decimal } from "@/lib/financialMath";
import { mockStore } from "@/services/mockDataStore";

export type MaliReportType =
  | "genel-mizan"
  | "kesin-mizan"
  | "iki-tarih-mizan"
  | "muavin"
  | "bilanco"
  | "gelir-tablosu"
  | "nakit-akis"
  | "kar-zarar";

export interface MaliFilterOptions {
  date_from?: string;
  date_to?: string;
  branch_id?: number;
  record_type_id?: number;
  account_code?: string;
  account_id?: number;
  q?: string;
  status?: string; // "ALL" | "POSTED" | "DRAFT"
  compare_previous_period?: boolean;
  previous_date_from?: string;
  previous_date_to?: string;
}

export interface MizanRow {
  code: string;
  name: string;
  opening_debit: number;
  opening_credit: number;
  period_debit: number;
  period_credit: number;
  total_debit: number;
  total_credit: number;
  debit_balance: number;
  credit_balance: number;
  account_class?: string;
  is_summary?: boolean;
}

export interface MuavinLine {
  voucher_id: number;
  voucher_no: string;
  voucher_date: string;
  madde_no?: number | null;
  code: string;
  name: string;
  counter_account?: string;
  description: string;
  debit: number;
  credit: number;
  running_balance: number;
  balance_type: "BORÇ" | "ALACAK" | "SIFIR";
  status: string;
}

export interface BilancoItem {
  code: string;
  title: string;
  amount: number;
  previous_amount?: number;
  change_amount?: number;
  change_pct?: number | null;
  level: number; // 1: Ana Grup, 2: Ara Grup, 3: Hesap
  is_regulatory?: boolean; // Düzenleyici eksi hesap (103, 257 vb.)
  section: "AKTIF" | "PASIF";
}

export interface GelirTablosuItem {
  code: string;
  title: string;
  amount: number;
  previous_amount?: number;
  change_amount?: number;
  change_pct?: number | null;
  level: number;
  is_deduction?: boolean; // İndirim / maliyet / gider (-)
  group: string;
}

export interface MaliReportResult {
  meta: {
    report_key: string;
    title: string;
    subtitle?: string;
    is_official_vuk: boolean;
    standard_version: string;
    generated_at: string;
    data_source: string;
    filters: Record<string, unknown>;
    period_labels: string[];
    row_count: number;
    is_balanced?: boolean;
    imbalance_amount?: number;
    kpi_cards: Array<{
      key: string;
      label: string;
      value: number | string | null;
      format?: string;
    }>;
    columns: Array<{ key: string; label: string }>;
  };
  rows: Array<Record<string, unknown>>;
  drilldown_lines?: MuavinLine[];
}

/** Yardımcı: Tarih aralığında mı? */
function isDateWithin(dateStr?: string, from?: string, to?: string): boolean {
  if (!dateStr) return true;
  if (from && dateStr < from) return false;
  if (to && dateStr > to) return false;
  return true;
}

/** Yardımcı: Tarih başlangıçtan önce mi? (Devir bakiyesi için) */
function isDateBefore(dateStr?: string, from?: string): boolean {
  if (!dateStr || !from) return false;
  return dateStr < from;
}

/**
 * 1. MİZAN MOTORU (Genel Mizan, İki Tarih Arası Mizan, Kesin Mizan)
 */
export function computeMizan(
  reportType: "genel-mizan" | "kesin-mizan" | "iki-tarih-mizan",
  filters: MaliFilterOptions = {}
): MaliReportResult {
  const allVouchers = mockStore.getVouchers();
  const dateFrom = filters.date_from;
  const dateTo = filters.date_to;
  const branchId = filters.branch_id;
  const q = filters.q?.toLowerCase().trim();
  const statusFilter = filters.status || "POSTED";

  // İlgili fişleri filtrele
  const vouchers = allVouchers.filter((v) => {
    if (statusFilter !== "ALL" && v.status !== statusFilter) return false;
    if (branchId && v.branch_id && v.branch_id !== branchId) return false;
    // Bitiş tarihinden sonrakileri hariç tut
    if (dateTo && v.voucher_date > dateTo) return false;
    return true;
  });

  // Hesap bazında toplayıcı harita
  type AccAccumulator = {
    code: string;
    name: string;
    opening_debit: Decimal;
    opening_credit: Decimal;
    period_debit: Decimal;
    period_credit: Decimal;
  };
  const accMap = new Map<string, AccAccumulator>();

  for (const v of vouchers) {
    if (!Array.isArray(v.lines)) continue;
    const isOpening = dateFrom ? isDateBefore(v.voucher_date, dateFrom) : false;

    for (const ln of v.lines) {
      const code = String(ln.coa_code || "999").trim();
      const name = String(ln.coa_name || ln.description || "Hesap");
      const debit = toDecimal(ln.debit || 0);
      const credit = toDecimal(ln.credit || 0);

      if (!accMap.has(code)) {
        accMap.set(code, {
          code,
          name,
          opening_debit: toDecimal(0),
          opening_credit: toDecimal(0),
          period_debit: toDecimal(0),
          period_credit: toDecimal(0),
        });
      }
      const acc = accMap.get(code)!;

      if (isOpening) {
        acc.opening_debit = acc.opening_debit.plus(debit);
        acc.opening_credit = acc.opening_credit.plus(credit);
      } else {
        acc.period_debit = acc.period_debit.plus(debit);
        acc.period_credit = acc.period_credit.plus(credit);
      }
    }
  }

  // Hesap koduna göre alfabetik sırala
  const sortedAccounts = Array.from(accMap.values()).sort((a, b) =>
    a.code.localeCompare(b.code, undefined, { numeric: true })
  );

  let sumOpeningDebit = toDecimal(0);
  let sumOpeningCredit = toDecimal(0);
  let sumPeriodDebit = toDecimal(0);
  let sumPeriodCredit = toDecimal(0);
  let sumTotalDebit = toDecimal(0);
  let sumTotalCredit = toDecimal(0);
  let sumDebitBalance = toDecimal(0);
  let sumCreditBalance = toDecimal(0);

  const rawRows: MizanRow[] = [];

  for (const acc of sortedAccounts) {
    // Arama filtresi
    if (q && !acc.code.toLowerCase().includes(q) && !acc.name.toLowerCase().includes(q)) {
      continue;
    }

    // Kesin Mizan Kuralı: 6'lı gelir/gider hesapları ve 7'li yansıtma hesapları kesin mizanda bakiye vermez!
    if (reportType === "kesin-mizan" && (acc.code.startsWith("6") || acc.code.startsWith("7"))) {
      // Kesin mizanda sadece 1-5 bilanço hesapları yer alır; kapanmamış 6'lı hesap varsa sıfır bakiye kalmalıdır
      continue;
    }

    const totalDebit = acc.opening_debit.plus(acc.period_debit);
    const totalCredit = acc.opening_credit.plus(acc.period_credit);

    let debitBal = toDecimal(0);
    let creditBal = toDecimal(0);

    if (totalDebit.greaterThan(totalCredit)) {
      debitBal = totalDebit.minus(totalCredit);
    } else if (totalCredit.greaterThan(totalDebit)) {
      creditBal = totalCredit.minus(totalDebit);
    }

    sumOpeningDebit = sumOpeningDebit.plus(acc.opening_debit);
    sumOpeningCredit = sumOpeningCredit.plus(acc.opening_credit);
    sumPeriodDebit = sumPeriodDebit.plus(acc.period_debit);
    sumPeriodCredit = sumPeriodCredit.plus(acc.period_credit);
    sumTotalDebit = sumTotalDebit.plus(totalDebit);
    sumTotalCredit = sumTotalCredit.plus(totalCredit);
    sumDebitBalance = sumDebitBalance.plus(debitBal);
    sumCreditBalance = sumCreditBalance.plus(creditBal);

    rawRows.push({
      code: acc.code,
      name: acc.name,
      opening_debit: roundMoney(acc.opening_debit).toNumber(),
      opening_credit: roundMoney(acc.opening_credit).toNumber(),
      period_debit: roundMoney(acc.period_debit).toNumber(),
      period_credit: roundMoney(acc.period_credit).toNumber(),
      total_debit: roundMoney(totalDebit).toNumber(),
      total_credit: roundMoney(totalCredit).toNumber(),
      debit_balance: roundMoney(debitBal).toNumber(),
      credit_balance: roundMoney(creditBal).toNumber(),
    });
  }

  const isBalancedTotals = sumTotalDebit.equals(sumTotalCredit);
  const isBalancedBalances = sumDebitBalance.equals(sumCreditBalance);
  const isFullyBalanced = isBalancedTotals && isBalancedBalances;
  const imbalance = sumTotalDebit.minus(sumTotalCredit).abs();

  const titleMap = {
    "genel-mizan": "Genel Mizan (Tekdüzen Hesap Planı Bakiye Listesi)",
    "kesin-mizan": "Kesin Mizan (Dönem Sonu Kapanış ve Bilanço Mizanı)",
    "iki-tarih-mizan": "İki Tarih Arası Hareket ve Devir Mizanı",
  };

  const columns = [
    { key: "code", label: "Hesap Kodu" },
    { key: "name", label: "Hesap Adı" },
    { key: "opening_debit", label: "Devir Borç (₺)" },
    { key: "opening_credit", label: "Devir Alacak (₺)" },
    { key: "period_debit", label: "Dönem Borç (₺)" },
    { key: "period_credit", label: "Dönem Alacak (₺)" },
    { key: "total_debit", label: "Toplam Borç (₺)" },
    { key: "total_credit", label: "Toplam Alacak (₺)" },
    { key: "debit_balance", label: "Borç Bakiye (₺)" },
    { key: "credit_balance", label: "Alacak Bakiye (₺)" },
  ];

  return {
    meta: {
      report_key: reportType,
      title: titleMap[reportType],
      subtitle: "VUK 213 Sayılı Kanun ve MSUGT 1-15 Hükümlerine Uygun Resmî Defter Mizanı",
      is_official_vuk: true,
      standard_version: "MSUGT-15 / TDHP-2026.1",
      generated_at: new Date().toLocaleString("tr-TR"),
      data_source: `Gerçek Yevmiye Defteri Kayıtları (${vouchers.length} Fiş)`,
      filters: filters as Record<string, unknown>,
      period_labels: [
        dateFrom ? `Başlangıç: ${dateFrom}` : "Dönem Başı",
        dateTo ? `Bitiş: ${dateTo}` : "Güncel",
      ],
      row_count: rawRows.length,
      is_balanced: isFullyBalanced,
      imbalance_amount: roundMoney(imbalance).toNumber(),
      kpi_cards: [
        {
          key: "total_debit",
          label: "Toplam Borç Hareketi",
          value: roundMoney(sumTotalDebit).toNumber(),
          format: "money",
        },
        {
          key: "total_credit",
          label: "Toplam Alacak Hareketi",
          value: roundMoney(sumTotalCredit).toNumber(),
          format: "money",
        },
        {
          key: "total_balance",
          label: "Net Bakiye Toplamı",
          value: roundMoney(sumDebitBalance).toNumber(),
          format: "money",
        },
        {
          key: "is_balanced",
          label: "Mizan Denkliği",
          value: isFullyBalanced
            ? "TAM DENK (Borç = Alacak)"
            : `DENGESİZ! (Fark: ${roundMoney(imbalance).toNumber()} ₺)`,
          format: "string",
        },
      ],
      columns,
    },
    rows: rawRows as unknown as Array<Record<string, unknown>>,
  };
}

/**
 * 2. MUAVİN DEFTER / HESAP EKSTRESİ MOTORU
 */
export function computeMuavin(filters: MaliFilterOptions = {}): MaliReportResult {
  const allVouchers = mockStore.getVouchers();
  const dateFrom = filters.date_from;
  const dateTo = filters.date_to;
  const branchId = filters.branch_id;
  const targetAccount = filters.account_code?.trim();
  const q = filters.q?.toLowerCase().trim();

  // Fişleri tarihe ve numaraya göre sırala
  const sortedVouchers = [...allVouchers]
    .filter((v) => {
      if (v.status !== "POSTED" && filters.status === "POSTED") return false;
      if (branchId && v.branch_id && v.branch_id !== branchId) return false;
      return true;
    })
    .sort((a, b) => (a.voucher_date || "").localeCompare(b.voucher_date || "") || a.id - b.id);

  const lines: MuavinLine[] = [];
  let currentRunning = toDecimal(0);
  let totalDebit = toDecimal(0);
  let totalCredit = toDecimal(0);

  for (const v of sortedVouchers) {
    if (!Array.isArray(v.lines)) continue;

    for (const ln of v.lines) {
      const code = String(ln.coa_code || "").trim();
      const name = String(ln.coa_name || ln.description || "Hesap");

      if (targetAccount && !code.startsWith(targetAccount)) {
        continue;
      }

      if (q && !code.toLowerCase().includes(q) && !name.toLowerCase().includes(q)) {
        continue;
      }

      // Tarih filtreleme
      if (!isDateWithin(v.voucher_date, dateFrom, dateTo)) {
        continue;
      }

      const debit = toDecimal(ln.debit || 0);
      const credit = toDecimal(ln.credit || 0);
      totalDebit = totalDebit.plus(debit);
      totalCredit = totalCredit.plus(credit);

      // Yürüyen bakiye: Borç (+) - Alacak (-)
      currentRunning = currentRunning.plus(debit).minus(credit);

      // Karşı hesap tespiti
      const counterLines = v.lines.filter((o: any) => o !== ln && o.coa_code);
      const counterCodes = counterLines.map((o: any) => o.coa_code).join(", ") || "Mahsup";

      lines.push({
        voucher_id: v.id,
        voucher_no: v.voucher_no,
        voucher_date: v.voucher_date,
        madde_no: v.madde_no,
        code,
        name,
        counter_account: counterCodes,
        description: ln.description || v.description || "Yevmiye Kaydı",
        debit: roundMoney(debit).toNumber(),
        credit: roundMoney(credit).toNumber(),
        running_balance: roundMoney(currentRunning.abs()).toNumber(),
        balance_type: currentRunning.greaterThan(0)
          ? "BORÇ"
          : currentRunning.lessThan(0)
          ? "ALACAK"
          : "SIFIR",
        status: v.status || "POSTED",
      });
    }
  }

  const columns = [
    { key: "voucher_date", label: "Tarih" },
    { key: "voucher_no", label: "Yevmiye Fiş No" },
    { key: "code", label: "Hesap Kodu" },
    { key: "name", label: "Hesap Adı" },
    { key: "counter_account", label: "Karşı Hesaplar" },
    { key: "description", label: "Satır Açıklaması" },
    { key: "debit", label: "Borç (₺)" },
    { key: "credit", label: "Alacak (₺)" },
    { key: "running_balance", label: "Yürüyen Bakiye (₺)" },
    { key: "balance_type", label: "Bakiye Yönü" },
  ];

  return {
    meta: {
      report_key: "muavin",
      title: "Muavin Defter / Hesap Ekstresi",
      subtitle: targetAccount
        ? `Seçilen Hesap: ${targetAccount} (Ayrıntılı Hareket Dökümü)`
        : "Tüm Hesaplar Muavin Defter Dökümü",
      is_official_vuk: true,
      standard_version: "VUK Madde 182 / MSUGT 1",
      generated_at: new Date().toLocaleString("tr-TR"),
      data_source: "Yevmiye Kayıtları ve Fiş Satırları",
      filters: filters as Record<string, unknown>,
      period_labels: [
        dateFrom ? `Başlangıç: ${dateFrom}` : "Dönem Başı",
        dateTo ? `Bitiş: ${dateTo}` : "Güncel",
      ],
      row_count: lines.length,
      kpi_cards: [
        {
          key: "total_debit",
          label: "Toplam Borç",
          value: roundMoney(totalDebit).toNumber(),
          format: "money",
        },
        {
          key: "total_credit",
          label: "Toplam Alacak",
          value: roundMoney(totalCredit).toNumber(),
          format: "money",
        },
        {
          key: "final_balance",
          label: "Net Bakiye",
          value: roundMoney(currentRunning.abs()).toNumber(),
          format: "money",
        },
        {
          key: "balance_direction",
          label: "Bakiye Karakteri",
          value: currentRunning.greaterThan(0)
            ? "BORÇ BAKİYESİ"
            : currentRunning.lessThan(0)
            ? "ALACAK BAKİYESİ"
            : "KAPANMIŞ (SIFIR)",
          format: "string",
        },
      ],
      columns,
    },
    rows: lines as unknown as Array<Record<string, unknown>>,
    drilldown_lines: lines,
  };
}

/**
 * 3. BİLANÇO MOTORU (VUK Resmî Mali Tablosu)
 */
export function computeBilanco(filters: MaliFilterOptions = {}): MaliReportResult {
  const mizan = computeMizan("genel-mizan", filters);
  const rows = mizan.rows as unknown as MizanRow[];

  // Gelir tablosundan hesaplanan kâr/zararı bul
  const gelirResult = computeGelirTablosu(filters);
  const netIncomeFromPnl = toDecimal(
    (gelirResult.meta.kpi_cards.find((k) => k.key === "net_profit")?.value as number) || 0
  );

  let donenVarliklar = toDecimal(0);
  let duranVarliklar = toDecimal(0);
  let kvyk = toDecimal(0);
  let uvyk = toDecimal(0);
  let ozKaynaklar = toDecimal(0);

  const bilancoRows: BilancoItem[] = [];

  for (const r of rows) {
    const code = r.code;
    const name = r.name;
    const dBal = toDecimal(r.debit_balance);
    const cBal = toDecimal(r.credit_balance);

    // 1: Dönen Varlıklar
    if (code.startsWith("1")) {
      // Düzenleyici hesaplar (103, 119, 122, 129, 137, 157, 158) aktifi azaltır
      const isReg = ["103", "119", "122", "129", "137", "157", "158"].some((p) =>
        code.startsWith(p)
      );
      const val = isReg ? cBal.negated() : dBal.minus(cBal);
      donenVarliklar = donenVarliklar.plus(val);

      bilancoRows.push({
        code,
        title: name,
        amount: roundMoney(val).toNumber(),
        level: code.includes(".") ? 3 : 2,
        is_regulatory: isReg,
        section: "AKTIF",
      });
    }

    // 2: Duran Varlıklar
    else if (code.startsWith("2")) {
      // 257 Birikmiş Amortismanlar vb. düzenleyicidir
      const isReg = ["257", "268", "278", "298"].some((p) => code.startsWith(p));
      const val = isReg ? cBal.negated() : dBal.minus(cBal);
      duranVarliklar = duranVarliklar.plus(val);

      bilancoRows.push({
        code,
        title: name,
        amount: roundMoney(val).toNumber(),
        level: code.includes(".") ? 3 : 2,
        is_regulatory: isReg,
        section: "AKTIF",
      });
    }

    // 3: Kısa Vadeli Yabancı Kaynaklar
    else if (code.startsWith("3")) {
      const isReg = ["322", "337"].some((p) => code.startsWith(p));
      const val = isReg ? dBal.negated() : cBal.minus(dBal);
      kvyk = kvyk.plus(val);

      bilancoRows.push({
        code,
        title: name,
        amount: roundMoney(val).toNumber(),
        level: code.includes(".") ? 3 : 2,
        is_regulatory: isReg,
        section: "PASIF",
      });
    }

    // 4: Uzun Vadeli Yabancı Kaynaklar
    else if (code.startsWith("4")) {
      const isReg = ["422"].some((p) => code.startsWith(p));
      const val = isReg ? dBal.negated() : cBal.minus(dBal);
      uvyk = uvyk.plus(val);

      bilancoRows.push({
        code,
        title: name,
        amount: roundMoney(val).toNumber(),
        level: code.includes(".") ? 3 : 2,
        is_regulatory: isReg,
        section: "PASIF",
      });
    }

    // 5: Öz Kaynaklar
    else if (code.startsWith("5")) {
      const isReg = ["501", "580", "591"].some((p) => code.startsWith(p));
      const val = isReg ? dBal.negated() : cBal.minus(dBal);
      ozKaynaklar = ozKaynaklar.plus(val);

      bilancoRows.push({
        code,
        title: name,
        amount: roundMoney(val).toNumber(),
        level: code.includes(".") ? 3 : 2,
        is_regulatory: isReg,
        section: "PASIF",
      });
    }
  }

  // Eğer 590/591 yevmiyede henüz kesinleşmemişse, gelir tablosundan gelen dönem sonucunu ekle
  const hasRecorded590or591 = rows.some((r) => r.code.startsWith("590") || r.code.startsWith("591"));
  if (!hasRecorded590or591 && !netIncomeFromPnl.isZero()) {
    ozKaynaklar = ozKaynaklar.plus(netIncomeFromPnl);
    bilancoRows.push({
      code: netIncomeFromPnl.greaterThan(0) ? "590" : "591",
      title: netIncomeFromPnl.greaterThan(0)
        ? "Dönem Net Kârı (Gelir Tablosundan Hesaplanan)"
        : "Dönem Net Zararı (-) (Gelir Tablosundan Hesaplanan)",
      amount: roundMoney(netIncomeFromPnl).toNumber(),
      level: 2,
      is_regulatory: netIncomeFromPnl.lessThan(0),
      section: "PASIF",
    });
  }

  const toplamAktif = donenVarliklar.plus(duranVarliklar);
  const toplamPasif = kvyk.plus(uvyk).plus(ozKaynaklar);
  const isBalanced = toplamAktif.equals(toplamPasif);
  const diff = toplamAktif.minus(toplamPasif).abs();

  const columns = [
    { key: "section", label: "Bilanço Tarafı" },
    { key: "code", label: "Hesap Kodu" },
    { key: "title", label: "Bilanço Kalemi" },
    { key: "amount", label: "Cari Dönem Tutarı (₺)" },
  ];

  return {
    meta: {
      report_key: "bilanco",
      title: "Bilanço (VUK Resmî Mali Tablosu)",
      subtitle: "VUK Mükerrer 257 ve 1 Sıra No'lu MSUGT Uyarınca Düzenlenen Resmî Bilanço",
      is_official_vuk: true,
      standard_version: "VUK / MSUGT-1",
      generated_at: new Date().toLocaleString("tr-TR"),
      data_source: "Genel Mizan ve Yevmiye Defteri",
      filters: filters as Record<string, unknown>,
      period_labels: [
        filters.date_to ? `Tarih: ${filters.date_to}` : `Dönem: ${new Date().getFullYear()}`,
      ],
      row_count: bilancoRows.length,
      is_balanced: isBalanced,
      imbalance_amount: roundMoney(diff).toNumber(),
      kpi_cards: [
        {
          key: "total_assets",
          label: "Toplam Aktif (Varlıklar)",
          value: roundMoney(toplamAktif).toNumber(),
          format: "money",
        },
        {
          key: "total_liabilities_equity",
          label: "Toplam Pasif (Kaynaklar)",
          value: roundMoney(toplamPasif).toNumber(),
          format: "money",
        },
        {
          key: "working_capital",
          label: "Net İşletme Sermayesi",
          value: roundMoney(donenVarliklar.minus(kvyk)).toNumber(),
          format: "money",
        },
        {
          key: "balance_check",
          label: "Bilanço Denklik Kontrolü",
          value: isBalanced
            ? "TAM DENK (Aktif = Pasif)"
            : `DENGESİZ! Fark: ${roundMoney(diff).toNumber()} ₺`,
          format: "string",
        },
      ],
      columns,
    },
    rows: bilancoRows as unknown as Array<Record<string, unknown>>,
  };
}

/**
 * 4. GELİR TABLOSU MOTORU (VUK Resmî Mali Tablosu)
 */
export function computeGelirTablosu(filters: MaliFilterOptions = {}): MaliReportResult {
  const mizan = computeMizan("genel-mizan", filters);
  const rows = mizan.rows as unknown as MizanRow[];

  let brutSatislar = toDecimal(0); // 600, 601, 602 (Alacak)
  let satisIndirimleri = toDecimal(0); // 610, 611, 612 (Borç)
  let satislarinMaliyeti = toDecimal(0); // 620, 621, 622, 623 (Borç)
  let faaliyetGiderleri = toDecimal(0); // 630, 631, 632 veya 760, 770 yansıtılan (Borç)
  let digerFaaliyetGelirleri = toDecimal(0); // 640-649 (Alacak)
  let digerFaaliyetGiderleri = toDecimal(0); // 650-659 (Borç)
  let finansmanGiderleri = toDecimal(0); // 660-669 veya 780 (Borç)
  let olagandisiGelirler = toDecimal(0); // 670-679 (Alacak)
  let olagandisiGiderler = toDecimal(0); // 680-689 (Borç)
  let vergiKarsiliklari = toDecimal(0); // 691 (Borç)

  const items: GelirTablosuItem[] = [];

  for (const r of rows) {
    const code = r.code;
    const name = r.name;
    const dBal = toDecimal(r.debit_balance);
    const cBal = toDecimal(r.credit_balance);

    // 60: Brüt Satışlar
    if (code.startsWith("60")) {
      const val = cBal.minus(dBal);
      brutSatislar = brutSatislar.plus(val);
      items.push({
        code,
        title: name,
        amount: roundMoney(val).toNumber(),
        level: 3,
        group: "A. BRÜT SATIŞLAR",
      });
    }
    // 61: Satış İndirimleri (-)
    else if (code.startsWith("61")) {
      const val = dBal.minus(cBal);
      satisIndirimleri = satisIndirimleri.plus(val);
      items.push({
        code,
        title: name,
        amount: roundMoney(val).toNumber(),
        level: 3,
        is_deduction: true,
        group: "B. SATIŞ İNDİRİMLERİ (-)",
      });
    }
    // 62: Satışların Maliyeti (-)
    else if (code.startsWith("62")) {
      const val = dBal.minus(cBal);
      satislarinMaliyeti = satislarinMaliyeti.plus(val);
      items.push({
        code,
        title: name,
        amount: roundMoney(val).toNumber(),
        level: 3,
        is_deduction: true,
        group: "C. SATIŞLARIN MALİYETİ (-)",
      });
    }
    // 63: Faaliyet Giderleri (-)
    else if (code.startsWith("63")) {
      const val = dBal.minus(cBal);
      faaliyetGiderleri = faaliyetGiderleri.plus(val);
      items.push({
        code,
        title: name,
        amount: roundMoney(val).toNumber(),
        level: 3,
        is_deduction: true,
        group: "D. FAALİYET GİDERLERİ (-)",
      });
    }
    // Eğer 63 yoksa ve 760/770 yansıtılmamışsa, yönetim/pazarlama hesaplarını da hesaba kat
    else if (code.startsWith("760") || code.startsWith("770")) {
      const val = dBal.minus(cBal);
      if (val.greaterThan(0)) {
        faaliyetGiderleri = faaliyetGiderleri.plus(val);
        items.push({
          code,
          title: `${name} (Dönem İçi Faaliyet Gideri)`,
          amount: roundMoney(val).toNumber(),
          level: 3,
          is_deduction: true,
          group: "D. FAALİYET GİDERLERİ (-)",
        });
      }
    }
    // 64: Diğer Faaliyet Gelirleri
    else if (code.startsWith("64")) {
      const val = cBal.minus(dBal);
      digerFaaliyetGelirleri = digerFaaliyetGelirleri.plus(val);
      items.push({
        code,
        title: name,
        amount: roundMoney(val).toNumber(),
        level: 3,
        group: "E. DİĞER FAALİYET GELİRLERİ",
      });
    }
    // 65: Diğer Faaliyet Giderleri (-)
    else if (code.startsWith("65")) {
      const val = dBal.minus(cBal);
      digerFaaliyetGiderleri = digerFaaliyetGiderleri.plus(val);
      items.push({
        code,
        title: name,
        amount: roundMoney(val).toNumber(),
        level: 3,
        is_deduction: true,
        group: "F. DİĞER FAALİYET GİDERLERİ (-)",
      });
    }
    // 66 veya 780: Finansman Giderleri (-)
    else if (code.startsWith("66") || code.startsWith("780")) {
      const val = dBal.minus(cBal);
      finansmanGiderleri = finansmanGiderleri.plus(val);
      items.push({
        code,
        title: name,
        amount: roundMoney(val).toNumber(),
        level: 3,
        is_deduction: true,
        group: "G. FİNANSMAN GİDERLERİ (-)",
      });
    }
    // 67: Olağandışı Gelirler
    else if (code.startsWith("67")) {
      const val = cBal.minus(dBal);
      olagandisiGelirler = olagandisiGelirler.plus(val);
      items.push({
        code,
        title: name,
        amount: roundMoney(val).toNumber(),
        level: 3,
        group: "H. OLAĞANDIŞI GELİRLER",
      });
    }
    // 68: Olağandışı Giderler (-)
    else if (code.startsWith("68")) {
      const val = dBal.minus(cBal);
      olagandisiGiderler = olagandisiGiderler.plus(val);
      items.push({
        code,
        title: name,
        amount: roundMoney(val).toNumber(),
        level: 3,
        is_deduction: true,
        group: "I. OLAĞANDIŞI GİDERLER (-)",
      });
    }
    // 691: Vergi Karşılıkları (-)
    else if (code.startsWith("691")) {
      const val = dBal.minus(cBal);
      vergiKarsiliklari = vergiKarsiliklari.plus(val);
      items.push({
        code,
        title: name,
        amount: roundMoney(val).toNumber(),
        level: 3,
        is_deduction: true,
        group: "J. DÖNEM KÂRI VERGİ KARŞILIKLARI (-)",
      });
    }
  }

  // Ara Toplam Hesaplamaları
  const netSatislar = brutSatislar.minus(satisIndirimleri);
  const brutKar = netSatislar.minus(satislarinMaliyeti);
  const faaliyetKari = brutKar.minus(faaliyetGiderleri);
  const olaganKar = faaliyetKari
    .plus(digerFaaliyetGelirleri)
    .minus(digerFaaliyetGiderleri)
    .minus(finansmanGiderleri);
  const donemKariVergiOncesi = olaganKar.plus(olagandisiGelirler).minus(olagandisiGiderler);
  const donemNetKari = donemKariVergiOncesi.minus(vergiKarsiliklari);

  // Başlık Ara Toplam Satırları
  const summaryRows: GelirTablosuItem[] = [
    {
      code: "A",
      title: "BRÜT SATIŞLAR",
      amount: roundMoney(brutSatislar).toNumber(),
      level: 1,
      group: "A",
    },
    {
      code: "B",
      title: "SATIŞ İNDİRİMLERİ (-)",
      amount: roundMoney(satisIndirimleri).toNumber(),
      level: 1,
      is_deduction: true,
      group: "B",
    },
    {
      code: "C",
      title: "NET SATIŞLAR",
      amount: roundMoney(netSatislar).toNumber(),
      level: 1,
      group: "C",
    },
    {
      code: "D",
      title: "SATIŞLARIN MALİYETİ (-)",
      amount: roundMoney(satislarinMaliyeti).toNumber(),
      level: 1,
      is_deduction: true,
      group: "D",
    },
    {
      code: "E",
      title: "BRÜT SATIŞ KÂRI VEYA ZARARI",
      amount: roundMoney(brutKar).toNumber(),
      level: 1,
      group: "E",
    },
    {
      code: "F",
      title: "FAALİYET GİDERLERİ (-)",
      amount: roundMoney(faaliyetGiderleri).toNumber(),
      level: 1,
      is_deduction: true,
      group: "F",
    },
    {
      code: "G",
      title: "FAALİYET KÂRI VEYA ZARARI",
      amount: roundMoney(faaliyetKari).toNumber(),
      level: 1,
      group: "G",
    },
    {
      code: "H",
      title: "OLAĞAN KÂR VEYA ZARAR",
      amount: roundMoney(olaganKar).toNumber(),
      level: 1,
      group: "H",
    },
    {
      code: "I",
      title: "DÖNEM KÂRI VEYA ZARARI (Vergi Öncesi)",
      amount: roundMoney(donemKariVergiOncesi).toNumber(),
      level: 1,
      group: "I",
    },
    {
      code: "J",
      title: "DÖNEM NET KÂRI VEYA ZARARI",
      amount: roundMoney(donemNetKari).toNumber(),
      level: 1,
      group: "J",
    },
  ];

  const columns = [
    { key: "code", label: "Kod / Satır" },
    { key: "title", label: "Gelir / Gider Kalemi" },
    { key: "amount", label: "Tutar (₺)" },
    { key: "group", label: "Grup / Başlık" },
  ];

  return {
    meta: {
      report_key: "gelir-tablosu",
      title: "Gelir Tablosu (VUK Resmî Mali Tablosu)",
      subtitle: "VUK 1 Sıra No'lu Muhasebe Sistemi Uygulama Genel Tebliği (MSUGT-1) Standardı",
      is_official_vuk: true,
      standard_version: "VUK / MSUGT-1",
      generated_at: new Date().toLocaleString("tr-TR"),
      data_source: "6'lı ve 7'li Hesap Yevmiye Hareketleri",
      filters: filters as Record<string, unknown>,
      period_labels: [
        filters.date_from ? `Başlangıç: ${filters.date_from}` : "Dönem Başı",
        filters.date_to ? `Bitiş: ${filters.date_to}` : "Güncel",
      ],
      row_count: summaryRows.length + items.length,
      kpi_cards: [
        {
          key: "net_sales",
          label: "Net Satışlar",
          value: roundMoney(netSatislar).toNumber(),
          format: "money",
        },
        {
          key: "gross_profit",
          label: "Brüt Satış Kârı",
          value: roundMoney(brutKar).toNumber(),
          format: "money",
        },
        {
          key: "operating_profit",
          label: "Faaliyet Kârı / (Zararı)",
          value: roundMoney(faaliyetKari).toNumber(),
          format: "money",
        },
        {
          key: "net_profit",
          label: "Dönem Net Kârı / (Zararı)",
          value: roundMoney(donemNetKari).toNumber(),
          format: "money",
        },
      ],
      columns,
    },
    rows: summaryRows.concat(items) as unknown as Array<Record<string, unknown>>,
  };
}

/**
 * 5. NAKİT AKIŞ ANALİZİ (YÖNETİM RAPORU — VUK Resmî Değildir)
 */
export function computeNakitAkis(filters: MaliFilterOptions = {}): MaliReportResult {
  const allVouchers = mockStore.getVouchers();
  const dateFrom = filters.date_from;
  const dateTo = filters.date_to;

  let netOperating = toDecimal(0);
  let netInvesting = toDecimal(0);
  let netFinancing = toDecimal(0);

  const cashRows: Array<{
    category: string;
    description: string;
    inflow: number;
    outflow: number;
    net: number;
  }> = [];

  for (const v of allVouchers) {
    if (!isDateWithin(v.voucher_date, dateFrom, dateTo)) continue;
    if (!Array.isArray(v.lines)) continue;

    // Fişte 100/102 hesabı var mı?
    const hasCash = v.lines.some((l: any) =>
      String(l.coa_code || "").startsWith("100") || String(l.coa_code || "").startsWith("102")
    );
    if (!hasCash) continue;

    for (const ln of v.lines) {
      const code = String(ln.coa_code || "");
      const debit = toDecimal(ln.debit || 0);
      const credit = toDecimal(ln.credit || 0);

      // 120 Müşteri tahsilatları (İşletme faaliyeti girişi)
      if (code.startsWith("120") && credit.greaterThan(0)) {
        netOperating = netOperating.plus(credit);
        cashRows.push({
          category: "İşletme Faaliyetleri",
          description: `Müşteri Tahsilatı — Fiş: ${v.voucher_no}`,
          inflow: roundMoney(credit).toNumber(),
          outflow: 0,
          net: roundMoney(credit).toNumber(),
        });
      }
      // 320 Tedarikçi ödemeleri (İşletme faaliyeti çıkışı)
      else if (code.startsWith("320") && debit.greaterThan(0)) {
        netOperating = netOperating.minus(debit);
        cashRows.push({
          category: "İşletme Faaliyetleri",
          description: `Tedarikçi Ödemesi — Fiş: ${v.voucher_no}`,
          inflow: 0,
          outflow: roundMoney(debit).toNumber(),
          net: roundMoney(debit.negated()).toNumber(),
        });
      }
      // 25 Maddi Duran Varlık alımları (Yatırım faaliyeti çıkışı)
      else if (code.startsWith("25") && debit.greaterThan(0)) {
        netInvesting = netInvesting.minus(debit);
        cashRows.push({
          category: "Yatırım Faaliyetleri",
          description: `Duran Varlık Yatırımı — Fiş: ${v.voucher_no}`,
          inflow: 0,
          outflow: roundMoney(debit).toNumber(),
          net: roundMoney(debit.negated()).toNumber(),
        });
      }
      // 500 Sermaye girişi / 300 Kredi kullanımı (Finansman faaliyeti girişi)
      else if ((code.startsWith("500") || code.startsWith("300")) && credit.greaterThan(0)) {
        netFinancing = netFinancing.plus(credit);
        cashRows.push({
          category: "Finansman Faaliyetleri",
          description: `Sermaye / Kredi Girişi — Fiş: ${v.voucher_no}`,
          inflow: roundMoney(credit).toNumber(),
          outflow: 0,
          net: roundMoney(credit).toNumber(),
        });
      }
    }
  }

  const netCashChange = netOperating.plus(netInvesting).plus(netFinancing);

  const columns = [
    { key: "category", label: "Nakit Akış Kategorisi" },
    { key: "description", label: "Açıklama / Kaynak Fiş" },
    { key: "inflow", label: "Nakit Girişi (₺)" },
    { key: "outflow", label: "Nakit Çıkışı (₺)" },
    { key: "net", label: "Net Nakit Akışı (₺)" },
  ];

  return {
    meta: {
      report_key: "nakit-akis",
      title: "Nakit Akış Analizi (YÖNETİM RAPORU)",
      subtitle: "⚠️ [YÖNETİM RAPORUDUR — VUK Resmî Mali Tablosu Değildir, Karar Destek Amaçlıdır]",
      is_official_vuk: false,
      standard_version: "Yönetim Muhasebesi v2026",
      generated_at: new Date().toLocaleString("tr-TR"),
      data_source: "Kasa/Banka Yevmiye ve Fiş Hareketleri",
      filters: filters as Record<string, unknown>,
      period_labels: [
        filters.date_from ? `Başlangıç: ${filters.date_from}` : "Dönem Başı",
        filters.date_to ? `Bitiş: ${filters.date_to}` : "Güncel",
      ],
      row_count: cashRows.length,
      kpi_cards: [
        {
          key: "operating_cash",
          label: "İşletme Nakit Akışı",
          value: roundMoney(netOperating).toNumber(),
          format: "money",
        },
        {
          key: "investing_cash",
          label: "Yatırım Nakit Akışı",
          value: roundMoney(netInvesting).toNumber(),
          format: "money",
        },
        {
          key: "financing_cash",
          label: "Finansman Nakit Akışı",
          value: roundMoney(netFinancing).toNumber(),
          format: "money",
        },
        {
          key: "net_change",
          label: "Net Nakit Değişimi",
          value: roundMoney(netCashChange).toNumber(),
          format: "money",
        },
      ],
      columns,
    },
    rows: cashRows as unknown as Array<Record<string, unknown>>,
  };
}

/**
 * 6. KÂR / ZARAR VE MALİYET DAĞILIMI (YÖNETİM RAPORU — VUK Resmî Değildir)
 */
export function computeYonetimKarZarar(filters: MaliFilterOptions = {}): MaliReportResult {
  const gelirResult = computeGelirTablosu(filters);
  const mizan = computeMizan("genel-mizan", filters);
  const mizanRows = mizan.rows as unknown as MizanRow[];

  // 7'li Maliyet Dağılımını hesapla
  let direkIlkMadde = toDecimal(0); // 710
  let direkIscilik = toDecimal(0); // 720
  let genelUretim = toDecimal(0); // 730
  let pazarlamaGideri = toDecimal(0); // 760
  let yonetimGideri = toDecimal(0); // 770
  let finansmanGideri = toDecimal(0); // 780

  for (const r of mizanRows) {
    const code = r.code;
    const netCost = toDecimal(r.debit_balance).minus(toDecimal(r.credit_balance));
    if (netCost.lessThanOrEqualTo(0)) continue;

    if (code.startsWith("710")) direkIlkMadde = direkIlkMadde.plus(netCost);
    else if (code.startsWith("720")) direkIscilik = direkIscilik.plus(netCost);
    else if (code.startsWith("730")) genelUretim = genelUretim.plus(netCost);
    else if (code.startsWith("760")) pazarlamaGideri = pazarlamaGideri.plus(netCost);
    else if (code.startsWith("770")) yonetimGideri = yonetimGideri.plus(netCost);
    else if (code.startsWith("780")) finansmanGideri = finansmanGideri.plus(netCost);
  }

  const toplamMaliyet = direkIlkMadde
    .plus(direkIscilik)
    .plus(genelUretim)
    .plus(pazarlamaGideri)
    .plus(yonetimGideri)
    .plus(finansmanGideri);

  const rows = [
    {
      category: "710 Direkt İlk Madde ve Malzeme Giderleri",
      amount: roundMoney(direkIlkMadde).toNumber(),
      share_pct: toplamMaliyet.isZero()
        ? 0
        : roundMoney(direkIlkMadde.times(100).dividedBy(toplamMaliyet), 1).toNumber(),
    },
    {
      category: "720 Direkt İşçilik Giderleri",
      amount: roundMoney(direkIscilik).toNumber(),
      share_pct: toplamMaliyet.isZero()
        ? 0
        : roundMoney(direkIscilik.times(100).dividedBy(toplamMaliyet), 1).toNumber(),
    },
    {
      category: "730 Genel Üretim Giderleri",
      amount: roundMoney(genelUretim).toNumber(),
      share_pct: toplamMaliyet.isZero()
        ? 0
        : roundMoney(genelUretim.times(100).dividedBy(toplamMaliyet), 1).toNumber(),
    },
    {
      category: "760 Pazarlama, Satış ve Dağıtım Giderleri",
      amount: roundMoney(pazarlamaGideri).toNumber(),
      share_pct: toplamMaliyet.isZero()
        ? 0
        : roundMoney(pazarlamaGideri.times(100).dividedBy(toplamMaliyet), 1).toNumber(),
    },
    {
      category: "770 Genel Yönetim Giderleri",
      amount: roundMoney(yonetimGideri).toNumber(),
      share_pct: toplamMaliyet.isZero()
        ? 0
        : roundMoney(yonetimGideri.times(100).dividedBy(toplamMaliyet), 1).toNumber(),
    },
    {
      category: "780 Finansman Giderleri",
      amount: roundMoney(finansmanGideri).toNumber(),
      share_pct: toplamMaliyet.isZero()
        ? 0
        : roundMoney(finansmanGideri.times(100).dividedBy(toplamMaliyet), 1).toNumber(),
    },
  ];

  const columns = [
    { key: "category", label: "Maliyet / Fonksiyon Kalemi" },
    { key: "amount", label: "Toplam Maliyet Tutarı (₺)" },
    { key: "share_pct", label: "Toplam İçindeki Payı (%)" },
  ];

  return {
    meta: {
      report_key: "kar-zarar",
      title: "Maliyet ve Kârlılık Yönetim Raporu",
      subtitle: "⚠️ [YÖNETİM RAPORUDUR — VUK Resmî Mali Tablosu Değildir, 7/A Maliyet Odaklıdır]",
      is_official_vuk: false,
      standard_version: "7/A Seçeneği Maliyet Muhasebesi",
      generated_at: new Date().toLocaleString("tr-TR"),
      data_source: "7'li Hesap Grubu ve Yevmiye Fişleri",
      filters: filters as Record<string, unknown>,
      period_labels: [
        filters.date_from ? `Başlangıç: ${filters.date_from}` : "Dönem Başı",
        filters.date_to ? `Bitiş: ${filters.date_to}` : "Güncel",
      ],
      row_count: rows.length,
      kpi_cards: [
        {
          key: "total_cost",
          label: "Toplam Faaliyet ve İmalat Maliyeti",
          value: roundMoney(toplamMaliyet).toNumber(),
          format: "money",
        },
        {
          key: "net_sales",
          label: "Net Satış Geliri",
          value: gelirResult.meta.kpi_cards.find((k) => k.key === "net_sales")?.value || 0,
          format: "money",
        },
        {
          key: "net_income",
          label: "Dönem Net Kârı",
          value: gelirResult.meta.kpi_cards.find((k) => k.key === "net_profit")?.value || 0,
          format: "money",
        },
      ],
      columns,
    },
    rows: rows as unknown as Array<Record<string, unknown>>,
  };
}

/**
 * 7. AI MALİ TABLO YORUMU & FİNANSAL ORAN ANALİZİ MOTORU
 * Kesin İlkeler (Madde 8 & 9):
 * - AI yalnızca gerçek hesaplanan rapor verilerini (Bilanço ve Gelir Tablosu) kullanır.
 * - AI metni asla rapor rakamlarını değiştiremez veya sahte veri gönderemez.
 * - AI servisi yoksa/offline ise kural tabanlı finansal analiz motoru eksiksiz çalışır.
 */
export function getAiMaliTabloAnalysis(
  reportType: string,
  filters: MaliFilterOptions = {}
): {
  analysis_text: string;
  financial_ratios: Array<{ name: string; value: string; benchmark: string; status: string }>;
  is_ai_live: boolean;
  service_status: string;
  period_label: string;
} {
  const bilanco = computeBilanco(filters);
  const gelir = computeGelirTablosu(filters);

  const totalAssets = toDecimal(
    (bilanco.meta.kpi_cards.find((k) => k.key === "total_assets")?.value as number) || 0
  );
  const totalLiabilities = toDecimal(
    (bilanco.meta.kpi_cards.find((k) => k.key === "total_liabilities_equity")?.value as number) || 0
  );
  const workingCapital = toDecimal(
    (bilanco.meta.kpi_cards.find((k) => k.key === "working_capital")?.value as number) || 0
  );

  const netSales = toDecimal(
    (gelir.meta.kpi_cards.find((k) => k.key === "net_sales")?.value as number) || 0
  );
  const grossProfit = toDecimal(
    (gelir.meta.kpi_cards.find((k) => k.key === "gross_profit")?.value as number) || 0
  );
  const operatingProfit = toDecimal(
    (gelir.meta.kpi_cards.find((k) => k.key === "operating_profit")?.value as number) || 0
  );
  const netProfit = toDecimal(
    (gelir.meta.kpi_cards.find((k) => k.key === "net_profit")?.value as number) || 0
  );

  // Oran hesaplamaları
  const grossMargin = netSales.isZero()
    ? "0.0%"
    : `%${roundMoney(grossProfit.times(100).dividedBy(netSales), 1).toNumber()}`;
  const netMargin = netSales.isZero()
    ? "0.0%"
    : `%${roundMoney(netProfit.times(100).dividedBy(netSales), 1).toNumber()}`;
  const operatingMargin = netSales.isZero()
    ? "0.0%"
    : `%${roundMoney(operatingProfit.times(100).dividedBy(netSales), 1).toNumber()}`;

  const ratios = [
    {
      name: "Brüt Kâr Marjı (Gross Margin)",
      value: grossMargin,
      benchmark: "%20 - %35",
      status: grossProfit.greaterThan(0) ? "İYİ" : "DİKKAT",
    },
    {
      name: "Faaliyet Kâr Marjı (Operating Margin)",
      value: operatingMargin,
      benchmark: "%10 - %20",
      status: operatingProfit.greaterThan(0) ? "İYİ" : "KRİTİK",
    },
    {
      name: "Net Kâr Marjı (Net Profit Margin)",
      value: netMargin,
      benchmark: "%5 - %15",
      status: netProfit.greaterThan(0) ? "NORMAL" : "ZARAR",
    },
    {
      name: "Net Çalışma Sermayesi (Working Capital)",
      value: `${roundMoney(workingCapital).toNumber().toLocaleString("tr-TR")} ₺`,
      benchmark: "> 0 ₺",
      status: workingCapital.greaterThan(0) ? "GÜÇLÜ" : "RİSKLİ",
    },
    {
      name: "Bilanço Denklik Doğrulaması",
      value: bilanco.meta.is_balanced ? "TAM DENK" : "DENGESİZ",
      benchmark: "Aktif = Pasif",
      status: bilanco.meta.is_balanced ? "DOĞRULANDI" : "HATA",
    },
  ];

  const analysis = `### 📊 Mali Tablolar Yönetim Özeti & Finansal Sağlık Analizi

**Rapor Dönemi:** ${bilanco.meta.period_labels.join(" · ")}  
**Mevzuat Uyumu:** ${bilanco.meta.standard_version} (VUK / MSUGT)

1. **Varlık ve Kaynak Dengesi:**
   - Toplam Aktif Büyüklüğü: **${roundMoney(totalAssets).toNumber().toLocaleString("tr-TR")} ₺**
   - Toplam Pasif ve Öz Kaynaklar: **${roundMoney(totalLiabilities).toNumber().toLocaleString("tr-TR")} ₺**
   - Bilanço Eşitlik Durumu: **${bilanco.meta.is_balanced ? "✅ Aktif ve Pasif kuruşu kuruşuna denktir." : "⚠️ Aktif ve Pasif arasında fark mevcuttur! Lütfen yevmiye kayıtlarını gözden geçirin."}**
   - Net Çalışma Sermayesi (Dönen Varlıklar - KVYK): **${roundMoney(workingCapital).toNumber().toLocaleString("tr-TR")} ₺** (${workingCapital.greaterThan(0) ? "Şirketin kısa vadeli borçlarını ödeme kapasitesi yeterlidir." : "Kısa vadeli likidite riski mevcuttur."})

2. **Kârlılık ve Gelir Tablosu Performansı:**
   - Net Satışlar: **${roundMoney(netSales).toNumber().toLocaleString("tr-TR")} ₺**
   - Brüt Satış Kârı: **${roundMoney(grossProfit).toNumber().toLocaleString("tr-TR")} ₺** (Brüt Marj: ${grossMargin})
   - Faaliyet Kârı: **${roundMoney(operatingProfit).toNumber().toLocaleString("tr-TR")} ₺**
   - Dönem Net Kârı: **${roundMoney(netProfit).toNumber().toLocaleString("tr-TR")} ₺** (Net Kâr Marjı: ${netMargin})

3. **Uzman Değerlendirmesi:**
   Şirketin dönem içi operasyonel kârlılığı ${netProfit.greaterThan(0) ? "pozitif seyretmekte olup öz kaynak yapısını desteklemektedir." : "negatif seviyede olup maliyet kontrolü önerilmektedir."}
   Rapor verileri VUK Tekdüzen Hesap Planı kaynak yevmiye fişlerinden dinamik olarak türetilmiş olup harici/sahte değer içermemektedir.`;

  return {
    analysis_text: analysis,
    financial_ratios: ratios,
    is_ai_live: false, // Dış bulut LLM bağımlılığı olmadan yerel kural motoru devrede
    service_status: "Yerel Mevzuat ve Oran Analiz Motoru Aktif (Tam Doğruluk)",
    period_label: bilanco.meta.period_labels.join(" · "),
  };
}
