/**
 * Cari Kart Servisi (Cari Service)
 * Türkiye Muhasebe Standartları & Vergi Usul Kanunu (VUK) Uyumlu
 * VKN (10 Hane), TCKN (11 Hane) ve TR IBAN (26 Hane Mod-97) Algoritmik Doğrulaması
 */

import { z } from "zod";
import { prisma } from "../prisma";
import { Prisma } from "@prisma/client";
import { validateVKN, validateTCKN } from "@/lib/validation/taxIdValidation";

/**
 * -----------------------------------------------------------------------------
 * 1. TÜRKİYE IBAN (TR - 26 Hane) ALGORTİMİK DOĞRULAMASI (ISO 7064 Mod-97-10)
 * -----------------------------------------------------------------------------
 * Format: TR + 2 kontrol basamağı + 5 banka kodu + 1 rezerv + 16 hesap no = 26 karakter
 * 
 * Algoritma:
 * 1. Boşluklar temizlenir ve büyük harfe çevrilir.
 * 2. 'TR' ile başlamalı ve toplam 26 karakter olmalıdır.
 * 3. İlk 4 karakter (TR + 2 hane) sona taşınır.
 * 4. Harfler rakama çevrilir ('T' -> 29, 'R' -> 27).
 * 5. Elde edilen sayının 97'ye bölümünden kalan 1 olmalıdır (Mod-97 kontrolü).
 */
export function validateTR_IBAN(iban: string): boolean {
  if (!iban || typeof iban !== "string") return false;
  const clean = iban.replace(/\s+/g, "").toUpperCase();

  // TR ile başlamalı ve tam 26 karakter alfanümerik olmalıdır
  if (!/^TR\d{24}$/.test(clean)) {
    return false;
  }

  // İlk 4 karakteri (TR + kontrol rakamları) sona taşı
  const rearranged = clean.slice(4) + clean.slice(0, 4);

  // Harfleri rakama çevir: A=10, B=11 ... T=29, R=27
  let numericString = "";
  for (let i = 0; i < rearranged.length; i++) {
    const char = rearranged[i];
    const code = char.charCodeAt(0);
    if (code >= 65 && code <= 90) {
      // Harf: 'A' için 10, 'T' için 29, 'R' için 27
      numericString += (code - 55).toString();
    } else {
      numericString += char;
    }
  }

  // Mod-97 Hesaplaması (ISO 7064 Mod-97-10 standardı)
  try {
    return BigInt(numericString) % 97n === 1n;
  } catch {
    return false;
  }
}

/**
 * -----------------------------------------------------------------------------
 * 2. ZOD ŞEMALARI: VKN, TCKN VE IBAN
 * -----------------------------------------------------------------------------
 */

// Esnek Vergi Kimlik Numarası (VKN 10 hane veya TCKN 11 hane)
export const VergiNoZodSchema = z
  .string()
  .min(1, "Vergi / TC Kimlik Numarası zorunludur.")
  .trim()
  .refine(
    (val) => {
      if (/^\d{10}$/.test(val)) return validateVKN(val);
      if (/^\d{11}$/.test(val)) return validateTCKN(val);
      return false;
    },
    {
      message: "Geçersiz Vergi/TC Kimlik Numarası. 10 haneli tüzel VKN veya 11 haneli şahıs TCKN algoritmik olarak doğrulanmalıdır.",
    }
  );

// IBAN Zod Şeması (İsteğe bağlı, ancak girilmişse TR ve 26 hane Mod-97 doğrulanır)
export const IbanZodSchema = z
  .string()
  .trim()
  .transform((val) => val.replace(/\s+/g, "").toUpperCase())
  .refine(
    (val) => {
      if (!val || val.length === 0) return true; // Boş bırakılabilir
      return validateTR_IBAN(val);
    },
    {
      message: "Geçersiz IBAN formatı veya Mod-97 sağlama hatası. IBAN 'TR' ile başlamalı ve tam 26 karakter olmalıdır.",
    }
  )
  .optional()
  .nullable();

