import type { GibColumn, GibTableDef } from "../../kdv/config/kdv1Tables";

const AMOUNT_COLS: GibColumn[] = [
  { key: "kod", label: "Hesap / Kalem", type: "text", width: 100 },
  { key: "aciklama", label: "Açıklama", type: "text" },
  { key: "cari", label: "Cari Dönem", type: "number", width: 120 },
  { key: "onceki", label: "Önceki Dönem", type: "number", width: 120 },
  { key: "hesap", label: "Hesap", type: "account", width: 140 },
];

export function maliTablo(
  id: string,
  title: string,
  description: string,
  seed: { kod: string; aciklama: string }[],
): GibTableDef {
  return {
    id,
    title,
    description,
    kind: "grid",
    columns: AMOUNT_COLS,
    seedRows: seed.map((s) => ({ ...s, cari: 0, onceki: 0 })),
  };
}

/** Tek Düzen — Aktif özet kalemleri */
export const TDHP_AKTIF = [
  { kod: "1", aciklama: "Dönen Varlıklar" },
  { kod: "10", aciklama: "Hazır Değerler" },
  { kod: "12", aciklama: "Ticari Alacaklar" },
  { kod: "15", aciklama: "Stoklar" },
  { kod: "2", aciklama: "Duran Varlıklar" },
  { kod: "25", aciklama: "Maddi Duran Varlıklar" },
  { kod: "26", aciklama: "Maddi Olmayan Duran Varlıklar" },
];

export const TDHP_PASIF = [
  { kod: "3", aciklama: "Kısa Vadeli Yabancı Kaynaklar" },
  { kod: "32", aciklama: "Ticari Borçlar" },
  { kod: "4", aciklama: "Uzun Vadeli Yabancı Kaynaklar" },
  { kod: "5", aciklama: "Özkaynaklar" },
  { kod: "50", aciklama: "Ödenmiş Sermaye" },
  { kod: "57", aciklama: "Geçmiş Yıllar Kârları" },
  { kod: "59", aciklama: "Dönem Net Kârı (Zararı)" },
];

export const TDHP_GELIR = [
  { kod: "60", aciklama: "Brüt Satışlar" },
  { kod: "61", aciklama: "Satış İndirimleri (-)" },
  { kod: "62", aciklama: "Satışların Maliyeti (-)" },
  { kod: "63", aciklama: "Faaliyet Giderleri (-)" },
  { kod: "64", aciklama: "Diğer Faaliyetlerden Gelir/Gider" },
  { kod: "65", aciklama: "Finansman Giderleri (-)" },
  { kod: "69", aciklama: "Dönem Net Kârı / Zararı" },
];

export const BANKA_AKTIF = [
  { kod: "A1", aciklama: "Nakit Değerler ve Merkez Bankası" },
  { kod: "A2", aciklama: "Gerçeğe Uygun Değer Farkı K/Z'a Yansıtılan FV" },
  { kod: "A3", aciklama: "Bankalar" },
  { kod: "A4", aciklama: "Para Piyasalarından Alacaklar" },
  { kod: "A5", aciklama: "Krediler" },
  { kod: "A6", aciklama: "Maddi Duran Varlıklar" },
];

export const BANKA_PASIF = [
  { kod: "P1", aciklama: "Mevduat" },
  { kod: "P2", aciklama: "Para Piyasalarına Borçlar" },
  { kod: "P3", aciklama: "Alınan Krediler" },
  { kod: "P4", aciklama: "İhraç Edilen Menkul Kıymetler" },
  { kod: "P5", aciklama: "Özkaynaklar" },
];

export const BANKA_NAZIM = [
  { kod: "N1", aciklama: "Garanti ve Kefaletler" },
  { kod: "N2", aciklama: "Taahhütler" },
  { kod: "N3", aciklama: "Türev Finansal Araçlar" },
];

export const BANKA_GELIR = [
  { kod: "G1", aciklama: "Faiz Gelirleri" },
  { kod: "G2", aciklama: "Faiz Giderleri (-)" },
  { kod: "G3", aciklama: "Net Faiz Geliri/Gideri" },
  { kod: "G4", aciklama: "Net Ücret ve Komisyon Gelirleri" },
  { kod: "G5", aciklama: "Dönem Net Kârı / Zararı" },
];

export const SIGORTA_AKTIF = [
  { kod: "SA1", aciklama: "Nakit ve Nakit Benzeri Varlıklar" },
  { kod: "SA2", aciklama: "Finansal Varlıklar" },
  { kod: "SA3", aciklama: "Esas Faaliyetlerden Alacaklar" },
  { kod: "SA4", aciklama: "Maddi Duran Varlıklar" },
];

