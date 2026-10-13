import { Decimal, toDecimal, roundMoney } from "../../lib/financialMath";

export type StokKatman = {
  kalan: string;
  birimMaliyet: string;
};

/** Çıkış eldeki miktarı eksiye düşüremez. */
export function stokCikisKontrol(eldeki: string, cikis: string): void {
  const kalan = toDecimal(eldeki).minus(cikis);
  if (toDecimal(cikis).lte(0)) throw new Error("Çıkış miktarı pozitif olmalıdır.");
  if (kalan.lt(0)) throw new Error("Stok yetersiz. Negatif stok yazılmaz.");
}

/** Ağırlıklı ortalama birim maliyet. Girişten sonra yeni birim döner. */
export function ortalamaGiris(eldekiMiktar: string, ortalama: string, giris: string, girisBirim: string): string {
  const eski = toDecimal(eldekiMiktar);
  const yeniMiktar = eski.plus(giris);
  if (yeniMiktar.lte(0)) return "0.000000";
  const deger = eski.mul(toDecimal(ortalama || "0")).plus(toDecimal(giris).mul(girisBirim));
  return deger.div(yeniMiktar).toDecimalPlaces(6, Decimal.ROUND_HALF_UP).toFixed(6);
}

export function ortalamaCikis(eldekiMiktar: string, ortalama: string, cikis: string): string {
  stokCikisKontrol(eldekiMiktar, cikis);
  if (toDecimal(ortalama || "0").lte(0)) throw new Error("Ağırlıklı ortalama maliyet yok. Çıkış yazılmadı.");
  return roundMoney(toDecimal(cikis).mul(ortalama)).toFixed(2);
}

/** İlk giren ilk çıkar. Katmanlar eskiden yeniye sıralı olmalıdır. */
export function fifoCikis(katmanlar: StokKatman[], cikis: string): { maliyet: string; kalanlar: StokKatman[] } {
  let ihtiyac = toDecimal(cikis);
  if (ihtiyac.lte(0)) throw new Error("Çıkış miktarı pozitif olmalıdır.");
  let maliyet = new Decimal(0);
  const kalanlar = katmanlar.map((katman) => ({ ...katman }));
  for (const katman of kalanlar) {
    if (ihtiyac.lte(0)) break;
    const elde = toDecimal(katman.kalan);
    if (elde.lte(0)) continue;
    const alinan = elde.lt(ihtiyac) ? elde : ihtiyac;
    maliyet = maliyet.plus(alinan.mul(katman.birimMaliyet));
    katman.kalan = elde.minus(alinan).toDecimalPlaces(4, Decimal.ROUND_HALF_UP).toFixed(4);
    ihtiyac = ihtiyac.minus(alinan);
  }
  if (ihtiyac.gt(0)) throw new Error("Stok yetersiz. Negatif stok yazılmaz.");
  return { maliyet: roundMoney(maliyet).toFixed(2), kalanlar };
}
