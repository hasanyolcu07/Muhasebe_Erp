import { api } from "@/services/api";
import type { CariFormValues } from "../schemas/cariSchema";

export type CariListItem = {
  id: number;
  code: string;
  title: string;
  account_type: string;
  tax_number: string | null;
  city: string | null;
  is_passive: boolean;
  is_efatura: boolean;
  is_eirsaliye: boolean;
  branch_id: number;
  record_type_id: number;
  coa_code: string | null;
  coa_name: string | null;
};

export type CoaLookup = { id: number; code: string; name: string };
export type PriceListLookup = { id: number; code: string; name: string };

export const cariApi = {
  list: (params?: { q?: string; branch_id?: number; page?: number; page_size?: number }) => {
    const qs = new URLSearchParams();
    if (params?.q) qs.set("q", params.q);
    if (params?.branch_id) qs.set("branch_id", String(params.branch_id));
    if (params?.page) qs.set("page", String(params.page));
    if (params?.page_size) qs.set("page_size", String(params.page_size));
    const q = qs.toString();
    return api<{ items: CariListItem[]; total: number; page: number; page_size: number }>(
      `/cari${q ? `?${q}` : ""}`
    );
  },
  get: (id: number) => api<CariFormValues & { id: number; coa_code?: string; coa_name?: string }>(`/cari/${id}`),
  create: (body: CariFormValues) =>
    api<CariFormValues & { id: number }>("/cari", { method: "POST", body }),
  update: (id: number, body: CariFormValues) =>
    api<CariFormValues & { id: number }>(`/cari/${id}`, { method: "PUT", body }),
  remove: (id: number) => api<void>(`/cari/${id}`, { method: "DELETE" }),
  lookupCoa: (q?: string) =>
    api<{ items: CoaLookup[] }>(`/cari/lookups/chart-of-accounts${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  lookupPriceLists: (branchId?: number) =>
    api<{ items: PriceListLookup[] }>(
      `/cari/lookups/price-lists${branchId ? `?branch_id=${branchId}` : ""}`
    ),
};
