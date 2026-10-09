import type { CSSProperties } from "react";
import { SIDEBAR_HUBS } from "./moduleHubConfig";

export type NavBadge = {
  text: string;
  style?: CSSProperties;
};

export type NavItem = {
  id: string;
  path: string;
  label: string;
  title: string;
  module?: string;
  badge?: NavBadge;
  accent?: "green" | "amber" | "blue";
};

export type NavSection = {
  /** Alt bölüm başlığı (Ayarlar içi Tanımlar / Sistem vb.) */
  title: string;
  items: NavItem[];
};

export type NavGroup = {
  category: string;
  items: NavItem[];
  /** Varsa sidebar'da category altında section başlıkları gösterilir */
  sections?: NavSection[];
};

/** Alt menü öğeleri (Kart Tanımları, Finans İşlemleri vb.) — L çizgisi CSS'te kapalı */
export function isNavSubitem(path: string): boolean {
  return (
    path.startsWith("kart-tanimlari/") ||
    path.startsWith("finans-islemleri/") ||
    path.startsWith("ayarlar/")
  );
}

/** Satışlar & e-Fatura — hub alt bölüm deep-link (hub sayfasına yönlendirir) */
export const SATISLAR_EFATURA_ITEMS: NavItem[] = [
  {
    id: "satis-faturalar",
    path: "satis-satin-alma/satislar-e-fatura/faturalar",
    label: "📄 Satış Faturaları",
    title: "Satışlar & e-Fatura / Satış Faturaları",
    module: "fatura",
    accent: "green",
  },
  {
    id: "satis-irsaliyeler",
    path: "satis-satin-alma/satislar-e-fatura/irsaliyeler",
    label: "🚚 Satış İrsaliyeleri",
    title: "Satışlar & e-Fatura / Satış İrsaliyeleri",
    module: "irsaliye",
    accent: "blue",
  },
];

/** Alışlar & Giderler — hub alt bölüm deep-link */
export const ALISLAR_GIDERLER_ITEMS: NavItem[] = [
  {
    id: "alis-faturalar",
    path: "satis-satin-alma/alislar-giderler/faturalar",
    label: "📄 Alış Faturaları",
    title: "Alışlar & Giderler / Alış Faturaları",
    module: "fatura",
    accent: "amber",
  },
  {
    id: "alis-irsaliyeler",
    path: "satis-satin-alma/alislar-giderler/irsaliyeler",
    label: "🚚 Alış İrsaliyeleri",
    title: "Alışlar & Giderler / Alış İrsaliyeleri",
    module: "irsaliye",
  },
];

/** FAZ 2 Section 1 — Kart Tanımları alt menü */
export const KART_TANIMLARI_ITEMS: NavItem[] = [
  {
    id: "cari-kartlar",
    path: "kart-tanimlari/cari-kartlar",
    label: "👥 Cari Kartlar",
    title: "Kart Tanımları / Cari Kartlar",
    module: "cari",
  },
  {
    id: "stok-fiyat-listeleri",
    path: "kart-tanimlari/stok-fiyat-listeleri",
    label: "🏷️ Stok & Fiyat Listeleri",
    title: "Kart Tanımları / Stok & Fiyat Listeleri",
    module: "stok",
    accent: "amber",
    badge: { text: "STOK", style: { background: "#f59e0b", color: "#000" } },
  },
  {
    id: "stok-birimleri",
    path: "kart-tanimlari/stok-birimleri",
    label: "📐 Stok Birimleri",
    title: "Kart Tanımları / Stok Birimleri",
    module: "stok",
  },
  {
    id: "sabit-kiymet",
    path: "kart-tanimlari/sabit-kiymet",
    label: "🏗️ Sabit Kıymet Tanımları",
    title: "Kart Tanımları / Sabit Kıymet",
    module: "finans",
  },
  {
    id: "kasa-banka-kartlari",
    path: "kart-tanimlari/kasa-banka-kartlari",
    label: "🏛️ Kasa & Banka Kartları",
    title: "Kart Tanımları / Kasa & Banka Kartları",
    module: "finans",
  },
  {
    id: "gelir-gider-kartlari",
    path: "kart-tanimlari/gelir-gider-kartlari",
    label: "💵 Gelir & Gider Kartları",
    title: "Kart Tanımları / Gelir & Gider Kartları",
    module: "finans",
    accent: "green",
    badge: { text: "PRO", style: { background: "#10b981", color: "#fff" } },
  },
];

