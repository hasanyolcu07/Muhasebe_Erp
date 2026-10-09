import type { GibTableDef } from "../../kdv/config/kdv1Tables";
import { idariForm } from "../../vergi/config/maliTabloHelpers";

/** Örnek TDHP satırları — Veri Al ile doldurulur */
export const DEFAULT_MIZAN_SEED: Record<string, string | number>[] = [
  { hesap_kodu: "100", aciklama: "Kasa", borc_toplam: 0, alacak_toplam: 0, borc_kalan: 0, alacak_kalan: 0 },
  { hesap_kodu: "102", aciklama: "Bankalar", borc_toplam: 0, alacak_toplam: 0, borc_kalan: 0, alacak_kalan: 0 },
  { hesap_kodu: "120", aciklama: "Alıcılar", borc_toplam: 0, alacak_toplam: 0, borc_kalan: 0, alacak_kalan: 0 },
  { hesap_kodu: "153", aciklama: "Ticari Mallar", borc_toplam: 0, alacak_toplam: 0, borc_kalan: 0, alacak_kalan: 0 },
  { hesap_kodu: "320", aciklama: "Satıcılar", borc_toplam: 0, alacak_toplam: 0, borc_kalan: 0, alacak_kalan: 0 },
  { hesap_kodu: "360", aciklama: "Ödenecek Vergi ve Fonlar", borc_toplam: 0, alacak_toplam: 0, borc_kalan: 0, alacak_kalan: 0 },
  { hesap_kodu: "500", aciklama: "Sermaye", borc_toplam: 0, alacak_toplam: 0, borc_kalan: 0, alacak_kalan: 0 },
  { hesap_kodu: "600", aciklama: "Yurt İçi Satışlar", borc_toplam: 0, alacak_toplam: 0, borc_kalan: 0, alacak_kalan: 0 },
  { hesap_kodu: "770", aciklama: "Genel Yönetim Giderleri", borc_toplam: 0, alacak_toplam: 0, borc_kalan: 0, alacak_kalan: 0 },
];

/** Canlı hesap planından örnek genişletilmiş mizan (demo Veri Al) */
export function buildMizanFromAccounts(): Record<string, string | number>[] {
  const extra = [
    { hesap_kodu: "101", aciklama: "Alınan Çekler", borc: 12500, alacak: 0 },
    { hesap_kodu: "108", aciklama: "Diğer Hazır Değerler", borc: 3200, alacak: 0 },
    { hesap_kodu: "121", aciklama: "Alacak Senetleri", borc: 48000, alacak: 0 },
    { hesap_kodu: "150", aciklama: "İlk Madde ve Malzeme", borc: 95000, alacak: 0 },
    { hesap_kodu: "191", aciklama: "İndirilecek KDV", borc: 18450, alacak: 0 },
    { hesap_kodu: "255", aciklama: "Demirbaşlar", borc: 210000, alacak: 45000 },
    { hesap_kodu: "300", aciklama: "Banka Kredileri", borc: 0, alacak: 75000 },
    { hesap_kodu: "391", aciklama: "Hesaplanan KDV", borc: 0, alacak: 22300 },
    { hesap_kodu: "570", aciklama: "Geçmiş Yıllar Kârları", borc: 0, alacak: 120000 },
    { hesap_kodu: "622", aciklama: "Satılan Ticari Mallar Maliyeti", borc: 310000, alacak: 0 },
  ];
  return [
    ...DEFAULT_MIZAN_SEED.map((r, i) => {
      const b = (i + 1) * 1500;
      const a = i % 3 === 0 ? (i + 1) * 800 : 0;
      const net = b - a;
      return {
        ...r,
        borc_toplam: b,
        alacak_toplam: a,
        borc_kalan: net > 0 ? net : 0,
        alacak_kalan: net < 0 ? -net : 0,
      };
    }),
    ...extra.map((e) => {
      const net = e.borc - e.alacak;
      return {
        hesap_kodu: e.hesap_kodu,
        aciklama: e.aciklama,
        borc_toplam: e.borc,
        alacak_toplam: e.alacak,
        borc_kalan: net > 0 ? net : 0,
        alacak_kalan: net < 0 ? -net : 0,
      };
    }),
  ].sort((a, b) => String((a as any).hesap_kodu ?? "").localeCompare(String((b as any).hesap_kodu ?? "")));
}

export function makeMizanTableDef(seed: Record<string, string | number>[]): GibTableDef {
  return {
    id: "s2_1",
    title: "2.1 Kesin Mizan Tablosu",
    description: "Hesap kodu, açıklama, borç/alacak toplam ve kalan kolonları. Veri Al ile doldurulur.",
    kind: "grid",
    columns: [
      { key: "hesap_kodu", label: "Hesap Kodu", type: "text", width: 100 },
      { key: "aciklama", label: "Açıklama", type: "text", width: 220 },
      { key: "borc_toplam", label: "Borç Toplam", type: "number", width: 120 },
      { key: "alacak_toplam", label: "Alacak Toplam", type: "number", width: 120 },
      { key: "borc_kalan", label: "Borç Kalan", type: "number", width: 110 },
      { key: "alacak_kalan", label: "Alacak Kalan", type: "number", width: 110 },
      { key: "hesap", label: "Hesap", type: "account", width: 140 },
    ],
    seedRows: seed,
  };
}

export const KESIN_MIZAN_STATIC_DEFS: Record<string, GibTableDef> = {
  s1_1: idariForm("s1_1", "1.1 İdari Bilgiler", [
    { key: "donem_yil", label: "Yıl", type: "number", width: 100 },
  ]),
  s1_2: {
    id: "s1_2",
    title: "1.2 Dönem / Defter Bilgileri",
    kind: "form",
    fields: [
      {
        key: "defter_turu",
        label: "Defter Türü",
        type: "select",
        options: [
          { value: "bilanco", label: "Bilanço Esası" },
          { value: "isletme", label: "İşletme Hesabı" },
        ],
      },
      { key: "baslangic", label: "Dönem Başlangıç", type: "text" },
      { key: "bitis", label: "Dönem Bitiş", type: "text" },
      { key: "sube", label: "Şube", type: "text" },
      {
        key: "kayit_turu",
        label: "Kayıt Türü",
        type: "select",
        options: [
          { value: "R", label: "Resmi (R)" },
          { value: "GR", label: "Gayri Resmi (GR)" },
        ],
      },
    ],
  },
  s3_1: {
    id: "s3_1",
    title: "3.1 Düzenleyen",
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
};
