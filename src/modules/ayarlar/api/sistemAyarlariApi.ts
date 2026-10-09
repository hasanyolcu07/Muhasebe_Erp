import { api } from "@/services/api";

export type BackupScheduleSlot = {
  hour: number;
  minute: number;
  is_active: boolean;
};

export type BackupSettings = {
  company_id: number;
  backup_folder: string;
  backup_format: "plain" | "custom" | "directory";
  max_backups: number;
  auto_delete_days: number;
  is_active: boolean;
  schedule_slots: BackupScheduleSlot[];
};

export type BackupRunLog = {
  id: number;
  run_type: string;
  status: string;
  file_path?: string | null;
  file_size?: number | null;
  message?: string | null;
  created_at?: string | null;
};

export type FirmaProfile = {
  company_id?: number | null;
  code?: string | null;
  company_type: "TUZEL" | "SAHIS";
  name?: string | null;
  trade_name?: string | null;
  short_name?: string | null;
  tax_number?: string | null;
  tax_office?: string | null;
  tc_identity_no?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  address_line?: string | null;
  city?: string | null;
  district?: string | null;
  postal_code?: string | null;
  country_code?: string;
  currency_code?: string;
  opening_date?: string | null;
  closing_date?: string | null;
  tax_verified?: boolean;
  integrator_verified?: boolean;
  defaults?: Record<string, unknown>;
  edonusum?: Record<string, unknown>;
  partnerships?: Array<Record<string, unknown>>;
  smmm_info?: Record<string, unknown>;
  ymm_info?: Record<string, unknown>;
  nace_rows?: Array<Record<string, unknown>>;
  profile_extra?: Record<string, unknown>;
};

export type CoaAccountLevel = "SINIF" | "ALT_SINIF" | "ANA" | "GRUP" | "MUAVIN";
export type CoaAccountNature = "BORC" | "ALACAK" | "BORC_ALACAK";
export type CoaCodeSeparator = "." | "-";
export type CoaRateType = "ALIS" | "SATIS" | "EFEKTIF_ALIS" | "EFEKTIF_SATIS";

export type CoaAccount = {
  id: number;
  code: string;
  name: string;
  parent_id?: number | null;
  account_class?: number | null;
  is_postable?: boolean;
  debit?: number;
  credit?: number;
  balance?: number;
  description?: string | null;
  account_level?: CoaAccountLevel | string | null;
  account_nature?: CoaAccountNature | string | null;
  use_fx_diff?: boolean;
  special_code?: string | null;
  special_code2?: string | null;
  special_code3?: string | null;
  group_code?: string | null;
  code_separator?: CoaCodeSeparator | string | null;
  code_depth?: number | null;
  currency_code?: string | null;
  rate_type?: CoaRateType | string | null;
};

export type CoaAccountPayload = {
  code: string;
  name: string;
  parent_id?: number | null;
  account_class?: number | null;
  is_postable?: boolean;
  insert_after_id?: number | null;
  description?: string | null;
  account_level?: CoaAccountLevel | string | null;
  account_nature?: CoaAccountNature | string | null;
  use_fx_diff?: boolean;
  special_code?: string | null;
  special_code2?: string | null;
  special_code3?: string | null;
  group_code?: string | null;
  code_separator?: CoaCodeSeparator | string | null;
  code_depth?: number | null;
  currency_code?: string | null;
  rate_type?: CoaRateType | string | null;
};

export type AccountMappingModule = {
  code: string;
  title: string;
  scope_modes: string[];
  operations: Array<{ code: string; label: string }>;
};

export type AccountMapping = {
  id: number;
  module_code: string;
  scope_type: string;
  scope_ref_id?: number | null;
  scope_ref_code?: string | null;
  scope_ref_name?: string | null;
  operation_code?: string | null;
  coa_id: number;
  coa_code?: string | null;
  coa_name?: string | null;
  is_active: boolean;
  note?: string | null;
};

export type ScopeLookupItem = {
  id: number;
  code: string;
  name: string;
};