/** FAZ 3 Section 1 — Finans İşlemleri alt menü */
export const FINANS_ISLEMLERI_ITEMS: NavItem[] = [
  {
    id: "kasa-islemleri",
    path: "finans-islemleri/kasa",
    label: "💵 Kasa İşlemleri (Hareketler)",
    title: "Finans / Kasa İşlemleri (Hareketler)",
    module: "finans",
    accent: "green",
    badge: { text: "KASA", style: { background: "#10b981", color: "#fff" } },
  },
  {
    id: "banka-islemleri",
    path: "finans-islemleri/banka",
    label: "🏛️ Banka İşlemleri (Hareketler)",
    title: "Finans / Banka İşlemleri (Hareketler)",
    module: "finans",
    accent: "blue",
    badge: { text: "BANKA", style: { background: "#3b82f6", color: "#fff" } },
  },
  {
    id: "cek-senet-islemleri",
    path: "finans-islemleri/cek-senet",
    label: "📝 Çek-Senet İşlemleri",
    title: "Çek-Senet İşlemleri",
    module: "finans",
  },
  {
    id: "fis-dekont",
    path: "finans-islemleri/fis-dekont",
    label: "➕ Fiş & Dekont Kayıt",
    title: "Cari İşlemler & Fişler / Fiş & Dekont Kayıt Ekranı",
    module: "finans",
    accent: "green",
    badge: { text: "15 FİŞ", style: { background: "#10b981", color: "#fff" } },
  },
  {
    id: "banka-kredileri",
    path: "finans-islemleri/banka-kredileri",
    label: "🏦 Banka Kredileri",
    title: "Finans / Banka Kredileri",
    module: "finans",
    accent: "blue",
  },
];

/**
 * Ayarlar — sidebar alt menü başlıkları.
 * Detaylar hub iç ekranında Gelir&Gider tarzı bölüm kartlarıdır.
 */
export const AYARLAR_MENU_ITEMS: NavItem[] = [
  {
    id: "ayr-tanimlar",
    path: "ayarlar/tanimlar",
    label: "📐 Tanımlar",
    title: "Ayarlar / Tanımlar",
    module: "ayarlar",
  },
  {
    id: "ayr-firma-kullanici",
    path: "ayarlar/firma-kullanici",
    label: "⚙️ Firma & Kullanıcı Tanım",
    title: "Ayarlar / Firma & Kullanıcı Tanım",
    module: "ayarlar",
  },
  {
    id: "ayr-sistem",
    path: "ayarlar/sistem",
    label: "🖥️ Sistem Ayarları",
    title: "Ayarlar / Sistem Ayarları",
    module: "ayarlar",
  },
  {
    id: "ayr-program",
    path: "ayarlar/program",
    label: "🛠️ Program Ayarları",
    title: "Ayarlar / Program Ayarları",
    module: "ayarlar",
  },
  {
    id: "ayr-lisans",
    path: "ayarlar/lisans",
    label: "🔑 Lisans Etkinleştirme",
    title: "Ayarlar / Lisans Etkinleştirme",
    module: "ayarlar",
  },
];

