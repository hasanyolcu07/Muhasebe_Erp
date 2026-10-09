import type { RightMenuItem } from "@/components/ui";
import type { DeclarationType } from "../api/beyannameApi";

export type HubTabId =
  | "babs"
  | "kdv1"
  | "kdv2"
  | "muhtasar_1003a"
  | "muhtasar_1003b"
  | "gecici"
  | "kurumlar"
  | "gelir"
  | "damga"
  | "poset"
  | "kesin_mizan"
  | "kdv_tevkifat"
  | "kdv_iade";

export type HubTab = {
  id: HubTabId;
  label: string;
  icon: string;
  activeClass: string;
  declarationType?: DeclarationType;
};

export const HUB_TABS: HubTab[] = [
  { id: "babs", label: "Ba-Bs", icon: "📋", activeClass: "active-fatura" },
  { id: "kdv1", label: "KDV1", icon: "🧾", activeClass: "active-irsaliye", declarationType: "KDV1" },
  { id: "kdv2", label: "KDV2", icon: "🧾", activeClass: "active-irsaliye", declarationType: "KDV2" },
  {
    id: "muhtasar_1003a",
    label: "Muhtasar Beyannamesi - 1003A",
    icon: "📑",
    activeClass: "active-irsaliye",
    declarationType: "MUHTASAR_1003A",
  },
  {
    id: "muhtasar_1003b",
    label: "Muhtasar Beyannamesi - 1003B",
    icon: "📑",
    activeClass: "active-irsaliye",
    declarationType: "MUHTASAR_1003B",
  },
  {
    id: "gecici",
    label: "Kurumlar Geçici Vergi",
    icon: "📊",
    activeClass: "active-irsaliye",
    declarationType: "GECICI_VERGI",
  },
  {
    id: "kurumlar",
    label: "Kurumlar",
    icon: "🏢",
    activeClass: "active-irsaliye",
    declarationType: "KURUMLAR",
  },
  {
    id: "gelir",
    label: "Gelir Vergisi",
    icon: "👤",
    activeClass: "active-irsaliye",
    declarationType: "GELIR_YILLIK",
  },
  { id: "damga", label: "Damga Vergisi", icon: "✒️", activeClass: "active-irsaliye", declarationType: "DAMGA" },
  {
    id: "poset",
    label: "Poşet (GEKAP)",
    icon: "🛍️",
    activeClass: "active-irsaliye",
    declarationType: "POSET",
  },
  {
    id: "kesin_mizan",
    label: "Kesin Mizan",
    icon: "⚖️",
    activeClass: "active-irsaliye",
    declarationType: "KESIN_MIZAN",
  },
  {
    id: "kdv_tevkifat",
    label: "KDV Tevkifat",
    icon: "🧮",
    activeClass: "active-irsaliye",
    declarationType: "KDV_TEVKIFAT",
  },
  {
    id: "kdv_iade",
    label: "KDV İadesi & GÇB Listeleri",
    icon: "🚢",
    activeClass: "active-irsaliye",
  },
];

const COMMON_MENUS: RightMenuItem[] = [
  { id: "prepare", label: "Hazırlama" },
  { id: "tables", label: "Tablolar" },
  { id: "accounts", label: "Hesap Bağlantıları" },
  { id: "list", label: "Oluşturulan Beyannameler" },
  { id: "outputs", label: "Çıktılar" },
];

