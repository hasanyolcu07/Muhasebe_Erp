import type { GibTableDef } from "./kdv1Tables";

const KDV_ORANI_OPTIONS = [
  { value: "1", label: "%1" },
  { value: "10", label: "%10" },
  { value: "20", label: "%20" },
];

const TEVKIFAT_ORANI_OPTIONS = [
  { value: "9/10", label: "9/10" },
  { value: "7/10", label: "7/10" },
  { value: "5/10", label: "5/10" },
  { value: "4/10", label: "4/10" },
  { value: "3/10", label: "3/10" },
  { value: "2/10", label: "2/10" },
  { value: "1/10", label: "1/10" },
  { value: "2/3", label: "2/3" },
  { value: "1/2", label: "1/2" },
  { value: "1/3", label: "1/3" },
];

const ISLEM_TURU_OPTIONS = [
  { value: "601", label: "601 — Yapım işleri ile ilgili işçilik bedeli" },
  { value: "602", label: "602 — Temizlik, çevre ve bahçe bakım hizmetleri" },
  { value: "603", label: "603 — Makine, teçhizat, demirbaş ve taşıtlara ait tadil, bakım ve onarım" },
  { value: "604", label: "604 — Etüt, plan-proje, danışmanlık, denetim ve benzeri hizmetler" },
  { value: "605", label: "605 — Yemek servis hizmetleri" },
  { value: "606", label: "606 — Organizasyon hizmetleri" },
  { value: "607", label: "607 — İşgücü temin hizmetleri" },
  { value: "608", label: "608 — Yapı denetim hizmetleri" },
  { value: "609", label: "609 — Fason tekstil ve konfeksiyon işleri" },
  { value: "610", label: "610 — Turistik mağazalara verilen hizmetler" },
  { value: "611", label: "611 — Reklam hizmetleri" },
  { value: "612", label: "612 — Diğer hizmetler (tam tevkifat)" },
  { value: "613", label: "613 — Diğer hizmetler (kısmi tevkifat)" },
];

