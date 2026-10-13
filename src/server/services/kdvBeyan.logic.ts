import { Decimal, roundMoney } from "../../lib/financialMath";

export type KdvHareket = {
  hesapKodu: string;
  borc: string;
  alacak: string;
};

/**
 * Beyan tutarları dönem fişlerinden okunur. Bu fonksiyon tahakkuk fişi kesmez.
 * TODO(MEVZUAT-DOGRULA): KDV md. 29 indirim hakkı süresi. Formül yalnız dönemde 191'e yazılmış tutarı alır.
 * TODO(MEVZUAT-DOGRULA): İstisna, ihraç kayıtlı ve indirilemeyecek KDV bu netin dışındadır.
 */
export function kdvBeyanHesapla(input: { oncekiDevreden: string; hareketler: KdvHareket[] }) {
  let indirilecek = new Decimal(0);
  let hesaplanan = new Decimal(0);
  let tevkifat = new Decimal(0);
  for (const hareket of input.hareketler) {
    const kod = hareket.hesapKodu;
    const borc = roundMoney(hareket.borc);
    const alacak = roundMoney(hareket.alacak);
    if (kod === "191" || kod.startsWith("191.")) indirilecek = indirilecek.plus(borc).minus(alacak);
    if (kod === "391" || kod.startsWith("391.")) hesaplanan = hesaplanan.plus(alacak).minus(borc);
    if (kod === "360.01" || kod.startsWith("360.01.")) tevkifat = tevkifat.plus(alacak).minus(borc);
  }
  const onceki = roundMoney(input.oncekiDevreden || "0");
  const fark = hesaplanan.minus(indirilecek).minus(onceki);
  const odenecek = fark.gt(0) ? roundMoney(fark) : roundMoney(0);
  const devreden = fark.lt(0) ? roundMoney(fark.neg()) : roundMoney(0);
  return {
    indirilecek191: roundMoney(indirilecek).toFixed(2),
    hesaplanan391: roundMoney(hesaplanan).toFixed(2),
    oncekiDevreden190: onceki.toFixed(2),
    odenecek: odenecek.toFixed(2),
    devreden: devreden.toFixed(2),
    tevkifat360: roundMoney(tevkifat).toFixed(2),
    tahakkukFisi: false,
  };
}
