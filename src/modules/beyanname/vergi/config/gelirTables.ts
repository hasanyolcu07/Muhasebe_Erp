import type { GibTableDef } from "../../kdv/config/kdv1Tables";
import {
  TDHP_AKTIF,
  TDHP_GELIR,
  TDHP_PASIF,
  ekBildirimGrid,
  idariForm,
  maliTablo,
} from "./maliTabloHelpers";

function kazancGrid(id: string, title: string): GibTableDef {
  return {
    id,
    title,
    kind: "grid",
    defaultRows: 2,
    columns: [
      { key: "aciklama", label: "Açıklama / Kaynak", type: "text" },
      { key: "gayrisafi", label: "Gayrisafi Hasılat", type: "number", width: 120 },
      { key: "gider", label: "Giderler", type: "number", width: 110 },
      { key: "matrah", label: "Kazanç / Matrah", type: "number", width: 120 },
      { key: "hesap", label: "Hesap", type: "account", width: 140 },
    ],
  };
}

export const GELIR_TABLE_DEFS: Record<string, GibTableDef> = {
  s1_1: idariForm("s1_1", "1.1 İdari Bilgiler", [
    { key: "donem_yil", label: "Yıl", type: "number", width: 100 },
  ]),
  s1_2: {
    id: "s1_2",
    title: "1.2 Mükellef / Aile Bilgileri",
    kind: "form",
    fields: [
      { key: "tckn", label: "TCKN", type: "text" },
      { key: "ad_soyad", label: "Adı Soyadı", type: "text" },
      { key: "es_tckn", label: "Eş TCKN", type: "text" },
      {
        key: "beyan_sekli",
        label: "Beyan Şekli",
        type: "select",
        options: [
          { value: "bireysel", label: "Bireysel" },
          { value: "birlikte", label: "Birlikte" },
        ],
      },
      {
        key: "kazanc_tespit",
        label: "Kazanç Tespit",
        type: "select",
        options: [
          { value: "bilanco", label: "Bilanço" },
          { value: "isletme", label: "İşletme Hesabı" },
          { value: "basit", label: "Basit Usul" },
        ],
      },
    ],
  },
  s2_1: kazancGrid("s2_1", "2.1 Ticari Kazanç"),
  s2_2: kazancGrid("s2_2", "2.2 Zirai Kazanç"),
  s2_3: kazancGrid("s2_3", "2.3 Serbest Meslek Kazancı"),
  s2_4: {
    id: "s2_4",
    title: "2.4 Ücretler",
    kind: "grid",
    defaultRows: 2,
    columns: [
      { key: "isveren", label: "İşveren / Kurum", type: "text" },
      { key: "brut", label: "Brüt Ücret", type: "number", width: 110 },
      { key: "gv_kesinti", label: "GV Kesintisi", type: "number", width: 110 },
      { key: "net", label: "Net", type: "number", width: 100 },
    ],
  },
  s2_5: kazancGrid("s2_5", "2.5 Gayrimenkul Sermaye İradı"),
  s2_6: kazancGrid("s2_6", "2.6 Menkul Sermaye İradı"),
  s2_7: kazancGrid("s2_7", "2.7 Diğer Kazanç ve İratlar"),
  s2_8: {
    id: "s2_8",
    title: "2.8 Kazançlar Toplamı",
    kind: "summary",
    fields: [
      { key: "ticari", label: "Ticari", type: "number" },
      { key: "zirai", label: "Zirai", type: "number" },
      { key: "sm", label: "Serbest Meslek", type: "number" },
      { key: "ucret", label: "Ücret", type: "number" },
      { key: "gmsi", label: "GMSİ", type: "number" },
      { key: "msi", label: "Menkul", type: "number" },
      { key: "diger", label: "Diğer", type: "number" },
      { key: "toplam", label: "Toplam Kazanç", type: "number" },
    ],
  },
  s3_1: ekBildirimGrid("s3_1", "3.1 Şahıs Sigorta / BES"),
  s3_2: ekBildirimGrid("s3_2", "3.2 Eğitim / Sağlık"),
  s3_3: ekBildirimGrid("s3_3", "3.3 Bağış ve Yardımlar"),
  s3_4: ekBildirimGrid("s3_4", "3.4 Diğer İndirimler"),
  s4_1: ekBildirimGrid("s4_1", "4.1 Kazanç İstisnaları"),
  s4_2: ekBildirimGrid("s4_2", "4.2 Ücret İstisnaları"),
  s5_1: {
    id: "s5_1",
    title: "5.1 Gelir Vergisi Matrahı",
    kind: "summary",
    fields: [
      { key: "toplam_kazanc", label: "Toplam Kazanç", type: "number" },
      { key: "indirimler", label: "İndirimler (-)", type: "number" },
      { key: "istisnalar", label: "İstisnalar (-)", type: "number" },
      { key: "matrah", label: "GV Matrahı", type: "number" },
    ],
  },
  s5_2: {
    id: "s5_2",
    title: "5.2 Hesaplanan Vergi",
    kind: "summary",
    fields: [
      { key: "hesaplanan", label: "Hesaplanan Gelir Vergisi", type: "number" },
      { key: "asgari", label: "Asgari Geçim / Diğer", type: "number" },
    ],
  },
  s5_3: ekBildirimGrid("s5_3", "5.3 Mahsuplar"),
  s5_4: {
    id: "s5_4",
    title: "5.4 Ödenecek / İade",
    kind: "summary",
    fields: [
      { key: "odenecek", label: "Ödenecek GV", type: "number" },
      { key: "iade", label: "İade", type: "number" },
    ],
  },
  bil_aktif: maliTablo("bil_aktif", "6.1 Ayrıntılı Bilanço — Aktif", "Aktif kalemler.", TDHP_AKTIF),
  bil_pasif: maliTablo("bil_pasif", "6.2 Ayrıntılı Bilanço — Pasif", "Pasif kalemler.", TDHP_PASIF),
  bil_dipnot: {
    id: "bil_dipnot",
    title: "6.3 Dipnot",
    kind: "form",
    fields: [{ key: "dipnot", label: "Dipnot / Açıklamalar", type: "text" }],
  },
  bil_gt: maliTablo("bil_gt", "6.4 Gelir Tablosu", "Gelir tablosu kalemleri.", TDHP_GELIR),
  bil_basit: {
    id: "bil_basit",
    title: "6.5 Basit Usul Özeti",
    kind: "summary",
    fields: [
      { key: "hasilat", label: "Hasılat", type: "number" },
      { key: "gider", label: "Giderler", type: "number" },
      { key: "kazanc", label: "Basit Usul Kazancı", type: "number" },
    ],
  },
  bil_isletme: {
    id: "bil_isletme",
    title: "6.6 İşletme Hesabı Özeti",
    kind: "summary",
    fields: [
      { key: "donem_basi", label: "Dönem Başı Emtea", type: "number" },
      { key: "alimlar", label: "Alımlar", type: "number" },
      { key: "donem_sonu", label: "Dönem Sonu Emtea", type: "number" },
      { key: "satislar", label: "Satışlar", type: "number" },
      { key: "giderler", label: "Giderler", type: "number" },
      { key: "kar", label: "Kâr / Zarar", type: "number" },
    ],
  },
  s7_1: {
    id: "s7_1",
    title: "7.1 SM / SMMM Bilgileri",
    kind: "form",
    fields: [
      { key: "adi", label: "Adı Soyadı", type: "text" },
      {
        key: "sifat",
        label: "Sıfat",
        type: "select",
        options: [
          { value: "sm", label: "SM" },
          { value: "smmm", label: "SMMM" },
          { value: "ymm", label: "YMM" },
        ],
      },
      { key: "oda_no", label: "Oda Sicil No", type: "text" },
      { key: "tckn", label: "TCKN", type: "text" },
      { key: "tarih", label: "Tarih", type: "text" },
    ],
  },
};
