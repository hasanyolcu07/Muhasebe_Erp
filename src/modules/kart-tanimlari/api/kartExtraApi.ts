import { api } from "@/services/api";

export type FixedAsset = {
  id: number;
  branch_id: number;
  record_type_id: number;
  code: string;
  name: string;
  coa_id: number | null;
  coa_code?: string | null;
  coa_name?: string | null;
  category: string | null;
  acquisition_date: string | null;
  acquisition_cost: number | string;
  residual_value: number | string;
  useful_life_months: number;
  depreciation_method: string;
  location_note: string | null;
  responsible_name: string | null;
  serial_no: string | null;
  invoice_no: string | null;
  notes: string | null;
  is_passive: boolean;
};

export type FixedAssetPayload = Omit<FixedAsset, "id" | "coa_code" | "coa_name">;

export const sabitKiymetApi = {
  list: (params?: { q?: string; branch_id?: number }) => {
    const qs = new URLSearchParams();
    if (params?.q) qs.set("q", params.q);
    if (params?.branch_id) qs.set("branch_id", String(params.branch_id));
    const s = qs.toString();
    return api<{ items: FixedAsset[] }>(`/sabit-kiymet${s ? `?${s}` : ""}`);
  },
  get: (id: number) => api<FixedAsset>(`/sabit-kiymet/${id}`),
  create: (body: FixedAssetPayload) =>
    api<FixedAsset>("/sabit-kiymet", { method: "POST", body }),
  update: (id: number, body: FixedAssetPayload) =>
    api<FixedAsset>(`/sabit-kiymet/${id}`, { method: "PUT", body }),
  remove: (id: number) => api<void>(`/sabit-kiymet/${id}`, { method: "DELETE" }),
};

export type StockUnit = {
  id: number;
  code: string;
  name: string;
  symbol: string | null;
  conversion_factor: number | string;
  base_unit_id: number | null;
  base_unit_code?: string | null;
  is_base: boolean;
  branch_id: number | null;
  record_type_id: number | null;
  is_active: boolean;
  description: string | null;
  width_val?: number | string | null;
  width_unit_id?: number | null;
  length_val?: number | string | null;
  length_unit_id?: number | null;
  height_val?: number | string | null;
  height_unit_id?: number | null;
  area_val?: number | string | null;
  area_unit_id?: number | null;
  volume_val?: number | string | null;
  volume_unit_id?: number | null;
  weight_val?: number | string | null;
  weight_unit_id?: number | null;
  content_qty?: number | string | null;
};

export type StockUnitPayload = Omit<StockUnit, "id" | "base_unit_code">;

export const stokBirimApi = {
  list: (params?: { q?: string; branch_id?: number }) => {
    const qs = new URLSearchParams();
    if (params?.q) qs.set("q", params.q);
    if (params?.branch_id) qs.set("branch_id", String(params.branch_id));
    const s = qs.toString();
    return api<{ items: StockUnit[] }>(`/stok-birimleri${s ? `?${s}` : ""}`);
  },
  create: (body: StockUnitPayload) =>
    api<StockUnit>("/stok-birimleri", { method: "POST", body }),
  update: (id: number, body: StockUnitPayload) =>
    api<StockUnit>(`/stok-birimleri/${id}`, { method: "PUT", body }),
  remove: (id: number) => api<void>(`/stok-birimleri/${id}`, { method: "DELETE" }),
};