export type EtiketEntityType = "STOK" | "GELIR" | "GIDER" | "CARI" | "PERSONEL";

export type EtiketEkBilgiDef = {
  id: number;
  entity_type: EtiketEntityType;
  name: string;
  group_1?: string | null;
  group_2?: string | null;
  group_3?: string | null;
  group_4?: string | null;
  group_5?: string | null;
  ek_metin_1?: string | null;
  ek_metin_2?: string | null;
  ek_sayi_1?: string | null;
  ek_sayi_2?: string | null;
  ek_tarih_1?: string | null;
  ek_tarih_2?: string | null;
  ek_decimal_1?: string | null;
  ek_decimal_2?: string | null;
  sort_order: number;
  is_active: boolean;
};

export type YearEndOperation = {
  key: string;
  label: string;
};

export type YearEndOperationRun = {
  id: number;
  operation_key: string;
  fiscal_year: number;
  status: string;
  preparation_mode: string;
  preview_data: Record<string, unknown>;
  ai_suggestion: Record<string, unknown>;
  journal_voucher_ids: number[];
};

export type UiLanguage = "tr" | "en" | "de";
export type UiTheme = "light" | "dark" | "navy" | "night-blue" | "corporate";

export type SystemUiSettings = {
  company_id: number;
  language: UiLanguage;
  theme: UiTheme;
  session_timeout_minutes: number;
  audit_logging: boolean;
  two_factor_enabled: boolean;
};

export type NotificationRule = {
  key: string;
  label: string;
  enabled: boolean;
  days: number | null;
  threshold: number | null;
};

export type NotificationDefinitions = {
  company_id: number;
  rules: NotificationRule[];
};

export type WorkingPeriod = {
  id: string;
  label: string;
  year_start: number;
  year_end: number;
  status: "open" | "closed";
};

export type FirmaBranding = {
  logo_data_url?: string | null;
  theme_color?: string | null;
  card_border_light?: string | null;
  card_border_dark?: string | null;
  working_periods?: WorkingPeriod[];
};

