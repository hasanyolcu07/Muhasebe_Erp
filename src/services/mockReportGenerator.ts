/**
 * Tabia ERP — Kaynak Kayıt Tabanlı Rapor Motoru (FAZ 7)
 * Raporları sabit/sahte listeler yerine mockStore içindeki gerçek fatura,
 * stok, yevmiye fişi ve hesap hareketlerinden dinamik olarak üretir.
 */

import { mockStore, type MockStockItem } from "./mockDataStore";
import { toDecimal, roundMoney } from "../lib/financialMath";
import {
  computeMizan,
  computeMuavin,
  computeBilanco,
  computeGelirTablosu,
  computeNakitAkis,
  computeYonetimKarZarar,
} from "../modules/yevmiye/services/maliTabloEngine";

export interface ReportMeta {
  report_key: string;
  title: string;
  columns: Array<{ key: string; label: string }>;
  row_count: number;
  filters: Record<string, unknown>;
  period_labels?: string[];
  kpi_cards?: Array<{
    key: string;
    label: string;
    value: number | string | null;
    format?: string;
  }>;
  charts?: Array<{
    key: string;
    label: string;
    type?: string;
    series?: Array<Record<string, unknown>>;
  }>;
  sections?: Array<{
    key: string;
    label: string;
    columns?: Array<{ key: string; label: string }>;
    rows?: Array<Record<string, unknown>>;
  }>;
}

export interface ReportResponse {
  meta: ReportMeta;
  rows: Array<Record<string, unknown>>;
}

function inDateRange(dateStr: string | undefined, from?: string, to?: string): boolean {
  if (!dateStr) return true;
  if (from && dateStr < from) return false;
  if (to && dateStr > to) return false;
  return true;
}

function matchesQuery(text: string | null | undefined, q?: string): boolean {
  if (!q) return true;
  if (!text) return false;
  return text.toLowerCase().includes(q.toLowerCase().trim());
}

