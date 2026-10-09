import { z } from "zod";
import type { WaybillTypeCode } from "../constants/dispatchTypes";

export const irsaliyeLineSchema = z.object({
  stock_id: z.number().nullable().optional(),
  description: z.string().max(255).optional().nullable(),
  qty: z.coerce.number().positive("Miktar sıfırdan büyük olmalı"),
  unit_id: z.number().nullable().optional(),
  unit_price: z.coerce.number().min(0).default(0),
  discount_pct: z.coerce.number().min(0).max(100).default(0),
  tax_rate_id: z.number().nullable().optional(),
  tax_rate: z.coerce.number().min(0).default(20),
});

export const irsaliyeFormSchema = z.object({
  branch_id: z.number().int().positive(),
  record_type_id: z.number().int().positive(),
  waybill_type: z.string(),
  account_id: z.number().int().positive("Cari seçimi zorunludur"),
  waybill_date: z.string().min(1),
  waybill_no: z.string().max(64).optional().nullable(),
  warehouse_id: z.number().nullable().optional(),
  order_id: z.number().nullable().optional(),
  istisna_code: z.string().max(40).optional().nullable(),
  shipping_address: z.string().optional().nullable(),
  carrier_name: z.string().max(255).optional().nullable(),
  carrier_code: z.string().max(64).optional().nullable(),
  plate_no: z.string().max(32).optional().nullable(),
  driver_name: z.string().max(128).optional().nullable(),
  shipment_date: z.string().optional().nullable(),
  shipment_time: z.string().optional().nullable(),
  e_irsaliye_type: z.enum(["KAGIT", "E_IRSALIYE", "OKC"]).default("KAGIT"),
  document_no: z.string().max(64).optional().nullable(),
  tracking_no: z.string().max(128).optional().nullable(),
  description: z.string().optional().nullable(),
  project_code: z.string().max(64).optional().nullable(),
  cost_center_code: z.string().max(64).optional().nullable(),
  group_code: z.string().max(64).optional().nullable(),
  special_code: z.string().max(64).optional().nullable(),
  lines: z.array(irsaliyeLineSchema).min(1, "En az bir kalem gerekli"),
});

export type IrsaliyeFormValues = z.infer<typeof irsaliyeFormSchema>;
export type IrsaliyeLineValues = z.infer<typeof irsaliyeLineSchema>;

export function emptyLine(): IrsaliyeLineValues {
  return {
    stock_id: null,
    description: "",
    qty: 1,
    unit_id: null,
    unit_price: 0,
    discount_pct: 0,
    tax_rate_id: null,
    tax_rate: 20,
  };
}

export function emptyIrsaliyeForm(
  branchId: number,
  recordTypeId: number,
  waybillType: WaybillTypeCode
): IrsaliyeFormValues {
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date();
  const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  return {
    branch_id: branchId,
    record_type_id: recordTypeId,
    waybill_type: waybillType,
    account_id: 0,
    waybill_date: today,
    waybill_no: "",
    warehouse_id: null,
    order_id: null,
    istisna_code: "",
    shipping_address: "",
    carrier_name: "",
    carrier_code: "",
    plate_no: "",
    driver_name: "",
    shipment_date: today,
    shipment_time: time,
    e_irsaliye_type: "KAGIT",
    document_no: "",
    tracking_no: "",
    description: "",
    project_code: "",
    cost_center_code: "",
    group_code: "",
    special_code: "",
    lines: [emptyLine()],
  };
}

export function buildShipmentDatetime(dateStr: string | null | undefined, timeStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const time = (timeStr || "00:00").slice(0, 5);
  return `${dateStr}T${time}:00`;
}

export function splitShipmentDatetime(value: string | null | undefined): { date: string; time: string } {
  if (!value) {
    const today = new Date().toISOString().slice(0, 10);
    return { date: today, time: "00:00" };
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    const [datePart, timePart] = value.split("T");
    return { date: datePart || "", time: (timePart || "00:00").slice(0, 5) };
  }
  return {
    date: d.toISOString().slice(0, 10),
    time: `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`,
  };
}

/** Satır net tutarı (iskonto sonrası, KDV hariç) */
export function irsaliyeLineNet(ln: IrsaliyeLineValues): number {
  const gross = Number(ln.qty || 0) * Number(ln.unit_price || 0);
  const disc = Number(ln.discount_pct || 0);
  return Math.max(gross - gross * (disc / 100), 0);
}

export function irsaliyeLineTax(ln: IrsaliyeLineValues): number {
  return irsaliyeLineNet(ln) * (Number(ln.tax_rate || 0) / 100);
}

export function irsaliyeLineTotal(ln: IrsaliyeLineValues): number {
  return irsaliyeLineNet(ln) + irsaliyeLineTax(ln);
}

export function computeIrsaliyeTotals(lines: IrsaliyeLineValues[]) {
  let subtotal = 0;
  let discountTotal = 0;
  let taxTotal = 0;
  const taxByRate: Record<string, number> = {};
  for (const ln of lines) {
    const gross = Number(ln.qty || 0) * Number(ln.unit_price || 0);
    const net = irsaliyeLineNet(ln);
    const tax = irsaliyeLineTax(ln);
    subtotal += net;
    discountTotal += Math.max(gross - net, 0);
    taxTotal += tax;
    const rateKey = String(Number(ln.tax_rate || 0));
    taxByRate[rateKey] = (taxByRate[rateKey] || 0) + tax;
  }
  return {
    subtotal,
    discountTotal,
    taxByRate,
    taxTotal,
    grandTotal: subtotal + taxTotal,
  };
}
