import { useAuthStore } from "../store/appStore";

/** Spec Section 3 — modül anahtarları (backend ile uyumlu) */
export const MODULES = {
  dashboard: "dashboard",
  cari: "cari",
  fatura: "fatura",
  irsaliye: "irsaliye",
  stok: "stok",
  finans: "finans",
  eBelge: "e_belge",
  maliyet: "maliyet",
  resmiMuhasebe: "resmi_muhasebe",
  raporlar: "raporlar",
  ayarlar: "ayarlar",
} as const;

export type PermissionAction =
  | "view"
  | "create"
  | "update"
  | "delete"
  | "approve"
  | "export"
  | "print";

const MODULE_ALIASES: Record<string, string> = {
  accounts: "cari",
  "cari-kartlar": "cari",
  invoices: "fatura",
  orders: "fatura",
  teklifler: "fatura",

  "irsaliye-girisi": "irsaliye",
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
  "e-belge": "e_belge",
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

export function usePermissions() {
  const permissions = useAuthStore((s) => s.permissions);
  const user = useAuthStore((s) => s.user);
  const roleCode = useAuthStore((s) => s.roleCode);
  const allowedBranchCodes = useAuthStore((s) => s.allowedBranchCodes);
  const amountLimit = useAuthStore((s) => s.amountLimit);
  const defaultBranchCode = useAuthStore((s) => s.defaultBranchCode);
  const hasPerm = useAuthStore((s) => s.hasPerm);

  const isSuperAdmin = Boolean(user?.is_superadmin);

  function can(module: string, action: PermissionAction = "view"): boolean {
    return hasPerm(normalizeModule(module), action);
  }

  function canBranch(branchCode: string | null | undefined): boolean {
    if (!branchCode || isSuperAdmin) return true;
    if (!allowedBranchCodes || allowedBranchCodes.length === 0) return true;
    return allowedBranchCodes.includes(branchCode);
  }

  function canAmount(amount: number | null | undefined): boolean {
    if (amount == null || amountLimit == null || isSuperAdmin) return true;
    return amount <= amountLimit;
  }

  return {
    permissions,
    roleCode,
    isSuperAdmin,
    allowedBranchCodes,
    defaultBranchCode,
    amountLimit,
    can,
    canBranch,
    canAmount,
    hasPerm,
  };
}
