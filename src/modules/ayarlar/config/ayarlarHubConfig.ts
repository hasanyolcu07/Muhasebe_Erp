/** Ayarlar hub — iç ekran bölüm kartları (sidebar'da değil) */

export type AyarlarPanel = {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  description: string;
  formatHint?: string;
  activeClass: string;
  /** Alt bölüm kartları (örn. Numara Tanımları) */
  children?: AyarlarPanel[];
};

export const EBELGE_NO_FORMAT =
  "SSSYYYYNNNNNNNNN  →  seri(3) + yıl(4) + numara(9)  örn. ABC2026000000001";

export const TANIMLAR_PANELS: AyarlarPanel[] = [
  {
    id: "hesap-plani-ayarlari",
    icon: "⚙️",
    title: "Hesap Planı Ayarları",
    subtitle: "Ayrışım / kırılım / renk",
    description: "Hesap kodu ayrışım-kırılım ve Sınıf–Alt Sınıf–Ana–Grup–Muavin renkleri.",
    activeClass: "active-purple",
  },
  {
    id: "kod-tanimlari",
    icon: "🏷️",
    title: "Grup / Özel Kod Tanımları",
    subtitle: "Dinamik kod alanları",
    description: "Cari ve stok grup/özel kodları, muhasebe bağlantıları ve toplu aktarım.",
    activeClass: "active-blue",
  },
  {
    id: "stok-birim",
    icon: "📐",
    title: "Stok Birim Tanımları",
    subtitle: "Birim kodları",
    description: "Birim kodları (Adet, Kg, Lt …) ve dönüşüm katsayıları.",
    activeClass: "active-blue",
  },
  {
    id: "cari-tip",
    icon: "🏷️",
    title: "Cari Tip Tanımları",
    subtitle: "Müşteri / tedarikçi",
    description: "Müşteri, tedarikçi ve diğer cari tipleri.",
    activeClass: "active-amber",
  },
  {
    id: "sube",
    icon: "🏢",
    title: "Şube Tanımları",
    subtitle: "Şube / Proje / Masraf",
    description:
      "Şirket şubeleri, Proje Kodu ve Masraf Merkezi tanımları; topbar şube seçicisi buradan beslenir.",
    activeClass: "active-gelir",
  },
  {
    id: "kayit-tip",
    icon: "📋",
    title: "Kayıt Tip Tanımları (GR-R)",
    subtitle: "Resmi / Gayri Resmi",
    description: "Resmi / Gayri Resmi kayıt türleri.",
    activeClass: "active-gider",
  },
  {
    id: "makina-tip",
    icon: "⚙️",
    title: "Makina Tip Tanımları",
    subtitle: "Parkur & İstasyon Tipleri",
    description: "Makina parkuru ve iş istasyonu tip kodları, saatlik amortisman ve enerji katsayıları.",
    activeClass: "active-amber",
  },
  {
    id: "depo-tanim",
    icon: "🏬",
    title: "Depo Tanımları",
    subtitle: "Muhasebe & Stok Ambarları",
    description: "Hammadde (150), Yarı Mamul (151), Mamul (152), Ticari (153) depo ambarları ve muhasebe entegrasyonu.",
    activeClass: "active-purple",
  },
];

export const SISTEM_PANELS: AyarlarPanel[] = [
  {
    id: "veritabani-yedekleme",
    icon: "💾",
    title: "Veritabanı Yedekleme",
    subtitle: "Yedek / geri yükle",
    description: "Yedek alma / geri yükleme işlemleri.",
    activeClass: "active-blue",
  },
  {
    id: "dil-tema-guvenlik",
    icon: "🌐",
    title: "Dil, Tema ve Güvenlik",
    subtitle: "TR/EN/DE · Tema · 2FA",
    description: "Sistem dili, arayüz teması, oturum ve güvenlik ayarları.",
    activeClass: "active-gelir",
  },
  {
    id: "bildirim",
    icon: "🔔",
    title: "Bildirim Tanımları",
    subtitle: "Vade / stok uyarıları",
    description: "Çek-senet, fatura, stok min. ve diğer uyarı eşikleri.",
    activeClass: "active-amber",
  },
  {
    id: "gib",
    icon: "🏛️",
    title: "GİB Tanımları",
    subtitle: "Test / Canlı",
    description: "GİB Test / Canlı ortam ve kimlik bilgileri.",
    activeClass: "active-gelir",
  },
  {
    id: "entegrator",
    icon: "🔌",
    title: "Entegratör Tanımları",
    subtitle: "e-Belge bağlantı",
    description: "e-Belge entegratör bağlantı ayarları.",
    activeClass: "active-gider",
  },
];