// Tam Cari Kart Zod Giriş Şeması
export const CariKartInputSchema = z.object({
  kod: z
    .string()
    .min(1, "Cari hesap kodu zorunludur.")
    .trim()
    .min(3, "Cari hesap kodu en az 3 karakter olmalıdır (Örn: 120.01.001, 320.01.001).")
    .regex(/^[0-9]{3}(\.[0-9]{2,3})*$/, "Geçersiz Tekdüzen Hesap Planı cari kod formatı (Örn: 120.01.001)."),
  ad: z
    .string()
    .min(1, "Cari ünvanı / adı zorunludur.")
    .trim()
    .min(2, "Cari ünvanı en az 2 karakter olmalıdır."),
  vergiNo: VergiNoZodSchema,
  vergiDairesi: z.string().trim().optional().nullable(),
  iban: IbanZodSchema,
  bakiye: z.number().default(0),
  telefon: z.string().trim().optional().nullable(),
  eposta: z.string().email("Geçerli bir e-posta adresi giriniz.").optional().nullable(),
  adres: z.string().trim().optional().nullable(),
  isActive: z.boolean().default(true),
});

export type CariKartInputDto = z.infer<typeof CariKartInputSchema>;

/**
 * -----------------------------------------------------------------------------
 * 3. CARİ KART SERVİS MANTIĞI
 * -----------------------------------------------------------------------------
 */
export class CariService {
  /**
   * Cari Kart Girdisini Algoritmik Olarak Doğrular
   */
  public static async validateCariKart(
    input: unknown,
    client: any = prisma
  ): Promise<CariKartInputDto> {
    // 1. Zod şeması ile VKN/TCKN ve IBAN Mod-97 doğrulaması
    const parseResult = CariKartInputSchema.safeParse(input);
    if (!parseResult.success) {
      const firstError = parseResult.error.issues?.[0]?.message || "Cari kart girdi doğrulama hatası.";
      throw new Error(firstError);
    }

    const validData = parseResult.data;

    // 2. Kod ve Vergi No benzersizlik kontrolü (Veritabanında kayıtlı mı?)
    if (client?.cariKart?.findFirst) {
      try {
        const existingKod = await client.cariKart.findFirst({
          where: { kod: validData.kod },
        });
        if (existingKod) {
          throw new Error(`'${validData.kod}' kodlu cari kart sistemde zaten mevcuttur.`);
        }
      } catch (err: any) {
        if (err.message && err.message.includes("sistemde zaten mevcuttur")) {
          throw err;
        }
      }
    }

    return validData;
  }

  /**
   * Yeni Cari Kart Oluşturma (Doğrulama + Prisma Kaydı)
   */
  public static async createCariKart(
    input: unknown,
    options: { kullaniciId?: number; ipAdresi?: string; companyId?: number } = {}
  ) {
    const validated = await this.validateCariKart(input);
    const company = options.companyId
      ? await prisma.company.findUnique({ where: { id: options.companyId } })
      : await prisma.company.findFirst();
    if (!company) {
      throw new Error("Şirket kaydı bulunamadı.");
    }

    const opening = Number(validated.bakiye || 0);
    return await prisma.$transaction(async (tx) => {
      const created = await tx.cariKart.create({
        data: {
          companyId: company.id,
          kod: validated.kod,
          ad: validated.ad,
          vergiNo: validated.vergiNo,
          vergiDairesi: validated.vergiDairesi || null,
          iban: validated.iban || null,
          bakiye: new Prisma.Decimal(0),
          telefon: validated.telefon || null,
          eposta: validated.eposta || null,
          adres: validated.adres || null,
          isActive: validated.isActive,
        },
      });
      if (opening !== 0) {
        const borc = opening > 0 ? opening : 0;
        const alacak = opening < 0 ? Math.abs(opening) : 0;
        await tx.cariHareket.create({
          data: {
            companyId: company.id,
            cariId: created.id,
            tarih: new Date(),
            borc: new Prisma.Decimal(borc),
            alacak: new Prisma.Decimal(alacak),
            aciklama: "Açılış bakiyesi",
          },
        });
        await tx.cariKart.update({
          where: { id: created.id },
          data: { bakiye: new Prisma.Decimal(borc - alacak) },
        });
      }
      return tx.cariKart.findUniqueOrThrow({ where: { id: created.id } });
    });
  }

  /**
   * Vergi Numarası veya TCKN ile Cari Kart Arama
   */
  public static async findByVergiNo(vergiNo: string, client: any = prisma) {
    const clean = vergiNo.trim();
    return await client.cariKart.findFirst({
      where: { vergiNo: clean },
    });
  }
}
