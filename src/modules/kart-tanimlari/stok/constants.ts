export const STOCK_TYPES = [
  { value: "TICARI_MAL", label: "Ticari Mal" },
  { value: "HAMMADDE", label: "Hammadde" },
  { value: "MAMUL", label: "Mamul" },
  { value: "HIZMET", label: "Hizmet" },
  { value: "DEMIRBAS", label: "Demirbaş" },
] as const;

export const PRICE_LIST_TYPES = [
  { value: "PERAKENDE", label: "Perakende" },
  { value: "TOPTAN", label: "Toptan" },
  { value: "BAYI", label: "Bayi" },
  { value: "IHRACAT", label: "İhracat" },
] as const;

export type StokMainMode = "stok" | "fiyat";
export type StokTabId =
  | "stok-temel"
  | "stok-muhasebe"
  | "stok-birim-set"
  | "stok-parametreler"
  | "stok-tedarikci"
  | "stok-depo"
  | "stok-ozet";
export type FiyatTabId = "fl-bilgiler" | "fl-coklu" | "fl-yetkiler";

export const STOK_TABS: { id: StokTabId; label: string }[] = [
  { id: "stok-temel", label: "📋 Temel Bilgiler" },
  { id: "stok-muhasebe", label: "🏛️ Muhasebe Kodları" },
  { id: "stok-birim-set", label: "📐 Birim Seti & Barkod" },
  { id: "stok-parametreler", label: "⚙️ Stok Parametreleri & Raf" },
  { id: "stok-tedarikci", label: "🏢 Tedarikçiler" },
  { id: "stok-depo", label: "🏭 Depo & Lot Atama" },
  { id: "stok-ozet", label: "📊 Stok & Lot Özeti" },
];

export const FIYAT_TABS: { id: FiyatTabId; label: string }[] = [
  { id: "fl-bilgiler", label: "📋 Fiyat Liste Bilgileri" },
  { id: "fl-coklu", label: "🏢 Çoklu Müşteri/Tedarikçi & Grup Matrisi" },
  { id: "fl-yetkiler", label: "🔒 Kullanıcı Yetkileri" },
];