export const KDV2_TABLE_DEFS: Record<string, GibTableDef> = {
  idari: {
    id: "idari",
    title: "İdari Bilgiler",
    description: "KDV2 beyannamesi dönem ve mükellef kimlik bilgileri.",
    kind: "form",
    fields: [
      { key: "vergi_dairesi", label: "Vergi Dairesi", type: "text" },
      {
        key: "donem_tipi",
        label: "Dönem Tipi",
        type: "select",
        options: [
          { value: "aylik", label: "Aylık" },
          { value: "uc_aylik", label: "Üç aylık" },
        ],
      },
      { key: "donem_ay", label: "Dönem Ay", type: "number", width: 100 },
      { key: "donem_yil", label: "Dönem Yıl", type: "number", width: 100 },
      { key: "vkn", label: "VKN", type: "text" },
      { key: "tckn", label: "TCKN", type: "text" },
      { key: "unvan", label: "Ünvan", type: "text" },
      { key: "telefon", label: "Telefon", type: "text" },
      { key: "eposta", label: "E-posta", type: "text" },
      {
        key: "beyanname_kodu",
        label: "Beyanname Kodu",
        type: "select",
        options: [
          { value: "1015B", label: "1015B" },
          { value: "9015", label: "9015" },
        ],
      },
      {
        key: "beyanname_turu",
        label: "Beyanname Türü",
        type: "select",
        options: [
          { value: "asil", label: "Asıl" },
          { value: "duzeltme", label: "Düzeltme" },
        ],
      },
    ],
  },

  mukellefler: {
    id: "mukellefler",
    title: "Kesinti Yapılan Mükellefler",
    description: "Tevkifat uygulanan satıcı / yüklenici listesi.",
    kind: "grid",
    defaultRows: 3,
    columns: [
      { key: "soyadi_unvan", label: "Soyadı / Ünvan", type: "text", width: 180 },
      { key: "adi", label: "Adı", type: "text", width: 140 },
      { key: "adres", label: "Adres", type: "text", width: 200 },
      { key: "vkn", label: "VKN", type: "text", width: 110 },
      { key: "tckn", label: "TCKN", type: "text", width: 120 },
      { key: "tevkifat_esasi_tutar", label: "Tevkifat Esası Tutar", type: "number", width: 130 },
      { key: "hesap", label: "Hesap", type: "account", width: 240 },
    ],
  },

  tam_tevkifat: {
    id: "tam_tevkifat",
    title: "Tam Tevkifat Uygulanan İşlemler",
    description: "Tam tevkifat matrah ve vergi satırları. Vergi alanı hesaplama ipucudur; kullanıcı düzenleyebilir.",
    kind: "grid",
    defaultRows: 3,
    columns: [
      { key: "islem_turu", label: "İşlem Türü", type: "select", options: ISLEM_TURU_OPTIONS, width: 280 },
      { key: "matrah", label: "Matrah", type: "number", width: 120 },
      { key: "kdv_orani", label: "KDV Oranı", type: "select", options: KDV_ORANI_OPTIONS, width: 100 },
      { key: "vergi", label: "Vergi", type: "number", width: 120 },
    ],
  },

  kismi_tevkifat: {
    id: "kismi_tevkifat",
    title: "Kısmi Tevkifat Uygulanan İşlemler",
    description: "Kısmi tevkifat oranlı işlem satırları.",
    kind: "grid",
    defaultRows: 3,
    columns: [
      { key: "islem_turu", label: "İşlem Türü", type: "select", options: ISLEM_TURU_OPTIONS, width: 280 },
      { key: "matrah", label: "Matrah", type: "number", width: 120 },
      { key: "kdv_orani", label: "KDV Oranı", type: "select", options: KDV_ORANI_OPTIONS, width: 100 },
      {
        key: "tevkifat_orani",
        label: "Tevkifat Oranı",
        type: "select",
        options: TEVKIFAT_ORANI_OPTIONS,
        width: 110,
      },
      { key: "vergi", label: "Vergi", type: "number", width: 120 },
    ],
  },

  indirilecek: {
    id: "indirilecek",
    title: "İndirilecek KDV",
    description: "Bu dönem indirilecek KDV ve önceki dönemden devreden tutarlar.",
    kind: "summary",
    fields: [
      { key: "bu_donem_indirilecek_kdv", label: "Bu Dönem İndirilecek KDV", type: "number" },
      { key: "onceki_devreden", label: "Önceki Dönemden Devreden", type: "number" },
      { key: "toplam", label: "Toplam İndirilecek KDV", type: "number", readOnly: true },
    ],
  },

  vergi_ozet: {
    id: "vergi_ozet",
    title: "Vergi Bildirimi Özeti",
    description: "Tam / kısmi tevkifat ve indirilecek KDV özetinden ödenecek KDV.",
    kind: "summary",
    fields: [
      { key: "tam_tevkifat_toplam", label: "Tam Tevkifat Toplamı", type: "number", readOnly: true },
      { key: "kismi_tevkifat_toplam", label: "Kısmi Tevkifat Toplamı", type: "number", readOnly: true },
      { key: "indirilecek_toplam", label: "İndirilecek KDV Toplamı", type: "number", readOnly: true },
      { key: "odenecek_kdv", label: "Ödenecek KDV", type: "number", readOnly: true },
    ],
  },

  duzenleyen: {
    id: "duzenleyen",
    title: "Düzenleme Bilgileri",
    description: "Beyannameyi düzenleyen kişi / meslek mensubu bilgileri.",
    kind: "form",
    fields: [
      { key: "duzenleyen_adi", label: "Düzenleyen Adı", type: "text" },
      {
        key: "unvan_sifat",
        label: "Ünvan / Sıfat",
        type: "select",
        options: [
          { value: "mukellef", label: "Mükellef" },
          { value: "sm", label: "SM" },
          { value: "ymm", label: "YMM" },
        ],
      },
      { key: "tckn", label: "TCKN", type: "text" },
      { key: "oda_no", label: "Oda No", type: "text" },
      { key: "telefon", label: "Telefon", type: "text" },
      { key: "tarih", label: "Tarih", type: "text" },
    ],
  },
};

export function getKdv2TableDef(menuId: string): GibTableDef | undefined {
  return KDV2_TABLE_DEFS[menuId];
}

