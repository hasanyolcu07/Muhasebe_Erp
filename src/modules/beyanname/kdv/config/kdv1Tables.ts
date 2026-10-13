export type GibColumn = {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "account";
  options?: { value: string; label: string }[];
  readOnly?: boolean;
  width?: number;
};

export type GibTableDef = {
  id: string;
  title: string;
  description?: string;
  kind: "form" | "grid" | "summary";
  columns?: GibColumn[];
  fields?: GibColumn[];
  defaultRows?: number;
  rateRows?: { rate: string; label: string }[];
  /** Seed rows for reference / read-only grids */
  seedRows?: Record<string, string | number>[];
};

const KDV_RATE_OPTIONS = [
  { value: "1", label: "%1" },
  { value: "10", label: "%10" },
  { value: "20", label: "%20" },
];

const TEVKIFAT_ORAN_OPTIONS = [
  { value: "2/3", label: "2/3" },
  { value: "1/2", label: "1/2" },
  { value: "9/10", label: "9/10" },
  { value: "7/10", label: "7/10" },
  { value: "5/10", label: "5/10" },
  { value: "4/10", label: "4/10" },
  { value: "3/10", label: "3/10" },
  { value: "2/10", label: "2/10" },
  { value: "1/10", label: "1/10" },
];

const MONTH_OPTIONS = [
  { value: "1", label: "Ocak" },
  { value: "2", label: "Şubat" },
  { value: "3", label: "Mart" },
  { value: "4", label: "Nisan" },
  { value: "5", label: "Mayıs" },
  { value: "6", label: "Haziran" },
  { value: "7", label: "Temmuz" },
  { value: "8", label: "Ağustos" },
  { value: "9", label: "Eylül" },
  { value: "10", label: "Ekim" },
  { value: "11", label: "Kasım" },
  { value: "12", label: "Aralık" },
];

