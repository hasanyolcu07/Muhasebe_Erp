import { api } from "@/services/api";
import type { BankIslemFormValues, BankTxnType } from "../schemas/bankaIslemleriSchema";

export type BankTransactionListItem = {
  id: number;
  txn_no: string;
  txn_date: string;
  txn_type: BankTxnType;
  txn_type_label: string;
  direction: string | null;
  bank_account_id: number;
  bank_account_code: string;
  bank_account_name: string;
  target_bank_account_id: number | null;
  target_bank_account_label: string | null;
  account_id: number | null;
  account_label: string | null;
  amount: number;
  description: string | null;
  document_no: string | null;
  check_ref: string | null;
  pos_batch_no: string | null;
  commission_amount: number | null;
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

export type BankTransactionSummary = {
  total_giris: number;
  total_cikis: number;
  net_balance: number;
};

export type BankaLookup = {
  id: number;
  code: string;
  name: string;
  bank_name: string | null;
  iban: string | null;
  account_no: string | null;
  balance: number;
  currency_code: string | null;
  is_passive: boolean;
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

export const bankaIslemleriApi = {
  list: (params?: {
    q?: string;
    branch_id?: number;
    record_type_id?: number;
    bank_account_id?: number;
    date_from?: string;
    date_to?: string;
    txn_type?: string;
    page?: number;
    page_size?: number;
  }) =>
    api<{
      items: BankTransactionListItem[];
      total: number;
      page: number;
      page_size: number;
      summary: BankTransactionSummary | null;
    }>(`/banka-islemleri${qs(params)}`),

  create: (body: BankIslemFormValues) =>
    api<BankTransactionListItem>("/banka-islemleri", { method: "POST", body }),

  remove: (id: number) => api<void>(`/banka-islemleri/${id}`, { method: "DELETE" }),

  lookupBanka: (params?: { branch_id?: number; q?: string }) =>
    api<{ items: BankaLookup[] }>(`/banka-islemleri/lookups/banka${qs(params)}`),

  lookupCari: (params?: { branch_id?: number; q?: string }) =>
    api<{ items: CariLookup[] }>(`/banka-islemleri/lookups/cari${qs(params)}`),
};
