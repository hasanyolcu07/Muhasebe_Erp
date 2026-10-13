/**
 * Vergi Kimlik Numarası (VKN) ve TC Kimlik Numarası (TCKN) Doğrulama Kütüphanesi
 * Türkiye Muhasebe Standartları (TMS) ve Vergi Usul Kanunu (VUK) Uyumlu
 */

import { z } from "zod";

/**
 * 10 Haneli Vergi Kimlik Numarası (VKN) Algoritmik Doğrulaması (Modül 10 Kuralı)
 *
 * Algoritma:
 * - İlk 9 hanenin her biri için (i = 0..8):
 *   v = (hane + (9 - i)) % 10
 *   v != 0 ise: c = (v * 2^(9 - i)) % 9; (c == 0 ise 9 alınır)
 *   v == 0 ise: c = 0
 * - Tüm c değerleri toplanır.
 * - Son hane: (10 - (toplam % 10)) % 10 değerine eşit olmalıdır.
 */
export function validateVKN(vkn: string): boolean {
  if (!vkn || typeof vkn !== "string") return false;
  const clean = vkn.trim();
  if (!/^\d{10}$/.test(clean)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    const digit = Number(clean[i]);
    const v = (digit + (9 - i)) % 10;
    if (v === 0) {
      sum += 0;
    } else {
      const c = (v * Math.pow(2, 9 - i)) % 9;
      sum += c === 0 ? 9 : c;
    }
  }

  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === Number(clean[9]);
}

/**
 * 11 Haneli TC Kimlik Numarası (TCKN) Algoritmik Doğrulaması
 *
 * Algoritma:
 * - 11 haneli ve tamamen rakamlardan oluşmalıdır.
 * - İlk hane '0' olamaz.
 * - 1, 3, 5, 7, 9. hanelerin toplamı = tekToplam
 * - 2, 4, 6, 8. hanelerin toplamı = ciftToplam
 * - 10. hane = ((tekToplam * 7) - ciftToplam) % 10
 * - 11. hane = (ilk 10 hanenin toplamı) % 10
 */
export function validateTCKN(tckn: string): boolean {
  if (!tckn || typeof tckn !== "string") return false;
  const clean = tckn.trim();
  if (!/^\d{11}$/.test(clean)) return false;
  if (clean[0] === "0") return false;

  const digits = clean.split("").map(Number);

  const tekToplam = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
  const ciftToplam = digits[1] + digits[3] + digits[5] + digits[7];

  const calculated10 = ((tekToplam * 7) - ciftToplam) % 10;
  // Negatif modül güvenliği
  const hane10 = calculated10 < 0 ? calculated10 + 10 : calculated10;
  if (digits[9] !== hane10) return false;

  const ilk10Toplam = digits.slice(0, 10).reduce((acc, d) => acc + d, 0);
  const hane11 = ilk10Toplam % 10;
  return digits[10] === hane11;
}

/** Zod Şeması: Zorunlu VKN (Tüzel Kişiler için 10 Hane) */
export const vknZodSchema = z
  .string()
  .trim()
  .regex(/^\d{10}$/, "Vergi Kimlik Numarası (VKN) tam 10 haneli olmalıdır.")
  .refine((vkn) => validateVKN(vkn), {
    message: "Geçersiz Vergi Kimlik Numarası (VKN algoritma kontrolü başarısız).",
  });

/** Zod Şeması: Zorunlu TCKN (Şahıs Şirketleri / Gerçek Kişiler için 11 Hane) */
export const tcknZodSchema = z
  .string()
  .trim()
  .regex(/^\d{11}$/, "TC Kimlik Numarası (TCKN) tam 11 haneli olmalıdır.")
  .refine((tckn) => validateTCKN(tckn), {
    message: "Geçersiz TC Kimlik Numarası (TCKN algoritma kontrolü başarısız).",
  });

/** Zod Şeması: Esnek Vergi Kimlik (VKN veya TCKN ikisinden birini doğrular) */
export const vergiNoZodSchema = z
  .string()
  .trim()
  .refine(
    (val) => {
      if (/^\d{10}$/.test(val)) return validateVKN(val);
      if (/^\d{11}$/.test(val)) return validateTCKN(val);
      return false;
    },
    {
      message: "Geçerli bir 10 haneli VKN veya 11 haneli TCKN girilmelidir.",
    }
  );
