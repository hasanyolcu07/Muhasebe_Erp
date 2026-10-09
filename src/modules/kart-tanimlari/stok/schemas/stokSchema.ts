import { z } from "zod";

const supplierSchema = z.object({
  id: z.number().optional().nullable(),
  account_id: z.number().min(1),
  account_code: z.string().optional().nullable(),
  account_title: z.string().optional().nullable(),
  supplier_code: z.string().optional().nullable(),
  purchase_price: z.coerce.number().min(0).default(0),
  moq: z.coerce.number().int().min(0).default(0),
  lead_time_days: z.coerce.number().int().min(0).default(0),
});

const warehouseLotSchema = z.object({
  id: z.number().optional().nullable(),
  warehouse_id: z.number().min(1),
  warehouse_code: z.string().optional().nullable(),
  warehouse_name: z.string().optional().nullable(),
  lot_no: z.string().optional().nullable(),
  lot_name: z.string().optional().nullable(),
  shelf_location: z.string().optional().nullable(),
  qty_on_hand: z.coerce.number().min(0).default(0),
  qty_reserved: z.coerce.number().min(0).default(0),
  min_level: z.coerce.number().min(0).default(0),
  max_level: z.coerce.number().min(0).default(0),
  production_date: z.string().optional().nullable(),
  expiry_date: z.string().optional().nullable(),
  is_passive: z.boolean().default(false),
});

export const stokFormSchema = z.object({
  branch_id: z.number().min(1),
  record_type_id: z.number().min(1),
  code: z.string().min(1, "Stok kodu zorunlu"),
  name: z.string().min(1, "Stok adı zorunlu"),
  unit_id: z.number().optional().nullable(),
  tax_rate_id: z.number().optional().nullable(),
  category_id: z.number().optional().nullable(),
  currency_id: z.number().optional().nullable(),
  stock_type: z.enum(["TICARI_MAL", "HAMMADDE", "MAMUL", "HIZMET", "DEMIRBAS"]),
  barcode: z.string().optional().nullable(),
  purchase_price: z.coerce.number().min(0).default(0),
  sale_price: z.coerce.number().min(0).default(0),
  min_stock: z.coerce.number().min(0).default(0),
  max_stock: z.coerce.number().min(0).default(0),
  critical_level: z.coerce.number().min(0).default(0),
  track_lot: z.boolean().default(false),
  track_serial: z.boolean().default(false),
  serial_lot_enabled: z.boolean().default(false),
  coa_id: z.number().optional().nullable(),
  default_istisna_code: z.string().max(40).optional().nullable(),
  default_tevkifat_code: z.string().max(40).optional().nullable(),
  is_passive: z.boolean().default(false),
  suppliers: z.array(supplierSchema).default([]),
  warehouse_lots: z.array(warehouseLotSchema).default([]),
});

export type StokFormValues = z.infer<typeof stokFormSchema>;

const priceItemSchema = z.object({
  id: z.number().optional().nullable(),
  stock_id: z.number().min(1),
  stock_code: z.string().optional().nullable(),
  stock_name: z.string().optional().nullable(),
  unit_price: z.coerce.number().min(0),
});

const matrixSchema = z.object({
  id: z.number().optional().nullable(),
  link_type: z.enum(["FIRMA", "GRUP"]),
  account_id: z.number().optional().nullable(),
  account_group_id: z.number().optional().nullable(),
  account_code: z.string().optional().nullable(),
  account_title: z.string().optional().nullable(),
  group_code: z.string().optional().nullable(),
  group_name: z.string().optional().nullable(),
  discount_text: z.string().optional().nullable(),
  discount_rate: z.coerce.number().min(0).default(0),
  multiplier: z.coerce.number().min(0).default(1),
  moq_text: z.string().optional().nullable(),
  moq_qty: z.coerce.number().min(0).default(0),
  is_active: z.boolean().default(true),
});

const permissionSchema = z.object({
  id: z.number().optional().nullable(),
  user_id: z.number().min(1),
  username: z.string().optional().nullable(),
  full_name: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  can_edit_unit_price: z.boolean().default(false),
  can_sell_below_min: z.boolean().default(false),
});

export const priceListFormSchema = z.object({
  branch_id: z.number().min(1),
  record_type_id: z.number().min(1, "Kayıt türü seçin"),
  code: z.string().min(1, "Liste kodu zorunlu"),
  name: z.string().min(1, "Liste adı zorunlu"),
  list_type: z.enum(["PERAKENDE", "TOPTAN", "BAYI", "IHRACAT"]),
  currency_id: z.number().optional().nullable(),
  valid_from: z.string().optional().nullable(),
  valid_to: z.string().optional().nullable(),
  is_passive: z.boolean().default(false),
  items: z.array(priceItemSchema).default([]),
  matrix: z.array(matrixSchema).default([]),
  permissions: z.array(permissionSchema).default([]),
});

