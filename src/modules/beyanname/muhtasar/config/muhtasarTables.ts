import type { GibTableDef } from "../../kdv/config/kdv1Tables";

const ODEME_TURU_OPTIONS = [
  { value: "011", label: "011 — Ücret ödemeleri" },
  { value: "012", label: "012 — Asgari ücret" },
  { value: "013", label: "013 — Diğer ücretler" },
  { value: "021", label: "021 — Serbest meslek ödemeleri" },
  { value: "031", label: "031 — Kira ödemeleri" },
  { value: "041", label: "041 — Yıllara yaygın inşaat" },
  { value: "051", label: "051 — Menkul sermaye iradı" },
  { value: "061", label: "061 — Diğer ödemeler" },
];

const DONEM_TIPI = [
  { value: "aylik", label: "Aylık" },
  { value: "uc_aylik", label: "Üç aylık" },
];

const BELGE_MAHIYET = [
  { value: "A", label: "Asıl" },
  { value: "E", label: "Ek" },
  { value: "I", label: "İptal" },
];

const TAHAKKUK_NEDEN = [
  { value: "A", label: "A — Yasal süresinde verilme" },
  { value: "B", label: "B — Resen / idarece tarh" },
  { value: "C", label: "C — İdari para cezası" },
  { value: "F", label: "F — Ücret farkı / ek ödeme" },
];

