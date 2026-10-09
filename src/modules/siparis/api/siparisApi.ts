import { api } from "@/services/api";

function qs(params: Record<string, string | number | boolean | undefined | null>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  }
  return parts.length ? `?${parts.join("&")}` : "";
}

export type DocKind = "SIPARIS" | "TEKLIF";
export type OrderDirection = "ALINAN" | "VERILEN";

export type OrderLineInput = {
  stock_id?: number | null;
  description?: string | null;
  qty: number;
  unit_id?: number | null;
  unit_price: number;
  discount_pct?: number;
  discount_pct_2?: number;
  discount_pct_3?: number;
  discount_amount?: number;
  tax_rate_id?: number | null;
  tax_rate?: number | null;
  delivery_date?: string | null;
};

export type OrderListItem = {
  id: number;
  order_no: string;
  order_date: string;
  direction: string;
  doc_kind: string;
  account_id: number;
  account_code?: string | null;
  account_title?: string | null;
  grand_total: number;
  status: string;
  status_label: string;
  delivery_status: string;
  delivery_status_label: string;
  invoice_status: string;
  invoice_status_label: string;
  collection_status: string;
  collection_status_label: string;
  delivery_date?: string | null;
  invoiced_total: number;
  collected_total: number;
  branch_id: number;
  record_type_id: number;
  change_flag?: boolean;
  change_summary?: string | null;
  linked_order_id?: number | null;
  linked_order_no?: string | null;
  linked_waybill_id?: number | null;
  linked_waybill_no?: string | null;
  linked_invoice_id?: number | null;
  linked_invoice_no?: string | null;
};

export type OrderLineOut = OrderLineInput & {
  id: number;
  line_no: number;
  stock_code?: string | null;
  stock_name?: string | null;
  line_subtotal?: number;
  line_total: number;
  tax_amount?: number;
  qty_delivered?: number;
};

export type OrderDocumentLink = {
  id: number;
  link_type: string;
  document_type: string;
  document_id: number;
  document_no?: string | null;
  amount: number;
  ettn?: string | null;
};

export type OrderDetail = {
  id: number;
  order_no: string;
  order_date: string;
  direction: string;
  doc_kind: string;
  branch_id: number;
  record_type_id: number;
  account_id: number;
  account_code?: string | null;
  account_title?: string | null;
  grand_total: number;
  subtotal: number;
  discount_total: number;
  tax_total: number;
  vat_included: boolean;
  footer_discount_pct: number;
  footer_discount_pct_2: number;
  footer_discount_pct_3: number;
  status: string;
  status_label: string;
  delivery_status: string;
  delivery_status_label?: string;
  invoice_status: string;
  invoice_status_label?: string;
  collection_status: string;
  collection_status_label?: string;
  delivery_date?: string | null;
  delivery_address?: string | null;
  invoiced_total: number;
  collected_total: number;
  notes?: string | null;
  change_flag?: boolean;
  change_summary?: string | null;
  linked_order_id?: number | null;
  linked_order_no?: string | null;
  linked_waybill_id?: number | null;
  linked_waybill_no?: string | null;
  linked_invoice_id?: number | null;
  linked_invoice_no?: string | null;
  lines: OrderLineOut[];
  document_links: OrderDocumentLink[];
};

export type OrderListResponse = {
  items: OrderListItem[];
  total: number;
  page: number;
  page_size: number;
};

export type OrderConvertResponse = {
  ok: boolean;
  message: string;
  target_id?: number;
  target_no?: string;
};

export const siparisApi = {
  list: (params?: Record<string, string | number | boolean | undefined>) =>
    api<OrderListResponse>(`/siparis${qs(params ?? {})}`),

  get: (id: number) => api<OrderDetail>(`/siparis/${id}`),

  create: (body: Record<string, unknown>) =>
    api<OrderDetail>("/siparis", { method: "POST", body }),

  update: (id: number, body: Record<string, unknown>) =>
    api<OrderDetail>(`/siparis/${id}`, { method: "PUT", body }),

  delete: (id: number) => api<{ ok: boolean; message: string }>(`/siparis/${id}`, { method: "DELETE" }),

  convertOrder: (id: number) =>
    api<OrderConvertResponse>(`/siparis/${id}/convert/order`, { method: "POST" }),

  convertInvoice: (id: number) =>
    api<OrderConvertResponse>(`/siparis/${id}/convert/invoice`, { method: "POST" }),

  convertWaybill: (id: number) =>
    api<OrderConvertResponse>(`/siparis/${id}/convert/waybill`, { method: "POST" }),
};
