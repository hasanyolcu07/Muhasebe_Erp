import type { GibTableDef } from "../../kdv/config/kdv1Tables";
import { idariForm } from "../../vergi/config/maliTabloHelpers";

const KAGIT_TURU = [
  { value: "1", label: "1 — Sözleşmeler" },
  { value: "2", label: "2 — Taahhütnameler" },
  { value: "3", label: "3 — Makbuzlar" },
  { value: "4", label: "4 — Senetler" },
  { value: "5", label: "5 — Teminat mektupları" },
  { value: "6", label: "6 — Kira sözleşmeleri" },
  { value: "7", label: "7 — Diğer kağıtlar" },
];

const DUZENLEYEN: GibTableDef = {
  id: "duzenleyen",
  title: "Düzenleyen",
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
};

export const DAMGA_TABLE_DEFS: Record<string, GibTableDef> = {
  s1_1: idariForm("s1_1", "1.1 İdari Bilgiler", [
    { key: "donem_ay", label: "Dönem Ayı", type: "number", width: 100 },
    { key: "donem_yil", label: "Dönem Yılı", type: "number", width: 100 },
  ]),
  s1_2: {
    id: "s1_2",
    title: "1.2 Mükellef Bilgileri",
    kind: "form",
    fields: [
      { key: "unvan", label: "Ünvan / Ad Soyad", type: "text" },
      { key: "adres", label: "Adres", type: "text" },
      { key: "telefon", label: "Telefon", type: "text" },
      { key: "eposta", label: "E-posta", type: "text" },
      { key: "sube", label: "Şube", type: "text" },
    ],
  },
  s2_1: {
    id: "s2_1",
    title: "2.1 Bir Ay İçinde Düzenlenen Kağıtlar",
    description: "Damga vergisine tabi kağıtların tür, adet, matrah ve vergi satırları.",
    kind: "grid",
    defaultRows: 4,
    columns: [
      { key: "kagit_turu", label: "Kağıt Türü", type: "select", options: KAGIT_TURU, width: 220 },
      { key: "aciklama", label: "Açıklama", type: "text", width: 180 },
      { key: "adet", label: "Adet", type: "number", width: 80 },
      { key: "matrah", label: "Matrah", type: "number", width: 120 },
      { key: "oran", label: "Oran ‰", type: "number", width: 90 },
      { key: "vergi", label: "Vergi", type: "number", width: 120 },
      { key: "istisna", label: "İstisna", type: "number", width: 110 },
      { key: "hesap", label: "Hesap", type: "account", width: 140 },
    ],
  },
  s2_2: {
    id: "s2_2",
    title: "2.2 İstisna / İndirim",
    kind: "grid",
    defaultRows: 2,
    columns: [
      { key: "kod", label: "Kod", type: "text", width: 90 },
      { key: "aciklama", label: "Açıklama", type: "text" },
      { key: "tutar", label: "Tutar", type: "number", width: 120 },
      { key: "hesap", label: "Hesap", type: "account", width: 140 },
    ],
  },
  s2_3: {
    id: "s2_3",
    title: "2.3 Vergi Özeti",
    kind: "summary",
    fields: [
      { key: "toplam_matrah", label: "Toplam Matrah", type: "number" },
      { key: "hesaplanan_vergi", label: "Hesaplanan Damga Vergisi", type: "number" },
      { key: "istisna_toplam", label: "İstisna Toplamı", type: "number" },
      { key: "mahsup", label: "Mahsup", type: "number" },
      { key: "odenecek", label: "Ödenecek Damga Vergisi", type: "number", readOnly: true },
    ],
  },
  s3_1: { ...DUZENLEYEN, id: "s3_1", title: "3.1 Düzenleyen" },
};
