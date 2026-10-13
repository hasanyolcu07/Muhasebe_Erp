import { api } from "@/services/api";

export type StockLookup = {
  id: number;
  code: string;
  name: string;
  unit_id: number | null;
  unit_code: string | null;
  purchase_price: number | null;
  sale_price: number | null;
  track_lot?: boolean;
  track_serial?: boolean;
};

export type WarehouseLookup = {
  id: number;
  code: string;
  name: string;
  branch_id: number | null;
};

export type UnitLookup = {
  id: number;
  code: string;
  name: string;
};

export type StockMovementLine = {
  id: number;
  line_no: number;
  stock_id: number;
  stock_code: string | null;
  stock_name: string | null;
  quantity: number;
  unit_id: number | null;
  unit_code: string | null;
  unit_cost: number;
  line_amount: number;
  description: string | null;
};

export type StockMovementItem = {
  id: number;
  document_no: string | null;
  fis_no: string | null;
  movement_date: string;
  movement_type: string;
  movement_type_label: string;
  movement_reason: string;
  movement_reason_label: string;
  warehouse_id: number;
  warehouse_code: string | null;
  warehouse_name: string | null;
  to_warehouse_id: number | null;
  to_warehouse_label: string | null;
  description: string | null;
  ref_doc_no: string | null;
  branch_id: number;
  record_type_id: number;
  record_type_code: string | null;
  status: string;
  is_posted: boolean;
  yevmiye_fis_no: string | null;
  journal_voucher_id: number | null;
  line_count: number;
  total_qty: number;
  total_amount: number;
  created_at: string | null;
  lines?: StockMovementLine[];
};

export type StockMovementCreateBody = {
  branch_id: number;
  record_type_id: number;
  warehouse_id: number;
  to_warehouse_id?: number | null;
  movement_date: string;
  movement_type: string;
  movement_reason: string;
  description?: string | null;
  ref_doc_type?: string | null;
  ref_doc_no?: string | null;
  as_draft?: boolean;
  lines: Array<{
    stock_id: number;
    quantity: number;
    unit_id?: number | null;
    unit_cost: number;
    description?: string | null;
    lot_id?: number | null;
    serial_ids?: number[];
  }>;
};

function qs(params?: Record<string, string | number | boolean | null | undefined>): string {
  if (!params) return "";
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    sp.set(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export const stokHareketApi = {
  list: (params?: Record<string, string | number | null | undefined>) =>
    api<{ items: StockMovementItem[]; total: number; page: number; page_size: number }>(
      `/stok-hareket${qs(params)}`
    ),

  get: (id: number) => api<StockMovementItem>(`/stok-hareket/${id}`),

  create: (body: StockMovementCreateBody) =>
    api<StockMovementItem>("/stok-hareket", { method: "POST", body }),

  approve: (id: number) =>
    api<StockMovementItem>(`/stok-hareket/${id}/approve`, { method: "POST" }),

  remove: (id: number) => api<void>(`/stok-hareket/${id}`, { method: "DELETE" }),

  lookupStocks: (params?: Record<string, string | number | null | undefined>) =>
    api<{ items: StockLookup[] }>(`/stok-hareket/lookups/stocks${qs(params)}`),

  lookupWarehouses: (params?: Record<string, string | number | null | undefined>) =>
    api<{ items: WarehouseLookup[] }>(`/stok-hareket/lookups/warehouses${qs(params)}`),

  lookupUnits: (params?: Record<string, string | number | null | undefined>) =>
    api<{ items: UnitLookup[] }>(`/stok-hareket/lookups/units${qs(params)}`),
};