export const NUMARA_TANIM_PANELS: AyarlarPanel[] = [
  {
    id: "e-fatura-no",
    icon: "🧾",
    title: "E-Fatura No",
    subtitle: "GIB + Sistem",
    description: "Fatura GIB format ve Sistem format seri tanımları.",
    formatHint: EBELGE_NO_FORMAT,
    activeClass: "active-gelir",
  },
  {
    id: "e-irsaliye-no",
    icon: "🚚",
    title: "E-İrsaliye No",
    subtitle: "GIB + Sistem",
    description: "İrsaliye GIB format ve Sistem format seri tanımları.",
    formatHint: EBELGE_NO_FORMAT,
    activeClass: "active-gider",
  },
  {
    id: "siparis-no",
    icon: "🛒",
    title: "Sipariş No",
    subtitle: "Sipariş serisi",
    description: "Sipariş belge numarası serisi (sol form + sağ liste).",
    activeClass: "active-blue",
  },
  {
    id: "teklif-no",
    icon: "💬",
    title: "Teklif No",
    subtitle: "Teklif serisi",
    description: "Teklif belge numarası serisi (sol form + sağ liste).",
    activeClass: "active-amber",
  },
  {
    id: "kasa-fis-no",
    icon: "💵",
    title: "Kasa Fiş No",
    subtitle: "Kasa serisi",
    description: "Kasa hareket fiş numarası serisi.",
    activeClass: "active-blue",
  },
  {
    id: "banka-fis-no",
    icon: "🏦",
    title: "Banka Fiş No",
    subtitle: "Banka serisi",
    description: "Banka hareket fiş numarası serisi.",
    activeClass: "active-amber",
  },
  {
    id: "cek-senet-fis-no",
    icon: "📝",
    title: "Çek-Senet Fiş No",
    subtitle: "Çek / Senet ayrı",
    description: "Alınan/Verilen Çek ve Alınan/Verilen Senet için ayrı fiş no serileri.",
    activeClass: "active-gelir",
  },
  {
    id: "fis-dekont-fis-no",
    icon: "➕",
    title: "Fiş&Dekont Fiş No",
    subtitle: "Tüm alt türler",
    description:
      "Cari Tahsilat/Ödeme, Nakit, Alacak/Borç Dekontu, KK, POS, Virman, Açılış, Özel, Kur Farkı fiş no serileri.",
    activeClass: "active-gider",
  },
  {
    id: "stok-fis-no",
    icon: "📦",
    title: "Stok Fiş No",
    subtitle: "Giriş / Çıkış / Transfer…",
    description: "Stok Giriş, Çıkış, Transfer, Sayım, Fire&Zaiyat fiş numarası serileri.",
    activeClass: "active-blue",
  },
  {
    id: "yevmiye-no",
    icon: "📒",
    title: "Yevmiye No",
    subtitle: "GIB Madde No",
    description: "Yevmiye madde numarası serisi (GIB uyumlu, tarih sırası zorunlu).",
    formatHint: EBELGE_NO_FORMAT,
    activeClass: "active-amber",
  },
];

export const PROGRAM_PANELS: AyarlarPanel[] = [
  {
    id: "hesap-plani",
    icon: "📒",
    title: "Hesap Planı",
    subtitle: "Mizan / Muavin",
    description: "Hesap planı listesi, mizan, muavin ve tarih aralıklı mizan raporları.",
    activeClass: "active-blue",
  },
  {
    id: "etiket-ek-bilgi",
    icon: "🏷️",
    title: "Etiket/Ek Bilgi Tanımları",
    subtitle: "Grup ve ek alanlar",
    description: "Stok, gelir, gider, cari ve personel etiket / ek bilgi alan adları.",
    activeClass: "active-amber",
  },
  {
    id: "muhasebelestirme-kod",
    icon: "🔗",
    title: "Muhasebeleştirme Kod Bağlantıları",
    subtitle: "Hesap eşleme",
    description: "Belge türü → hesap planı kod eşlemeleri.",
    activeClass: "active-blue",
  },
  {
    id: "numara-tanimlari",
    icon: "🔢",
    title: "Numara Tanımları",
    subtitle: "Seri / fiş no",
    description: "E-Fatura, irsaliye, sipariş, teklif, kasa, banka, çek-senet, stok ve yevmiye numara serileri.",
    activeClass: "active-gelir",
    children: NUMARA_TANIM_PANELS,
  },
];

export const LISANS_PANELS: AyarlarPanel[] = [
  {
    id: "lisans",
    icon: "🔑",
    title: "Lisans Etkinleştirme",
    subtitle: "Anahtar / paket",
    description: "Lisans anahtarı girişi ve paket durumu.",
    activeClass: "active-amber",
  },
];

export type AyarlarHubKind = "tanimlar" | "sistem" | "program" | "lisans";

export const AYARLAR_HUB_PANELS: Record<AyarlarHubKind, AyarlarPanel[]> = {
  tanimlar: TANIMLAR_PANELS,
  sistem: SISTEM_PANELS,
  program: PROGRAM_PANELS,
  lisans: LISANS_PANELS,
};

export const AYARLAR_HUB_META: Record<
  AyarlarHubKind,
  { breadcrumb: string; title: string }
> = {
  tanimlar: { breadcrumb: "Ayarlar / Tanımlar", title: "Tanımlar" },
  sistem: { breadcrumb: "Ayarlar / Sistem Ayarları", title: "Sistem Ayarları" },
  program: { breadcrumb: "Ayarlar / Program Ayarları", title: "Program Ayarları" },
  lisans: { breadcrumb: "Ayarlar / Lisans Etkinleştirme", title: "Lisans Etkinleştirme" },
};

/** Üst kart veya çocuk id ile paneli bul */
export function findAyarlarPanel(panels: AyarlarPanel[], id: string): AyarlarPanel | undefined {
  for (const p of panels) {
    if (p.id === id) return p;
    const child = p.children?.find((c) => c.id === id);
    if (child) return child;
  }
  return undefined;
}

/** Aktif yaprak için üst grup kartı */
export function findAyarlarParent(panels: AyarlarPanel[], leafId: string): AyarlarPanel | undefined {
  return panels.find((p) => p.id === leafId || p.children?.some((c) => c.id === leafId));
}
