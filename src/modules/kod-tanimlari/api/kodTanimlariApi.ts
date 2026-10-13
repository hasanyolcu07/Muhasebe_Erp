import { api } from "@/services/api";

export type CodeFieldSlot = {
  id: number;
  entity_type: string;
  field_kind: string;
  label: string;
  sort_order: number;
  is_active: boolean;
};

export type CodeMasterEntry = {
  id: number;
  slot_id: number;
  code: string;
  name: string;
  coa_id: number | null;
  coa_code: string | null;
  coa_title: string | null;
  is_active: boolean;
  in_use_count: number;
};

export type EntityCodeAssignment = {
  slot_id: number;
  field_kind: string;
  label: string;
  entry_id: number | null;
  code_value: string | null;
  entry_name: string | null;
  coa_id: number | null;
  coa_code: string | null;
};

export type IstisnaCode = {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  is_active: boolean;
};

export type TevkifatCodeExtended = {
  id: number;
  code: string;
  name: string;
  rate: number;
  share_numerator: number;
  share_denominator: number;
};

function qs(params: Record<string, string | number | boolean | undefined | null>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

export const kodTanimlariApi = {
  listSlots: (entity_type?: string) =>
    api<{ items: CodeFieldSlot[] }>(`/kod-tanimlari/slots${qs({ entity_type })}`),
  createSlot: (body: { entity_type: string; field_kind: string; label: string }) =>
    api<CodeFieldSlot>("/kod-tanimlari/slots", { method: "POST", body }),
  listEntries: (slot_id: number) =>
    api<{ items: CodeMasterEntry[] }>(`/kod-tanimlari/entries${qs({ slot_id })}`),
  createEntry: (body: {
    slot_id: number;
    code: string;
    name: string;
    coa_id?: number | null;
  }) => api<CodeMasterEntry>("/kod-tanimlari/entries", { method: "POST", body }),
  updateSlot: (id: number, body: { label?: string; sort_order?: number; is_active?: boolean }) =>
    api<CodeFieldSlot>(`/kod-tanimlari/slots/${id}`, { method: "PUT", body }),
  removeSlot: (id: number) => api<void>(`/kod-tanimlari/slots/${id}`, { method: "DELETE" }),
  updateEntry: (id: number, body: { name?: string; coa_id?: number | null; is_active?: boolean }) =>
    api<CodeMasterEntry>(`/kod-tanimlari/entries/${id}`, { method: "PUT", body }),
  removeEntry: (id: number) => api<void>(`/kod-tanimlari/entries/${id}`, { method: "DELETE" }),
  getEntityCodes: (entity_type: string, entity_id: number) =>
    api<{ items: EntityCodeAssignment[] }>(`/kod-tanimlari/entity/${entity_type}/${entity_id}`),
  saveEntityCodes: (
    entity_type: string,
    entity_id: number,
    items: Array<{ slot_id: number; entry_id?: number | null; code_value?: string | null }>
  ) =>
    api<{ items: EntityCodeAssignment[] }>(`/kod-tanimlari/entity/${entity_type}/${entity_id}`, {
      method: "PUT",
      body: items,
    }),
  previewBulkCoa: (body: {
    entity_type: string;
    slot_id: number;
    entry_code: string;
    new_coa_id: number;
  }) =>
    api<{ affected_count: number; run_id: number | null; items: Array<Record<string, unknown>> }>(
      "/kod-tanimlari/bulk-coa/preview",
      { method: "POST", body }
    ),
  applyBulkCoa: (run_id: number) =>
    api<{ affected_count: number }>("/kod-tanimlari/bulk-coa/apply", {
      method: "POST",
      body: { run_id },
    }),
  listIstisna: () => api<{ items: IstisnaCode[] }>("/kod-tanimlari/istisna-codes"),
  listTevkifat: () => api<{ items: TevkifatCodeExtended[] }>("/kod-tanimlari/tevkifat-codes"),
  gibSync: () =>
    api<{ istisna_updated: number; tevkifat_updated: number; version: string }>(
      "/kod-tanimlari/gib-sync",
      { method: "POST", body: { source: "GIB_OFFICIAL", version: "2026.1" } }
    ),
};