export const SIGORTA_PASIF = [
  { kod: "SP1", aciklama: "Esas Faaliyetlerden Borçlar" },
  { kod: "SP2", aciklama: "Sigortacılık Teknik Karşılıkları" },
  { kod: "SP3", aciklama: "Özkaynaklar" },
];

export const SIGORTA_GELIR = [
  { kod: "SG1", aciklama: "Yazılan Primler" },
  { kod: "SG2", aciklama: "Kazanılmamış Primler Karşılığı (-)" },
  { kod: "SG3", aciklama: "Teknik Bölüm Dengesi" },
  { kod: "SG4", aciklama: "Dönem Net Kârı / Zararı" },
];

export const KATILIM_AKTIF = [
  { kod: "KA1", aciklama: "Nakit Değerler" },
  { kod: "KA2", aciklama: "Bankalar" },
  { kod: "KA3", aciklama: "Kullandırılan Fonlar" },
  { kod: "KA4", aciklama: "Maddi Duran Varlıklar" },
];

export const KATILIM_PASIF = [
  { kod: "KP1", aciklama: "Toplanan Fonlar" },
  { kod: "KP2", aciklama: "Alınan Krediler" },
  { kod: "KP3", aciklama: "Özkaynaklar" },
];

export const KATILIM_BDH = [
  { kod: "KB1", aciklama: "Bilanço Dışı Taahhütler" },
  { kod: "KB2", aciklama: "Emanet ve Rehinli Kıymetler" },
];

export const KATILIM_GELIR = [
  { kod: "KG1", aciklama: "Kâr Payı Gelirleri" },
  { kod: "KG2", aciklama: "Kâr Payı Giderleri (-)" },
  { kod: "KG3", aciklama: "Net Kâr Payı Geliri" },
  { kod: "KG4", aciklama: "Dönem Net Kârı / Zararı" },
];

export const FK_AKTIF = [
  { kod: "FA1", aciklama: "Nakit ve Bankalar" },
  { kod: "FA2", aciklama: "Finansal Kiralama Alacakları" },
  { kod: "FA3", aciklama: "Maddi Duran Varlıklar" },
];

export const FK_PASIF = [
  { kod: "FP1", aciklama: "Alınan Krediler" },
  { kod: "FP2", aciklama: "İhraç Edilen Menkul Kıymetler" },
  { kod: "FP3", aciklama: "Özkaynaklar" },
];

export const FK_GELIR = [
  { kod: "FG1", aciklama: "Finansal Kiralama Gelirleri" },
  { kod: "FG2", aciklama: "Finansman Giderleri (-)" },
  { kod: "FG3", aciklama: "Dönem Net Kârı / Zararı" },
];

export const YF_AKTIF = [
  { kod: "YA1", aciklama: "Finansal Yatırımlar" },
  { kod: "YA2", aciklama: "Nakit ve Nakit Benzerleri" },
  { kod: "YA3", aciklama: "Diğer Alacaklar" },
];

export const YF_PASIF = [
  { kod: "YP1", aciklama: "Borçlar" },
  { kod: "YP2", aciklama: "Toplam Değer / Fon Toplamı" },
];

export const YF_GELIR = [
  { kod: "YG1", aciklama: "Faiz / Temettü Gelirleri" },
  { kod: "YG2", aciklama: "Değer Artış / Azalışları" },
  { kod: "YG3", aciklama: "Dönem Net Kârı / Zararı" },
];

export function ekBildirimGrid(id: string, title: string): GibTableDef {
  return {
    id,
    title,
    description: "GIB ek bildirim satırları.",
    kind: "grid",
    defaultRows: 2,
    columns: [
      { key: "kod", label: "Kod", type: "text", width: 90 },
      { key: "aciklama", label: "Açıklama", type: "text" },
      { key: "matrah", label: "Matrah / Tutar", type: "number", width: 120 },
      { key: "vergi", label: "Vergi / İndirim", type: "number", width: 120 },
      { key: "hesap", label: "Hesap", type: "account", width: 140 },
    ],
  };
}

export function idariForm(id: string, title: string, extra?: GibColumn[]): GibTableDef {
  return {
    id,
    title,
    kind: "form",
    fields: [
      { key: "vergi_dairesi", label: "Vergi Dairesi", type: "text" },
      { key: "vkn", label: "VKN", type: "text" },
      { key: "unvan", label: "Ünvan", type: "text" },
      {
        key: "beyanname_turu",
        label: "Beyanname Türü",
        type: "select",
        options: [
          { value: "asil", label: "Asıl" },
          { value: "duzeltme", label: "Düzeltme" },
        ],
      },
      ...(extra ?? []),
    ],
  };
}
