import { api } from "@/services/api";

export type JournalVoucherSummary = {
  id: number;
  voucher_no: string;
  voucher_date: string;
  madde_no?: number | null;
  description?: string | null;
  total_debit: number;
  total_credit: number;
  status: string;
  revision_no: number;
  has_changes: boolean;
  source_labels?: string[];
};

export type JournalVoucher = {
  id: number;
  voucher_no: string;
  voucher_date: string;
  description?: string;
  total_debit: number;
  total_credit: number;
  status: string;
  revision_no: number;
  madde_no?: number | null;
  has_changes?: boolean;
  correction_note?: string | null;
  original_lines?: Array<Record<string, unknown>>;
  lines: Array<{
    line_no: number;
    coa_id?: number;
    coa_code?: string;
    coa_name?: string;
    debit: number;
    credit: number;
    description?: string;
  }>;
  document_links: Array<{ source_type: string; source_id: number }>;
};

export type JournalChangeCompare = {
  voucher_id: number;
  voucher_no: string;
  has_changes: boolean;
  revision_no: number;
  olusturulan: Array<Record<string, unknown>>;
  kayitli: Array<Record<string, unknown>>;
  source_type?: string | null;
  source_id?: number | null;
};

export type MissingYevmiyeItem = {
  source_type: string;
  source_id: number;
  doc_no?: string | null;
  doc_date: string;
  amount: number;
  status_label: string;
};

export type MaddeRenumberPreview = {
  date_from: string;
  date_to: string;
  last_madde_no: number;
  start_madde_no: number;
  end_madde_no: number;
  count: number;
  rows: Array<{
    id: number;
    voucher_no: string;
    voucher_date: string;
    description?: string | null;
    old_madde_no?: number | null;
    new_madde_no: number;
    total_debit: number;
    total_credit: number;
  }>;
};

export type Suggestion = {
  id?: number;
  source_type: string;
  source_id: number;
  status: string;
  proposed_description?: string;
  proposed_lines?: Array<Record<string, unknown>>;
  confidence: number;
  doc_no?: string;
  amount?: number;
};

function qs(params?: Record<string, string | number | boolean | null | undefined>): string {
  if (!params) return "";
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    sp.set(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export const yevmiyeApi = {
  listVouchers: (params?: Record<string, unknown>) =>
    api<{ items: JournalVoucherSummary[]; total: number }>(
      `/yevmiye/fisler${qs(params as Record<string, string | number>)}`
    ),
  getVoucher: (id: number) => api<JournalVoucher>(`/yevmiye/fisler/${id}`),
  createManual: (body: Record<string, unknown>) =>
    api<JournalVoucher>(`/yevmiye/fisler`, { method: "POST", body }),
  getChanges: (id: number) => api<JournalChangeCompare>(`/yevmiye/fisler/${id}/degisiklik`),
  updateVoucher: (id: number, body: Record<string, unknown>) =>
    api<JournalVoucher>(`/yevmiye/fisler/${id}`, { method: "PUT", body }),
  deleteVoucher: (id: number) =>
    api<{ ok: boolean; message?: string }>(`/yevmiye/fisler/${id}`, { method: "DELETE" }),
  correctVoucher: (id: number, body: Record<string, unknown>) =>
    api<JournalVoucher>(`/yevmiye/fisler/${id}/duzelt`, { method: "POST", body }),

  listMissing: (params?: { branch_id?: number; limit?: number }) =>
    api<{ items: MissingYevmiyeItem[]; total: number }>(`/yevmiye/olusmayanlar${qs(params)}`),
  createFromSource: (source_type: string, source_id: number) =>
    api<JournalVoucher>(`/yevmiye/olustur`, {
      method: "POST",
      body: { source_type, source_id },
    }),

  maddeSonNo: (params?: { date_from?: string; branch_id?: number; record_type_id?: number }) =>
    api<{ last_madde_no: number; start_madde_no: number }>(
      `/yevmiye/madde-numaralama/son-no${qs(params)}`
    ),
  maddePreview: (params: {
    date_from: string;
    date_to: string;
    branch_id?: number;
    record_type_id?: number;
  }) => api<MaddeRenumberPreview>(`/yevmiye/madde-numaralama/onizleme${qs(params)}`),
  maddeApply: (body: {
    date_from: string;
    date_to: string;
    branch_id?: number | null;
    record_type_id?: number | null;
    start_madde_no: number;
  }) => api<MaddeRenumberPreview>(`/yevmiye/madde-numaralama/kaydet`, { method: "POST", body }),

  listSuggestions: (branch_id?: number) =>
    api<Suggestion[]>(`/yevmiye/oneriler${qs({ branch_id })}`),
  previewSuggestion: (source_type: string, source_id: number) =>
    api<Suggestion>(`/yevmiye/oneriler/onizleme${qs({ source_type, source_id })}`),
  regenSuggestion: (source_type: string, source_id: number) =>
    api<Suggestion>(`/yevmiye/oneriler/yeniden${qs({ source_type, source_id })}`, { method: "POST" }),
  approveSuggestion: (id: number, body?: Record<string, unknown>) =>
    api<JournalVoucher>(`/yevmiye/oneriler/${id}/onayla`, { method: "POST", body: body ?? {} }),
  rejectSuggestion: (id: number, reason: string) =>
    api<Suggestion>(`/yevmiye/oneriler/${id}/reddet`, { method: "POST", body: { reason } }),
  uploadOcr: async (
    branch_id: number,
    record_type_id: number,
    file: File,
    doc_kind = "FIS"
  ) => {
    const form = new FormData();
    form.append("branch_id", String(branch_id));
    form.append("record_type_id", String(record_type_id));
    form.append("doc_kind", doc_kind);
    form.append("file", file);
    return api<Record<string, unknown>>("/yevmiye/ocr/yukle", {
      method: "POST",
      body: form,
    });
  },
  proposeOcr: (ocr_id: number) =>
    api<Record<string, unknown>>(`/yevmiye/ocr/${ocr_id}/oneri`, { method: "POST" }),
  approveOcr: (ocr_id: number, body?: Record<string, unknown>) =>
    api<Record<string, unknown>>(`/yevmiye/ocr/${ocr_id}/onayla`, { method: "POST", body: body ?? {} }),
  yearEndPreview: (body: Record<string, unknown>) =>
    api<Record<string, unknown>>("/yevmiye/yil-sonu", { method: "POST", body }),
  yearEndApprove: (run_id: number) =>
    api<Record<string, unknown>>(`/yevmiye/yil-sonu/${run_id}/onayla`, { method: "POST" }),
  aiMaliTablo: (body: Record<string, unknown>) =>
    api<Record<string, unknown>>("/yevmiye/ai/mali-tablo", { method: "POST", body }),
};
