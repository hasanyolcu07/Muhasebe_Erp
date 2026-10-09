import type { GibTableDef } from "../../kdv/config/kdv1Tables";
import { ekBildirimGrid, idariForm } from "../../vergi/config/maliTabloHelpers";

const KDV_ORANI = [
  { value: "1", label: "%1" },
  { value: "10", label: "%10" },
  { value: "20", label: "%20" },
];

const TEVKIFAT_ORANI = [
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

/** GİB KDV tevkifat işlem türleri */
export const ISLEM_TURU_OPTIONS = [
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
  { value: "614", label: "614 — İsteğe bağlı tevkifat" },
];

export const KDV_TEVKIFAT_TABLE_DEFS: Record<string, GibTableDef> = {
  s1_1: idariForm("s1_1", "1.1 İdari Bilgiler", [
    { key: "donem_ay", label: "Dönem Ayı", type: "number", width: 100 },
    { key: "donem_yil", label: "Dönem Yılı", type: "number", width: 100 },
    {
      key: "beyanname_kodu",
      label: "Beyanname Kodu",
      type: "select",
      options: [
        { value: "1015", label: "1015" },
        { value: "1015B", label: "1015B" },
      ],
    },
  ]),
  s2_1: {
    id: "s2_1",
    title: "2.1 Kesinti Yapılan Satıcılar",
    description: "Tevkifat uygulanan satıcı / yüklenici listesi.",
    kind: "grid",
    defaultRows: 3,
    columns: [
      { key: "soyadi_unvan", label: "Soyadı / Ünvan", type: "text", width: 160 },
      { key: "adi", label: "Adı", type: "text", width: 120 },
      { key: "vkn", label: "VKN", type: "text", width: 110 },
      { key: "tckn", label: "TCKN", type: "text", width: 120 },
      { key: "adres", label: "Adres", type: "text", width: 180 },
      { key: "tevkifat_esasi", label: "Tevkifat Esası", type: "number", width: 120 },
      { key: "hesap", label: "Hesap", type: "account", width: 140 },
    ],
  },
  s3_1: {
    id: "s3_1",
    title: "3.1 Tam Tevkifat",
    description: "Tam tevkifat uygulanan işlemler — işlem türü seçimi zorunlu.",
    kind: "grid",
    defaultRows: 3,
    columns: [
      { key: "islem_turu", label: "İşlem Türü", type: "select", options: ISLEM_TURU_OPTIONS, width: 280 },
      { key: "satici_vkn", label: "Satıcı VKN", type: "text", width: 110 },
      { key: "matrah", label: "Matrah", type: "number", width: 120 },
      { key: "kdv_orani", label: "KDV Oranı", type: "select", options: KDV_ORANI, width: 100 },
      { key: "vergi", label: "Vergi", type: "number", width: 120 },
      { key: "hesap", label: "Hesap", type: "account", width: 140 },
    ],
  },
  s3_2: {
    id: "s3_2",
    title: "3.2 Kısmi Tevkifat",
    description: "Kısmi tevkifat oranlı işlem satırları.",
    kind: "grid",
    defaultRows: 3,
    columns: [
      { key: "islem_turu", label: "İşlem Türü", type: "select", options: ISLEM_TURU_OPTIONS, width: 280 },
      { key: "satici_vkn", label: "Satıcı VKN", type: "text", width: 110 },
      { key: "matrah", label: "Matrah", type: "number", width: 120 },
      { key: "kdv_orani", label: "KDV Oranı", type: "select", options: KDV_ORANI, width: 100 },
      {
        key: "tevkifat_orani",
        label: "Tevkifat Oranı",
        type: "select",
        options: TEVKIFAT_ORANI,
        width: 110,
      },
      { key: "vergi", label: "Vergi", type: "number", width: 120 },
      { key: "hesap", label: "Hesap", type: "account", width: 140 },
    ],
  },
  s3_3: {
    id: "s3_3",
    title: "3.3 İsteğe Bağlı Tevkifat",
    description: "İsteğe bağlı tevkifat uygulanan işlemler.",
    kind: "grid",
    defaultRows: 2,
    columns: [
      { key: "islem_turu", label: "İşlem Türü", type: "select", options: ISLEM_TURU_OPTIONS, width: 280 },
      { key: "satici_vkn", label: "Satıcı VKN", type: "text", width: 110 },
      { key: "matrah", label: "Matrah", type: "number", width: 120 },
      { key: "kdv_orani", label: "KDV Oranı", type: "select", options: KDV_ORANI, width: 100 },
      {
        key: "tevkifat_orani",
        label: "Tevkifat Oranı",
        type: "select",
        options: TEVKIFAT_ORANI,
        width: 110,
      },
      { key: "vergi", label: "Vergi", type: "number", width: 120 },
      { key: "hesap", label: "Hesap", type: "account", width: 140 },
    ],
  },
  s3_4: {
    id: "s3_4",
    title: "3.4 Vergi Özeti",
    kind: "summary",
    fields: [
      { key: "tam_toplam", label: "Tam Tevkifat Toplamı", type: "number" },
      { key: "kismi_toplam", label: "Kısmi Tevkifat Toplamı", type: "number" },
      { key: "istege_toplam", label: "İsteğe Bağlı Toplam", type: "number" },
      { key: "mahsup", label: "Mahsup", type: "number" },
      { key: "odenecek", label: "Ödenecek KDV", type: "number", readOnly: true },
    ],
  },
  s4_1: {
    id: "s4_1",
    title: "4.1 Düzenleyen",
    kind: "form",
    fields: [
      { key: "adi_soyadi", label: "Adı Soyadı", type: "text" },
      {
        key: "sifat",
        label: "Sıfat",
        type: "select",
        options: [
          { value: "mukellef", label: "Mükellef" },
          { value: "sm", label: "SM" },
          { value: "smmm", label: "SMMM" },
          { value: "ymm", label: "YMM" },
        ],
      },
      { key: "tckn", label: "TCKN", type: "text" },
      { key: "oda_no", label: "Oda Sicil No", type: "text" },
      { key: "telefon", label: "Telefon", type: "text" },
      { key: "tarih", label: "Tarih", type: "text" },
    ],
  },
  s5_1: ekBildirimGrid("s5_1", "5.1 Ek Bildirimler"),
};
