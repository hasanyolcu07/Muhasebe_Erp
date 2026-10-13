/**
 * Türkiye Muhasebe Standartları (TMS) ve Vergi Usul Kanunu (VUK) Uyumlu Muhasebe Doğrulama Modülü
 * Çift Kayıt (Borç = Alacak) Kesinliği ve İmalat Maliyet Muhasebesi (710/720/730 & 150/151/152)
 */

import { z } from "zod";

/** TDHP Hesap Kodu Format Denetimi (Örn: 100, 100.01, 150.01.001, 710.01.01) */
export const tdhpAccountCodeRegex = /^[1-7]\d{2}(\.\d{2,3})*$/;

/** Yevmiye Fişi Satırı Zod Şeması */
export const YevmiyeSatirZodSchema = z
  .object({
    satir_no: z.number().int().positive("Satır numarası pozitif tamsayı olmalıdır."),
    hesap_kodu: z
      .string()
      .min(3, "Hesap kodu en az 3 basamaklı olmalıdır.")
      .regex(tdhpAccountCodeRegex, "Geçersiz TDHP hesap kodu formatı (100..799 formatında olmalıdır)."),
    hesap_adi: z.string().min(2, "Hesap adı zorunludur."),
    borc: z.number().nonnegative("Borç tutarı negatif olamaz.").default(0),
    alacak: z.number().nonnegative("Alacak tutarı negatif olamaz.").default(0),
    aciklama: z.string().min(3, "Satır açıklaması zorunludur.").trim(),
    belge_turu: z.enum(["FATURA", "IRSALIYE", "URETIM_FISI", "BANKA", "KASA", "DEKONT"]).default("URETIM_FISI"),
    belge_no: z.string().optional().nullable(),
  })
  .refine(
    (row) => {
      // Bir satırda hem borç hem alacak aynı anda pozitif olamaz
      const hasDebit = row.borc > 0;
      const hasCredit = row.alacak > 0;
      return (hasDebit && !hasCredit) || (!hasDebit && hasCredit);
    },
    {
      message: "Yevmiye satırında borç veya alacaktan sadece biri sıfırdan büyük olmalıdır.",
    }
  );

export type YevmiyeSatir = z.infer<typeof YevmiyeSatirZodSchema>;

/** Yevmiye Fiş Türleri */
export const FisTuruEnum = z.enum([
  "MAHSUP",       // Genel mahsup ve üretim mahsubu
  "KASA_TAHSIL",
  "KASA_TEDIYE",
  "URETIM_MALIYET", // İmalat maliyeti aktarımı (710/720/730 -> 151 -> 152)
  "ACILIS",
  "KAPANIS",
]);

/** Yevmiye Fişi Başlık ve Bütünlük Doğrulama Şeması (Borç = Alacak Çift Kayıt Kuralı) */
export const YevmiyeFisiZodSchema = z
  .object({
    fis_no: z.string().min(1, "Fiş numarası zorunludur.").trim(),
    fis_tarihi: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Fiş tarihi YYYY-AA-GG formatında olmalıdır."),
    fis_turu: FisTuruEnum.default("MAHSUP"),
    sube_kodu: z.string().min(1, "Şube kodu zorunludur.").default("MERKEZ"),
    donem_yili: z.number().int().min(2020).max(2050),
    aciklama: z.string().min(5, "Fiş genel açıklaması en az 5 karakter olmalıdır."),
    satirlar: z
      .array(YevmiyeSatirZodSchema)
      .min(2, "Çift kayıt ilkesi gereği fişte en az 2 satır (biri borç, biri alacak) bulunmalıdır."),
    kilitli_mi: z.boolean().default(false),
  })
  .refine(
    (fis) => {
      // Çift kayıt kuralı (Borç Toplamı === Alacak Toplamı)
      let toplamBorc = 0;
      let toplamAlacak = 0;

      for (const row of fis.satirlar) {
        toplamBorc += Math.round(row.borc * 100);
        toplamAlacak += Math.round(row.alacak * 100);
      }

      // Kuruş bazında eşitlik denetimi
      return toplamBorc === toplamAlacak && toplamBorc > 0;
    },
    {
      message: "VUK/TMS Çift Kayıt Kuralı İhlali: Yevmiye fişinde Borç toplamı ile Alacak toplamı kesinlikle eşit olmalıdır.",
    }
  );

