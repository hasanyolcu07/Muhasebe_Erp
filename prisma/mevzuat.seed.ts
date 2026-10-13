/**
 * Mevzuat parametre taslağı.
 * Resmi tutar ve oran burada yok. deger null olan satır veritabanına yazılmaz.
 */

export type MevzuatSeedTaslak = {
  anahtar: string;
  birim: "oran" | "tl" | "gun";
  aciklama: string;
  deger: null;
  gecerlilikBaslangic: null;
  gecerlilikBitis: null;
};

export const MEVZUAT_SEED_TASLAK: MevzuatSeedTaslak[] = [
  {
    anahtar: "kdv.oran.genel",
    birim: "oran",
    aciklama: "TODO(MEVZUAT-DOGRULA): KDV genel oran. Değer ve geçerlilik tarihi girilmedi.",
    deger: null,
    gecerlilikBaslangic: null,
    gecerlilikBitis: null,
  },
  {
    anahtar: "kdv.oran.indirimli",
    birim: "oran",
    aciklama: "TODO(MEVZUAT-DOGRULA): KDV indirimli oran. Değer ve geçerlilik tarihi girilmedi.",
    deger: null,
    gecerlilikBaslangic: null,
    gecerlilikBitis: null,
  },
  {
    anahtar: "kdv.oran.ozel",
    birim: "oran",
    aciklama: "TODO(MEVZUAT-DOGRULA): KDV özel oran. Değer ve geçerlilik tarihi girilmedi.",
    deger: null,
    gecerlilikBaslangic: null,
    gecerlilikBitis: null,
  },
  {
    anahtar: "sgk.isci.oran",
    birim: "oran",
    aciklama: "TODO(MEVZUAT-DOGRULA): SGK işçi payı. Değer ve geçerlilik tarihi girilmedi.",
    deger: null,
    gecerlilikBaslangic: null,
    gecerlilikBitis: null,
  },
  {
    anahtar: "sgk.isveren.oran",
    birim: "oran",
    aciklama: "TODO(MEVZUAT-DOGRULA): SGK işveren payı. Tehlike sınıfı ayrımı doğrulanacak. Değer girilmedi.",
    deger: null,
    gecerlilikBaslangic: null,
    gecerlilikBitis: null,
  },
  {
    anahtar: "sgk.issizlik.isci.oran",
    birim: "oran",
    aciklama: "TODO(MEVZUAT-DOGRULA): İşsizlik sigortası işçi payı. Değer ve geçerlilik tarihi girilmedi.",
    deger: null,
    gecerlilikBaslangic: null,
    gecerlilikBitis: null,
  },
  {
    anahtar: "sgk.issizlik.isveren.oran",
    birim: "oran",
    aciklama: "TODO(MEVZUAT-DOGRULA): İşsizlik sigortası işveren payı. Değer ve geçerlilik tarihi girilmedi.",
    deger: null,
    gecerlilikBaslangic: null,
    gecerlilikBitis: null,
  },
  {
    anahtar: "sgk.tesvik.5510.oran",
    birim: "oran",
    aciklama: "TODO(MEVZUAT-DOGRULA): 5510 teşvik oranı. Boş bırakılırsa teşvik uygulanmaz. Değer girilmedi.",
    deger: null,
    gecerlilikBaslangic: null,
    gecerlilikBitis: null,
  },
  {
    anahtar: "sgk.taban",
    birim: "tl",
    aciklama: "TODO(MEVZUAT-DOGRULA): SGK aylık taban. Değer ve geçerlilik tarihi girilmedi.",
    deger: null,
    gecerlilikBaslangic: null,
    gecerlilikBitis: null,
  },
  {
    anahtar: "sgk.tavan",
    birim: "tl",
    aciklama: "TODO(MEVZUAT-DOGRULA): SGK aylık tavan. Değer ve geçerlilik tarihi girilmedi.",
    deger: null,
    gecerlilikBaslangic: null,
    gecerlilikBitis: null,
  },
  {
    anahtar: "gv.dilim.1.oran",
    birim: "oran",
    aciklama: "TODO(MEVZUAT-DOGRULA): Gelir vergisi 1. dilim oranı. Dilim sayısı da doğrulanacak. Değer girilmedi.",
    deger: null,
    gecerlilikBaslangic: null,
    gecerlilikBitis: null,
  },
  {
    anahtar: "gv.dilim.1.ust",
    birim: "tl",
    aciklama: "TODO(MEVZUAT-DOGRULA): Gelir vergisi 1. dilim üst sınırı. Değer girilmedi.",
    deger: null,
    gecerlilikBaslangic: null,
    gecerlilikBitis: null,
  },
  {
    anahtar: "gv.dilim.2.oran",
    birim: "oran",
    aciklama: "TODO(MEVZUAT-DOGRULA): Gelir vergisi 2. dilim oranı. Değer girilmedi.",
    deger: null,
    gecerlilikBaslangic: null,
    gecerlilikBitis: null,
  },
  {
    anahtar: "gv.dilim.2.ust",
    birim: "tl",
    aciklama: "TODO(MEVZUAT-DOGRULA): Gelir vergisi 2. dilim üst sınırı. Değer girilmedi.",
    deger: null,
    gecerlilikBaslangic: null,
    gecerlilikBitis: null,
  },
  {
    anahtar: "gv.dilim.3.oran",
    birim: "oran",
    aciklama: "TODO(MEVZUAT-DOGRULA): Gelir vergisi 3. dilim oranı. Değer girilmedi.",
    deger: null,
    gecerlilikBaslangic: null,
    gecerlilikBitis: null,
  },
  {
    anahtar: "gv.dilim.3.ust",
    birim: "tl",
    aciklama: "TODO(MEVZUAT-DOGRULA): Gelir vergisi 3. dilim üst sınırı. Değer girilmedi.",
    deger: null,
    gecerlilikBaslangic: null,
    gecerlilikBitis: null,
  },
  {
    anahtar: "gv.dilim.4.oran",
    birim: "oran",
    aciklama: "TODO(MEVZUAT-DOGRULA): Gelir vergisi 4. dilim oranı. Değer girilmedi.",
    deger: null,
    gecerlilikBaslangic: null,
    gecerlilikBitis: null,
  },
  {
    anahtar: "gv.dilim.4.ust",
    birim: "tl",
    aciklama: "TODO(MEVZUAT-DOGRULA): Gelir vergisi 4. dilim üst sınırı. Değer girilmedi.",
    deger: null,
    gecerlilikBaslangic: null,
    gecerlilikBitis: null,
  },
  {
    anahtar: "gv.dilim.5.oran",
    birim: "oran",
    aciklama: "TODO(MEVZUAT-DOGRULA): Gelir vergisi son dilim oranı. Üst sınır anahtarı yok. Dilim adedi doğrulanacak.",
    deger: null,
    gecerlilikBaslangic: null,
    gecerlilikBitis: null,
  },
  {
    anahtar: "damga.oran",
    birim: "oran",
    aciklama: "TODO(MEVZUAT-DOGRULA): Damga vergisi oranı. Değer ve geçerlilik tarihi girilmedi.",
    deger: null,
    gecerlilikBaslangic: null,
    gecerlilikBitis: null,
  },
  {
    anahtar: "asgari_ucret.brut",
    birim: "tl",
    aciklama: "TODO(MEVZUAT-DOGRULA): Brüt asgari ücret. Değer ve geçerlilik tarihi girilmedi.",
    deger: null,
    gecerlilikBaslangic: null,
    gecerlilikBitis: null,
  },
  {
    anahtar: "asgari_ucret.istisna.gelir_vergisi",
    birim: "tl",
    aciklama: "TODO(MEVZUAT-DOGRULA): Asgari ücret gelir vergisi istisna tutarı. Değer girilmedi.",
    deger: null,
    gecerlilikBaslangic: null,
    gecerlilikBitis: null,
  },
  {
    anahtar: "asgari_ucret.istisna.damga",
    birim: "tl",
    aciklama: "TODO(MEVZUAT-DOGRULA): Asgari ücret damga vergisi istisna tutarı. Değer girilmedi.",
    deger: null,
    gecerlilikBaslangic: null,
    gecerlilikBitis: null,
  },
  {
    anahtar: "kidem.tavan",
    birim: "tl",
    aciklama: "TODO(MEVZUAT-DOGRULA): Kıdem tazminatı tavanı. Değer ve geçerlilik tarihi girilmedi.",
    deger: null,
    gecerlilikBaslangic: null,
    gecerlilikBitis: null,
  },
  {
    anahtar: "sgk.ise_giris.once_gun",
    birim: "gun",
    aciklama: "TODO(MEVZUAT-DOGRULA): İşe giriş bildirgesinin işe başlamadan kaç gün önce verileceği. Değer girilmedi.",
    deger: null,
    gecerlilikBaslangic: null,
    gecerlilikBitis: null,
  },
  {
    anahtar: "sgk.isten_cikis.gun",
    birim: "gun",
    aciklama: "TODO(MEVZUAT-DOGRULA): İşten çıkış bildirgesinin ayrılıştan itibaren kaç gün içinde verileceği. Değer girilmedi.",
    deger: null,
    gecerlilikBaslangic: null,
    gecerlilikBitis: null,
  },
];

