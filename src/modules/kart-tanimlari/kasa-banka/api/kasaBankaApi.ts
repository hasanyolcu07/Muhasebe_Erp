import { api } from "@/services/api";
import type { BankaFormValues, KasaFormValues } from "../schemas/kasaBankaSchema";

export type KasaListItem = {
  id: number;
  code: string;
  name: string;
  branch_id: number;
  record_type_id: number;
  currency_id: number | null;
  currency_code: string | null;
  opening_balance: number;
  balance: number;
  responsible_user_id: number | null;
  is_passive: boolean;
  coa_code: string | null;
};

export type BankaListItem = {
  id: number;
  code: string;
  name: string;
  bank_name: string | null;
  iban: string | null;
  branch_id: number;
  record_type_id: number;
  currency_id: number | null;
  currency_code: string | null;
  opening_balance: number;
  balance: number;
  is_passive: boolean;
};

export type CurrencyLookup = { id: number; code: string; name: string; symbol?: string | null };
export type UserLookup = { id: number; username: string; full_name?: string | null; email?: string | null };
export type CoaLookup = { id: number; code: string; name: string };

const qs = (params?: Record<string, string | number | undefined>) => {
  const sp = new URLSearchParams();
  if (!params) return "";
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
};

export const kasaBankaApi = {
  listKasa: (params?: { q?: string; branch_id?: number; page?: number; page_size?: number }) =>
    api<{ items: KasaListItem[]; total: number; page: number; page_size: number }>(
      `/kasa-banka/kasa${qs(params)}`
    ),
  getKasa: (id: number) => api<KasaFormValues & { id: number }>(`/kasa-banka/kasa/${id}`),
  createKasa: (body: KasaFormValues) =>
    api<KasaFormValues & { id: number }>("/kasa-banka/kasa", { method: "POST", body }),
  updateKasa: (id: number, body: KasaFormValues) =>
    api<KasaFormValues & { id: number }>(`/kasa-banka/kasa/${id}`, { method: "PUT", body }),
  removeKasa: (id: number) => api<void>(`/kasa-banka/kasa/${id}`, { method: "DELETE" }),

  listBanka: (params?: { q?: string; branch_id?: number; page?: number; page_size?: number }) =>
    api<{ items: BankaListItem[]; total: number; page: number; page_size: number }>(
      `/kasa-banka/banka${qs(params)}`
    ),
  getBanka: (id: number) => api<BankaFormValues & { id: number }>(`/kasa-banka/banka/${id}`),
  createBanka: (body: BankaFormValues) =>
    api<BankaFormValues & { id: number }>("/kasa-banka/banka", { method: "POST", body }),
  updateBanka: (id: number, body: BankaFormValues) =>
    api<BankaFormValues & { id: number }>(`/kasa-banka/banka/${id}`, { method: "PUT", body }),
  removeBanka: (id: number) => api<void>(`/kasa-banka/banka/${id}`, { method: "DELETE" }),

  lookupCurrencies: () => api<{ items: CurrencyLookup[] }>("/kasa-banka/lookups/currencies"),
  lookupUsers: (q?: string) =>
    api<{ items: UserLookup[] }>(`/kasa-banka/lookups/users${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  lookupCoa: (q?: string) =>
    api<{ items: CoaLookup[] }>(
      `/kasa-banka/lookups/chart-of-accounts${q ? `?q=${encodeURIComponent(q)}` : ""}`
    ),
};
