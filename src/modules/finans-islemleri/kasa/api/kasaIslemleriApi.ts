import { api } from "@/services/api";
import type { CashTxnType, KasaIslemFormValues } from "../schemas/kasaIslemleriSchema";

export type CashTransactionListItem = {
  id: number;
  txn_no: string;
  txn_date: string;
  txn_type: CashTxnType;
  txn_type_label: string;
  cash_account_id: number;
  cash_account_code: string;
  cash_account_name: string;
  target_cash_account_id: number | null;
  target_cash_account_label: string | null;
  account_id: number | null;
  account_label: string | null;
  invoice_id: number | null;
  invoice_no: string | null;
  amount: number;
  description: string | null;
  branch_id: number;
  record_type_id: number;
  record_type_code: string | null;
  yevmiye_fis_no: string | null;
  is_posted: boolean;
  journal_voucher_id: number | null;
  debit_amount: number;
  credit_amount: number;
  created_at: string | null;
};

export type CashTransactionSummary = {
  total_tahsilat: number;
  total_odeme: number;
  net_balance: number;
};

export type KasaLookup = {
  id: number;
  code: string;
  name: string;
  balance: number;
  currency_code: string | null;
  is_passive: boolean;
};

export type CariLookup = { id: number; code: string; title: string };
export type FaturaLookup = {
  id: number;
  invoice_no: string;
  account_id: number;
  account_title: string | null;
};

const qs = (params?: Record<string, string | number | undefined | null>) => {
  const sp = new URLSearchParams();
  if (!params) return "";
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
};

export const kasaIslemleriApi = {
  list: (params?: {
    q?: string;
    branch_id?: number;
    record_type_id?: number;
    cash_account_id?: number;
    date_from?: string;
    date_to?: string;
    txn_type?: string;
    page?: number;
    page_size?: number;
  }) =>
    api<{
      items: CashTransactionListItem[];
      total: number;
      page: number;
      page_size: number;
      summary: CashTransactionSummary | null;
    }>(`/kasa-islemleri${qs(params)}`),

  create: (body: KasaIslemFormValues) =>
    api<CashTransactionListItem>("/kasa-islemleri", { method: "POST", body }),

  remove: (id: number) => api<void>(`/kasa-islemleri/${id}`, { method: "DELETE" }),

  lookupKasa: (params?: { branch_id?: number; q?: string }) =>
    api<{ items: KasaLookup[] }>(`/kasa-islemleri/lookups/kasa${qs(params)}`),

  lookupCari: (params?: { branch_id?: number; q?: string }) =>
    api<{ items: CariLookup[] }>(`/kasa-islemleri/lookups/cari${qs(params)}`),

  lookupFatura: (params?: { branch_id?: number; q?: string }) =>
    api<{ items: FaturaLookup[] }>(`/kasa-islemleri/lookups/fatura${qs(params)}`),
};
