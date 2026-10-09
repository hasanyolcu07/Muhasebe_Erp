import { create } from "zustand";
import { persist } from "zustand/middleware";

type Permissions = Record<string, string[]>;

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: Record<string, unknown> | null;
  company: Record<string, unknown> | null;
  companies: Array<Record<string, unknown>>;
  permissions: Permissions;
  roleCode: string;
  defaultBranchCode: string | null;
  allowedBranchCodes: string[] | null;
  amountLimit: number | null;
  setSession: (payload: {
    access_token: string;
    refresh_token: string;
    user: Record<string, unknown>;
    company: Record<string, unknown> | null;
    companies?: Array<Record<string, unknown>>;
    permissions?: Permissions;
    role_code?: string;
    membership?: {
      default_branch_code?: string | null;
      allowed_branch_codes?: string[] | null;
      amount_limit?: number | null;
    };
  }) => void;
  clear: () => void;
  hasPerm: (module: string, action: string) => boolean;
};

const MODULE_ALIASES: Record<string, string> = {
  accounts: "cari",
  "cari-kartlar": "cari",
  invoices: "fatura",
  orders: "fatura",
  teklifler: "fatura",

  stocks: "stok",
  "stok-fiyat-listeleri": "stok",
  "stock-tx": "stok",
  finance: "finans",
  "finance-cards": "finans",
  "kasa-banka-kartlari": "finans",
  "gelir-gider-kartlari": "finans",
  cash: "finans",
  bank: "finans",
  checks: "finans",
  "kasa-islemleri": "finans",
  "banka-islemleri": "finans",
  "cek-senet-islemleri": "finans",
  "kasa-islemler": "finans",
  "banka-islemler": "finans",
  edoc: "e_belge",
  emm: "e_belge",
  cost: "maliyet",
  production: "maliyet",
  journal: "resmi_muhasebe",
  reports: "raporlar",
  settings: "ayarlar",
};

function normalizeModule(module: string): string {
  const m = module.trim().toLowerCase();
  return MODULE_ALIASES[m] || m;
}

function checkPerm(permissions: Permissions, module: string, action: string): boolean {
  const mod = normalizeModule(module);
  if (permissions["*"]?.includes("*")) return true;
  const star = permissions["*"] || [];
  if (star.includes("*") || star.includes(action)) return true;
  const mods = permissions[mod] || [];
  if (mods.includes("*") || mods.includes(action)) return true;
  for (const [legacy, canonical] of Object.entries(MODULE_ALIASES)) {
    if (canonical === mod) {
      const legacyMods = permissions[legacy] || [];
      if (legacyMods.includes("*") || legacyMods.includes(action)) return true;
    }
  }
  return false;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: "demo-jwt-token-tabia",
      refreshToken: "demo-refresh-token",
      user: { id: 1, username: "admin", email: "admin@tabiaerp.com", full_name: "Sistem Yöneticisi" },
      company: { id: 1, name: "Tabia Muhasebe ve Bilişim A.Ş.", code: "TABIA_01" },
      companies: [{ id: 1, name: "Tabia Muhasebe ve Bilişim A.Ş.", code: "TABIA_01" }],
      permissions: { "*": ["*"] },
      roleCode: "ADMIN",
      defaultBranchCode: "MERKEZ",
      allowedBranchCodes: ["MERKEZ"],
      amountLimit: 10000000,
      setSession: (payload) =>
        set({
          accessToken: payload.access_token,
          refreshToken: payload.refresh_token,
          user: payload.user,
          company: payload.company,
          companies: payload.companies || [],
          permissions: payload.permissions || {},
          roleCode: payload.role_code || "",
          defaultBranchCode:
            payload.membership?.default_branch_code ??
            (payload.company?.default_branch_code as string | null) ??
            null,
          allowedBranchCodes:
            (payload.membership?.allowed_branch_codes as string[] | null) ??
            (payload.company?.allowed_branch_codes as string[] | null) ??
            null,
          amountLimit:
            payload.membership?.amount_limit ??
            (payload.company?.amount_limit as number | null) ??
            null,
        }),
      clear: () =>
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          company: null,
          companies: [],
          permissions: {},
          roleCode: "",
          defaultBranchCode: null,
          allowedBranchCodes: null,
          amountLimit: null,
        }),
      hasPerm: (module, action) => {
        const { permissions, user } = get();
        if (user?.is_superadmin) return true;
        return checkPerm(permissions, module, action);
      },
    }),
    { name: "tabia-auth" }
  )
);

