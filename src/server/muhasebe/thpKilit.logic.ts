/** THP ana hesap kilidi ve fiş hesabı uygunluğu. Resmi oran içermez. */

const KILITLI = new Set(["SINIF", "ALT_SINIF", "ANA"]);

export function kilitliSeviye(seviye: string): boolean {
  return KILITLI.has(seviye);
}

export function altHesapAnaKodu(kod: string): string | null {
  const temiz = kod.trim().replace(/\s+/g, "");
  const eslesme = /^([1-7]\d{2})(\.\d{2,3})+$/.exec(temiz);
  return eslesme ? eslesme[1] : null;
}

/**
 * 1 ve 2 haneli hesaba fiş yazılmaz.
 * 7/B şirkette 710-789 reddedilir. 790-799 kalır.
 */
export function hesapFiseUygun(kod: string, maliyetYontemi: string): string | null {
  const temiz = kod.trim();
  if (!/^[1-7]\d{2}(\.\d{2,3})*$/.test(temiz)) {
    return "Hesap kodu THP biçiminde değil. Ana hesap 3 hane, alt hesap noktalıdır.";
  }
  if (maliyetYontemi === "7B" && /^7[1-8]/.test(temiz)) {
    return "7/B şirkette 710-789 hesabına fiş yazılmaz.";
  }
  return null;
}
