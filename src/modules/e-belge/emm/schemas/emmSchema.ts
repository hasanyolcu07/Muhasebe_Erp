import { z } from "zod";

const lineSchema = z.object({
  stock_id: z.number().nullable().optional(),
  description: z.string().nullable().optional(),
  qty: z.coerce.number().positive("Miktar 0'dan büyük olmalıdır"),
  unit_id: z.number().nullable().optional(),
  unit_code: z.string().nullable().optional(),
  unit_price: z.coerce.number().min(0, "Birim fiyat geçersiz"),
});

export const emmFormSchema = z.object({
  branch_id: z.coerce.number().positive("Şube zorunludur"),
  record_type_id: z.coerce.number().positive("Kayıt türü zorunludur"),
  account_id: z.coerce.number().positive("Müstahsil (çiftçi) zorunludur"),
  receipt_date: z.string().min(1, "Makbuz tarihi zorunludur"),
  receipt_no: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  stopaj_rate: z.coerce.number().min(0).max(100).default(0),
  tevkifat_rate: z.coerce.number().min(0).max(100).default(0),
  lines: z.array(lineSchema).min(1, "En az bir kalem giriniz"),
});

export type EmmFormValues = z.infer<typeof emmFormSchema>;

export function emptyEmmForm(branchId: number, recordTypeId: number): EmmFormValues {
  const today = new Date().toISOString().slice(0, 10);
  return {
    branch_id: branchId,
    record_type_id: recordTypeId,
    account_id: 0,
    receipt_date: today,
    receipt_no: "",
    description: "",
    stopaj_rate: 2,
    tevkifat_rate: 0,
    lines: [{ stock_id: null, description: "", qty: 1, unit_code: "KG", unit_price: 0 }],
  };
}

export function calcLineTotal(qty: number, unitPrice: number): number {
  return Math.round(Number(qty || 0) * Number(unitPrice || 0) * 100) / 100;
}

export function calcTotals(values: Pick<EmmFormValues, "lines" | "stopaj_rate" | "tevkifat_rate">) {
  const subtotal = values.lines.reduce((s, ln) => s + calcLineTotal(ln.qty, ln.unit_price), 0);
  const stopaj = Math.round(subtotal * Number(values.stopaj_rate || 0)) / 100;
  const tevkifat = Math.round(subtotal * Number(values.tevkifat_rate || 0)) / 100;
  const grand = Math.max(0, Math.round((subtotal - stopaj - tevkifat) * 100) / 100);
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    stopaj_amount: Math.round(stopaj * 100) / 100,
    tevkifat_amount: Math.round(tevkifat * 100) / 100,
    grand_total: grand,
  };
}