export type RecordTypeItem = {
  id: number;
  code: string;
  name: string;
  muhasebelessin_mi?: boolean;
  raporda_gorunsun_mu?: boolean;
};

export type RecordTypeMeta = {
  muhasebelessin_mi: boolean;
  raporda_gorunsun_mu: boolean;
  code: string;
  name: string;
};

type AppState = {
  pageTitle: string;
  workingYear: number;
  branchId: number | null;
  recordTypeId: number | null;
  branches: Array<{ id: number; code: string; name: string }>;
  recordTypes: RecordTypeItem[];
  recordTypeMeta: RecordTypeMeta | null;
  isDirty: boolean;
  sidebarCollapsed: boolean;
  setPageTitle: (t: string) => void;
  setWorkingYear: (year: number) => void;
  setBranchId: (id: number | null) => void;
  setRecordTypeId: (id: number | null) => void;
  setTenantLists: (branches: AppState["branches"], recordTypes: AppState["recordTypes"]) => void;
  setDirty: (v: boolean) => void;
  toggleSidebarCollapsed: () => void;
  guardNavigate: (fn: () => void) => void;
};

function metaFromRecordTypes(
  recordTypes: RecordTypeItem[],
  recordTypeId: number | null
): RecordTypeMeta | null {
  if (!recordTypeId) return null;
  const rt = recordTypes.find((r) => r.id === recordTypeId);
  if (!rt) return null;
  return {
    code: rt.code,
    name: rt.name,
    muhasebelessin_mi: rt.muhasebelessin_mi ?? true,
    raporda_gorunsun_mu: rt.raporda_gorunsun_mu ?? true,
  };
}

export const useAppStore = create<AppState>((set, get) => ({
  pageTitle: "Ana Panel",
  workingYear: 2026,
  branchId: null,
  recordTypeId: null,
  branches: [],
  recordTypes: [],
  recordTypeMeta: null,
  isDirty: false,
  sidebarCollapsed: false,
  setPageTitle: (t) => set({ pageTitle: t }),
  setWorkingYear: (year) => set({ workingYear: year }),
  setBranchId: (id) => set({ branchId: id }),
  toggleSidebarCollapsed: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setRecordTypeId: (id) => {
    const { recordTypes } = get();
    set({
      recordTypeId: id,
      recordTypeMeta: metaFromRecordTypes(recordTypes, id),
    });
  },
  setTenantLists: (branches, recordTypes) => {
    const prev = get();
    const branchId =
      prev.branchId && branches.some((b) => b.id === prev.branchId)
        ? prev.branchId
        : branches[0]?.id ?? null;
    const recordTypeId =
      prev.recordTypeId && recordTypes.some((r) => r.id === prev.recordTypeId)
        ? prev.recordTypeId
        : recordTypes[0]?.id ?? null;
    set({
      branches,
      recordTypes,
      branchId,
      recordTypeId,
      recordTypeMeta: metaFromRecordTypes(recordTypes, recordTypeId),
    });
  },
  setDirty: (v) => set({ isDirty: v }),
  guardNavigate: (fn) => {
    if (get().isDirty) {
      const ok = window.confirm(
        "⚠️ Form üzerinde kaydedilmemiş değişiklikleriniz (isDirty) bulunmaktadır! Vazgeçerseniz bu değişiklikler kaybolacak. Devam etmek istiyor musunuz?"
      );
      if (!ok) return;
      set({ isDirty: false });
    }
    fn();
  },
}));

/** Seçili kayıt türü meta bilgisi (Gayri Resmi → muhasebeleşme kapalı). */
export function useRecordTypeMeta(): RecordTypeMeta | null {
  return useAppStore((s) => s.recordTypeMeta);
}

/** Kayıt türü ID'sine göre muhasebeleşme açık mı? */
export function isAccountingEnabledForRecordType(
  recordTypes: RecordTypeItem[],
  recordTypeId: number | null | undefined
): boolean {
  if (!recordTypeId) return true;
  const rt = recordTypes.find((r) => r.id === recordTypeId);
  return rt?.muhasebelessin_mi ?? true;
}