/** Ortak GIB tablo tanımları — 1003A / 1003B menü id’leri ile eşleşir */
export function buildMuhtasarTableDefs(opts?: {
  wageFocused?: boolean;
}): Record<string, GibTableDef> {
  const wage = opts?.wageFocused === true;
  return {
    s1_1: {
      id: "s1_1",
      title: "1.1 İdari Bilgiler",
      description: "Vergi dairesi, dönem ve şube bilgileri.",
      kind: "form",
      fields: [
        { key: "vergi_dairesi", label: "Vergi Dairesi", type: "text" },
        { key: "donem_tipi", label: "Dönem Tipi", type: "select", options: DONEM_TIPI },
        { key: "donem_ay", label: "Ay", type: "number", width: 80 },
        { key: "donem_yil", label: "Yıl", type: "number", width: 100 },
        { key: "sube_no", label: "Şube No", type: "text" },
        {
          key: "beyanname_kodu",
          label: "Beyanname Kodu",
          type: "select",
          options: wage
            ? [
                { value: "1003B", label: "1003B" },
                { value: "0095", label: "0095 (ücret)" },
              ]
            : [
                { value: "1003A", label: "1003A" },
                { value: "0003", label: "0003 (stopaj)" },
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
    s1_2: {
      id: "s1_2",
      title: "1.2 Vergi Sorumlusu",
      kind: "form",
      fields: [
        { key: "vkn", label: "VKN", type: "text" },
        { key: "tckn", label: "TCKN", type: "text" },
        { key: "soyadi_unvan", label: "Soyadı / Ünvan", type: "text" },
        { key: "adi", label: "Adı / Ünvan Devamı", type: "text" },
        { key: "eposta", label: "E-posta", type: "text" },
        { key: "telefon", label: "İrtibat Telefon", type: "text" },
      ],
    },
    s2_1: {
      id: "s2_1",
      title: wage ? "2.1 Ücret Matrah / Vergi Bildirimi" : "2.1 Matrah ve Vergi Bildirimi",
      description: wage
        ? "Ücret ödemelerine ilişkin kesinti satırları (ödeme türü kodu)."
        : "Ödeme türü koduna göre toplu kesinti beyanı.",
      kind: "grid",
      defaultRows: 4,
      columns: [
        { key: "odeme_turu", label: "Ödeme Türü", type: "select", options: ODEME_TURU_OPTIONS, width: 220 },
        { key: "gayrisafi_tutar", label: "Gayrisafi Tutar", type: "number", width: 120 },
        { key: "matrah", label: "Matrah", type: "number", width: 120 },
        { key: "vergi", label: "Kesilen Vergi", type: "number", width: 120 },
        { key: "hesap", label: "Hesap", type: "account", width: 160 },
      ],
    },
    s2_2: {
      id: "s2_2",
      title: "2.2 Mahsup Edilen Vergiler",
      kind: "grid",
      defaultRows: 2,
      columns: [
        { key: "aciklama", label: "Açıklama", type: "text" },
        { key: "tutar", label: "Mahsup Tutarı", type: "number", width: 130 },
        { key: "hesap", label: "Hesap", type: "account", width: 160 },
      ],
    },
    s3_1: {
      id: "s3_1",
      title: wage ? "3.1 Ücret Ödeme Türü Özeti" : "3.1 Ödeme Türü Özeti",
      kind: "summary",
      fields: [
        { key: "ucret_matrah", label: "Ücret Matrah Toplamı", type: "number" },
        { key: "ucret_vergi", label: "Ücret Vergi Toplamı", type: "number" },
        { key: "diger_matrah", label: "Diğer Kesinti Matrah", type: "number", readOnly: wage },
        { key: "diger_vergi", label: "Diğer Kesinti Vergi", type: "number", readOnly: wage },
        { key: "genel_toplam", label: "Genel Vergi Toplamı", type: "number" },
      ],
    },
    s3_2: {
      id: "s3_2",
      title: "3.2 Tahakkuk Özeti",
      kind: "summary",
      fields: [
        { key: "tahakkuk_gv", label: "Gelir Vergisi Tahakkuk", type: "number" },
        { key: "mahsup", label: "Mahsuplar", type: "number" },
        { key: "odenecek", label: "Ödenecek Vergi", type: "number" },
        { key: "iade", label: "İade / Terkin", type: "number" },
      ],
    },
    s4_1: {
      id: "s4_1",
      title: "4.1 İşyeri Sicil Numarası",
      description: "26 karakterli SGK işyeri sicil no bileşenleri.",
      kind: "form",
      fields: [
        { key: "isyeri_sicil", label: "İşyeri Sicil No (26)", type: "text" },
        { key: "yeni_unite", label: "Yeni Ünite Kodu", type: "text" },
        { key: "eski_unite", label: "Eski Ünite Kodu", type: "text" },
        { key: "isyeri_sira", label: "İşyeri Sıra No", type: "text" },
        { key: "il", label: "İl Kodu", type: "text" },
        { key: "alt_isveren", label: "Alt İşveren Kodu", type: "text" },
      ],
    },
    s4_2: {
      id: "s4_2",
      title: "4.2 Sigortalı Çalışan Bilgileri",
      description: "Prim / hizmet / GV matrah satırları.",
      kind: "grid",
      defaultRows: 3,
      columns: [
        { key: "belge_mahiyet", label: "Belge Mahiyeti", type: "select", options: BELGE_MAHIYET, width: 100 },
        { key: "tckn", label: "TCKN / SG No", type: "text", width: 120 },
        { key: "ad_soyad", label: "Adı Soyadı", type: "text", width: 140 },
        { key: "prim_gun", label: "Prim Günü", type: "number", width: 80 },
        { key: "hak_edilen_ucret", label: "Hak Edilen Ücret", type: "number", width: 110 },
        { key: "prim_ikramiye", label: "Prim / İkramiye", type: "number", width: 100 },
        { key: "gv_matrah", label: "GV Matrah", type: "number", width: 100 },
        { key: "gv_kesinti", label: "GV Kesintisi", type: "number", width: 100 },
        { key: "meslek_kodu", label: "Meslek Kodu", type: "text", width: 90 },
        { key: "tahakkuk_neden", label: "Tahakkuk", type: "select", options: TAHAKKUK_NEDEN, width: 140 },
      ],
    },
    s4_3: {
      id: "s4_3",
      title: "4.3 Tahakkuk Nedenleri",
      kind: "grid",
      defaultRows: 2,
      columns: [
        { key: "kod", label: "Kod", type: "select", options: TAHAKKUK_NEDEN, width: 200 },
        { key: "aciklama", label: "Açıklama", type: "text" },
        { key: "adet", label: "Sigortalı Adedi", type: "number", width: 100 },
        { key: "toplam_kazanc", label: "Toplam Kazanç", type: "number", width: 120 },
      ],
    },
    s5_1: {
      id: "s5_1",
      title: "5.1 Düzenleyen",
      kind: "form",
      fields: [
        { key: "duzenleyen_adi", label: "Adı Soyadı", type: "text" },
        {
          key: "sifat",
          label: "Sıfat",
          type: "select",
          options: [
            { value: "mukellef", label: "Mükellef" },
            { value: "sm", label: "SMMM" },
            { value: "ymm", label: "YMM" },
          ],
        },
        { key: "tckn", label: "TCKN", type: "text" },
        { key: "oda_no", label: "Oda Sicil No", type: "text" },
        { key: "telefon", label: "Telefon", type: "text" },
        { key: "tarih", label: "Tarih", type: "text" },
      ],
    },
    s6_1: ekGrid("s6_1", "6.1 Sporcu Teşviki (GVK Geç. 72)"),
    s6_2: ekGrid("s6_2", "6.2 Yurt Dışı Hizmet İndirimi"),
    s6_3: ekGrid("s6_3", "6.3 Yeraltı Maden İşletmeleri"),
    s6_4: ekGrid("s6_4", "6.4 İstihdam Teşviki"),
    s6_5: ekGrid("s6_5", "6.5 GVK Geç. 80 Stopaj Teşviki"),
    s6_6: ekGrid("s6_6", "6.6 Gelir Vergisi Stopaj Teşviki"),
    s6_7_1: ekGrid("s6_7_1", "6.7.1 4691 Sayılı Kanun Kapsamında Bildirim"),
    s6_7_2: ekGrid("s6_7_2", "6.7.2 6550 Sayılı Kanun Kapsamında Bildirim"),
    s6_8: ekGrid("s6_8", "6.8 Serbest Bölgelerde Gelir Vergisi İstisnası"),
    s6_9: ekGrid("s6_9", "6.9 Kültür Yatırımları ve Girişimleri"),
    s6_10: ekGrid("s6_10", "6.10 Ar-Ge Kapsamında Gelir Vergisi Stopaj Teşviki"),
  };
}

function ekGrid(id: string, title: string): GibTableDef {
  return {
    id,
    title,
    description: "GIB ek bildirim satırları.",
    kind: "grid",
    defaultRows: 2,
    columns: [
      { key: "tckn", label: "TCKN", type: "text", width: 120 },
      { key: "ad_soyad", label: "Ad Soyad", type: "text", width: 140 },
      { key: "matrah", label: "Matrah / Ücret", type: "number", width: 120 },
      { key: "vergi", label: "Vergi / Teşvik", type: "number", width: 120 },
      { key: "aciklama", label: "Açıklama", type: "text" },
      { key: "hesap", label: "Hesap", type: "account", width: 140 },
    ],
  };
}

export const MUHTASAR_1003A_TABLE_DEFS = buildMuhtasarTableDefs({ wageFocused: false });
export const MUHTASAR_1003B_TABLE_DEFS = buildMuhtasarTableDefs({ wageFocused: true });
