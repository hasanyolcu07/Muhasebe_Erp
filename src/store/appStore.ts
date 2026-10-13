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

import { MODULE_ALIASES, normalizeModule } from "../hooks/usePermissions";

export { MODULE_ALIASES, normalizeModule };

export function checkPerm(permissions: Permissions, module: string, action: string): boolean {
  if (!permissions || typeof permissions !== "object") return false;

  // Wildcard super-permission: *.* or *:action
  const star = permissions["*"] || [];
  if (star.includes("*") || star.includes(action)) return true;

  const raw = module.trim().toLowerCase();
  const mod = normalizeModule(raw);

  // 1. Direct canonical module match (e.g. permissions["fatura"] includes "view")
  const mods = permissions[mod] || [];
  if (mods.includes("*") || mods.includes(action)) return true;

  // 2. Direct raw key match (e.g. permissions["satis-faturalar"] includes "view")
  if (raw !== mod) {
    const rawMods = permissions[raw] || [];
    if (rawMods.includes("*") || rawMods.includes(action)) return true;
  }

  // 3. Reverse legacy alias mapping
  for (const [legacy, canonical] of Object.entries(MODULE_ALIASES)) {
    if (canonical === mod) {
      const legacyMods = permissions[legacy] || [];
      if (legacyMods.includes("*") || legacyMods.includes(action)) return true;
    }
  }

  // 4. Menu-based permissions list (stored under __menu__ or directly)
  const menuList = Array.isArray(permissions)
    ? (permissions as unknown as string[])
    : Array.isArray(permissions["__menu__"])
    ? permissions["__menu__"]
    : null;

  if (menuList && action === "view") {
    if (menuList.includes("*") || menuList.includes(raw) || menuList.includes(mod)) {
      return true;
    }
    // Check if any element in menuList belongs to mod
    const belongsToMod = menuList.some((k) => normalizeModule(String(k)) === mod);
    if (belongsToMod) return true;
  }

  return false;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
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
      clear: () => {
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
        });
        useAppStore.getState().clearCompanyData();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("tabia:session-cleared"));
        }
      },
      hasPerm: (module, action) => {
        const { permissions, accessToken } = get();
        if (!accessToken) return false;
        return checkPerm(permissions, module, action);
      },
    }),
    {
      name: "tabia-auth",
      version: 4,
      migrate: () => ({
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
    }
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
  companyEpoch: number;
  setPageTitle: (t: string) => void;
  setWorkingYear: (year: number) => void;
  setBranchId: (id: number | null) => void;
  setRecordTypeId: (id: number | null) => void;
  setTenantLists: (branches: AppState["branches"], recordTypes: AppState["recordTypes"]) => void;
  setDirty: (v: boolean) => void;
  clearCompanyData: () => void;
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
  companyEpoch: 0,
  setPageTitle: (t) => set({ pageTitle: t }),
  setWorkingYear: (year) => set({ workingYear: year }),
  setBranchId: (id) => set({ branchId: id }),
  toggleSidebarCollapsed: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  clearCompanyData: () => {
    set((s) => ({
      branchId: null,
      recordTypeId: null,
      branches: [],
      recordTypes: [],
      recordTypeMeta: null,
      isDirty: false,
      companyEpoch: (s.companyEpoch || 0) + 1,
    }));
  },
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