export const SECTION_MENU_ITEMS: Record<HubTabId, RightMenuItem[]> = {
  babs: [
    { id: "prepare", label: "Hazırlama" },
    { id: "lines", label: "Ba / Bs Satırları" },
    { id: "accounts", label: "Hesap Bağlantıları" },
    { id: "list", label: "Oluşturulan Beyannameler" },
    { id: "outputs", label: "Çıktılar" },
  ],
  kdv1: [...COMMON_MENUS],
  kdv2: [...COMMON_MENUS],
  muhtasar_1003a: [
    { id: "prepare", label: "Hazırlama" },
    { id: "tables", label: "Stopaj Tabloları" },
    { id: "accounts", label: "Hesap Bağlantıları" },
    { id: "list", label: "Oluşturulan Beyannameler" },
    { id: "outputs", label: "Çıktılar" },
  ],
  muhtasar_1003b: [
    { id: "prepare", label: "Hazırlama" },
    { id: "tables", label: "SGK / Özet" },
    { id: "accounts", label: "Hesap Bağlantıları" },
    { id: "list", label: "Oluşturulan Beyannameler" },
    { id: "outputs", label: "Çıktılar" },
  ],
  gecici: [
    { id: "prepare", label: "Hazırlama" },
    { id: "tables", label: "Gelir / Gider Özeti" },
    { id: "accounts", label: "Hesap Bağlantıları" },
    { id: "list", label: "Oluşturulan Beyannameler" },
    { id: "outputs", label: "Çıktılar" },
  ],
  kurumlar: [
    { id: "prepare", label: "Hazırlama" },
    { id: "tables", label: "Kurumlar Tabloları" },
    { id: "accounts", label: "Hesap Bağlantıları" },
    { id: "list", label: "Oluşturulan Beyannameler" },
    { id: "outputs", label: "Çıktılar" },
  ],
  gelir: [
    { id: "prepare", label: "Hazırlama" },
    { id: "tables", label: "Gelir Tabloları" },
    { id: "accounts", label: "Hesap Bağlantıları" },
    { id: "list", label: "Oluşturulan Beyannameler" },
    { id: "outputs", label: "Çıktılar" },
  ],
  damga: [
    { id: "prepare", label: "Hazırlama" },
    { id: "tables", label: "Damga Matrahları" },
    { id: "accounts", label: "Hesap Bağlantıları" },
    { id: "list", label: "Oluşturulan Beyannameler" },
    { id: "outputs", label: "Çıktılar" },
  ],
  poset: [
    { id: "prepare", label: "Hazırlama" },
    { id: "tables", label: "GEKAP Kalemleri" },
    { id: "accounts", label: "Hesap Bağlantıları" },
    { id: "list", label: "Oluşturulan Beyannameler" },
    { id: "outputs", label: "Çıktılar" },
  ],
  kesin_mizan: [
    { id: "prepare", label: "Hazırlama" },
    { id: "tables", label: "Mizan Satırları" },
    { id: "accounts", label: "Hesap Bağlantıları" },
    { id: "list", label: "Oluşturulan Beyannameler" },
    { id: "outputs", label: "Çıktılar" },
  ],
  kdv_tevkifat: [
    { id: "prepare", label: "Hazırlama" },
    { id: "tables", label: "Tevkifat Tabloları" },
    { id: "accounts", label: "Hesap Bağlantıları" },
    { id: "list", label: "Oluşturulan Beyannameler" },
    { id: "outputs", label: "Çıktılar" },
  ],
  kdv_iade: [...COMMON_MENUS],
};

export const STATUS_LABELS: Record<string, string> = {
  TASLAK: "Taslak",
  GIB_HAZIR: "GIB Hazır",
  GIB_GONDERILDI: "GIB Gönderildi",
  GIB_ONAYLANDI: "GIB Onaylandı",
  HATA: "Hata",
  ARSIV: "Arşiv",
  // legacy aliases
  HAZIRLANIYOR: "Taslak",
  HAZIR: "GIB Hazır",
  IMZALI: "GIB Hazır",
  YUKLENDI: "GIB Gönderildi",
};

const BASE_STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  TASLAK: { bg: "#fef3c7", color: "#92400e" },
  GIB_HAZIR: { bg: "#d1fae5", color: "#065f46" },
  GIB_GONDERILDI: { bg: "#dbeafe", color: "#1e40af" },
  GIB_ONAYLANDI: { bg: "#e0e7ff", color: "#3730a3" },
  HATA: { bg: "#fee2e2", color: "#991b1b" },
  ARSIV: { bg: "#f3f4f6", color: "#374151" },
};

export const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  ...BASE_STATUS_STYLE,
  HAZIRLANIYOR: BASE_STATUS_STYLE.TASLAK,
  HAZIR: BASE_STATUS_STYLE.GIB_HAZIR,
  IMZALI: BASE_STATUS_STYLE.GIB_HAZIR,
  YUKLENDI: BASE_STATUS_STYLE.GIB_GONDERILDI,
};

export function normalizeStatus(status: string): string {
  const map: Record<string, string> = {
    HAZIRLANIYOR: "TASLAK",
    HAZIR: "GIB_HAZIR",
    IMZALI: "GIB_HAZIR",
    YUKLENDI: "GIB_GONDERILDI",
  };
  return map[status] || status;
}