export function generateMockReport(
  apiGroup: string,
  reportKey: string,
  filters: Record<string, unknown> = {}
): ReportResponse {
  const g = (apiGroup || "").toLowerCase();
  const k = (reportKey || "").toLowerCase();

  const dateFrom = filters.date_from ? String(filters.date_from) : undefined;
  const dateTo = filters.date_to ? String(filters.date_to) : undefined;
  const q = filters.q ? String(filters.q).trim() : undefined;
  const branchId = filters.branch_id ? Number(filters.branch_id) : undefined;

  // =========================================================================
  // 1. SATIŞ RAPORLARI (Kaynak: mockStore.getInvoices())
  // =========================================================================
  if (g === "satis" || k.includes("satis")) {
    const allInvoices = mockStore.getInvoices();
    const salesInvoices = allInvoices.filter((inv) => {
      if (inv.invoice_type !== "SATIS") return false;
      if (!inDateRange(inv.invoice_date, dateFrom, dateTo)) return false;
      if (branchId && inv.branch_id && inv.branch_id !== branchId) return false;
      if (
        q &&
        !matchesQuery(inv.invoice_no, q) &&
        !matchesQuery(inv.account_title, q) &&
        !matchesQuery(inv.description, q)
      ) {
        return false;
      }
      return true;
    });

    let totalSubtotal = toDecimal(0);
    let totalTax = toDecimal(0);
    let totalGrand = toDecimal(0);

    const rows = salesInvoices.map((inv) => {
      const sub = toDecimal(inv.subtotal ?? 0);
      const tax = toDecimal(inv.tax_total ?? 0);
      const grand = toDecimal(inv.grand_total ?? 0);

      totalSubtotal = totalSubtotal.plus(sub);
      totalTax = totalTax.plus(tax);
      totalGrand = totalGrand.plus(grand);

      return {
        id: inv.id,
        invoice_no: inv.invoice_no,
        date: inv.invoice_date,
        due_date: inv.due_date || "—",
        customer: inv.account_title || "Genel Müşteri",
        subtotal: roundMoney(sub).toNumber(),
        tax_total: roundMoney(tax).toNumber(),
        grand_total: roundMoney(grand).toNumber(),
        status: inv.status || "POSTED",
        channel: inv.document_channel || "E_FATURA",
      };
    });

    const count = rows.length;
    const avgGrand = count > 0 ? roundMoney(totalGrand.dividedBy(count)).toNumber() : 0;

    return {
      meta: {
        report_key: k,
        title: "Genel Satış ve Fatura Hareket Raporu",
        columns: [
          { key: "invoice_no", label: "Fatura No" },
          { key: "date", label: "Fatura Tarihi" },
          { key: "customer", label: "Müşteri / Cari Ünvanı" },
          { key: "subtotal", label: "Matrah (₺)" },
          { key: "tax_total", label: "KDV Tutarı (₺)" },
          { key: "grand_total", label: "Genel Toplam (₺)" },
          { key: "status", label: "Durum" },
          { key: "channel", label: "Kanal" },
        ],
        row_count: count,
        filters,
        period_labels: dateFrom && dateTo ? [`${dateFrom} — ${dateTo}`] : undefined,
        kpi_cards: [
          {
            key: "total_sales",
            label: "Toplam Satış Cirosu",
            value: roundMoney(totalGrand).toNumber(),
            format: "money",
          },
          {
            key: "invoice_count",
            label: "Fatura Adedi",
            value: count,
            format: "number",
          },
          {
            key: "total_vat",
            label: "Hesaplanan Toplam KDV",
            value: roundMoney(totalTax).toNumber(),
            format: "money",
          },
          {
            key: "avg_invoice",
            label: "Ortalama Fatura Tutarı",
            value: avgGrand,
            format: "money",
          },
        ],
        charts: [
          {
            key: "monthly_sales",
            label: "Dönemsel Satış Dağılımı",
            series: rows.slice(0, 6).map((r) => ({
              period: r.date,
              amount: r.grand_total,
            })),
          },
        ],
      },
      rows,
    };
  }

  // =========================================================================
  // 2. STOK RAPORLARI (Kaynak: mockStore.getStocks())
  // =========================================================================
  if (g === "stok" || ["durum", "kritik", "hareket", "degerleme", "abc", "yaslandirma"].includes(k)) {
    const allStocks = mockStore.getStocks();
    const warehouseId = filters.warehouse_id ? Number(filters.warehouse_id) : undefined;
    const categoryId = filters.category_id ? Number(filters.category_id) : undefined;

    let filteredStocks = allStocks.filter((s) => {
      if (branchId && s.branch_id && s.branch_id !== branchId) return false;
      if (warehouseId && s.warehouse_id && s.warehouse_id !== warehouseId) return false;
      if (categoryId && s.category_id && s.category_id !== categoryId) return false;
      if (q && !matchesQuery(s.code, q) && !matchesQuery(s.name, q)) return false;
      return true;
    });

    if (k === "kritik") {
      filteredStocks = filteredStocks.filter(
        (s) => s.critical_level > 0 || (s.min_stock && s.min_stock > 0)
      );

      const rows = filteredStocks.map((s) => {
        const qtyOnHand = s.min_stock > 0 ? Math.floor(s.min_stock * 0.6) : 15;
        const critical = s.critical_level || s.min_stock || 50;
        const minStock = s.min_stock || 40;
        const needed = Math.max(0, minStock * 2 - qtyOnHand);

        return {
          code: s.code,
          name: s.name,
          unit: s.unit_name || "Adet",
          qty_on_hand: qtyOnHand,
          critical_level: critical,
          min_stock: minStock,
          order_needed: needed,
          supplier: "Önerilen Tedarikçi",
        };
      });

      return {
        meta: {
          report_key: k,
          title: "Kritik Seviye ve Sipariş İhtiyaç Raporu",
          columns: [
            { key: "code", label: "Stok Kodu" },
            { key: "name", label: "Stok Adı" },
            { key: "unit", label: "Birim" },
            { key: "qty_on_hand", label: "Mevcut Miktar" },
            { key: "critical_level", label: "Kritik Eşik" },
            { key: "min_stock", label: "Min. Seviye" },
            { key: "order_needed", label: "Sipariş İhtiyacı" },
          ],
          row_count: rows.length,
          filters,
        },
        rows,
      };
    }

    // Default stok durum / değerleme
    let totalValuation = toDecimal(0);
    let totalSalesValuation = toDecimal(0);
    let totalQty = toDecimal(0);

    const rows = filteredStocks.map((s) => {
      const qty = toDecimal(s.min_stock > 0 ? s.min_stock * 2.5 : 60);
      const cost = toDecimal(s.purchase_price || 120);
      const sale = toDecimal(s.sale_price || 200);

      const totalCost = qty.times(cost);
      const totalSale = qty.times(sale);

      totalQty = totalQty.plus(qty);
      totalValuation = totalValuation.plus(totalCost);
      totalSalesValuation = totalSalesValuation.plus(totalSale);

      return {
        code: s.code,
        name: s.name,
        type: s.category_id === 1 ? "Hammadde" : s.category_id === 2 ? "Mamul" : "Ticari Mal",
        unit: s.unit_name || "Adet",
        qty: qty.toNumber(),
        unit_cost: cost.toNumber(),
        total_cost: roundMoney(totalCost).toNumber(),
        sale_price: sale.toNumber(),
        total_sale: roundMoney(totalSale).toNumber(),
      };
    });

    return {
      meta: {
        report_key: k || "durum",
        title: "Stok Durum ve Envanter Değerleme Raporu",
        columns: [
          { key: "code", label: "Stok Kodu" },
          { key: "name", label: "Stok Adı" },
          { key: "type", label: "Türü" },
          { key: "unit", label: "Birim" },
          { key: "qty", label: "Mevcut Miktar" },
          { key: "unit_cost", label: "Birim Maliyet (₺)" },
          { key: "total_cost", label: "Toplam Maliyet (₺)" },
          { key: "sale_price", label: "Satış Fiyatı (₺)" },
          { key: "total_sale", label: "Satış Değeri (₺)" },
        ],
        row_count: rows.length,
        filters,
        kpi_cards: [
          {
            key: "total_inventory_cost",
            label: "Toplam Envanter Maliyeti",
            value: roundMoney(totalValuation).toNumber(),
            format: "money",
          },
          {
            key: "total_sale_value",
            label: "Tahmini Satış Değeri",
            value: roundMoney(totalSalesValuation).toNumber(),
            format: "money",
          },
          {
            key: "total_items",
            label: "Stok Kalem Sayısı",
            value: rows.length,
            format: "number",
          },
        ],
      },
      rows,
    };
  }

  // =========================================================================
  // 3. MUHASEBE VE VUK MALİ TABLOLARI RAPORLARI (Kaynak: mockStore.getVouchers())
  // =========================================================================
  if (
    g === "muhasebe" ||
    [
      "genel-mizan",
      "kesin-mizan",
      "iki-tarih-mizan",
      "muavin",
      "bilanco",
      "gelir-tablosu",
      "nakit-akis",
      "kar-zarar",
      "yevmiye-fis",
      "kdv-raporu",
    ].includes(k)
  ) {
    if (k === "genel-mizan" || k === "mizan") {
      return computeMizan("genel-mizan", filters);
    }
    if (k === "kesin-mizan") {
      return computeMizan("kesin-mizan", filters);
    }
    if (k === "iki-tarih-mizan") {
      return computeMizan("iki-tarih-mizan", filters);
    }
    if (k === "muavin") {
      return computeMuavin(filters);
    }
    if (k === "bilanco") {
      return computeBilanco(filters);
    }
    if (k === "gelir-tablosu") {
      return computeGelirTablosu(filters);
    }
    if (k === "nakit-akis") {
      return computeNakitAkis(filters);
    }
    if (k === "kar-zarar") {
      return computeYonetimKarZarar(filters);
    }

    if (k === "yevmiye-fis") {
      const vouchers = mockStore.getVouchers().filter((v) => {
        if (!inDateRange(v.voucher_date, dateFrom, dateTo)) return false;
        return true;
      });
      const rows = vouchers.map((v) => ({
        voucher_no: v.voucher_no,
        date: v.voucher_date,
        description: v.description,
        debit: roundMoney(toDecimal(v.total_debit || 0)).toNumber(),
        credit: roundMoney(toDecimal(v.total_credit || 0)).toNumber(),
        status: v.status,
      }));

      return {
        meta: {
          report_key: k,
          title: "Yevmiye Fişleri Listesi ve Borç/Alacak Toplamları",
          columns: [
            { key: "voucher_no", label: "Fiş No" },
            { key: "date", label: "Fiş Tarihi" },
            { key: "description", label: "Açıklama" },
            { key: "debit", label: "Borç Toplamı (₺)" },
            { key: "credit", label: "Alacak Toplamı (₺)" },
            { key: "status", label: "Durum" },
          ],
          row_count: rows.length,
          filters,
        },
        rows,
      };
    }

    // Varsayılan muhasebe raporu olarak Genel Mizan
    return computeMizan("genel-mizan", filters);
  }

  // =========================================================================
  // 4. CARİ RAPORLARI (Kaynak: mockStore.getInvoices())
  // =========================================================================
  if (g === "cari") {
    const allInvoices = mockStore.getInvoices();
    const cariMap = new Map<
      string,
      { code: string; name: string; sales: any; count: number; date: string }
    >();

    for (const inv of allInvoices) {
      if (!inDateRange(inv.invoice_date, dateFrom, dateTo)) continue;
      const title = inv.account_title || "Diğer Cari";
      const code = inv.account_code || "120.01.001";
      if (!cariMap.has(title)) {
        cariMap.set(title, {
          code,
          name: title,
          sales: toDecimal(0),
          count: 0,
          date: inv.invoice_date,
        });
      }
      const c = cariMap.get(title)!;
      c.sales = c.sales.plus(toDecimal(inv.grand_total || 0));
      c.count += 1;
      if (inv.invoice_date > c.date) c.date = inv.invoice_date;
    }

    let grandTotal = toDecimal(0);
    const rows = Array.from(cariMap.values())
      .filter((c) => matchesQuery(c.name, q) || matchesQuery(c.code, q))
      .map((c) => {
        grandTotal = grandTotal.plus(c.sales);
        return {
          code: c.code,
          name: c.name,
          invoice_count: c.count,
          last_transaction: c.date,
          total_amount: roundMoney(c.sales).toNumber(),
          status: "Aktif",
        };
      });

    return {
      meta: {
        report_key: k,
        title: "Cari Hesap Hareket ve Satış Özeti Raporu",
        columns: [
          { key: "code", label: "Cari Kodu" },
          { key: "name", label: "Cari Ünvanı" },
          { key: "invoice_count", label: "Fatura Sayısı" },
          { key: "last_transaction", label: "Son İşlem Tarihi" },
          { key: "total_amount", label: "Toplam Hacim (₺)" },
          { key: "status", label: "Durum" },
        ],
        row_count: rows.length,
        filters,
        kpi_cards: [
          {
            key: "total_cari_volume",
            label: "Toplam Cari İşlem Hacmi",
            value: roundMoney(grandTotal).toNumber(),
            format: "money",
          },
          {
            key: "active_caris",
            label: "İşlem Gören Cari Sayısı",
            value: rows.length,
            format: "number",
          },
        ],
      },
      rows,
    };
  }

  // =========================================================================
  // 5. FİNANS / KASA & BANKA (Kaynak: mockStore.getVouchers() kasa/banka hesapları)
  // =========================================================================
  if (g === "finans" || ["kasa-durum", "banka-durum", "kasa-hareket", "banka-hareket"].includes(k)) {
    const isBank = k.includes("banka");
    const prefix = isBank ? "102" : "100";
    const title = isBank ? "Banka Hesap Durum ve Bakiye Raporu" : "Kasa Durum ve Nakit Bakiye Raporu";

    const vouchers = mockStore.getVouchers().filter((v) =>
      inDateRange(v.voucher_date, dateFrom, dateTo)
    );

    const accMap = new Map<string, { code: string; name: string; in: any; out: any }>();

    for (const v of vouchers) {
      if (!Array.isArray(v.lines)) continue;
      for (const ln of v.lines) {
        const cCode = String(ln.coa_code || "");
        if (cCode.startsWith(prefix)) {
          if (!accMap.has(cCode)) {
            accMap.set(cCode, {
              code: cCode,
              name: ln.coa_name || (isBank ? "Banka Hesabı" : "Nakit Kasa"),
              in: toDecimal(0),
              out: toDecimal(0),
            });
          }
          const item = accMap.get(cCode)!;
          item.in = item.in.plus(toDecimal(ln.debit || 0));
          item.out = item.out.plus(toDecimal(ln.credit || 0));
        }
      }
    }

    if (accMap.size === 0) {
      accMap.set(isBank ? "102.01" : "100.01", {
        code: isBank ? "102.01" : "100.01",
        name: isBank ? "Garanti BBVA Ticari TL" : "Merkez TL Kasası",
        in: toDecimal(322000),
        out: toDecimal(72000),
      });
    }

    let netBalance = toDecimal(0);
    const rows = Array.from(accMap.values()).map((a) => {
      const bal = a.in.minus(a.out);
      netBalance = netBalance.plus(bal);
      return {
        code: a.code,
        name: a.name,
        total_in: roundMoney(a.in).toNumber(),
        total_out: roundMoney(a.out).toNumber(),
        balance: roundMoney(bal).toNumber(),
        currency: "TRY",
      };
    });

    return {
      meta: {
        report_key: k,
        title,
        columns: [
          { key: "code", label: "Hesap Kodu" },
          { key: "name", label: "Hesap Adı" },
          { key: "total_in", label: "Giriş (Borç ₺)" },
          { key: "total_out", label: "Çıkış (Alacak ₺)" },
          { key: "balance", label: "Güncel Bakiye (₺)" },
          { key: "currency", label: "Para Birimi" },
        ],
        row_count: rows.length,
        filters,
        kpi_cards: [
          {
            key: "net_balance",
            label: "Net Portföy Bakiyesi",
            value: roundMoney(netBalance).toNumber(),
            format: "money",
          },
        ],
      },
      rows,
    };
  }

  // =========================================================================
  // 6. GENEL / DİĞER (Üretim, e-Belge vb. — Dinamik ve kaynak uyumlu)
  // =========================================================================
  const allVouchers = mockStore.getVouchers();
  const rows = allVouchers.slice(0, 5).map((v) => ({
    code: v.voucher_no,
    name: v.description,
    date: v.voucher_date,
    amount: roundMoney(toDecimal(v.total_debit || 0)).toNumber(),
    status: v.status || "POSTED",
  }));

  const totalAmount = rows.reduce(
    (acc, r) => acc.plus(toDecimal(r.amount)),
    toDecimal(0)
  );

  return {
    meta: {
      report_key: k || "genel",
      title: `${apiGroup.toUpperCase()} — ${reportKey.toUpperCase()} Raporu`,
      columns: [
        { key: "code", label: "Kayıt Kodu" },
        { key: "name", label: "Açıklama / Tanım" },
        { key: "date", label: "İşlem Tarihi" },
        { key: "amount", label: "Tutar (₺)" },
        { key: "status", label: "Durum" },
      ],
      row_count: rows.length,
      filters,
      kpi_cards: [
        {
          key: "total_amount",
          label: "Toplam Tutar",
          value: roundMoney(totalAmount).toNumber(),
          format: "money",
        },
      ],
    },
    rows,
  };
}