export const KDV1_TABLE_DEFS: Record<string, GibTableDef> = {
  idari: {
    id: "idari",
    title: "İdari Bilgiler",
    description: "Vergi dairesi, dönem ve mükellef kimlik bilgileri.",
    kind: "form",
    fields: [
      { key: "vergi_dairesi", label: "Vergi Dairesi", type: "text" },
      {
        key: "donem_ay",
        label: "Dönem Ayı",
        type: "select",
        options: MONTH_OPTIONS,
      },
      { key: "donem_yil", label: "Dönem Yılı", type: "number" },
      { key: "vkn_tckn", label: "VKN / TCKN", type: "text" },
      { key: "unvan", label: "Ünvan / Ad Soyad", type: "text" },
      { key: "adres", label: "Adres", type: "text" },
      { key: "telefon", label: "Telefon", type: "text" },
      { key: "eposta", label: "E-posta", type: "text" },
      {
        key: "beyanname_turu",
        label: "Beyanname Türü",
        type: "select",
        options: [
          { value: "asil", label: "Asıl" },
          { value: "duzeltme", label: "Düzeltme" },
        ],
      },
      { key: "sube", label: "Şube", type: "text" },
    ],
  },

  t1: {
    id: "t1",
    title: "TABLO 1 — Tevkifat Uygulanmayan İşlemler",
    description: "Oran bazında teslim / hizmet bedeli ve hesaplanan KDV.",
    kind: "grid",
    rateRows: [
      { rate: "1", label: "%1" },
      { rate: "10", label: "%10" },
      { rate: "20", label: "%20" },
    ],
    columns: [
      { key: "oran", label: "KDV Oranı", type: "text", readOnly: true, width: 90 },
      { key: "teslim_hizmet_bedeli", label: "Teslim / Hizmet Bedeli", type: "number", width: 160 },
      { key: "hesaplanan_kdv", label: "Hesaplanan KDV", type: "number", width: 140 },
      { key: "hesap", label: "Hesap", type: "account", width: 220 },
    ],
  },

  t2: {
    id: "t2",
    title: "TABLO 2 — Kısmi Tevkifat Uygulanan İşlemler",
    description: "Tevkifat oranına göre işlem satırları.",
    kind: "grid",
    defaultRows: 3,
    columns: [
      { key: "islem_turu", label: "İşlem Türü", type: "text", width: 160 },
      { key: "teslim_hizmet_bedeli", label: "Teslim / Hizmet Bedeli", type: "number", width: 150 },
      {
        key: "kdv_orani",
        label: "KDV Oranı",
        type: "select",
        options: KDV_RATE_OPTIONS,
        width: 100,
      },
      {
        key: "tevkifat_orani",
        label: "Tevkifat Oranı",
        type: "select",
        options: TEVKIFAT_ORAN_OPTIONS,
        width: 120,
      },
      { key: "hesaplanan_kdv", label: "Hesaplanan KDV", type: "number", width: 130 },
    ],
  },

  t3: {
    id: "t3",
    title: "TABLO 3 — Diğer İşlemler",
    description: "ÖTVİK, iade, değersiz, yolcu / bavul vb. işlem kodları.",
    kind: "grid",
    defaultRows: 3,
    columns: [
      {
        key: "kod",
        label: "Kod",
        type: "select",
        options: [
          { value: "503", label: "503 — ÖTVİK" },
          { value: "504", label: "504 — İade" },
          { value: "505", label: "505 — Değersiz" },
          { value: "22", label: "22 — Yolcu Beraberi" },
          { value: "24", label: "24 — Bavul Ticareti" },
        ],
        width: 160,
      },
      { key: "aciklama", label: "Açıklama", type: "text", width: 200 },
      { key: "bedel", label: "Bedel", type: "number", width: 130 },
      { key: "kdv", label: "KDV", type: "number", width: 120 },
    ],
  },

  t4: {
    id: "t4",
    title: "TABLO 4 — İndirimler",
    description: "Önceki dönemden devreden ve bu dönem indirilecek KDV.",
    kind: "summary",
    fields: [
      { key: "onceki_devreden", label: "32 — Önceki Dönemden Devreden KDV", type: "number" },
      { key: "bu_donem_indirilecek", label: "33 — Bu Dönem İndirilecek KDV", type: "number" },
      { key: "mal_iadeleri", label: "34 — Mal İadeleri Nedeniyle Düzeltme", type: "number" },
      { key: "yolcu_duzeltme", label: "35 — Yolcu Beraberi Eşya Düzeltme", type: "number" },
      { key: "bavul_duzeltme", label: "36 — Bavul Ticareti Düzeltme", type: "number" },
      { key: "toplam_indirim", label: "Toplam İndirim", type: "number", readOnly: true },
    ],
  },

  t5: {
    id: "t5",
    title: "TABLO 5 — Sonuç Hesapları",
    description: "Hesaplanan, indirilen, ödenecek / iade edilecek KDV özeti.",
    kind: "summary",
    fields: [
      { key: "hesaplanan_toplam", label: "Hesaplanan KDV Toplamı", type: "number" },
      { key: "indirimler_toplam", label: "İndirimler Toplamı", type: "number" },
      { key: "tecil_edilebilir", label: "Tecil Edilebilir KDV", type: "number" },
      { key: "odenecek_kdv", label: "Ödenecek KDV", type: "number" },
      { key: "sonraki_devreden", label: "Sonraki Döneme Devreden KDV", type: "number" },
      { key: "iade_edilecek", label: "İade Edilecek KDV", type: "number" },
    ],
  },

  t6: {
    id: "t6",
    title: "TABLO 6 — Diğer Bilgiler",
    description: "Kümülatif teslim, kredi kartı tahsilat ve özel matrah bilgileri.",
    kind: "form",
    fields: [
      { key: "kumulatif_teslim", label: "Kümülatif Teslim / Hizmet Bedeli", type: "number" },
      { key: "kredi_karti_tahsilat", label: "Kredi Kartı ile Tahsilat", type: "number" },
      {
        key: "ozel_matrah_dahil_olmayan",
        label: "Özel Matrah Dahil Olmayan İşlemler",
        type: "number",
      },
      { key: "ihracat_bedeli", label: "İhracat Bedeli", type: "number" },
      { key: "diger_aciklama", label: "Diğer Açıklama", type: "text" },
    ],
  },

  t7: {
    id: "t7",
    title: "TABLO 7 — Kısmi İstisna Kapsamına Giren İşlemler",
    kind: "grid",
    defaultRows: 2,
    columns: [
      { key: "kod_no", label: "Kod No", type: "text", width: 90 },
      { key: "kdvk_md", label: "KDVK Md.", type: "text", width: 100 },
      { key: "teslim_bedeli", label: "Teslim Bedeli", type: "number", width: 140 },
      { key: "yuklenen_kdv", label: "Yüklenen KDV", type: "number", width: 130 },
      { key: "iadeye_konu_kdv", label: "İadeye Konu KDV", type: "number", width: 130 },
    ],
  },

  t8: {
    id: "t8",
    title: "TABLO 8 — Tam İstisna Kapsamına Giren İşlemler",
    kind: "grid",
    defaultRows: 2,
    columns: [
      { key: "kod_no", label: "Kod No", type: "text", width: 90 },
      { key: "kdvk_md", label: "KDVK Md.", type: "text", width: 100 },
      { key: "teslim_bedeli", label: "Teslim Bedeli", type: "number", width: 140 },
      { key: "yuklenen_kdv", label: "Yüklenen KDV", type: "number", width: 130 },
      { key: "iadeye_konu_kdv", label: "İadeye Konu KDV", type: "number", width: 130 },
    ],
  },

  t9: {
    id: "t9",
    title: "TABLO 9 — Diğer İade Hakkı Doğuran İşlemler",
    kind: "grid",
    defaultRows: 2,
    columns: [
      { key: "kod_no", label: "Kod No", type: "text", width: 90 },
      { key: "kdvk_md", label: "KDVK Md.", type: "text", width: 100 },
      { key: "teslim_bedeli", label: "Teslim Bedeli", type: "number", width: 140 },
      { key: "yuklenen_kdv", label: "Yüklenen KDV", type: "number", width: 130 },
      { key: "iadeye_konu_kdv", label: "İadeye Konu KDV", type: "number", width: 130 },
    ],
  },

  t10: {
    id: "t10",
    title: "TABLO 10 — İhraç Kaydıyla Teslimler",
    description: "İhraç kayıtlı teslim bedeli ve tecil bilgileri.",
    kind: "form",
    fields: [
      { key: "ihrac_kayitli_bedel", label: "İhraç Kayıtlı Teslim Bedeli", type: "number" },
      { key: "tecil_edilebilir", label: "Tecil Edilebilir KDV", type: "number" },
      { key: "tecil_edilen", label: "Tecil Edilen KDV", type: "number" },
      { key: "tecil_edilemeyen", label: "Tecil Edilemeyen KDV", type: "number" },
    ],
  },

  t11: {
    id: "t11",
    title: "TABLO 11 — Kısmi İstisna İşlem Kodları",
    description: "GIB kısmi istisna kod referansı (salt okunur).",
    kind: "grid",
    columns: [
      { key: "kod", label: "Kod", type: "text", readOnly: true, width: 80 },
      { key: "aciklama", label: "Açıklama", type: "text", readOnly: true, width: 320 },
      { key: "kdvk_md", label: "KDVK Md.", type: "text", readOnly: true, width: 100 },
    ],
    seedRows: [
      { kod: "201", aciklama: "Kültür, eğitim, sağlık hizmetleri (örnek)", kdvk_md: "13/a" },
      { kod: "202", aciklama: "Sosyal amaçlı teslimler (örnek)", kdvk_md: "13/b" },
      { kod: "203", aciklama: "Tarımsal üretim destekleri (örnek)", kdvk_md: "13/c" },
      { kod: "204", aciklama: "Kısmi istisna diğer (örnek)", kdvk_md: "13/d" },
    ],
  },

  t12: {
    id: "t12",
    title: "TABLO 12 — Tam İstisna İşlem Kodları",
    description: "GIB tam istisna kod referansı (salt okunur).",
    kind: "grid",
    columns: [
      { key: "kod", label: "Kod", type: "text", readOnly: true, width: 80 },
      { key: "aciklama", label: "Açıklama", type: "text", readOnly: true, width: 320 },
      { key: "kdvk_md", label: "KDVK Md.", type: "text", readOnly: true, width: 100 },
    ],
    seedRows: [
      { kod: "301", aciklama: "İhracat teslimleri (örnek)", kdvk_md: "11/1-a" },
      { kod: "302", aciklama: "Diplomatik istisna (örnek)", kdvk_md: "15" },
      { kod: "303", aciklama: "Transit ve gümrük antrepo (örnek)", kdvk_md: "16" },
      { kod: "304", aciklama: "Tam istisna diğer (örnek)", kdvk_md: "17" },
    ],
  },

  t13: {
    id: "t13",
    title: "TABLO 13 — Diğer İade İşlem Kodları",
    description: "GIB diğer iade kod referansı (salt okunur).",
    kind: "grid",
    columns: [
      { key: "kod", label: "Kod", type: "text", readOnly: true, width: 80 },
      { key: "aciklama", label: "Açıklama", type: "text", readOnly: true, width: 320 },
      { key: "kdvk_md", label: "KDVK Md.", type: "text", readOnly: true, width: 100 },
    ],
    seedRows: [
      { kod: "401", aciklama: "Teşvik belgeli yatırım (örnek)", kdvk_md: "—" },
      { kod: "402", aciklama: "İndirimli oran farkı iadesi (örnek)", kdvk_md: "—" },
      { kod: "403", aciklama: "Diğer iade hakkı (örnek)", kdvk_md: "—" },
    ],
  },

  t14: {
    id: "t14",
    title: "TABLO 14 — Özel Matrah / İlave Bildirimler",
    kind: "grid",
    defaultRows: 2,
    columns: [
      { key: "bildirim_turu", label: "Bildirim Türü", type: "text", width: 160 },
      { key: "aciklama", label: "Açıklama", type: "text", width: 220 },
      { key: "matrah", label: "Matrah", type: "number", width: 130 },
      { key: "kdv", label: "KDV", type: "number", width: 120 },
    ],
  },

  t15: {
    id: "t15",
    title: "TABLO 15 — İndirilecek KDV Listesi (Detay)",
    description: "Belge bazında indirilecek KDV detay satırları.",
    kind: "grid",
    defaultRows: 3,
    columns: [
      { key: "belge_tarihi", label: "Belge Tarihi", type: "text", width: 110 },
      { key: "belge_no", label: "Belge No", type: "text", width: 120 },
      { key: "satici_vkn", label: "Satıcı VKN", type: "text", width: 120 },
      { key: "matrah", label: "Matrah", type: "number", width: 120 },
      {
        key: "kdv_orani",
        label: "KDV Oranı",
        type: "select",
        options: KDV_RATE_OPTIONS,
        width: 100,
      },
      { key: "indirilecek_kdv", label: "İndirilecek KDV", type: "number", width: 130 },
    ],
  },

  t16: {
    id: "t16",
    title: "TABLO 16 — Ödeme Bilgileri",
    kind: "form",
    fields: [
      { key: "odeme_turu", label: "Ödeme Türü", type: "text" },
      { key: "banka_adi", label: "Banka Adı", type: "text" },
      { key: "iban", label: "IBAN", type: "text" },
      { key: "odeme_tutari", label: "Ödeme Tutarı", type: "number" },
      { key: "odeme_tarihi", label: "Ödeme Tarihi", type: "text" },
    ],
  },

  t17: {
    id: "t17",
    title: "TABLO 17 — Düzenleyen Bilgileri",
    kind: "form",
    fields: [
      { key: "duzenleyen_ad", label: "Ad Soyad", type: "text" },
      { key: "duzenleyen_unvan", label: "Ünvan", type: "text" },
      { key: "duzenleyen_tckn", label: "TCKN", type: "text" },
      { key: "duzenleyen_telefon", label: "Telefon", type: "text" },
      { key: "duzenleyen_eposta", label: "E-posta", type: "text" },
    ],
  },

  t18: {
    id: "t18",
    title: "TABLO 18 — Ek Bildirimler / Notlar",
    kind: "form",
    fields: [
      { key: "ek_bildirim", label: "Ek Bildirim", type: "text" },
      { key: "aciklama_not", label: "Açıklama / Not", type: "text" },
      { key: "ek_belge_sayisi", label: "Ek Belge Sayısı", type: "number" },
    ],
  },
};