/** FAZ 1 Section 4 — 11 sidebar kategorisi (HTML iskeletine sadık) */
export const MENU: NavGroup[] = [
  {
    category: "Ana Panel",
    items: [{ id: "dashboard", path: "dashboard", label: "🏠 Dashboard", title: "Ana Panel", module: "dashboard" }],
  },
  {
    category: "Kart Tanımları",
    items: KART_TANIMLARI_ITEMS,
  },
  {
    category: "Satış & Satın Alma",
    items: [
      {
        id: "sales",
        path: "satis-satin-alma/satislar-e-fatura",
        label: "⬆️ Satışlar & e-Faturalar",
        title: "Satışlar & e-Fatura",
        module: "fatura",
      },
      {
        id: "purchases",
        path: "satis-satin-alma/alislar-giderler",
        label: "⬇️ Alışlar & Giderler",
        title: "Alışlar & Giderler",
        module: "fatura",
      },
      { id: "teklifler", path: "teklifler", label: "📋 Teklifler", title: "Teklifler", module: "fatura" },
      { id: "orders", path: "orders", label: "🛒 Siparişler", title: "Siparişler", module: "fatura" },

      { id: "pos", path: "pos", label: "🧾 POS Satış", title: "POS", module: "fatura" },
    ],
  },
  {
    category: "Finans İşlemleri",
    items: FINANS_ISLEMLERI_ITEMS,
  },
  {
    category: "Stok & Depo",
    items: [{ id: "stock-tx", path: "stock-tx", label: "📦 Stok İşlemleri", title: "Stok & Depo", module: "stok" }],
  },
  {
    category: "e-Dönüşüm",
    items: [
      {
        id: "edoc",
        path: "e-belge",
        label: "📑 e-Belge İşlemleri",
        title: "e-Belge İşlemleri",
        module: "e_belge",
      },
    ],
  },
  {
    category: "Üretim & MRP",
    items: [{ id: "production", path: "production", label: "🏭 Üretim Emirleri", title: "Üretim & MRP", module: "maliyet" }],
  },
  {
    category: "Maliyet Muhasebesi",
    items: [{ id: "cost", path: "cost", label: "📐 Maliyet Hesapları", title: "Maliyet Muhasebesi", module: "maliyet" }],
  },
  {
    category: "Resmi Muhasebe",
    items: [
      { id: "yevmiye-fisleri", path: "yevmiye/fisler", label: "📒 Yevmiye Fişleri", title: "Yevmiye Fişleri", module: "resmi_muhasebe" },
      { id: "journal", path: "yevmiye/edefter", label: "📘 Yevmiye & Defter", title: "Yevmiye & e-Defter", module: "resmi_muhasebe" },
      { id: "beyanname", path: "beyanname", label: "📋 Beyannameler", title: "Beyannameler", module: "resmi_muhasebe" },
    ],
  },
  {
    category: "Raporlar",
    items: [
      { id: "reports", path: "reports", label: "📉 Raporlar", title: "Raporlar", module: "raporlar" },
      { id: "excel-import", path: "excel-import", label: "📊 Excel Akıllı Rapor", title: "Excel Akıllı Rapor & Mizan", module: "raporlar" },
      {
        id: "sablon-tasarimci",
        path: "sablon-tasarimci",
        label: "🎨 Şablon Tasarımcısı",
        title: "Şablon & Rapor Tasarımcısı",
        module: "raporlar",
      },
    ],
  },
  {
    category: "Ayarlar",
    items: AYARLAR_MENU_ITEMS,
  },
];

export const ALL_NAV_ITEMS = MENU.flatMap((g) => g.items);

/** Eski FAZ 1 kart rotaları → yeni yollar (geriye dönük uyumluluk) */
export const LEGACY_KART_PATH_REDIRECTS: Record<string, string> = {
  accounts: "kart-tanimlari/cari-kartlar",
  stocks: "kart-tanimlari/stok-fiyat-listeleri",
  "finance-cards": "kart-tanimlari/kasa-banka-kartlari",
};

/** Eski FAZ 1 finans rotaları → FAZ 3 yolları (geriye dönük uyumluluk) */
export const LEGACY_FINANS_PATH_REDIRECTS: Record<string, string> = {
  cash: "finans-islemleri/kasa",
  bank: "finans-islemleri/banka",
  checks: "finans-islemleri/cek-senet",
  "fis-girisi": "finans-islemleri/fis-dekont",
  "kasa-islemler": "finans-islemleri/kasa",
  "banka-islemler": "finans-islemleri/banka",
};

