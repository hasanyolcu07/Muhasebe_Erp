import { api } from "@/services/api";
import type { PriceListFormValues, StokFormValues } from "../schemas/stokSchema";

export type StokListItem = {
  id: number;
  code: string;
  name: string;
  stock_type: string;
  barcode: string | null;
  unit_name: string | null;
  purchase_price: number;
  sale_price: number;
  min_stock: number;
  max_stock: number;
  critical_level: number;
  is_passive: boolean;
  branch_id: number;
  record_type_id: number;
  alert_min?: boolean;
  alert_min_severity?: string | null;
  alert_max?: boolean;
  alert_skt?: boolean;
  alert_skt_severity?: string | null;
};

export type PriceListListItem = {
  id: number;
  code: string;
  name: string;
  list_type: string;
  currency_code: string | null;
  valid_from: string | null;
  valid_to: string | null;
  is_passive: boolean;
  branch_id: number;
};

export type LookupItem = { id: number; code?: string | null; name: string; extra?: string | null };
export type UserLookup = { id: number; username: string; full_name?: string | null; email?: string | null };

export type LotSummaryItem = {
  id: number;
  warehouse_code: string | null;
  warehouse_name: string | null;
  stock_code: string;
  stock_name: string;
  lot_no: string | null;
  lot_name: string | null;
  qty_on_hand: number;
  production_date: string | null;
  expiry_date?: string | null;
  days_since_production: number | null;
  is_passive: boolean;
};

export const stokApi = {
  list: (params?: { q?: string; branch_id?: number; stock_type?: string; page?: number; page_size?: number }) => {
    const qs = new URLSearchParams();
    if (params?.q) qs.set("q", params.q);
    if (params?.branch_id) qs.set("branch_id", String(params.branch_id));
    if (params?.stock_type) qs.set("stock_type", params.stock_type);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.page_size) qs.set("page_size", String(params.page_size));
    const q = qs.toString();
    return api<{ items: StokListItem[]; total: number; page: number; page_size: number }>(
      `/stok${q ? `?${q}` : ""}`
    );
  },
  get: (id: number) => api<StokFormValues & { id: number }>(`/stok/${id}`),
  create: (body: StokFormValues) => api<StokFormValues & { id: number }>("/stok", { method: "POST", body }),
  update: (id: number, body: StokFormValues) =>
    api<StokFormValues & { id: number }>(`/stok/${id}`, { method: "PUT", body }),
  remove: (id: number) => api<void>(`/stok/${id}`, { method: "DELETE" }),
  lotSummary: (params?: { warehouse_id?: number; stock_id?: number; lot_q?: string }) => {
    const qs = new URLSearchParams();
    if (params?.warehouse_id) qs.set("warehouse_id", String(params.warehouse_id));
    if (params?.stock_id) qs.set("stock_id", String(params.stock_id));
    if (params?.lot_q) qs.set("lot_q", params.lot_q);
    const q = qs.toString();
    return api<LotSummaryItem[]>(`/stok/lot-summary${q ? `?${q}` : ""}`);
  },
  lookupSuppliers: (q?: string) =>
    api<{ items: LookupItem[] }>(`/stok/lookups/suppliers${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  lookupWarehouses: (branchId?: number) =>
    api<{ items: LookupItem[] }>(
      `/stok/lookups/warehouses${branchId ? `?branch_id=${branchId}` : ""}`
    ),
  lookupUnits: () => api<{ items: LookupItem[] }>("/stok/lookups/units"),
  lookupTaxRates: () => api<{ items: LookupItem[] }>("/stok/lookups/tax-rates"),
  lookupStocks: (branchId?: number) =>
    api<{ items: LookupItem[] }>(`/stok/lookups/stocks${branchId ? `?branch_id=${branchId}` : ""}`),
  lookupAccounts: (q?: string) =>
    api<{ items: LookupItem[] }>(`/stok/lookups/accounts${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  lookupGroups: (branchId?: number) =>
    api<{ items: LookupItem[] }>(`/stok/lookups/groups${branchId ? `?branch_id=${branchId}` : ""}`),
  lookupUsers: (q?: string) =>
    api<{ items: UserLookup[] }>(`/stok/lookups/users${q ? `?q=${encodeURIComponent(q)}` : ""}`),

  listPriceLists: (params?: { q?: string; branch_id?: number; list_type?: string }) => {
    const qs = new URLSearchParams();
    if (params?.q) qs.set("q", params.q);
    if (params?.branch_id) qs.set("branch_id", String(params.branch_id));
    if (params?.list_type) qs.set("list_type", params.list_type);
    const q = qs.toString();
    return api<{ items: PriceListListItem[]; total: number }>(`/stok/price-lists${q ? `?${q}` : ""}`);
  },
  getPriceList: (id: number) => api<PriceListFormValues & { id: number }>(`/stok/price-lists/${id}`),
  createPriceList: (body: PriceListFormValues) =>
    api<PriceListFormValues & { id: number }>("/stok/price-lists", { method: "POST", body }),
  updatePriceList: (id: number, body: PriceListFormValues) =>
    api<PriceListFormValues & { id: number }>(`/stok/price-lists/${id}`, { method: "PUT", body }),
  removePriceList: (id: number) => api<void>(`/stok/price-lists/${id}`, { method: "DELETE" }),
};
