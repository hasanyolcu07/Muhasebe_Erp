import { api, http } from "@/services/api";

export type BabsPeriod = {
  id: number;
  period_year: number;
  period_month: number;
  status: string;
  limit_amount: number | string;
  ba_line_count: number;
  bs_line_count: number;
  ba_total: number | string;
  bs_total: number | string;
  ba_xml_path?: string | null;
  bs_xml_path?: string | null;
  gib_ref?: string | null;
  error_message?: string | null;
  branch_id?: number | null;
  uploaded_at?: string | null;
  prepared_at?: string | null;
  notes?: string | null;
  created_at?: string | null;
  message?: string | null;
};

export type BabsLine = {
  id: number;
  period_id: number;
  declaration_type: string; // BA | BS
  account_id?: number | null;
  tax_number?: string | null;
  account_title?: string | null;
  doc_count: number;
  total_amount: number | string;
  above_limit: boolean;
};

export type BabsPeriodDetail = BabsPeriod & {
  lines: BabsLine[];
};

export type BabsPreview = {
  year: number;
  month: number;
  limit_amount: number | string;
  ba_line_count: number;
  bs_line_count: number;
  ba_total: number | string;
  bs_total: number | string;
  ba_above_count: number;
  bs_above_count: number;
  lines: BabsLine[];
  existing_period_id?: number | null;
  existing_period_status?: string | null;
};

export type BabsActionResult = {
  ok: boolean;
  message: string;
  period_id: number;
  status: string;
  gib_ref?: string | null;
};

function qs(params: Record<string, string | number | boolean | undefined | null>) {
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

export const babsApi = {
  list: (params?: { year?: number; status?: string; page?: number; page_size?: number }) =>
    api<{ items: BabsPeriod[]; total: number }>(`/babs/periods${qs(params ?? {})}`),

  get: (id: number) => api<BabsPeriodDetail>(`/babs/periods/${id}`),

  preview: (params: { year: number; month: number; limit_amount?: number; branch_id?: number }) =>
    api<BabsPreview>(`/babs/preview${qs(params)}`),

  previewPeriod: (id: number) => api<BabsPreview>(`/babs/periods/${id}/preview`),

  prepare: (body: {
    year: number;
    month: number;
    limit_amount?: number | null;
    include_only_above_limit?: boolean; // XML'e yalnızca limit üstü
    branch_id?: number | null;
    notes?: string;
  }) => api<BabsPeriodDetail>("/babs/periods/prepare", { method: "POST", body }),

  upload: (id: number) => api<BabsActionResult>(`/babs/periods/${id}/upload`, { method: "POST" }),

  downloadBaXml: (id: number, year: number, month: number) =>
    downloadBlob(`/babs/periods/${id}/ba-xml`, `ba_${year}${String(month).padStart(2, "0")}.xml`),

  downloadBsXml: (id: number, year: number, month: number) =>
    downloadBlob(`/babs/periods/${id}/bs-xml`, `bs_${year}${String(month).padStart(2, "0")}.xml`),
};
