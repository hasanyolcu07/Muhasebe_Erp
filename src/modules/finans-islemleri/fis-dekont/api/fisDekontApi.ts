import { api } from "@/services/api";
import type { FisDekontFormValues } from "../schemas/fisDekontSchema";

export type VoucherListItem = {
  id: number;
  fis_no: string | null;
  voucher_type: string;
  voucher_type_label: string;
  voucher_date: string;
  document_no: string | null;
  description: string | null;
  total_debit: number;
  total_credit: number;
  branch_id: number;
  record_type_id: number;
  record_type_code: string | null;
  cash_account_label: string | null;
  bank_account_label: string | null;
  yevmiye_fis_no: string | null;
  is_posted: boolean;
  journal_voucher_id: number | null;
  created_at: string | null;
};

export type KasaLookup = { id: number; code: string; name: string; balance: number; currency_code: string | null };
export type BankaLookup = {
  id: number;
  code: string;
  name: string;
  bank_name: string | null;
  balance: number;
  currency_code: string | null;
};
export type CariLookup = { id: number; code: string; title: string };

const qs = (params?: Record<string, string | number | undefined | null>) => {
  const sp = new URLSearchParams();
  if (!params) return "";
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
};

export const fisDekontApi = {
  list: (params?: {
    q?: string;
    branch_id?: number;
    record_type_id?: number;
    voucher_type?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    page_size?: number;
  }) =>
    api<{ items: VoucherListItem[]; total: number; page: number; page_size: number }>(
      `/fis-dekont${qs(params)}`
    ),

  create: (body: FisDekontFormValues) =>
    api<VoucherListItem>("/fis-dekont", { method: "POST", body }),

  remove: (id: number) => api<void>(`/fis-dekont/${id}`, { method: "DELETE" }),

  lookupKasa: (params?: { branch_id?: number; q?: string }) =>
    api<{ items: KasaLookup[] }>(`/fis-dekont/lookups/kasa${qs(params)}`),

  lookupBanka: (params?: { branch_id?: number; q?: string }) =>
    api<{ items: BankaLookup[] }>(`/fis-dekont/lookups/banka${qs(params)}`),

  lookupCari: (params?: { branch_id?: number; q?: string }) =>
    api<{ items: CariLookup[] }>(`/fis-dekont/lookups/cari${qs(params)}`),
};