export type YevmiyeFisi = z.infer<typeof YevmiyeFisiZodSchema>;

/**
 * İmalat Fişi Üretim Maliyet Muhasebesi Yardımcısı
 * Çivi / Tel Ağ üretimi tamamlandığında 710/720/730 maliyetlerini 151 ve 152'ye aktaran yevmiye kaydını oluşturur
 */
export function buildProductionCostJournalVoucher(params: {
  fisNo: string;
  tarih: string;
  mamulKodu: string;
  mamulAdi: string;
  hammaddeTutari: number; // 710 Direkt İlk Madde ve Malzeme
  iscilikTutari: number;   // 720 Direkt İşçilik
  genelUretimTutari: number; // 730 Genel Üretim Giderleri
  donemYili?: number;
}): YevmiyeFisi {
  const { fisNo, tarih, mamulKodu, mamulAdi, hammaddeTutari, iscilikTutari, genelUretimTutari } = params;
  const toplamMaliyet = Number((hammaddeTutari + iscilikTutari + genelUretimTutari).toFixed(2));
  const donemYili = params.donemYili ?? new Date(tarih).getFullYear();

  const satirlar: YevmiyeSatir[] = [
    // 1. Borç: 152 Mamuller Hesabı (Tamamlanan çivi/tel ağ mamul stoğu)
    {
      satir_no: 1,
      hesap_kodu: "152.01",
      hesap_adi: `152 MAMULLER - ${mamulAdi} (${mamulKodu})`,
      borc: toplamMaliyet,
      alacak: 0,
      aciklama: `İmalat mamul girişi: ${mamulAdi}`,
      belge_turu: "URETIM_FISI",
      belge_no: fisNo,
    },
    // 2. Alacak: 711 Direkt İlk Madde ve Malzeme Yansıtma
    {
      satir_no: 2,
      hesap_kodu: "711.01",
      hesap_adi: "711 DİREKT İLK MADDE VE MALZEME GİDERLERİ YANSITMA",
      borc: 0,
      alacak: Number(hammaddeTutari.toFixed(2)),
      aciklama: `Filmaşin/Tel hammadde sarf maliyet yansıtması`,
      belge_turu: "URETIM_FISI",
      belge_no: fisNo,
    },
    // 3. Alacak: 721 Direkt İşçilik Giderleri Yansıtma
    {
      satir_no: 3,
      hesap_kodu: "721.01",
      hesap_adi: "721 DİREKT İŞÇİLİK GİDERLERİ YANSITMA",
      borc: 0,
      alacak: Number(iscilikTutari.toFixed(2)),
      aciklama: `Üretim hattı direkt işçilik payı yansıtması`,
      belge_turu: "URETIM_FISI",
      belge_no: fisNo,
    },
    // 4. Alacak: 731 Genel Üretim Giderleri Yansıtma
    {
      satir_no: 4,
      hesap_kodu: "731.01",
      hesap_adi: "731 GENEL ÜRETİM GİDERLERİ YANSITMA",
      borc: 0,
      alacak: Number(genelUretimTutari.toFixed(2)),
      aciklama: `Amortisman, elektrik ve tambur/yağ sarf payı yansıtması`,
      belge_turu: "URETIM_FISI",
      belge_no: fisNo,
    },
  ];

  return YevmiyeFisiZodSchema.parse({
    fis_no: fisNo,
    fis_tarihi: tarih,
    fis_turu: "URETIM_MALIYET",
    sube_kodu: "MERKEZ",
    donem_yili: donemYili,
    aciklama: `İmalat Maliyet Mahsubu: ${mamulKodu} ${mamulAdi}`,
    satirlar,
    kilitli_mi: false,
  });
}
