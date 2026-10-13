import { api, http } from "@/services/api";

export type CariLookup = { id: number; code: string; title: string; tax_number?: string | null };
export type StokLookup = {
  id: number;
  code: string;
  name: string;
  unit_id: number | null;
  unit_code: string | null;
  sale_price: number | null;
  purchase_price: number | null;
};
export type OrderLookup = {
  id: number;
  order_no: string;
  order_date: string;
  direction: string;
  account_title: string | null;
  grand_total: number;
};

export type WaybillListItem = {
  id: number;
  waybill_no: string;
  fis_no: string | null;
  waybill_type: string;
  waybill_type_label: string;
  waybill_date: string;
  account_code: string | null;
  account_title: string | null;
  status: string;
  is_posted: boolean;
  yevmiye_fis_no: string | null;
  order_id: number | null;
  invoice_id: number | null;
  invoice_no?: string | null;
  invoice_fis_no?: string | null;
  e_irsaliye_type: string;
  gib_status?: string;
  gib_status_label?: string;
  carrier_name: string | null;
  plate_no: string | null;
  line_count: number;
  total_qty: number;
  ettn?: string | null;
  direction?: string;
  document_channel?: string | null;
  document_channel_label?: string | null;
  integrator_source?: string | null;
  is_incoming?: boolean;
  eirsaliye_direction?: string | null;
};

export type EirsaliyeStatusLogItem = {
  id: number;
  status: string;
  message?: string | null;
  queried_at: string;
};

export type EirsaliyeStatusResponse = {
  waybill_id: number;
  waybill_no: string;
  gib_status: string;
  gib_status_label: string;
  ettn?: string | null;
  gib_uuid?: string | null;
  eirsaliye_direction?: string | null;
  eirsaliye_sent_at?: string | null;
  document_channel?: string | null;
  history: EirsaliyeStatusLogItem[];
};

export type IncomingEirsaliyeItem = {
  id: number;
  waybill_no: string;
  waybill_date: string;
  account_title?: string | null;
  gib_status: string;
  gib_status_label: string;
  ettn?: string | null;
  integrator_source?: string | null;
  document_channel?: string | null;
  eirsaliye_direction?: string | null;
};

export type WaybillDetail = WaybillListItem & {
  branch_id: number;
  record_type_id: number;
  account_id: number;
  warehouse_id: number | null;
  shipping_address: string | null;
  carrier_code: string | null;
  driver_name: string | null;
  shipment_datetime: string | null;
  document_no: string | null;
  tracking_no: string | null;
  description: string | null;
  lines: Array<{
    id?: number;
    line_no?: number;
    stock_id: number | null;
    stock_code?: string | null;
    description: string | null;
    qty: number;
    unit_id: number | null;
    unit_code?: string | null;
    unit_price?: number;
    discount_pct?: number;
    tax_rate_id?: number | null;
    tax_rate?: number;
  }>;
  project_code?: string | null;
  cost_center_code?: string | null;
};

function qs(params: Record<string, string | number | undefined | null>): string {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export const irsaliyeApi = {
  list: (params?: Record<string, string | number | undefined>) =>
    api<{ items: WaybillListItem[]; total: number }>(`/irsaliye${qs(params ?? {})}`),

  get: (id: number) => api<WaybillDetail>(`/irsaliye/${id}`),

  create: (payload: Record<string, unknown>) => api<WaybillDetail>("/irsaliye", { method: "POST", body: payload }),

  update: (id: number, payload: Record<string, unknown>) =>
    api<WaybillDetail>(`/irsaliye/${id}`, { method: "PUT", body: payload }),

  approve: (id: number) => api<WaybillDetail>(`/irsaliye/${id}/approve`, { method: "POST" }),

  copy: (id: number) => api<WaybillDetail>(`/irsaliye/${id}/copy`, { method: "POST" }),

  remove: (id: number) => api<void>(`/irsaliye/${id}`, { method: "DELETE" }),

  convertToInvoice: (id: number) =>
    api<{ ok: boolean; message: string; invoice_id: number; invoice_no: string }>(
      `/irsaliye/${id}/convert-to-invoice`,
      { method: "POST" }
    ),

  sendEirsaliye: (id: number) =>
    api<{ ok: boolean; message: string; gib_status?: string }>(`/irsaliye/${id}/eirsaliye/send`, {
      method: "POST",
    }),

  eirsaliyeCreate: (id: number) =>
    api<{
      ok: boolean;
      message: string;
      waybill_id?: number;
      gib_status?: string;
      gib_status_label?: string;
      ettn?: string;
      ubl_ready?: boolean;
    }>(`/irsaliye/${id}/eirsaliye/create`, { method: "POST" }),

  eirsaliyeSend: (id: number) =>
    api<{
      ok: boolean;
      message: string;
      gib_status?: string;
      gib_status_label?: string;
      ettn?: string;
    }>(`/irsaliye/${id}/eirsaliye/send`, { method: "POST" }),

  eirsaliyeStatus: (id: number) =>
    api<EirsaliyeStatusResponse>(`/irsaliye/${id}/eirsaliye/status`),

  eirsaliyeQueryStatus: (id: number) =>
    api<EirsaliyeStatusResponse>(`/irsaliye/${id}/eirsaliye/query-status`, { method: "POST" }),

  eirsaliyeIncoming: (params?: { branch_id?: number; record_type_id?: number; limit?: number }) =>
    api<{ items: IncomingEirsaliyeItem[]; total: number; message?: string }>(
      `/irsaliye/eirsaliye/incoming${qs(params ?? {})}`
    ),

  eirsaliyeReceive: (id: number) =>
    api<{ ok: boolean; message: string; waybill_id?: number; gib_status?: string }>(
      `/irsaliye/${id}/eirsaliye/receive`,
      { method: "POST" }
    ),

  eirsaliyeReceiveNew: (params?: { branch_id?: number; record_type_id?: number }) =>
    api<{ ok: boolean; message: string; waybill_id?: number; gib_status?: string }>(
      `/irsaliye/eirsaliye/receive${qs(params ?? {})}`,
      { method: "POST" }
    ),

  downloadEirsaliye: async (id: number, kind: "pdf" | "ubl" | "xml" | "html") => {
    if (kind === "html") {
      const res = await http.get(`/irsaliye/${id}/eirsaliye/html`, { responseType: "text" });
      const blob = new Blob([res.data], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      return;
    }
    const ext = kind === "pdf" ? "pdf" : "xml";
    const path = kind === "ubl" || kind === "xml" ? "ubl" : kind;
    const res = await http.get(`/irsaliye/${id}/eirsaliye/${path}`, { responseType: "blob" });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = `eirsaliye-${id}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  },

  previewNo: (params: {
    waybill_type: string;
    branch_id: number;
    record_type_id: number;
    transaction_date: string;
  }) => api<{ waybill_no: string; fis_no: string }>(`/irsaliye/preview-no${qs(params)}`),

  lookupCari: (params?: { branch_id?: number; q?: string }) =>
    api<{ items: CariLookup[] }>(`/irsaliye/lookups/cari${qs(params ?? {})}`),

  lookupStok: (params?: { branch_id?: number; q?: string }) =>
    api<{ items: StokLookup[] }>(`/irsaliye/lookups/stok${qs(params ?? {})}`),

  lookupOrders: (params?: { branch_id?: number; q?: string; doc_kind?: string }) =>
    api<{ items: OrderLookup[] }>(`/irsaliye/lookups/orders${qs(params ?? {})}`),
};
