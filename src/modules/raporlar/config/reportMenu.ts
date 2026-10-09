/** Raporlar hub menü tanımı — FAZ 6 + geniş rapor seti */

export type ReportGroupId =
  | "cari"
  | "finans"
  | "gelir-gider"
  | "cek-senet"
  | "uretim"
  | "maliyet"
  | "muhasebe"
  | "stok"
  | "satis"
  | "ebelge"
  | "analytics";

export type ReportItem = {
  id: string;
  label: string;
  implemented?: boolean;
  /** API path segment under /raporlar/{apiGroup}/{id} */
  apiGroup?: string;
  /** Extra filter flags for UI */
  filters?: {
    cashPicker?: boolean;
    bankPicker?: boolean;
    dueDays?: boolean;
    maliCompare?: boolean;
    groupHeader?: string;
  };
};

export type ReportGroup = {
  id: ReportGroupId;
  label: string;
  items: ReportItem[];
};

export const REPORT_GROUPS: ReportGroup[] = [
  {
    id: "cari",
    label: "CARİ RAPORLARI",
    items: [
      {
        id: "cari-tahsilat",
        label: "Cari Tahsilat Raporları",
        implemented: true,
        apiGroup: "cari",
        filters: { groupHeader: "Cari Hareket Raporları" },
      },
      {
        id: "cari-tahsilat-gecikme",
        label: "Cari Tahsilat Gecikme raporları",
        implemented: true,
        apiGroup: "cari",
        filters: { groupHeader: "Cari Hareket Raporları" },
      },
      {
        id: "cari-satislar",
        label: "Carilere Göre Satışlar raporu",
        implemented: true,
        apiGroup: "cari",
        filters: { groupHeader: "Cari Hareket Raporları" },
      },
      {
        id: "cari-alislar",
        label: "Carilere Göre Alışlar Raporu",
        implemented: true,
        apiGroup: "cari",
        filters: { groupHeader: "Cari Hareket Raporları" },
      },
    ],
  },
  {
    id: "finans",
    label: "FİNANS RAPORLARI",
    items: [
      { id: "kasa-durum", label: "Kasa durum raporu", implemented: true, apiGroup: "finans", filters: { cashPicker: true } },
      { id: "banka-durum", label: "Banka durum raporu", implemented: true, apiGroup: "finans", filters: { bankPicker: true } },
      { id: "kasa-hareket", label: "Kasa Hareket Raporları", implemented: true, apiGroup: "finans", filters: { cashPicker: true } },
      { id: "banka-hareket", label: "Banka Hareket Raporları", implemented: true, apiGroup: "finans", filters: { bankPicker: true } },
    ],
  },
  {
    id: "gelir-gider",
    label: "GELİR & GİDER RAPORLARI",
    items: [
      { id: "gelir-ozet", label: "Gelir Raporları", implemented: true, apiGroup: "gelir-gider" },
      { id: "gider-ozet", label: "Gider Raporları", implemented: true, apiGroup: "gelir-gider" },
      { id: "kar-zarar", label: "Gelir-gider karşılaştırma", implemented: true, apiGroup: "gelir-gider" },
    ],
  },
  {
    id: "cek-senet",
    label: "ÇEK & SENET RAPORLARI",
    items: [
      { id: "genel", label: "Genel Çek / Senet Raporları", implemented: true, apiGroup: "cek-senet", filters: { dueDays: true } },
      { id: "vadesi-gelen", label: "Vadesi Gelen Çekler / Senetler", implemented: true, apiGroup: "cek-senet", filters: { dueDays: true } },
      { id: "vadesi-gecmis-portfoy", label: "Vadesi Geçmiş Portföydeki Çek / Senetler", implemented: true, apiGroup: "cek-senet", filters: { dueDays: true } },
      { id: "karsiliksiz", label: "Karşılıksız Çek / Senetler", implemented: true, apiGroup: "cek-senet", filters: { dueDays: true } },
      { id: "bankadan-iade", label: "Bankadan İade Gelen Çek / Senetler", implemented: true, apiGroup: "cek-senet", filters: { dueDays: true } },
      { id: "alinan-iade", label: "Alınan Çek / Senetler İade Raporu", implemented: true, apiGroup: "cek-senet", filters: { dueDays: true } },
      { id: "verilen", label: "Verilen Çek / Senetler", implemented: true, apiGroup: "cek-senet", filters: { dueDays: true } },
      { id: "verilen-iade", label: "Verilen Çek / Senet İade Raporu", implemented: true, apiGroup: "cek-senet", filters: { dueDays: true } },
    ],
  },
  {
    id: "uretim",
    label: "ÜRETİM RAPORLARI",
    items: [
      { id: "uretim-emir", label: "Üretim emir raporu", implemented: true, apiGroup: "uretim" },
      { id: "malzeme-ihtiyac", label: "Malzeme ihtiyaç raporu", implemented: true, apiGroup: "uretim" },
    ],
  },
  {
    id: "maliyet",
    label: "MALİYET MUHASEBESİ RAPORLARI",
    items: [
      { id: "standart-maliyet", label: "Standart maliyet raporu", implemented: true, apiGroup: "maliyet" },
      { id: "maliyet-sapma", label: "Maliyet sapma analizi", implemented: true, apiGroup: "maliyet" },
    ],
  },
  {
    id: "muhasebe",
    label: "MUHASEBE RAPORLARI",
    items: [
      { id: "genel-mizan", label: "Genel Mizan", implemented: true, apiGroup: "muhasebe" },
      { id: "iki-tarih-mizan", label: "İki Tarih arası Mizan", implemented: true, apiGroup: "muhasebe" },
      { id: "muavin", label: "Muavin", implemented: true, apiGroup: "muhasebe" },
      { id: "bilanco", label: "Bilanço", implemented: true, apiGroup: "muhasebe", filters: { maliCompare: true } },
      { id: "gelir-tablosu", label: "Gelir Tablosu", implemented: true, apiGroup: "muhasebe", filters: { maliCompare: true } },
      { id: "nakit-akis", label: "Nakit Akış Tablosu", implemented: true, apiGroup: "muhasebe", filters: { maliCompare: true } },
      { id: "kar-zarar", label: "Kar/Zarar Tablosu", implemented: true, apiGroup: "muhasebe", filters: { maliCompare: true } },
      { id: "yevmiye-fis", label: "Yevmiye Fiş Raporları", implemented: true, apiGroup: "muhasebe" },
      { id: "muhasebelesme", label: "Muhasebeleşme Raporları", implemented: true, apiGroup: "muhasebe" },
      { id: "kdv-raporu", label: "KDV Raporu", implemented: true, apiGroup: "muhasebe" },
    ],
  },
  {
    id: "stok",
    label: "STOK RAPORLARI",
    items: [
      { id: "durum", label: "Stok durum raporu (depo bazlı)", implemented: true },
      { id: "hareket", label: "Stok hareket raporu", implemented: true },
      { id: "abc", label: "ABC analizi", implemented: true },
      { id: "kritik", label: "Kritik stok raporu", implemented: true },
      { id: "yaslandirma", label: "Stok yaşlandırma (yavaş hareket)", implemented: true },
      { id: "lot-seri", label: "Lot / Seri takip raporu", implemented: true },
      { id: "degerleme", label: "Envanter değerleme raporu", implemented: true },
      { id: "alislar", label: "Stoklara göre alışlar", implemented: true },
      { id: "satislar", label: "Stoklara göre satışlar", implemented: true },
      { id: "degisim", label: "Stok değişim raporu", implemented: true },
      { id: "devir-hizi", label: "Stok devir hızı raporu", implemented: true },
    ],
  },
  {
    id: "satis",
    label: "SATIŞ RAPORLARI",
    items: [
      { id: "genel-satis", label: "Genel Satış Raporu", implemented: true, apiGroup: "satis" },
      { id: "satis-iade", label: "İade Satış Raporu", implemented: true, apiGroup: "satis" },
      { id: "satis-tahsilat", label: "Satış Tahsilat Raporu", implemented: true, apiGroup: "satis" },
      { id: "tekrarlayan-satis", label: "Tekrarlayan Satış Raporu", implemented: true, apiGroup: "satis" },
      { id: "teklif", label: "Teklif Raporu", implemented: true, apiGroup: "satis" },
      { id: "siparis", label: "Sipariş Raporu", implemented: true, apiGroup: "satis" },
      { id: "personel-satis", label: "Personel Satış Durum Raporu", implemented: true, apiGroup: "satis" },
    ],
  },
  {
    id: "ebelge",
    label: "e-BELGE RAPORLARI",
    items: [
      { id: "gib-durum", label: "GİB Durum Özeti", implemented: true, apiGroup: "ebelge" },
      { id: "ebelge-liste", label: "e-Belge Liste", implemented: true, apiGroup: "ebelge" },
    ],
  },
  {
    id: "analytics",
    label: "ANALİTİK",
    items: [
      { id: "aylik-ozet", label: "Aylık işlem özeti", implemented: true, apiGroup: "analytics" },
      { id: "satis-trend", label: "Satış trend analizi", implemented: true, apiGroup: "analytics" },
    ],
  },
];

export function findGroup(id: string | null): ReportGroup {
  return REPORT_GROUPS.find((g) => g.id === id) ?? REPORT_GROUPS.find((g) => g.id === "stok")!;
}

export function findReport(group: ReportGroup, reportId: string | null): ReportItem {
  const found = group.items.find((i) => i.id === reportId);
  if (found) return found;
  return group.items.find((i) => i.implemented) ?? group.items[0];
}

export function groupHasImplemented(group: ReportGroup): boolean {
  return group.items.some((i) => i.implemented);
}
