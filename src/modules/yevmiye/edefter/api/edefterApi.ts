import { api, http } from "@/services/api";

export type EdefterPeriod = {
  id: number;
  period_year: number;
  period_month: number;
  status: string;
  journal_count: number;
  line_count: number;
  total_debit: number | string;
  total_credit: number | string;
  berat_path?: string | null;
  defter_path?: string | null;
  archive_path?: string | null;
  gib_ref?: string | null;
  error_message?: string | null;
  branch_id?: number | null;
  uploaded_at?: string | null;
  prepared_at?: string | null;
  archived_at?: string | null;
  notes?: string | null;
  created_at?: string | null;
  message?: string | null;
};

export type EdefterPreviewItem = {
  id: number;
  voucher_no: string;
  voucher_date: string;
  description?: string | null;
  total_debit: number | string;
  total_credit: number | string;
  status: string;
  line_count: number;
};

export type EdefterPreview = {
  year: number;
  month: number;
  journal_count: number;
  line_count: number;
  total_debit: number | string;
  total_credit: number | string;
  items: EdefterPreviewItem[];
  existing_period_id?: number | null;
  existing_period_status?: string | null;
};

export type EdefterActionResult = {
  ok: boolean;
  message: string;
  period_id: number;
  status: string;
  gib_ref?: string | null;
  archive_path?: string | null;
};

function qs(params: Record<string, string | number | undefined | null>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
}

async function downloadBlob(url: string, filename: string) {
  const res = await http.get(url, { responseType: "blob" });
  const blobUrl = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(blobUrl);
}

export const edefterApi = {
  list: (params?: { year?: number; status?: string; page?: number; page_size?: number }) =>
    api<{ items: EdefterPeriod[]; total: number }>(`/edefter/periods${qs(params ?? {})}`),

  get: (id: number) => api<EdefterPeriod>(`/edefter/periods/${id}`),

  preview: (params: { year: number; month: number; branch_id?: number }) =>
    api<EdefterPreview>(`/edefter/preview${qs(params)}`),

  previewPeriod: (id: number) => api<EdefterPreview>(`/edefter/periods/${id}/preview`),

  prepare: (body: { year: number; month: number; branch_id?: number | null; notes?: string }) =>
    api<EdefterPeriod>("/edefter/periods/prepare", { method: "POST", body }),

  archive: (id: number) =>
    api<EdefterActionResult>(`/edefter/periods/${id}/archive`, { method: "POST" }),

  upload: (id: number) =>
    api<EdefterActionResult>(`/edefter/periods/${id}/upload`, { method: "POST" }),

  downloadBerat: (id: number, year: number, month: number) =>
    downloadBlob(`/edefter/periods/${id}/berat`, `berat_${year}${String(month).padStart(2, "0")}.xml`),

  downloadDefter: (id: number, year: number, month: number) =>
    downloadBlob(`/edefter/periods/${id}/defter`, `defter_${year}${String(month).padStart(2, "0")}.xml`),

  downloadZip: (id: number, year: number, month: number) =>
    downloadBlob(`/edefter/periods/${id}/archive`, `edefter_${year}${String(month).padStart(2, "0")}.zip`),
};
