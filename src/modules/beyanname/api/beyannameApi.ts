import { api, http } from "@/services/api";

export type DeclarationType =
  | "BABS"
  | "KDV1"
  | "KDV2"
  | "MUHTASAR_1003A"
  | "MUHTASAR_1003B"
  | "GECICI_VERGI"
  | "KURUMLAR"
  | "GELIR_YILLIK"
  | "DAMGA"
  | "POSET"
  | "KESIN_MIZAN"
  | "KDV_TEVKIFAT"
  /** @deprecated legacy alias → KDV1 */
  | "KDV"
  /** @deprecated legacy alias → MUHTASAR_1003A */
  | "MUHTASAR_SGK";

export type BeyannamePeriod = {
  id: number;
  declaration_type: DeclarationType | string;
  period_year: number;
  period_month?: number | null;
  period_quarter?: number | null;
  status: string;
  package_path?: string | null;
  signature_path?: string | null;
  receipt_path?: string | null;
  pdf_path?: string | null;
  xml_path?: string | null;
  mail_sent_at?: string | null;
  totals?: Record<string, unknown>;
  gib_ref?: string | null;
  error_message?: string | null;
  branch_id?: number | null;
  signed_at?: string | null;
  uploaded_at?: string | null;
  prepared_at?: string | null;
  notes?: string | null;
  created_at?: string | null;
  message?: string | null;
};

export type BeyannamePreview = {
  declaration_type: string;
  year: number;
  month?: number | null;
  quarter?: number | null;
  totals: Record<string, unknown>;
  existing_period_id?: number | null;
  existing_period_status?: string | null;
};

export type BeyannameActionResult = {
  ok: boolean;
  message: string;
  period_id: number;
  status: string;
  gib_ref?: string | null;
  package_path?: string | null;
  signature_path?: string | null;
  receipt_path?: string | null;
  pdf_path?: string | null;
  xml_path?: string | null;
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

export const beyannameApi = {
  list: (params?: {
    type?: DeclarationType | string;
    year?: number;
    status?: string;
    page?: number;
    page_size?: number;
  }) => api<{ items: BeyannamePeriod[]; total: number }>(`/beyanname/periods${qs(params ?? {})}`),

  get: (id: number) => api<BeyannamePeriod>(`/beyanname/periods/${id}`),

  preview: (params: {
    type: DeclarationType | string;
    year: number;
    month?: number;
    quarter?: number;
    branch_id?: number;
  }) => api<BeyannamePreview>(`/beyanname/preview${qs(params)}`),

  prepare: (body: {
    declaration_type: DeclarationType | string;
    year: number;
    month?: number | null;
    quarter?: number | null;
    branch_id?: number | null;
    notes?: string;
  }) => api<BeyannamePeriod>("/beyanname/periods/prepare", { method: "POST", body }),

  sign: (id: number, provider: "mali_muhur" | "nei") =>
    api<BeyannameActionResult>(`/beyanname/periods/${id}/sign`, {
      method: "POST",
      body: { provider },
    }),

  upload: (id: number) =>
    api<BeyannameActionResult>(`/beyanname/periods/${id}/upload`, { method: "POST" }),

  workflow: (id: number, target_status: string) =>
    api<BeyannameActionResult>(`/beyanname/periods/${id}/workflow`, {
      method: "POST",
      body: { target_status },
    }),

  downloadPackage: (id: number, filename: string) =>
    downloadBlob(`/beyanname/periods/${id}/package`, filename),

  downloadReceipt: (id: number, filename: string) =>
    downloadBlob(`/beyanname/periods/${id}/receipt`, filename),

  downloadXml: (id: number, filename: string) =>
    downloadBlob(`/beyanname/periods/${id}/xml`, filename),

  downloadPdf: (id: number, filename: string) =>
    downloadBlob(`/beyanname/periods/${id}/pdf`, filename),

  downloadGib: (id: number, filename: string) =>
    downloadBlob(`/beyanname/periods/${id}/gib-download`, filename),

  sendMail: (
    id: number,
    body: { to_email: string; subject?: string; body?: string },
  ) =>
    api<BeyannameActionResult>(`/beyanname/periods/${id}/mail`, {
      method: "POST",
      body,
    }),
};
