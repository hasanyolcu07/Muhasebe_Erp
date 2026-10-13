import { api } from "@/services/api";
import type { CekSenetTxnFormValues } from "../schemas/cekSenetSchema";

export type CheckBondListItem = {
  id: number;
  branch_id: number;
  record_type_id: number;
  record_type_code: string | null;
  instrument_type: string;
  instrument_type_label: string;
  direction: string;
  direction_label: string;
  document_no: string;
  amount: number;
  currency_id: number | null;
  currency_code: string | null;
  due_date: string | null;
  status: string;
  status_label: string;
  account_id: number | null;
  account_label: string | null;
  bank_account_id: number | null;
  bank_account_label: string | null;
  in_portfolio: boolean;
  description: string | null;
  days_to_due: number | null;
  is_overdue: boolean;
  yevmiye_fis_no: string | null;
  is_posted: boolean;
  journal_voucher_id: number | null;
  created_at: string | null;
};

export type CheckBondTransactionDetail = {
  id: number;
  check_bond_id: number;
  document_no: string | null;
  transaction_type: string;
  transaction_type_label: string;
  transaction_date: string;
  amount: number;
  description: string | null;
  yevmiye_fis_no: string | null;
  is_posted: boolean;
  journal_voucher_id: number | null;
  new_status: string | null;
};

export type UpcomingCheckItem = {
  id: number;
  document_no: string;
  instrument_type: string;
  direction: string;
  amount: number;
  due_date: string;
  days_to_due: number;
  status: string;
  status_label: string;
  account_label: string | null;
};

export type CariLookup = { id: number; code: string; title: string };
export type BankaLookup = { id: number; code: string; name: string; bank_name: string | null; balance: number };
export type KasaLookup = { id: number; code: string; name: string; balance: number };
export type PortfoyLookup = {
  id: number;
  document_no: string;
  instrument_type: string;
  direction: string;
  amount: number;
  due_date: string | null;
  status: string;
  status_label: string;
  account_id: number | null;
  account_label: string | null;
};

const qs = (params?: Record<string, string | number | undefined | null | boolean>) => {
  const sp = new URLSearchParams();
  if (!params) return "";
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
};

export const cekSenetApi = {
  list: (params?: {
    q?: string;
    branch_id?: number;
    record_type_id?: number;
    direction?: string;
    status?: string;
    instrument_type?: string;
    account_id?: number;
    due_from?: string;
    due_to?: string;
    page?: number;
    page_size?: number;
  }) =>
    api<{
      items_alinan: CheckBondListItem[];
      items_verilen: CheckBondListItem[];
      total_alinan: number;
      total_verilen: number;
      page: number;
      page_size: number;
    }>(`/cek-senet${qs(params)}`),

  createTransaction: (body: CekSenetTxnFormValues) =>
    api<CheckBondTransactionDetail>("/cek-senet/transactions", { method: "POST", body }),

  update: (id: number, body: Record<string, unknown>) =>
    api<CheckBondListItem>(`/cek-senet/${id}`, { method: "PUT", body }),

  remove: (id: number) => api<void>(`/cek-senet/${id}`, { method: "DELETE" }),

  upcoming: (params?: { branch_id?: number; days_ahead?: number; limit?: number }) =>
    api<{ items: UpcomingCheckItem[]; total: number }>(`/cek-senet/dashboard/upcoming${qs(params)}`),

  lookupCari: (params?: { branch_id?: number; q?: string }) =>
    api<{ items: CariLookup[] }>(`/cek-senet/lookups/cari${qs(params)}`),

  lookupBanka: (params?: { branch_id?: number; q?: string }) =>
    api<{ items: BankaLookup[] }>(`/cek-senet/lookups/banka${qs(params)}`),

  lookupKasa: (params?: { branch_id?: number; q?: string }) =>
    api<{ items: KasaLookup[] }>(`/cek-senet/lookups/kasa${qs(params)}`),

  lookupPortfoy: (params: { direction: string; status?: string; branch_id?: number; q?: string }) =>
    api<{ items: PortfoyLookup[] }>(`/cek-senet/lookups/portfoy${qs(params)}`),

  lookupForCollection: (params: { direction: string; branch_id?: number; q?: string }) =>
    api<{ items: PortfoyLookup[] }>(`/cek-senet/lookups/for-collection${qs(params)}`),
};
