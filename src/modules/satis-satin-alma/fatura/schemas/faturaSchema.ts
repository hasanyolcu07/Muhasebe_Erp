import { z } from "zod";
import type { InvoiceTypeCode } from "../constants/invoiceTypes";
import { calculateInvoiceTotalsExact } from "@/lib/financialMath";

export const faturaLineSchema = z.object({
  stock_id: z.number().nullable().optional(),
  description: z.string().max(255).optional().nullable(),
  qty: z.coerce.number().positive("Miktar sıfırdan büyük olmalı"),
  unit_id: z.number().nullable().optional(),
  unit_price: z.coerce.number().min(0),
  discount_pct: z.coerce.number().min(0).max(100).default(0),
  discount_pct_2: z.coerce.number().min(0).max(100).default(0),
  discount_pct_3: z.coerce.number().min(0).max(100).default(0),
  discount_amount: z.coerce.number().min(0).default(0),
  tax_rate_id: z.number().nullable().optional(),
  tax_rate: z.coerce.number().min(0).max(100).default(20),
  istisna_code: z.string().max(40).optional().nullable(),
  tevkifat_code: z.string().max(40).optional().nullable(),
  tevkifat_rate: z.coerce.number().min(0).max(100).default(0),
  override_istisna: z.boolean().default(false),
  override_tevkifat: z.boolean().default(false),
});

export const faturaFormSchema = z.object({
  branch_id: z.number().int().positive(),
  record_type_id: z.number().int().positive(),
  invoice_type: z.string(),
  account_id: z.number().int().positive("Cari seçimi zorunludur"),
  invoice_date: z.string().min(1),
  due_date: z.string().optional().nullable(),
  invoice_no: z.string().max(64).optional().nullable(),
  currency_id: z.number().nullable().optional(),
  exchange_rate: z.coerce.number().positive().default(1),
  vat_included: z.boolean().default(false),
  footer_discount_pct: z.coerce.number().min(0).max(100).default(0),
  footer_discount_pct_2: z.coerce.number().min(0).max(100).default(0),
  footer_discount_pct_3: z.coerce.number().min(0).max(100).default(0),
  description: z.string().optional().nullable(),
  order_id: z.number().nullable().optional(),
  dispatch_id: z.number().nullable().optional(),
  quotation_order_id: z.number().nullable().optional(),
  irsaliyeli_fatura: z.boolean().default(false),
  tevkifat_code: z.string().max(40).optional().nullable(),
  tevkifat_rate: z.coerce.number().min(0).max(100).default(0),
  istisna_code: z.string().max(40).optional().nullable(),
  ozel_matrah_code: z.string().max(40).optional().nullable(),
  ozel_matrah_amount: z.coerce.number().min(0).default(0),
  document_channel: z.enum(["KAGIT", "E_FATURA", "E_ARSIV"]).default("KAGIT"),
  project_code: z.string().max(64).optional().nullable(),
  cost_center_code: z.string().max(64).optional().nullable(),
  lines: z.array(faturaLineSchema).min(1, "En az bir kalem gerekli"),
});

export type FaturaFormValues = z.infer<typeof faturaFormSchema>;
export type FaturaLineValues = z.infer<typeof faturaLineSchema>;

export function emptyLine(): FaturaLineValues {
  return {
    stock_id: null,
    description: "",
    qty: 1,
    unit_id: null,
    unit_price: 0,
    discount_pct: 0,
    discount_pct_2: 0,
    discount_pct_3: 0,
    discount_amount: 0,
    tax_rate_id: null,
    tax_rate: 20,
    istisna_code: "",
    tevkifat_code: "",
    tevkifat_rate: 0,
    override_istisna: false,
    override_tevkifat: false,
  };
}

export function emptyFaturaForm(
  branchId: number,
  recordTypeId: number,
  invoiceType: InvoiceTypeCode
): FaturaFormValues {
  const today = new Date().toISOString().slice(0, 10);
  return {
    branch_id: branchId,
    record_type_id: recordTypeId,
    invoice_type: invoiceType,
    account_id: 0,
    invoice_date: today,
    due_date: today,
    invoice_no: "",
    currency_id: null,
    exchange_rate: 1,
    vat_included: false,
    footer_discount_pct: 0,
    footer_discount_pct_2: 0,
    footer_discount_pct_3: 0,
    description: "",
    order_id: null,
    dispatch_id: null,
    quotation_order_id: null,
    irsaliyeli_fatura: false,
    tevkifat_code: "",
    tevkifat_rate: 0,
    istisna_code: "",
    ozel_matrah_code: "",
    ozel_matrah_amount: 0,
    document_channel: "KAGIT",
    project_code: "",
    cost_center_code: "",
    lines: [emptyLine()],
  };
}

function applyCascade(amount: number, pcts: number[]): { remaining: number; disc: number } {
  let remaining = amount;
  let disc = 0;
  for (const pct of pcts) {
    if (pct > 0) {
      const d = remaining * (pct / 100);
      disc += d;
      remaining -= d;
    }
  }
  return { remaining: Math.max(remaining, 0), disc };
}

export function computeClientTotals(
  lines: FaturaLineValues[],
  vatIncluded: boolean,
  footerDiscountPct: number,
  tevkifatRate: number,
  footerDiscountPct2 = 0,
  footerDiscountPct3 = 0
) {
  const result = calculateInvoiceTotalsExact(
    lines,
    vatIncluded,
    footerDiscountPct,
    tevkifatRate,
    footerDiscountPct2,
    footerDiscountPct3
  );

  return {
    subtotal: result.subtotal,
    discountTotal: result.discountTotal,
    taxTotal: result.taxTotal,
    tevkifat: result.tevkifat,
    grandTotal: result.grandTotal,
    taxByRate: result.taxByRate,
  };
}