export const MEVZUAT_ETIKET: Record<string, string> = {
  "kdv.oran.genel": "KDV genel oran",
  "kdv.oran.indirimli": "KDV indirimli oran",
  "kdv.oran.ozel": "KDV özel oran",
  "sgk.isci.oran": "SGK işçi payı",
  "sgk.isveren.oran": "SGK işveren payı",
  "sgk.issizlik.isci.oran": "İşsizlik işçi payı",
  "sgk.issizlik.isveren.oran": "İşsizlik işveren payı",
  "sgk.tesvik.5510.oran": "5510 teşvik oranı",
  "sgk.taban": "SGK taban",
  "sgk.tavan": "SGK tavan",
  "gv.dilim.1.oran": "Gelir vergisi 1. dilim oranı",
  "gv.dilim.1.ust": "Gelir vergisi 1. dilim üst sınırı",
  "gv.dilim.2.oran": "Gelir vergisi 2. dilim oranı",
  "gv.dilim.2.ust": "Gelir vergisi 2. dilim üst sınırı",
  "gv.dilim.3.oran": "Gelir vergisi 3. dilim oranı",
  "gv.dilim.3.ust": "Gelir vergisi 3. dilim üst sınırı",
  "gv.dilim.4.oran": "Gelir vergisi 4. dilim oranı",
  "gv.dilim.4.ust": "Gelir vergisi 4. dilim üst sınırı",
  "gv.dilim.5.oran": "Gelir vergisi 5. dilim oranı",
  "damga.oran": "Damga vergisi oranı",
  "asgari_ucret.brut": "Brüt asgari ücret",
  "asgari_ucret.istisna.gelir_vergisi": "Asgari ücret gelir vergisi istisnası",
  "asgari_ucret.istisna.damga": "Asgari ücret damga vergisi istisnası",
  "kidem.tavan": "Kıdem tazminatı tavanı",
  "sgk.ise_giris.once_gun": "İşe giriş bildirgesi, başlamadan önceki gün",
  "sgk.isten_cikis.gun": "İşten çıkış bildirgesi, ayrılıştan sonraki gün",
};

export function mevzuatEtiket(anahtar: string): string {
  return MEVZUAT_ETIKET[anahtar] || anahtar;
}

/** Doğrulanmamış satır yazılmaz. Hazır satır yoksa false döner. */
export function mevzuatSeedYazilabilir(satirlar: MevzuatSeedTaslak[] = MEVZUAT_SEED_TASLAK): boolean {
  return satirlar.every((satir) => satir.deger !== null && satir.gecerlilikBaslangic !== null);
}
