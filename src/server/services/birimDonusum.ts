import { Decimal, toDecimal } from "../../lib/financialMath";

export type StokBirimi = "KG" | "TON" | "ADET" | "BOBIN";

const BIRIMLER = new Set<StokBirimi>(["KG", "TON", "ADET", "BOBIN"]);

function birim(value: string): StokBirimi {
  const kod = value.trim().toUpperCase();
  if (!BIRIMLER.has(kod as StokBirimi)) throw new Error("Birim kg, ton, adet veya bobin olmalıdır.");
  return kod as StokBirimi;
}

/**
 * kg ile ton arasında 1 ton = 1000 kg.
 * Adet ile bobin, karttaki bobin içi adet katsayısı olmadan dönmez.
 * Ağırlık ile adet arasında katsayı yoksa dönüşüm yapılmaz.
 */
export function birimDonustur(miktar: string, kaynak: string, hedef: string, katsayi: string | null = null): string {
  const from = birim(kaynak);
  const to = birim(hedef);
  const qty = toDecimal(miktar);
  if (qty.lt(0)) throw new Error("Miktar negatif olamaz.");
  if (from === to) return qty.toDecimalPlaces(4, Decimal.ROUND_HALF_UP).toFixed(4);
  if ((from === "KG" && to === "TON") || (from === "TON" && to === "KG")) {
    const sonuc = from === "TON" ? qty.mul(1000) : qty.div(1000);
    return sonuc.toDecimalPlaces(4, Decimal.ROUND_HALF_UP).toFixed(4);
  }
  if ((from === "ADET" && to === "BOBIN") || (from === "BOBIN" && to === "ADET")) {
    if (!katsayi || toDecimal(katsayi).lte(0)) {
      throw new Error("Bobin dönüşümü için kartta adet katsayısı olmalıdır.");
    }
    const sonuc = from === "BOBIN" ? qty.mul(katsayi) : qty.div(katsayi);
    return sonuc.toDecimalPlaces(4, Decimal.ROUND_HALF_UP).toFixed(4);
  }
  throw new Error("Ağırlık ile adet arasında tanımlı katsayı yok. Dönüşüm yapılmadı.");
}