export type PriceListFormValues = z.infer<typeof priceListFormSchema>;

export function emptyStokForm(branchId: number, recordTypeId: number): StokFormValues {
  return {
    branch_id: branchId,
    record_type_id: recordTypeId,
    code: "",
    name: "",
    unit_id: null,
    tax_rate_id: null,
    category_id: null,
    currency_id: null,
    stock_type: "TICARI_MAL",
    barcode: "",
    purchase_price: 0,
    sale_price: 0,
    min_stock: 0,
    max_stock: 0,
    critical_level: 0,
    track_lot: false,
    track_serial: false,
    serial_lot_enabled: false,
    coa_id: null,
    default_istisna_code: "",
    default_tevkifat_code: "",
    is_passive: false,
    suppliers: [],
    warehouse_lots: [],
  };
}

export function emptyPriceListForm(branchId: number, recordTypeId: number | null): PriceListFormValues {
  return {
    branch_id: branchId,
    record_type_id: recordTypeId ?? 0,
    code: "",
    name: "",
    list_type: "PERAKENDE",
    currency_id: null,
    valid_from: "",
    valid_to: "",
    is_passive: false,
    items: [],
    matrix: [],
    permissions: [],
  };
}

export function detailToStokForm(detail: Record<string, unknown>): StokFormValues {
  return {
    branch_id: Number(detail.branch_id),
    record_type_id: Number(detail.record_type_id),
    code: String(detail.code ?? ""),
    name: String(detail.name ?? ""),
    unit_id: detail.unit_id != null ? Number(detail.unit_id) : null,
    tax_rate_id: detail.tax_rate_id != null ? Number(detail.tax_rate_id) : null,
    category_id: detail.category_id != null ? Number(detail.category_id) : null,
    currency_id: detail.currency_id != null ? Number(detail.currency_id) : null,
    stock_type: (detail.stock_type as StokFormValues["stock_type"]) ?? "TICARI_MAL",
    barcode: (detail.barcode as string) ?? "",
    purchase_price: Number(detail.purchase_price ?? 0),
    sale_price: Number(detail.sale_price ?? 0),
    min_stock: Number(detail.min_stock ?? 0),
    max_stock: Number(detail.max_stock ?? 0),
    critical_level: Number(detail.critical_level ?? 0),
    track_lot: Boolean(detail.track_lot),
    track_serial: Boolean(detail.track_serial ?? detail.serial_lot_enabled),
    serial_lot_enabled: Boolean(detail.serial_lot_enabled ?? detail.track_serial),
    coa_id: detail.coa_id != null ? Number(detail.coa_id) : null,
    default_istisna_code: String(detail.default_istisna_code ?? ""),
    default_tevkifat_code: String(detail.default_tevkifat_code ?? ""),
    is_passive: Boolean(detail.is_passive),
    suppliers: ((detail.suppliers as StokFormValues["suppliers"]) ?? []).map((s) => ({
      ...s,
      purchase_price: Number(s.purchase_price ?? 0),
      moq: Number(s.moq ?? 0),
      lead_time_days: Number(s.lead_time_days ?? 0),
    })),
    warehouse_lots: ((detail.warehouse_lots as StokFormValues["warehouse_lots"]) ?? []).map((w) => ({
      ...w,
      qty_on_hand: Number(w.qty_on_hand ?? 0),
      qty_reserved: Number(w.qty_reserved ?? 0),
      min_level: Number(w.min_level ?? 0),
      max_level: Number(w.max_level ?? 0),
    })),
  };
}

export function detailToPriceListForm(detail: Record<string, unknown>): PriceListFormValues {
  return {
    branch_id: Number(detail.branch_id),
    record_type_id: detail.record_type_id != null ? Number(detail.record_type_id) : 0,
    code: String(detail.code ?? ""),
    name: String(detail.name ?? ""),
    list_type: (detail.list_type as PriceListFormValues["list_type"]) ?? "PERAKENDE",
    currency_id: detail.currency_id != null ? Number(detail.currency_id) : null,
    valid_from: (detail.valid_from as string) ?? "",
    valid_to: (detail.valid_to as string) ?? "",
    is_passive: Boolean(detail.is_passive),
    items: ((detail.items as PriceListFormValues["items"]) ?? []).map((i) => ({
      ...i,
      unit_price: Number(i.unit_price ?? 0),
    })),
    matrix: ((detail.matrix as PriceListFormValues["matrix"]) ?? []).map((m) => ({
      ...m,
      discount_rate: Number(m.discount_rate ?? 0),
      multiplier: Number(m.multiplier ?? 1),
      moq_qty: Number(m.moq_qty ?? 0),
    })),
    permissions: (detail.permissions as PriceListFormValues["permissions"]) ?? [],
  };
}