export const sistemAyarlariApi = {
  getBackupSettings: () => api<BackupSettings>("/sistem/backup/settings"),
  saveBackupSettings: (body: Partial<BackupSettings>) =>
    api<BackupSettings>("/sistem/backup/settings", { method: "PUT", body }),
  listBackupLogs: () => api<{ items: BackupRunLog[] }>("/sistem/backup/logs"),
  runBackup: () => api<BackupRunLog>("/sistem/backup/run", { method: "POST" }),
  restoreBackup: (backup_id: number, confirm_phrase: string) =>
    api<BackupRunLog>("/sistem/backup/restore", {
      method: "POST",
      body: { backup_id, confirm_phrase },
    }),

  getUiSettings: () => api<SystemUiSettings>("/sistem/ui-settings"),
  saveUiSettings: (body: Partial<SystemUiSettings>) =>
    api<SystemUiSettings>("/sistem/ui-settings", { method: "PUT", body }),

  getBildirimler: () => api<NotificationDefinitions>("/sistem/bildirimler"),
  saveBildirimler: (body: { rules: NotificationRule[] }) =>
    api<NotificationDefinitions>("/sistem/bildirimler", { method: "PUT", body }),

  getFirma: () => api<FirmaProfile>("/sistem/firma"),
  updateFirma: (body: Partial<FirmaProfile>) =>
    api<FirmaProfile>("/sistem/firma", { method: "PUT", body }),
  dogrulaFirma: (tax_number: string) =>
    api<Record<string, unknown>>(
      `/sistem/firma/dogrula?tax_number=${encodeURIComponent(tax_number)}`,
      { method: "POST" }
    ),

  listHesapPlani: (params?: {
    q?: string;
    date_from?: string;
    date_to?: string;
    branch_id?: number;
    record_type_id?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params?.q) qs.set("q", params.q);
    if (params?.date_from) qs.set("date_from", params.date_from);
    if (params?.date_to) qs.set("date_to", params.date_to);
    if (params?.branch_id) qs.set("branch_id", String(params.branch_id));
    if (params?.record_type_id) qs.set("record_type_id", String(params.record_type_id));
    const s = qs.toString();
    return api<{ items: CoaAccount[] }>(`/sistem/hesap-plani${s ? `?${s}` : ""}`);
  },

  createHesapPlani: (body: CoaAccountPayload) =>
    api<CoaAccount>("/sistem/hesap-plani", { method: "POST", body }),

  updateHesapPlani: (id: number, body: Partial<CoaAccountPayload>) =>
    api<CoaAccount>(`/sistem/hesap-plani/${id}`, { method: "PUT", body }),
  deleteHesapPlani: (id: number) =>
    api<{ ok: boolean; id: number; code: string }>(`/sistem/hesap-plani/${id}`, { method: "DELETE" }),
  seedTdhp: (force = false) =>
    api<{ seeded: number; skipped: boolean }>(`/sistem/hesap-plani/seed-tdhp?force=${force ? "true" : "false"}`, {
      method: "POST",
    }),
  importHesapPlaniExcel: (rows: Record<string, unknown>[]) =>
    api<{ created: number; updated: number; separator: string; depth: number }>(
      "/sistem/hesap-plani/import-excel",
      { method: "POST", body: { rows } }
    ),

  listMappingModules: () =>
    api<{ items: AccountMappingModule[] }>("/sistem/muhasebe-kod-baglantilari/moduller"),
  listMappings: (module_code?: string) => {
    const qs = module_code ? `?module_code=${encodeURIComponent(module_code)}` : "";
    return api<{ items: AccountMapping[]; total: number }>(`/sistem/muhasebe-kod-baglantilari${qs}`);
  },
  mappingLookups: (params: {
    module_code: string;
    scope_type: string;
    q?: string;
    limit?: number;
  }) => {
    const qs = new URLSearchParams();
    qs.set("module_code", params.module_code);
    qs.set("scope_type", params.scope_type);
    if (params.q) qs.set("q", params.q);
    if (params.limit) qs.set("limit", String(params.limit));
    return api<{ items: ScopeLookupItem[] }>(`/sistem/muhasebe-kod-baglantilari/lookups?${qs}`);
  },
  createMapping: (body: Record<string, unknown>) =>
    api<AccountMapping>("/sistem/muhasebe-kod-baglantilari", { method: "POST", body }),
  updateMapping: (id: number, body: Record<string, unknown>) =>
    api<AccountMapping>(`/sistem/muhasebe-kod-baglantilari/${id}`, { method: "PUT", body }),
  deleteMapping: (id: number) =>
    api<void>(`/sistem/muhasebe-kod-baglantilari/${id}`, { method: "DELETE" }),

  listEtiketDefs: (entity_type?: EtiketEntityType) => {
    const qs = entity_type ? `?entity_type=${encodeURIComponent(entity_type)}` : "";
    return api<EtiketEkBilgiDef[]>(`/sistem/etiket-ek-bilgi${qs}`);
  },
  createEtiketDef: (body: Partial<EtiketEkBilgiDef> & { entity_type: EtiketEntityType; name: string }) =>
    api<EtiketEkBilgiDef>("/sistem/etiket-ek-bilgi", { method: "POST", body }),
  updateEtiketDef: (id: number, body: Partial<EtiketEkBilgiDef>) =>
    api<EtiketEkBilgiDef>(`/sistem/etiket-ek-bilgi/${id}`, { method: "PUT", body }),
  deleteEtiketDef: (id: number) =>
    api<void>(`/sistem/etiket-ek-bilgi/${id}`, { method: "DELETE" }),

  listYearEndOperations: () =>
    api<{ items: YearEndOperation[] }>("/sistem/yil-sonu/operations"),
  yearEndPreview: (body: Record<string, unknown>) =>
    api<YearEndOperationRun>("/sistem/yil-sonu/preview", { method: "POST", body }),
  yearEndApprove: (run_id: number) =>
    api<YearEndOperationRun>(`/sistem/yil-sonu/${run_id}/onayla`, { method: "POST" }),
};
