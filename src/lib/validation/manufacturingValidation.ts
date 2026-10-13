/**
 * Çivi, Palet Çivisi ve Tel Ağ İmalatı Doğrulama Modülü
 * Zod tabanlı üretim kuralları, ürün ağacı (BOM), hammadde ve fire oranları denetimi
 */

import { z } from "zod";

/** İmalat Sektörüne Özgü Malzeme Türleri */
export const MalzemeTuruEnum = z.enum([
  "HAMMADDE",     // Filmaşin (SAE 1006/1008), Tavlı Tel, Galvanizli Tel, Bakır Tel vb.
  "YARI_MAMUL",    // Soğuk Çekilmiş Tel, Çapak Alınmış Ham Çivi, Şerit Dizgisi
  "MAMUL",         // İnşaat Çivisi, Palet Çivisi (Coil Nails), Örgü Tel Ağ, Kafes Tel
  "YARDIMCI_MALZEME", // Tambur Parlatma Yağı/Talaşı, Kaynak Teli, Plastik Şerit, Koli
]);
export type MalzemeTuru = z.infer<typeof MalzemeTuruEnum>;

/** Çivi ve Palet Çivisi Baş ve Gövde Tipleri */
export const CiviGovdeTipiEnum = z.enum(["DUZ", "BURGU", "HALKALI_RING"]);
export const CiviKafaTipiEnum = z.enum(["DUZ_GENIS", "HAVSA", "BOMBELI", "KAFASIZ"]);
export const CiviKaplamaTipiEnum = z.enum(["SIYAH_PARLAK", "ELEKTRO_GALVANIZ", "SICAK_DALDIRMA", "SARI_CINHALI"]);

/** Ürün Ağacı (BOM) Kalemi / Bileşen Doğrulama Şeması */
export const BomBilesenZodSchema = z.object({
  bilesen_stok_id: z.number().int().positive("Bileşen stok ID geçerli bir tamsayı olmalıdır."),
  bilesen_kodu: z.string().min(1, "Bileşen stok kodu zorunludur."),
  bilesen_adi: z.string().min(1, "Bileşen adı zorunludur."),
  malzeme_turu: MalzemeTuruEnum,
  /** Üretilecek 1 birim (örn. 1 kg veya 1000 adet) için gereken net miktar */
  net_miktar: z.number().positive("Net miktar 0'dan büyük olmalıdır."),
  birim: z.string().min(1, "Ölçü birimi zorunludur (kg, ton, metre, m2, adet)."),
  /** Fire Oranı (%) — Tel çekme firesi, uç çapağı vb. (0 ile 50 arası) */
  fire_orani: z
    .number()
    .min(0, "Fire oranı negatif olamaz.")
    .max(50, "Fire oranı makul sınır olan %50'yi aşamaz."),
  /** Brüt Miktar = Net Miktar * (1 + fire_orani / 100) */
  brut_miktar: z.number().positive("Brüt miktar 0'dan büyük olmalıdır."),
  satir_no: z.number().int().positive(),
  aciklama: z.string().optional().nullable(),
});
export type BomBilesen = z.infer<typeof BomBilesenZodSchema>;

/** Çivi & Palet Çivisi Teknik Özellikleri Şeması */
export const CiviTeknikOzelliklerZodSchema = z.object({
  tel_capi_mm: z.number().min(1.0, "Tel çapı en az 1.0 mm olmalıdır.").max(12.0, "Tel çapı en fazla 12.0 mm olabilir."),
  civi_boyu_mm: z.number().min(15, "Çivi boyu en az 15 mm olmalıdır.").max(250, "Çivi boyu en fazla 250 mm olabilir."),
  govde_tipi: CiviGovdeTipiEnum,
  kafa_tipi: CiviKafaTipiEnum,
  kaplama_tipi: CiviKaplamaTipiEnum,
  /** Palet çivisi için rulo özellikleri */
  palet_civisi_mi: z.boolean().default(false),
  rulo_acisi_derece: z.union([z.literal(15), z.literal(16)]).optional().nullable(),
  rulo_basina_adet: z.number().int().min(100).max(1000).optional().nullable(),
});

/** Tel Ağ (Örgü Tel / Çit Teli) Teknik Özellikleri Şeması */
export const TelAgTeknikOzelliklerZodSchema = z.object({
  tel_capi_mm: z.number().min(1.5, "Tel çapı en az 1.5 mm olmalıdır.").max(6.0, "Tel çapı en fazla 6.0 mm olabilir."),
  goz_araligi_mm: z.number().min(20, "Göz aralığı en az 20 mm olmalıdır.").max(150, "Göz aralığı en fazla 150 mm olabilir."),
  rulo_eni_metre: z.number().min(0.5, "Rulo eni en az 0.5 metre olmalıdır.").max(6.0, "Rulo eni en fazla 6.0 metre olabilir."),
  rulo_boyu_metre: z.number().min(5, "Rulo boyu en az 5 metre olmalıdır.").max(50, "Rulo boyu en fazla 50 metre olabilir."),
  galvanizli_mi: z.boolean().default(true),
  pvc_kapli_mi: z.boolean().default(false),
  m2_agirligi_kg: z.number().positive("Metrekare ağırlığı pozitif olmalıdır."),
});

/** Üretim Reçetesi / BOM Başlık Doğrulama Şeması */
export const UretimBomZodSchema = z
  .object({
    mamul_stok_id: z.number().int().positive("Mamul stok ID zorunludur."),
    recete_kodu: z.string().min(2, "Reçete kodu en az 2 karakter olmalıdır.").trim(),
    recete_adi: z.string().min(3, "Reçete adı en az 3 karakter olmalıdır.").trim(),
    versiyon: z.string().default("1.0"),
    parti_buyuklugu: z.number().positive("Parti büyüklüğü 0'dan büyük olmalıdır."),
    parti_birimi: z.string().min(1, "Parti ölçü birimi (kg, ton, rulo vb.) belirtilmelidir."),
    bilesenler: z.array(BomBilesenZodSchema).min(1, "Ürün ağacında en az bir hammadde veya yarı mamul bulunmalıdır."),
    aktif_mi: z.boolean().default(true),
    standart_maliyet: z.number().nonnegative("Standart maliyet negatif olamaz.").default(0),
    notlar: z.string().optional().nullable(),
  })
  .refine(
    (bom) => {
      // Brüt miktar ile net miktar + fire tutarlılığı kontrolü (tolerans: 0.001)
      return bom.bilesenler.every((b) => {
        const beklenenBrut = b.net_miktar * (1 + b.fire_orani / 100);
        return Math.abs(b.brut_miktar - beklenenBrut) < 0.01;
      });
    },
    {
      message: "Bileşen satırındaki brüt miktar, net miktar ve fire oranı formülüyle (Net * (1 + Fire/100)) tutarsız.",
    }
  );

export type UretimBom = z.infer<typeof UretimBomZodSchema>;

/**
 * Üretim Fire ve Miktar Hesaplama Yardımcısı
 * Çivi / Tel Ağ imalatında girdi filmaşin / tel miktarını hesaplar
 */
export function calculateGrossQuantity(netQuantity: number, scrapRatePercent: number): number {
  if (netQuantity <= 0) return 0;
  const scrap = Math.max(0, scrapRatePercent);
  const factor = 1 + scrap / 100;
  return Number((netQuantity * factor).toFixed(4));
}
