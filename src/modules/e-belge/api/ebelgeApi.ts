import { api } from "@/services/api";

export type EBelgeDocType = "invoice" | "waybill" | "emm";

export type EBelgeListItem = {
  doc_type: EBelgeDocType;
  id: number;
  document_no: string;
  document_date: string;
  account_id?: number | null;
  account_code?: string | null;
  account_title?: string | null;
  grand_total: number;
  belge_tipi: string;
  belge_tipi_label: string;
  gib_status: string;
  gib_status_label: string;
  yevmiye_fis_no?: string | null;
  branch_id?: number | null;
  record_type_id?: number | null;
  record_type_code?: string | null;
  is_incoming: boolean;
  is_deleted: boolean;
  is_modified: boolean;
  created_at?: string | null;
  updated_at?: string | null;
  ettn?: string | null;
  document_channel?: string | null;
};

export type EBelgeListResponse = {
  items: EBelgeListItem[];
  total: number;
  page: number;
  page_size: number;
};

export type EBelgeFilters = {
  date_from?: string;
  date_to?: string;
  q?: string;
  gib_status?: string;
  belge_tipi?: string;
  branch_id?: number;
  record_type_id?: number;
  include_emm?: boolean;
  page?: number;
  page_size?: number;
};

export type EBelgeActionResponse = {
  ok: boolean;
  message: string;
  doc_type: string;
  id: number;
  gib_status?: string | null;
  gib_status_label?: string | null;
};

export type EBelgeBulkResponse = {
  ok: boolean;
  message: string;
  results: Array<{
    doc_type: string;
    id: number;
    ok: boolean;
    message: string;
    gib_status?: string | null;
  }>;
  success_count: number;
  fail_count: number;
};

export type JournalPreview = {
  ok: boolean;
  message?: string | null;
  voucher_id?: number | null;
  voucher_no?: string | null;
  voucher_date?: string | null;
  description?: string | null;
  total_debit: number;
  total_credit: number;
  status?: string | null;
  lines: Array<{
    line_no: number;
    coa_code?: string | null;
    coa_name?: string | null;
    description?: string | null;
    debit: number;
    credit: number;
  }>;
};

function qs(params: Record<string, string | number | boolean | undefined | null>): string {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    sp.set(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export const ebelgeApi = {
  listOutgoing: (filters: EBelgeFilters = {}) =>
    api<EBelgeListResponse>(`/ebelge/outgoing${qs(filters)}`),

  listIncoming: (filters: EBelgeFilters = {}) =>
    api<EBelgeListResponse>(`/ebelge/incoming${qs(filters)}`),

  send: (docType: EBelgeDocType, id: number) =>
    api<EBelgeActionResponse>(`/ebelge/${docType}/${id}/send`, { method: "POST" }),

  cancel: (docType: EBelgeDocType, id: number) =>
    api<EBelgeActionResponse>(`/ebelge/${docType}/${id}/cancel`, { method: "POST" }),

  reject: (docType: EBelgeDocType, id: number, reason?: string) =>
    api<EBelgeActionResponse>(`/ebelge/${docType}/${id}/reject`, {
      method: "POST",
      body: { reason: reason || null },
    }),

  reply: (docType: EBelgeDocType, id: number, note?: string) =>
    api<EBelgeActionResponse>(`/ebelge/${docType}/${id}/reply`, {
      method: "POST",
      body: { note: note || null },
    }),

  download: (docType: EBelgeDocType, id: number) =>
    api<{ ok: boolean; message: string; filename: string }>(
      `/ebelge/${docType}/${id}/download`
    ),

  journal: (docType: EBelgeDocType, id: number) =>
    api<JournalPreview>(`/ebelge/${docType}/${id}/journal`),

  bulkSend: (items: Array<{ doc_type: EBelgeDocType; id: number }>) =>
    api<EBelgeBulkResponse>("/ebelge/bulk/send", { method: "POST", body: { items } }),

  bulkCancel: (items: Array<{ doc_type: EBelgeDocType; id: number }>) =>
    api<EBelgeBulkResponse>("/ebelge/bulk/cancel", { method: "POST", body: { items } }),

  bulkDownload: (items: Array<{ doc_type: EBelgeDocType; id: number }>) =>
    api<EBelgeBulkResponse>("/ebelge/bulk/download", { method: "POST", body: { items } }),

  health: (repair = false) =>
    api<EBelgeHealthResponse>(`/ebelge/health${qs({ repair })}`),

  getEnvironment: () => api<EBelgeEnvironmentResponse>("/ebelge/environment"),

  setEnvironment: (env_mode: "test" | "live") =>
    api<EBelgeEnvironmentResponse>("/ebelge/environment", {
      method: "POST",
      body: { env_mode },
    }),

  receive: () =>
    api<EBelgeReceiveResponse>("/ebelge/receive", { method: "POST" }),

  accept: (docType: EBelgeDocType, id: number, note?: string) =>
    api<EBelgeActionResponse>(`/ebelge/${docType}/${id}/accept`, {
      method: "POST",
      body: note ? { note } : {},
    }),

  getSyncSettings: () => api<GibSyncSettingsResponse>("/ebelge/sync-settings"),

  updateSyncSettings: (body: Partial<GibSyncSettingsResponse>) =>
    api<GibSyncSettingsResponse>("/ebelge/sync-settings", { method: "PUT", body }),
};

export type EBelgeEnvironmentResponse = {
  env_mode: "test" | "live";
  env_label: string;
  gib_base_url: string;
  can_switch: boolean;
};

export type EBelgeHealthResponse = {
  ok: boolean;
  env_mode: string;
  env_label: string;
  gib_base_url?: string | null;
  journal_link_coverage: {
    posted_total: number;
    linked: number;
    missing: number;
    coverage_pct: number;
    ok?: boolean;
  };
  celery_ready: boolean;
  recent_errors: Array<{
    id: number;
    message_tr: string;
    operation?: string;
    created_at?: string | null;
  }>;
};

export type EBelgeReceiveResponse = {
  ok: boolean;
  message: string;
  environment: string;
  items_count: number;
  imported?: number;
  skipped_duplicate?: number;
};

export type GibSyncSettingsResponse = {
  auto_send_enabled: boolean;
  auto_send_interval_minutes: number;
  auto_receive_enabled: boolean;
  auto_receive_interval_minutes: number;
};
