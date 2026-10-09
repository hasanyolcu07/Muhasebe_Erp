/** Sol menü ana başlıkları + hub içi bölüm kartları (görsel navigasyon) */

export type HubCard = {
  id: string;
  title: string;
  description: string;
  icon: string;
  /** active-blue | active-green | active-amber | active-purple | active-rose */
  activeClass: string;
  /** İçerik anahtarı (ModuleHubPage render) — children yoksa zorunlu */
  contentKey?: string;
  children?: HubCard[];
};

export type SidebarHub = {
  id: string;
  path: string;
  label: string;
  title: string;
  module?: string;
  /** true ise hub sayfası yok, doğrudan path */
  direct?: boolean;
  sections: HubCard[];
};

export const SIDEBAR_HUBS: SidebarHub[] = [
  {
    id: "dashboard",
    path: "dashboard",
    label: "🏠 DASHBOARD",
    title: "Dashboard",
    module: "dashboard",
    direct: true,
    sections: [],
  },
  {
    id: "satis",
    path: "hub/satis",
    label: "🛒 SATIŞ & SATINALMA & STOK",
    title: "Satış & Satınalma & Stok",
    module: "fatura",
    sections: [
      {
        id: "satislar",
        title: "SATIŞLAR",
        description: "Fatura, irsaliye, sipariş, teklif",
        icon: "⬆️",
        activeClass: "active-green",
        children: [
          {
            id: "satis-faturalar",
            title: "Satış Faturaları",
            description: "e-Fatura / kağıt satış",
            icon: "📄",
            activeClass: "active-green",
            contentKey: "satis-faturalar",
          },
          {
            id: "satis-irsaliyeler",
            title: "Satış İrsaliyeleri",
            description: "Sevk ve e-İrsaliye",
            icon: "🚚",
            activeClass: "active-blue",
            contentKey: "satis-irsaliyeler",
          },
          {
            id: "satis-siparisler",
            title: "Satış Siparişleri",
            description: "Alınan siparişler",
            icon: "🛒",
            activeClass: "active-blue",
            contentKey: "satis-siparisler",
          },
          {
            id: "satis-teklifler",
            title: "Satış Teklifleri",
            description: "Alınan teklifler",
            icon: "📋",
            activeClass: "active-amber",
            contentKey: "satis-teklifler",
          },
        ],
      },
      {
        id: "alislar",
        title: "ALIŞLAR",
        description: "Fatura, irsaliye, sipariş, teklif",
        icon: "⬇️",
        activeClass: "active-amber",
        children: [
          {
            id: "alis-faturalar",
            title: "Alış Faturaları",
            description: "Gider ve alış faturaları",
            icon: "📄",
            activeClass: "active-amber",
            contentKey: "alis-faturalar",
          },
          {
            id: "alis-irsaliyeler",
            title: "Alış İrsaliyeleri",
            description: "Gelen sevkiyat",
            icon: "🚚",
            activeClass: "active-blue",
            contentKey: "alis-irsaliyeler",
          },
          {
            id: "alis-siparisler",
            title: "Alış Siparişleri",
            description: "Verilen siparişler",
            icon: "🛍️",
            activeClass: "active-blue",
            contentKey: "alis-siparisler",
          },
          {
            id: "alis-teklifler",
            title: "Alış Teklifleri",
            description: "Verilen teklifler",
            icon: "📋",
            activeClass: "active-amber",
            contentKey: "alis-teklifler",
          },
        ],
      },
      {
        id: "stok-islemleri",
        title: "STOK İŞLEMLERİ",
        description: "Stok giriş / çıkış / virman",
        icon: "📦",
        activeClass: "active-purple",
        children: [
          {
            id: "stok-hareket",
            title: "Stok İşlemleri",
            description: "Stok hareket fişleri",
            icon: "📦",
            activeClass: "active-purple",
            contentKey: "stok-hareket",
          },
        ],
      },
    ],
  },
  {
    id: "finans",
    path: "hub/finans",
    label: "💰 FİNANS İŞLEMLERİ",
    title: "Finans İşlemleri",
    module: "finans",
    sections: [
      {
        id: "kasa",
        title: "Kasa İşlemleri",
        description: "Kasa hareketleri",
        icon: "💵",
        activeClass: "active-green",
        contentKey: "kasa-islemleri",
      },
      {
        id: "banka",
        title: "Banka İşlemleri",
        description: "Banka hareketleri",
        icon: "🏛️",
        activeClass: "active-blue",
        contentKey: "banka-islemleri",
      },
      {
        id: "cek-senet",
        title: "Çek & Senet",
        description: "Portföy işlemleri",
        icon: "📝",
        activeClass: "active-amber",
        contentKey: "cek-senet-islemleri",
      },
      {
        id: "fis-dekont",
        title: "Fiş & Dekont",
        description: "Cari fiş kayıtları",
        icon: "➕",
        activeClass: "active-purple",
        contentKey: "fis-dekont",
      },
      {
        id: "banka-kredileri",
        title: "Banka Kredileri",
        description: "Kredi sözleşmeleri ve taksitler",
        icon: "🏦",
        activeClass: "active-amber",
        contentKey: "banka-kredileri",
      },
    ],
  },
  {
    id: "e-donusum",
    path: "hub/e-donusum",
    label: "📑 E-DÖNÜŞÜM",
    title: "e-Dönüşüm",
    module: "e_belge",
    sections: [
      {
        id: "giden",
        title: "Giden Belgeler",
        description: "e-Fatura / e-İrsaliye gönderim",
        icon: "📤",
        activeClass: "active-blue",
        contentKey: "ebelge-giden",
      },
      {
        id: "gelen",
        title: "Gelen Belgeler",
        description: "Gelen kutusu",
        icon: "📥",
        activeClass: "active-green",
        contentKey: "ebelge-gelen",
      },
      {
        id: "emm",
        title: "E-MM",
        description: "e-Müstahsil makbuz",
        icon: "🌾",
        activeClass: "active-amber",
        contentKey: "ebelge-emm",
      },
    ],
  },
  {
    id: "uretim",
    path: "hub/uretim",
    label: "🏭 ÜRETİM & MRP",
    title: "Üretim & MRP",
    module: "maliyet",
    sections: [
      {
        id: "emir",
        title: "Üretim Emirleri",
        description: "Emir oluştur / tamamla",
        icon: "🏭",
        activeClass: "active-blue",
        contentKey: "uretim-emir",
      },
      {
        id: "bom",
        title: "Reçeteler",
        description: "BOM tanımları",
        icon: "🧩",
        activeClass: "active-purple",
        contentKey: "uretim-bom",
      },
      {
        id: "plan",
        title: "İş Planı",
        description: "Günlük / aylık plan",
        icon: "📅",
        activeClass: "active-green",
        contentKey: "uretim-plan",
      },
      {
        id: "makina",
        title: "Makina Parkuru",
        description: "Makina tanımları",
        icon: "⚙️",
        activeClass: "active-amber",
        contentKey: "uretim-makina",
      },
      {
        id: "maliyet-butce",
        title: "Maliyet Bütçesi",
        description: "Elektrik / maliyet / ciro",
        icon: "📊",
        activeClass: "active-rose",
        contentKey: "uretim-maliyet-butce",
      },
    ],
  },
  {
    id: "muhasebe",
    path: "hub/muhasebe",
    label: "📒 MUHASEBE",
    title: "Muhasebe",
    module: "resmi_muhasebe",
    sections: [
      {
        id: "yevmiye-fisleri",
        title: "Yevmiye Fişleri",
        description: "Fiş listesi ve kayıt",
        icon: "📒",
        activeClass: "active-blue",
        contentKey: "yevmiye-fisleri",
      },
      {
        id: "yevmiye-defter",
        title: "Yevmiye & Defter",
        description: "e-Defter ve işlemler",
        icon: "📘",
        activeClass: "active-purple",
        contentKey: "yevmiye-defter",
      },
      {
        id: "beyanname",
        title: "Beyannameler",
        description: "Resmi beyanname seti",
        icon: "📋",
        activeClass: "active-amber",
        contentKey: "beyanname",
      },
    ],
  },
  {
    id: "kart-tanimlari",
    path: "hub/kart-tanimlari",
    label: "📇 KART TANIMLARI",
    title: "Kart Tanımları",
    module: "cari",
    sections: [
      {
        id: "cari",
        title: "Cari Kartlar",
        description: "Müşteri / tedarikçi",
        icon: "👥",
        activeClass: "active-blue",
        contentKey: "cari-kartlar",
      },
      {
        id: "stok",
        title: "Stoklar & Fiyat",
        description: "Stok ve fiyat listeleri",
        icon: "🏷️",
        activeClass: "active-amber",
        contentKey: "stok-fiyat-listeleri",
      },
      {
        id: "sabit-kiymet",
        title: "Sabit Kıymet",
        description: "Demirbaş tanımları",
        icon: "🏗️",
        activeClass: "active-purple",
        contentKey: "sabit-kiymet",
      },
      {
        id: "kasa-banka",
        title: "Kasa & Banka",
        description: "Kasa / banka kartları",
        icon: "🏛️",
        activeClass: "active-green",
        contentKey: "kasa-banka-kartlari",
      },
      {
        id: "gelir-gider",
        title: "Gelir & Gider",
        description: "Gelir / gider kartları",
        icon: "💵",
        activeClass: "active-rose",
        contentKey: "gelir-gider-kartlari",
      },
    ],
  },
  {
    id: "raporlar",
    path: "hub/raporlar",
    label: "📉 RAPORLAR",
    title: "Raporlar",
    module: "raporlar",
    sections: [
      {
        id: "reports",
        title: "Raporlar",
        description: "Standart raporlar",
        icon: "📉",
        activeClass: "active-blue",
        contentKey: "reports",
      },
      {
        id: "excel",
        title: "Excel Akıllı Rapor",
        description: "AI kolon eşleme",
        icon: "📊",
        activeClass: "active-green",
        contentKey: "excel-import",
      },
      {
        id: "sablon",
        title: "Şablon Tasarımcısı",
        description: "GİB e-belge şablonları",
        icon: "🎨",
        activeClass: "active-purple",
        contentKey: "sablon-tasarimci",
      },
    ],
  },
  {
    id: "ayarlar",
    path: "hub/ayarlar",
    label: "⚙️ AYARLAR",
    title: "Ayarlar",
    module: "ayarlar",
    sections: [
      {
        id: "tanimlar",
        title: "Tanımlar",
        description: "Birim, tip, şube…",
        icon: "📐",
        activeClass: "active-blue",
        contentKey: "ayr-tanimlar",
      },
      {
        id: "firma",
        title: "Firma & Kullanıcı",
        description: "Firma ve kullanıcı",
        icon: "⚙️",
        activeClass: "active-green",
        contentKey: "ayr-firma-kullanici",
      },
      {
        id: "sistem",
        title: "Sistem Ayarları",
        description: "Yedek, GİB, bildirim",
        icon: "🖥️",
        activeClass: "active-amber",
        contentKey: "ayr-sistem",
      },
      {
        id: "program",
        title: "Program Ayarları",
        description: "Seri no ve kodlar",
        icon: "🛠️",
        activeClass: "active-purple",
        contentKey: "ayr-program",
      },
      {
        id: "lisans",
        title: "Lisans",
        description: "Etkinleştirme",
        icon: "🔑",
        activeClass: "active-rose",
        contentKey: "ayr-lisans",
      },
    ],
  },
];

