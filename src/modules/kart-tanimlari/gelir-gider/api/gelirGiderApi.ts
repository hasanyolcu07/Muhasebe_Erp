import { api } from "@/services/api";
import type { GelirGiderFormValues, GelirGiderType } from "../schemas/gelirGiderSchema";

export type CardListItem = {
  id: number;
  code: string;
  name: string;
  card_type: GelirGiderType;
  branch_id: number;
  record_type_id: number;
  default_vat_rate: number;
  card_group: string | null;
  branch_ratio: number | null;
  is_passive: boolean;
  coa_code: string | null;
  link_count: number;
};

export type CoaLookup = { id: number; code: string; name: string };
export type AccountLookup = { id: number; code: string | null; name: string };
export type BranchLookup = { id: number; code: string; name: string };

const qs = (params?: Record<string, string | number | undefined>) => {
  const sp = new URLSearchParams();
  if (!params) return "";
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
};

export const gelirGiderApi = {
  list: (params?: {
    card_type?: GelirGiderType;
    q?: string;
    branch_id?: number;
    page?: number;
    page_size?: number;
  }) =>
    api<{ items: CardListItem[]; total: number; page: number; page_size: number }>(
      `/gelir-gider${qs(params)}`
    ),

  get: (id: number) => api<GelirGiderFormValues & { id: number }>(`/gelir-gider/${id}`),

  create: (body: GelirGiderFormValues) =>
    api<GelirGiderFormValues & { id: number }>("/gelir-gider", { method: "POST", body }),

  update: (id: number, body: GelirGiderFormValues) =>
    api<GelirGiderFormValues & { id: number }>(`/gelir-gider/${id}`, { method: "PUT", body }),

  remove: (id: number) => api<void>(`/gelir-gider/${id}`, { method: "DELETE" }),

  lookupCoa: (q?: string) =>
    api<{ items: CoaLookup[] }>(
      `/gelir-gider/lookups/chart-of-accounts${q ? `?q=${encodeURIComponent(q)}` : ""}`
    ),

  lookupAccounts: (q?: string) =>
    api<{ items: AccountLookup[] }>(
      `/gelir-gider/lookups/accounts${q ? `?q=${encodeURIComponent(q)}` : ""}`
    ),

  lookupBranches: () => api<{ items: BranchLookup[] }>("/gelir-gider/lookups/branches"),

  lookupGroups: (card_type?: GelirGiderType) =>
    api<{ items: string[] }>(
      `/gelir-gider/lookups/groups${card_type ? `?card_type=${encodeURIComponent(card_type)}` : ""}`
    ),
};
