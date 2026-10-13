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
  personel: "personel",
} as const;

export type PermissionAction =
  | "view"
  | "create"
  | "update"
  | "delete"
  | "approve"
  | "export"
  | "print";

export const MODULE_ALIASES: Record<string, string> = {
  // Dashboard
  dashboard: "dashboard",

  // Cari
  accounts: "cari",
  "cari-kartlar": "cari",
  cari: "cari",

  // Fatura & Satış & Satın Alma
  invoices: "fatura",
  fatura: "fatura",
  sales: "fatura",
  purchases: "fatura",
  orders: "fatura",
  teklifler: "fatura",
  pos: "fatura",
  "satis-faturalar": "fatura",
  "alis-faturalar": "fatura",
  "satis-siparisler": "fatura",
  "satis-teklifler": "fatura",
  "alis-siparisler": "fatura",
  "alis-teklifler": "fatura",

  // İrsaliye
  irsaliye: "irsaliye",
  "irsaliye-girisi": "irsaliye",
  "satis-irsaliyeler": "irsaliye",
  "alis-irsaliyeler": "irsaliye",

  // Stok & Depo
  stocks: "stok",
  stok: "stok",
  "stok-fiyat-listeleri": "stok",
  "stok-birimleri": "stok",
  "stock-tx": "stok",
  "stok-hareket": "stok",

  // Finans
  finance: "finans",
  finans: "finans",
  "finance-cards": "finans",
  "kasa-banka-kartlari": "finans",
  "gelir-gider-kartlari": "finans",
  "sabit-kiymet": "finans",
  cash: "finans",
  bank: "finans",
  checks: "finans",
  "kasa-islemleri": "finans",
  "banka-islemleri": "finans",
  "cek-senet-islemleri": "finans",
  "cari-islemleri": "finans",
  "stok-defter": "stok",
  "kasa-islemler": "finans",
  "banka-islemler": "finans",
  "fis-dekont": "finans",
  "banka-kredileri": "finans",

  // e-Belge / e-Dönüşüm
  edoc: "e_belge",
  emm: "e_belge",
  "e-belge": "e_belge",
  e_belge: "e_belge",
  "e-donusum": "e_belge",
  "ebelge-giden": "e_belge",
  "ebelge-gelen": "e_belge",
  "ebelge-emm": "e_belge",

  // Üretim & MRP & Maliyet
  maliyet: "maliyet",
  cost: "maliyet",
  production: "maliyet",
  uretim: "maliyet",
  "uretim-emir": "maliyet",
  "uretim-bom": "maliyet",
  "uretim-plan": "maliyet",
  "uretim-makina": "maliyet",
  "uretim-maliyet-butce": "maliyet",

  // Resmi Muhasebe
  journal: "resmi_muhasebe",
  resmi_muhasebe: "resmi_muhasebe",
  "resmi-muhasebe": "resmi_muhasebe",
  muhasebe: "resmi_muhasebe",
  "yevmiye-fisleri": "resmi_muhasebe",
  "yevmiye-defter": "resmi_muhasebe",
  beyanname: "resmi_muhasebe",

  // Raporlar
  reports: "raporlar",
  raporlar: "raporlar",
  "excel-import": "raporlar",
  "sablon-tasarimci": "raporlar",

  // Ayarlar
  settings: "ayarlar",
  ayarlar: "ayarlar",
  "ayr-tanimlar": "ayarlar",
  "ayr-firma-kullanici": "ayarlar",
  "ayr-sistem": "ayarlar",
  "ayr-program": "ayarlar",
  "ayr-lisans": "ayarlar",

  // Personel & Bordro
  personel: "personel",
  "personel-kartlar": "personel",
  "ise-giris-cikis": "personel",
  puantaj: "personel",
  "izin-devamsizlik": "personel",
  "bordro-hesaplama": "personel",
  "bordro-listesi": "personel",
  "sgk-bildirim": "personel",
  "personel-raporlar": "personel",
  "personel-parametreleri": "personel",
  kobi: "kobi",
  "kobi-ortaklik": "kobi",
  "kobi-yatirim": "kobi",
};

export function normalizeModule(module: string): string {
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
