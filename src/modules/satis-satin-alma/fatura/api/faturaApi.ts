import { api, http } from "@/services/api";

export type CariLookup = {
  id: number;
  code: string;
  title: string;
  tax_number?: string | null;
  email?: string | null;
  is_efatura?: boolean;
};
export type TevkifatCodeLookup = { id: number; code: string; name: string; rate: number };
export type StokLookup = {
  id: number;
  code: string;
  name: string;
  unit_id: number | null;
  unit_code: string | null;
  sale_price: number | null;
  tax_rate_id: number | null;
  default_istisna_code?: string | null;
  default_tevkifat_code?: string | null;
};
export type TaxRateLookup = { id: number; code: string; name: string; rate: number };
export type CurrencyLookup = { id: number; code: string; name: string };
export type OrderLookup = {
  id: number;
  order_no: string;
  order_date: string;
  direction: string;
  account_title: string | null;
  grand_total: number;
};
export type DispatchLookup = {
  id: number;
  waybill_no: string;
  waybill_date: string;
  direction: string;
  account_title: string | null;
};

export type InvoiceListItem = {
  id: number;
  invoice_no: string;
  fis_no: string | null;
  invoice_type: string;
  invoice_type_label: string;
  invoice_date: string;
  due_date: string | null;
  account_code: string | null;
  account_title: string | null;
  subtotal?: number;
  tax_total?: number;
  grand_total: number;
  status: string;
  is_posted: boolean;
  yevmiye_fis_no: string | null;
  ettn?: string | null;
  direction?: string;
  document_channel?: string | null;
  document_channel_label?: string | null;
  e_fatura_type?: string | null;
  integrator_source?: string | null;
  is_incoming?: boolean;
  gib_status?: string;
  gib_status_label?: string;
  tax_breakdown?: Record<string, number>;
};

export type InvoiceDetail = InvoiceListItem & {
  branch_id: number;
  record_type_id: number;
  account_id: number;
  subtotal: number;
  discount_total: number;
  tax_total: number;
  vat_included: boolean;
  footer_discount_pct: number;
  footer_discount_pct_2?: number;
  footer_discount_pct_3?: number;
  description: string | null;
  tevkifat_code: string | null;
  tevkifat_rate: number;
  tevkifat_amount: number;
  istisna_code: string | null;
  ozel_matrah_code: string | null;
  exchange_rate: number;
  order_id: number | null;
  dispatch_id: number | null;
  gib_status?: string;
  gib_status_label?: string;
  tax_breakdown?: Record<string, number>;
  lines: Array<{
    id?: number;
    line_no?: number;
    stock_id: number | null;
    stock_code?: string | null;
    description: string | null;
    qty: number;
    unit_id: number | null;
    unit_price: number;
    discount_pct: number;
    discount_pct_2?: number;
    discount_pct_3?: number;
    discount_amount: number;
    tax_rate_id: number | null;
    tax_rate: number | null;
    istisna_code?: string | null;
    tevkifat_code?: string | null;
    tevkifat_rate?: number;
    override_istisna?: boolean;
    override_tevkifat?: boolean;
    line_total: number;
  }>;
};

function qs(params: Record<string, string | number | undefined | null>): string {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export const faturaApi = {
  list: (params?: Record<string, string | number | undefined>) =>
    api<{ items: InvoiceListItem[]; total: number }>(`/fatura${qs(params ?? {})}`),

  get: (id: number) => api<InvoiceDetail>(`/fatura/${id}`),

  create: (payload: Record<string, unknown>) => api<InvoiceDetail>("/fatura", { method: "POST", body: payload }),

  update: (id: number, payload: Record<string, unknown>) =>
    api<InvoiceDetail>(`/fatura/${id}`, { method: "PUT", body: payload }),

  approve: (id: number) => api<InvoiceDetail>(`/fatura/${id}/approve`, { method: "POST" }),

  copy: (id: number) => api<InvoiceDetail>(`/fatura/${id}/copy`, { method: "POST" }),

  remove: (id: number) => api<void>(`/fatura/${id}`, { method: "DELETE" }),

  print: (id: number) => api<{ ok: boolean; message: string }>(`/fatura/${id}/print`, { method: "POST" }),

  sendEfatura: (id: number) =>
    api<{ ok: boolean; message: string; gib_status?: string }>(`/fatura/${id}/send-efatura`, { method: "POST" }),

  convertProforma: (id: number) =>
    api<InvoiceDetail>(`/fatura/${id}/convert-proforma`, { method: "POST" }),

  convertToWaybill: (id: number) =>
    api<{ ok: boolean; message: string; waybill_id?: number; waybill_no?: string }>(
      `/fatura/${id}/convert-to-waybill`,
      { method: "POST" }
    ),

  downloadPdf: (id: number) =>
    api<{ ok: boolean; message: string; filename?: string }>(`/fatura/${id}/download-pdf`, { method: "POST" }),

  downloadXml: (id: number) =>
    api<{ ok: boolean; message: string; filename?: string }>(`/fatura/${id}/download-xml`, { method: "POST" }),

  sendEmail: (id: number) =>
    api<{ ok: boolean; message: string }>(`/fatura/${id}/send-email`, { method: "POST" }),

  downloadEarsivBlob: async (id: number, kind: "pdf" | "xml" | "ubl") => {
    const res = await http.get(`/fatura/${id}/earsiv/${kind}`, { responseType: "blob" });
    const blob = res.data as Blob;
    const ext = kind === "pdf" ? "pdf" : "xml";
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `earsiv-${id}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  },

  fetchEarsivHtml: async (id: number) => {
    const res = await http.get(`/fatura/${id}/earsiv/html`, { responseType: "text" });
    return String(res.data);
  },

  sendEarsivEmail: (
    id: number,
    payload: { to_email: string; cc_email?: string; subject?: string; body?: string }
  ) =>
    api<{ ok: boolean; message: string; outbox_id?: number; status?: string }>(
      `/fatura/${id}/earsiv/send-email`,
      { method: "POST", body: payload }
    ),

  previewNo: (params: {
    invoice_type: string;
    branch_id: number;
    record_type_id: number;
    transaction_date: string;
  }) => api<{ invoice_no: string; fis_no: string }>(`/fatura/preview-no${qs(params)}`),

  lookupCari: (params?: { branch_id?: number; q?: string }) =>
    api<{ items: CariLookup[] }>(`/fatura/lookups/cari${qs(params ?? {})}`),

  lookupStok: (params?: { branch_id?: number; q?: string }) =>
    api<{ items: StokLookup[] }>(`/fatura/lookups/stok${qs(params ?? {})}`),

  lookupTaxRates: () => api<{ items: TaxRateLookup[] }>("/fatura/lookups/tax-rates"),

  lookupCurrencies: () => api<{ items: CurrencyLookup[] }>("/fatura/lookups/currencies"),

  lookupOrders: (params?: { branch_id?: number; q?: string; doc_kind?: string }) =>
    api<{ items: OrderLookup[] }>(`/fatura/lookups/orders${qs(params ?? {})}`),

  lookupDispatches: (params?: { branch_id?: number; q?: string }) =>
    api<{ items: DispatchLookup[] }>(`/fatura/lookups/dispatches${qs(params ?? {})}`),

  lookupTevkifatCodes: () => api<{ items: TevkifatCodeLookup[] }>("/fatura/lookups/tevkifat-codes"),

  importLines: async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    const res = await http.post("/fatura/import-lines", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data as {
      lines: Array<Record<string, unknown>>;
      imported_count: number;
      skipped_count: number;
      warnings: string[];
    };
  },
};
