import { api, http } from "@/services/api";

export type EmmLine = {
  id?: number;
  line_no?: number;
  stock_id?: number | null;
  stock_code?: string | null;
  stock_name?: string | null;
  description?: string | null;
  qty: number;
  unit_id?: number | null;
  unit_code?: string | null;
  unit_price: number;
  line_total?: number;
};

export type EmmListItem = {
  id: number;
  receipt_no: string;
  fis_no?: string | null;
  receipt_date: string;
  account_id: number;
  account_code?: string | null;
  account_title?: string | null;
  branch_id: number;
  record_type_id: number;
  record_type_code?: string | null;
  subtotal: number;
  stopaj_amount: number;
  grand_total: number;
  status: string;
  gib_status: string;
  gib_status_label: string;
  ettn?: string | null;
  yevmiye_fis_no?: string | null;
  is_posted: boolean;
};

export type EmmDetail = EmmListItem & {
  description?: string | null;
  currency_id?: number | null;
  exchange_rate: number;
  stopaj_rate: number;
  tevkifat_code?: string | null;
  tevkifat_rate: number;
  tevkifat_amount: number;
  gib_uuid?: string | null;
  ubl_xml_path?: string | null;
  sent_at?: string | null;
  document_channel?: string | null;
  journal_voucher_id?: number | null;
  approved_at?: string | null;
  lines: EmmLine[];
};

export type EmmCreatePayload = {
  branch_id: number;
  record_type_id: number;
  account_id: number;
  receipt_date: string;
  receipt_no?: string | null;
  description?: string | null;
  stopaj_rate?: number;
  tevkifat_rate?: number;
  lines: Array<{
    stock_id?: number | null;
    description?: string | null;
    qty: number;
    unit_id?: number | null;
    unit_code?: string | null;
    unit_price: number;
  }>;
  save_mode: "draft" | "approve";
};

export type CariLookup = { id: number; code: string; title: string; tax_number?: string | null };
export type StokLookup = {
  id: number;
  code: string;
  name: string;
  unit_id?: number | null;
  unit_code?: string | null;
  purchase_price?: number | null;
};

function qs(params: Record<string, string | number | undefined | null>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export const emmApi = {
  list: (params?: {
    branch_id?: number;
    record_type_id?: number;
    status?: string;
    gib_status?: string;
    q?: string;
    page?: number;
    page_size?: number;
  }) => api<{ items: EmmListItem[]; total: number }>(`/emm${qs(params ?? {})}`),

  get: (id: number) => api<EmmDetail>(`/emm/${id}`),

  create: (body: EmmCreatePayload) =>
    api<EmmDetail>("/emm", { method: "POST", body }),

  update: (id: number, body: Partial<EmmCreatePayload>) =>
    api<EmmDetail>(`/emm/${id}`, { method: "PUT", body }),

  remove: (id: number) => api<void>(`/emm/${id}`, { method: "DELETE" }),

  approve: (id: number) =>
    api<{ ok: boolean; message: string; gib_status?: string; yevmiye_fis_no?: string }>(
      `/emm/${id}/approve`,
      { method: "POST" }
    ),

  createEmm: (id: number) =>
    api<{ ok: boolean; message: string; gib_status?: string; ettn?: string; ubl_ready?: boolean }>(
      `/emm/${id}/create-emm`,
      { method: "POST" }
    ),

  send: (id: number) =>
    api<{ ok: boolean; message: string; gib_status?: string; ettn?: string }>(`/emm/${id}/send`, {
      method: "POST",
    }),

  status: (id: number) =>
    api<{
      receipt_id: number;
      receipt_no: string;
      gib_status: string;
      gib_status_label: string;
      ettn?: string | null;
      history: Array<{ id: number; status: string; message?: string | null; queried_at: string }>;
    }>(`/emm/${id}/status`),

  queryStatus: (id: number) =>
    api<{ gib_status: string; gib_status_label: string; history: unknown[] }>(
      `/emm/${id}/query-status`,
      { method: "POST" }
    ),

  lookupCari: (params?: { branch_id?: number; q?: string }) =>
    api<{ items: CariLookup[] }>(`/emm/lookups/cari${qs(params ?? {})}`),

  lookupStok: (params?: { branch_id?: number; q?: string }) =>
    api<{ items: StokLookup[] }>(`/emm/lookups/stok${qs(params ?? {})}`),

  previewNo: (params: { branch_id: number; record_type_id: number; transaction_date: string }) =>
    api<{ receipt_no: string; fis_no: string }>(`/emm/preview-no${qs(params)}`),

  download: async (id: number, kind: "pdf" | "ubl" | "xml") => {
    const path = kind === "pdf" ? "pdf" : kind === "xml" ? "xml" : "ubl";
    const ext = kind === "pdf" ? "pdf" : "xml";
    const res = await http.get(`/emm/${id}/${path}`, { responseType: "blob" });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = `emm-${id}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  },
};
