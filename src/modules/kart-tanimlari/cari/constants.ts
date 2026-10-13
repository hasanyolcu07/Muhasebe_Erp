export type CariTabId =
  | "genel"
  | "ticari"
  | "yetkili"
  | "bakiye"
  | "banka"
  | "sube"
  | "gib"
  | "belge"
  | "not"
  | "risk"
  | "param"
  | "ozel"
  | "tasarim"
  | "entegrasyon";

export type CariTabDef = {
  id: CariTabId;
  index: number;
  label: string;
  icon: string;
  accent?: string;
};

/** 14 sekme — LogoConnect & EDI yok; 14. sekme Entegrasyonlar */
export const CARI_TABS: CariTabDef[] = [
  { id: "genel", index: 1, label: "Genel & İletişim Bilgileri", icon: "📋" },
  { id: "ticari", index: 2, label: "Ticari & İskonto", icon: "📌" },
  { id: "yetkili", index: 3, label: "İrtibat & Yetkili Kişiler", icon: "👥" },
  { id: "bakiye", index: 4, label: "Başlangıç Bakiyesi", icon: "💰" },
  { id: "banka", index: 5, label: "Banka & IBAN Listesi", icon: "🏛️" },
  { id: "sube", index: 6, label: "Şubeler & Adresler", icon: "🏢" },
  { id: "gib", index: 7, label: "GİB Posta Kutuları", icon: "🔢" },
  { id: "belge", index: 8, label: "Sözleşme & Doküman", icon: "📂" },
  { id: "not", index: 9, label: "Tarihçe Notları", icon: "📝" },
  { id: "risk", index: 10, label: "Risk Bilgileri & Limitler", icon: "🛡️", accent: "#b91c1c" },
  { id: "param", index: 11, label: "Parametreler & Vade", icon: "⚙️", accent: "#2563eb" },
  { id: "ozel", index: 12, label: "Özel Kodlar & Gönderim", icon: "🏷️" },
  { id: "tasarim", index: 13, label: "Form Tasarımları", icon: "📐" },
  { id: "entegrasyon", index: 14, label: "Entegrasyonlar (e-ticaret, CRM vb.)", icon: "🔗" },
];

export const BLOCK_ACTIONS = [
  { value: "CONTINUE", label: "İşleme Devam Edilecek" },
  { value: "WARN", label: "Kullanıcı Uyarılarak Devam" },
  { value: "STOP", label: "İşlem Durdurulacak" },
] as const;

export const ACCOUNT_TYPES = [
  { value: "MUSTERI_TEDARIKCI", label: "Müşteri-Tedarikçi" },
  { value: "ALICI", label: "Alıcı" },
  { value: "SATICI", label: "Satıcı" },
] as const;

export const OPENING_SIDES = [
  { value: "BORC", label: "Borç" },
  { value: "ALACAK", label: "Alacak" },
] as const;
