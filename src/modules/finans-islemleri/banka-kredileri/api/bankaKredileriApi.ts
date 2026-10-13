import { api } from "@/services/api";

export type CreditType = "ISLETME" | "IHTIYAC" | "YATIRIM" | "TICARI" | "TEMINAT";
export type AccountingMode = "TAKSITLER" | "TOPLAM";
export type WorkType = "BORC" | "ALACAK";
export type SourceField = "ANAPARA" | "FAIZ" | "BSMV" | "KKDF";
export type CalcType = "TOPLAM" | "TAKSITLER";

export type CreditInstallment = {
  id?: number;
  installment_no: number;
  amount: number;
  due_date: string | null;
  principal: number;
  interest_amt: number;
  bsmv: number;
  kkdf: number;
  movement_desc: string | null;
  is_paid?: boolean;
  paid_amount?: number;
};

export type CreditAccountMap = {
  id?: number;
  map_key: string;
  label: string;
  coa_id: number | null;
  work_type: WorkType;
  source_field: SourceField;
  calc_type: CalcType;
  sort_order: number;
  coa_code?: string | null;
  coa_name?: string | null;
};

export type BankCreditListItem = {
  id: number;
  code: string;
  description: string | null;
  contract_no: string | null;
  credit_type: string;
  branch_id: number;
  installment_count: number;
  total_payable: number;
  total_paid: number;
  remaining: number;
  receipt_date: string | null;
  create_bank_slip: boolean;
  yevmiye_fis_no: string | null;
};

export type BankCreditDetail = {
  id: number;
  code: string;
  description: string | null;
  contract_no: string | null;
  credit_type: CreditType;
  branch_id: number;
  record_type_id: number;
  project_code: string | null;
  cost_center_code: string | null;
  special_code: string | null;
  credit_coa_id: number | null;
  bank_account_id: number | null;
  receipt_date: string | null;
  close_date: string | null;
  payment_start_date: string | null;
  installment_count: number;
  accounting_mode: AccountingMode;
  create_bank_slip: boolean;
  total_payable: number;
  total_paid: number;
  remaining: number;
  avg_due_days: number | null;
  bank_transaction_id: number | null;
  journal_voucher_id: number | null;
  yevmiye_fis_no: string | null;
  credit_coa_code?: string | null;
  credit_coa_name?: string | null;
  bank_account_code?: string | null;
  bank_account_name?: string | null;
  installments: CreditInstallment[];
  account_maps: CreditAccountMap[];
};

export type BankCreditPayload = {
  code: string;
  description: string | null;
  contract_no: string | null;
  credit_type: CreditType;
  branch_id: number;
  record_type_id: number;
  project_code: string | null;
  cost_center_code: string | null;
  special_code: string | null;
  credit_coa_id: number | null;
  bank_account_id: number | null;
  receipt_date: string | null;
  close_date: string | null;
  payment_start_date: string | null;
  installment_count: number;
  accounting_mode: AccountingMode;
  create_bank_slip: boolean;
  installments: CreditInstallment[];
  account_maps: CreditAccountMap[];
};

export const DEFAULT_ACCOUNT_MAPS: CreditAccountMap[] = [
  { map_key: "BANKA_102", label: "Banka 102", work_type: "BORC", source_field: "ANAPARA", calc_type: "TOPLAM", sort_order: 10, coa_id: null },
  { map_key: "FAIZ_180", label: "Faiz 180", work_type: "BORC", source_field: "FAIZ", calc_type: "TOPLAM", sort_order: 20, coa_id: null },
  { map_key: "ANAPARA_BU_YIL", label: "Anapara bu yıl 300", work_type: "ALACAK", source_field: "ANAPARA", calc_type: "TAKSITLER", sort_order: 30, coa_id: null },
  { map_key: "ANAPARA_GELECEK", label: "Anapara gelecek yıl", work_type: "ALACAK", source_field: "ANAPARA", calc_type: "TAKSITLER", sort_order: 40, coa_id: null },
  { map_key: "GELECEK_FAIZ_280", label: "Gelecek yıl faiz 280", work_type: "ALACAK", source_field: "FAIZ", calc_type: "TAKSITLER", sort_order: 50, coa_id: null },
  { map_key: "GIDER_TAHAKKUK_381", label: "Gider tahakkuk bu yıl 381", work_type: "ALACAK", source_field: "FAIZ", calc_type: "TAKSITLER", sort_order: 60, coa_id: null },
  { map_key: "GIDER_TAHAKKUK_481", label: "Gider tahakkuk gelecek 481", work_type: "ALACAK", source_field: "FAIZ", calc_type: "TAKSITLER", sort_order: 70, coa_id: null },
  { map_key: "GIDER_780_770", label: "Gider 780/770", work_type: "BORC", source_field: "FAIZ", calc_type: "TOPLAM", sort_order: 80, coa_id: null },
];

export const CREDIT_TYPE_OPTIONS: { value: CreditType; label: string }[] = [
  { value: "ISLETME", label: "İşletme" },
  { value: "IHTIYAC", label: "İhtiyaç" },
  { value: "YATIRIM", label: "Yatırım" },
  { value: "TICARI", label: "Ticari" },
  { value: "TEMINAT", label: "Teminat" },
];

const qs = (params?: Record<string, string | number | undefined | null>) => {
  const sp = new URLSearchParams();
  if (!params) return "";
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
};

export const bankaKredileriApi = {
  list: (params?: { q?: string; branch_id?: number }) =>
    api<{ items: BankCreditListItem[] }>(`/banka-kredileri${qs(params)}`),
  get: (id: number) => api<BankCreditDetail>(`/banka-kredileri/${id}`),
  create: (body: BankCreditPayload) =>
    api<BankCreditDetail>("/banka-kredileri", { method: "POST", body }),
  update: (id: number, body: BankCreditPayload) =>
    api<BankCreditDetail>(`/banka-kredileri/${id}`, { method: "PUT", body }),
  remove: (id: number) => api<void>(`/banka-kredileri/${id}`, { method: "DELETE" }),
};