/** Eski fatura/irsaliye rotaları → hub sayfaları (geriye dönük uyumluluk) */
export const LEGACY_SATIS_PATH_REDIRECTS: Record<string, string> = {
  "satis-satin-alma/fatura": "satis-satin-alma/satislar-e-fatura?section=fatura",
  "satis-satin-alma/irsaliye": "satis-satin-alma/satislar-e-fatura?section=irsaliye",
  "satis-satin-alma/satislar-e-fatura/faturalar": "satis-satin-alma/satislar-e-fatura?section=fatura",
  "satis-satin-alma/satislar-e-fatura/irsaliyeler": "satis-satin-alma/satislar-e-fatura?section=irsaliye",
  "satis-satin-alma/alislar-giderler/faturalar": "satis-satin-alma/alislar-giderler?section=fatura",
  "satis-satin-alma/alislar-giderler/irsaliyeler": "satis-satin-alma/alislar-giderler?section=irsaliye",
  sales: "satis-satin-alma/satislar-e-fatura",
  purchases: "satis-satin-alma/alislar-giderler",
};

export const LEGACY_PATH_REDIRECTS: Record<string, string> = {
  ...LEGACY_KART_PATH_REDIRECTS,
  ...LEGACY_FINANS_PATH_REDIRECTS,
  ...LEGACY_SATIS_PATH_REDIRECTS,
  edoc: "e-belge?section=giden",
  "e-belge/emm": "e-belge?section=emm",
  journal: "yevmiye/edefter?section=edefter",
  "yevmiye-fisleri": "yevmiye/fisler?section=fisler",
  "ayarlar/tanimlar/fis-no-serileri": "ayarlar/program",
  settings: "ayarlar/firma-kullanici",
  "ayarlar/sistem/firma-kullanici": "ayarlar/firma-kullanici",
  "ayarlar/tanimlar/stok-birim": "ayarlar/tanimlar",
  "ayarlar/tanimlar/cari-tip": "ayarlar/tanimlar",
  "ayarlar/tanimlar/sube": "ayarlar/tanimlar",
  "ayarlar/tanimlar/kayit-tip": "ayarlar/tanimlar",
  "ayarlar/sistem/veritabani-yedekleme": "ayarlar/sistem",
  "ayarlar/sistem/bildirim": "ayarlar/sistem",
  "ayarlar/sistem/gib": "ayarlar/sistem",
  "ayarlar/sistem/entegrator": "ayarlar/sistem",
  "ayarlar/program/muhasebelestirme-kod": "ayarlar/program",
  "ayarlar/program/e-fatura-no": "ayarlar/program",
  "ayarlar/program/e-irsaliye-no": "ayarlar/program",
  "ayarlar/program/kasa-fis-no": "ayarlar/program",
  "ayarlar/program/banka-fis-no": "ayarlar/program",
  "ayarlar/program/cek-senet-fis-no": "ayarlar/program",
  "ayarlar/program/fis-dekont-fis-no": "ayarlar/program",
  "ayarlar/program/stok-fis-no": "ayarlar/program",
  "ayarlar/program/yevmiye-no": "ayarlar/program",
};

export function findNavItemByPath(pathSegment: string): NavItem | undefined {
  return ALL_NAV_ITEMS.find((i) => i.path === pathSegment || i.path.endsWith(`/${pathSegment}`));
}

/** /app/... tam yolundan nav öğesi bulur */
export function findNavItemByLocation(pathname: string): NavItem | undefined {
  const relative = pathname.replace(/^\/app\/?/, "").replace(/\/$/, "");
  if (!relative) return findNavItemByPath("dashboard");

  const hub = SIDEBAR_HUBS.find((h) => relative === h.path || relative.startsWith(`${h.path}/`));
  if (hub) {
    return {
      id: hub.id,
      path: hub.path,
      label: hub.label,
      title: hub.title,
      module: hub.module,
    };
  }

  const direct = ALL_NAV_ITEMS.find((i) => i.path === relative);
  if (direct) return direct;
  const byPrefix = ALL_NAV_ITEMS.filter((i) => relative === i.path || relative.startsWith(`${i.path}/`)).sort(
    (a, b) => b.path.length - a.path.length
  );
  if (byPrefix[0]) return byPrefix[0];
  const last = relative.split("/").pop() || relative;
  return findNavItemByPath(last);
}

export function navAccentStyle(accent?: NavItem["accent"]): CSSProperties | undefined {
  if (accent === "green") return { color: "#10b981", fontWeight: 700 };
  if (accent === "amber") return { color: "#f59e0b", fontWeight: 700 };
  if (accent === "blue") return { color: "#3b82f6", fontWeight: 700 };
  return undefined;
}
