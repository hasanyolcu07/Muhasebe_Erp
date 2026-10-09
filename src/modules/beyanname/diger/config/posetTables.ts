import type { GibTableDef } from "../../kdv/config/kdv1Tables";
import { idariForm } from "../../vergi/config/maliTabloHelpers";

const URUN_KODU = [
  { value: "PP", label: "PP — Plastik poşet" },
  { value: "AM", label: "AM — Ambalaj" },
  { value: "EL", label: "EL — Elektrikli / elektronik" },
  { value: "AK", label: "AK — Akü / pil" },
  { value: "YG", label: "YG — Yağ" },
  { value: "DG", label: "DG — Diğer GEKAP ürünü" },
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

export const POSET_TABLE_DEFS: Record<string, GibTableDef> = {
  s1_1: idariForm("s1_1", "1.1 İdari Bilgiler", [
    { key: "donem_ay", label: "Dönem Ayı", type: "number", width: 100 },
    { key: "donem_yil", label: "Dönem Yılı", type: "number", width: 100 },
  ]),
  s1_2: {
    id: "s1_2",
    title: "1.2 Mükellef Bilgileri",
    kind: "form",
    fields: [
      { key: "unvan", label: "Ünvan", type: "text" },
      { key: "adres", label: "Adres", type: "text" },
      { key: "telefon", label: "Telefon", type: "text" },
      { key: "eposta", label: "E-posta", type: "text" },
      {
        key: "faaliyet",
        label: "Faaliyet Türü",
        type: "select",
        options: [
          { value: "uretici", label: "Üretici" },
          { value: "ithalatci", label: "İthalatçı" },
          { value: "satici", label: "Satıcı / Dağıtıcı" },
        ],
      },
    ],
  },
  s2_1: {
    id: "s2_1",
    title: "2.1 Poşet Satış / Dağıtım",
    description: "Plastik poşet adet, birim bedel ve GEKAP tutarları.",
    kind: "grid",
    defaultRows: 3,
    columns: [
      { key: "poset_turu", label: "Poşet Türü", type: "text", width: 140 },
      { key: "adet", label: "Adet", type: "number", width: 90 },
      { key: "birim_bedel", label: "Birim Bedel", type: "number", width: 110 },
      { key: "toplam_bedel", label: "Toplam Bedel", type: "number", width: 120 },
      { key: "gekap_tutari", label: "GEKAP Tutarı", type: "number", width: 120 },
      { key: "hesap", label: "Hesap", type: "account", width: 140 },
    ],
  },
  s2_2: {
    id: "s2_2",
    title: "2.2 Poşet Özeti",
    kind: "summary",
    fields: [
      { key: "toplam_adet", label: "Toplam Adet", type: "number" },
      { key: "toplam_bedel", label: "Toplam Bedel", type: "number" },
      { key: "toplam_gekap", label: "Toplam GEKAP", type: "number" },
    ],
  },
  s3_1: {
    id: "s3_1",
    title: "3.1 Diğer Ürünlere İlişkin GEKAP Bildirimleri",
    description: "Poşet dışındaki GEKAP kapsamı ürün bildirimleri.",
    kind: "grid",
    defaultRows: 3,
    columns: [
      { key: "urun_kodu", label: "Ürün Kodu", type: "select", options: URUN_KODU, width: 200 },
      { key: "aciklama", label: "Açıklama", type: "text", width: 160 },
      { key: "miktar", label: "Miktar", type: "number", width: 90 },
      { key: "birim", label: "Birim", type: "text", width: 80 },
      { key: "matrah", label: "Matrah", type: "number", width: 110 },
      { key: "gekap_tutari", label: "GEKAP Tutarı", type: "number", width: 120 },
      { key: "hesap", label: "Hesap", type: "account", width: 140 },
    ],
  },
  s4_1: {
    id: "s4_1",
    title: "4.1 İstisnalar",
    kind: "grid",
    defaultRows: 2,
    columns: [
      { key: "kod", label: "İstisna Kodu", type: "text", width: 110 },
      { key: "aciklama", label: "Açıklama", type: "text" },
      { key: "tutar", label: "Tutar", type: "number", width: 120 },
      { key: "hesap", label: "Hesap", type: "account", width: 140 },
    ],
  },
  s4_2: {
    id: "s4_2",
    title: "4.2 Mahsup İşlemleri",
    kind: "grid",
    defaultRows: 2,
    columns: [
      { key: "belge_no", label: "Belge No", type: "text", width: 110 },
      { key: "aciklama", label: "Açıklama", type: "text" },
      { key: "tutar", label: "Mahsup Tutarı", type: "number", width: 120 },
      { key: "hesap", label: "Hesap", type: "account", width: 140 },
    ],
  },
  s4_3: {
    id: "s4_3",
    title: "4.3 Ödenecek / İade",
    kind: "summary",
    fields: [
      { key: "hesaplanan", label: "Hesaplanan GEKAP", type: "number" },
      { key: "istisna", label: "İstisna Toplamı", type: "number" },
      { key: "mahsup", label: "Mahsup Toplamı", type: "number" },
      { key: "odenecek", label: "Ödenecek", type: "number", readOnly: true },
      { key: "iade", label: "İade", type: "number", readOnly: true },
    ],
  },
  s5_1: { ...DUZENLEYEN, id: "s5_1", title: "5.1 Düzenleyen" },
};