export function getSidebarHubById(id: string): SidebarHub | undefined {
  return SIDEBAR_HUBS.find((h) => h.id === id);
}

export function getSidebarHubByPath(path: string): SidebarHub | undefined {
  const clean = path.replace(/^\/app\/?/, "").replace(/\/$/, "");
  return SIDEBAR_HUBS.find((h) => h.path === clean || clean.startsWith(`${h.path}/`));
}

/** Eski menü yolu → hub path + query (sidebar dışı deep-link uyumu) */
export const LEAF_TO_HUB: Record<string, { hubPath: string; group?: string; section: string }> = {
  "satis-satin-alma/satislar-e-fatura": { hubPath: "hub/satis", group: "satislar", section: "satis-faturalar" },
  "satis-satin-alma/alislar-giderler": { hubPath: "hub/satis", group: "alislar", section: "alis-faturalar" },
  orders: { hubPath: "hub/satis", group: "satislar", section: "satis-siparisler" },
  teklifler: { hubPath: "hub/satis", group: "satislar", section: "satis-teklifler" },
  "stock-tx": { hubPath: "hub/satis", group: "stok-islemleri", section: "stok-hareket" },
  "finans-islemleri/kasa": { hubPath: "hub/finans", section: "kasa" },
  "finans-islemleri/banka": { hubPath: "hub/finans", section: "banka" },
  "finans-islemleri/cek-senet": { hubPath: "hub/finans", section: "cek-senet" },
  "finans-islemleri/fis-dekont": { hubPath: "hub/finans", section: "fis-dekont" },
  "finans-islemleri/banka-kredileri": { hubPath: "hub/finans", section: "banka-kredileri" },
  "e-belge": { hubPath: "hub/e-donusum", section: "giden" },
  production: { hubPath: "hub/uretim", section: "emir" },
  "yevmiye/fisler": { hubPath: "hub/muhasebe", section: "yevmiye-fisleri" },
  "yevmiye/edefter": { hubPath: "hub/muhasebe", section: "yevmiye-defter" },
  beyanname: { hubPath: "hub/muhasebe", section: "beyanname" },
  "kart-tanimlari/cari-kartlar": { hubPath: "hub/kart-tanimlari", section: "cari" },
  "kart-tanimlari/stok-fiyat-listeleri": { hubPath: "hub/kart-tanimlari", section: "stok" },
  "kart-tanimlari/sabit-kiymet": { hubPath: "hub/kart-tanimlari", section: "sabit-kiymet" },
  "kart-tanimlari/kasa-banka-kartlari": { hubPath: "hub/kart-tanimlari", section: "kasa-banka" },
  "kart-tanimlari/gelir-gider-kartlari": { hubPath: "hub/kart-tanimlari", section: "gelir-gider" },
  reports: { hubPath: "hub/raporlar", section: "reports" },
  "excel-import": { hubPath: "hub/raporlar", section: "excel" },
  "sablon-tasarimci": { hubPath: "hub/raporlar", section: "sablon" },
  "ayarlar/tanimlar": { hubPath: "hub/ayarlar", section: "tanimlar" },
  "ayarlar/firma-kullanici": { hubPath: "hub/ayarlar", section: "firma" },
  "ayarlar/sistem": { hubPath: "hub/ayarlar", section: "sistem" },
  "ayarlar/program": { hubPath: "hub/ayarlar", section: "program" },
  "ayarlar/lisans": { hubPath: "hub/ayarlar", section: "lisans" },
};

export type HubFavoriteItem = {
  id: string;
  title: string;
  description: string;
  icon: string;
  to: string;
  activeClass: string;
  group?: string;
};

/** Hub yaprak kartlarından hızlı erişim adayları */
export function flattenHubFavorites(): HubFavoriteItem[] {
  const out: HubFavoriteItem[] = [];
  for (const hub of SIDEBAR_HUBS) {
    if (hub.direct) continue;
    for (const sec of hub.sections) {
      if (sec.children?.length) {
        for (const child of sec.children) {
          const qs = new URLSearchParams({ group: sec.id, section: child.id });
          out.push({
            id: `${hub.id}:${child.id}`,
            title: child.title,
            description: child.description,
            icon: child.icon,
            to: `/app/${hub.path}?${qs.toString()}`,
            activeClass: child.activeClass,
            group: hub.title,
          });
        }
      } else {
        const qs = new URLSearchParams({ section: sec.id });
        out.push({
          id: `${hub.id}:${sec.id}`,
          title: sec.title,
          description: sec.description,
          icon: sec.icon,
          to: `/app/${hub.path}?${qs.toString()}`,
          activeClass: sec.activeClass,
          group: hub.title,
        });
      }
    }
  }
  return out;
}

