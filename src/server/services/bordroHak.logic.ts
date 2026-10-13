import { Decimal } from "../../lib/financialMath";
import { money } from "../money";

function para(value: Decimal): string {
  return money(value.toString()).toFixed(2);
}

/** 4857/53. 1 yıldan az izin yok. Yaş yoksa 18/50 kuralı uygulanmaz. */
export function yillikIzinGunu(hizmetGun: number, yas: number | null): number {
  if (hizmetGun < 365) return 0;
  const yil = hizmetGun / 365;
  let gun = 14;
  if (yil > 5 && yil < 15) gun = 20;
  if (yil >= 15) gun = 26;
  if (yas != null && (yas < 18 || yas >= 50) && gun < 20) gun = 20;
  return gun;
}

/**
 * 1475/14. Tutar = min(aylık brüt, tavan) × hizmet günü / 365.
 * TODO(MEVZUAT-DOGRULA): Esas ücret çıplak brüt mü, giydirilmiş brüt mü.
 * TODO(MEVZUAT-DOGRULA): Hangi fesih nedeninde hak doğar. Bu tutar hakkı kendiliğinden vermez.
 */
export function kidemTutari(hizmetGun: number, brutAylik: string, tavan: string): { tutar: string; uyari: string } {
  const uyari = "Tutar, kıdem hakkı doğmuşsa uygulanır. Fesih nedeni bu hesapta yoktur.";
  if (hizmetGun < 365) return { tutar: "0.00", uyari };
  const aylik = money(brutAylik);
  const sinir = money(tavan);
  const esas = aylik.lessThan(sinir) ? aylik : sinir;
  return { tutar: para(esas.mul(hizmetGun).div(365)), uyari };
}

/** 4857/17. TODO(MEVZUAT-DOGRULA): 6 ay, 1,5 yıl ve 3 yıl sınırları takvim günüyle 183, 548 ve 1096 alındı. */
export function ihbarHafta(hizmetGun: number): number {
  if (hizmetGun < 183) return 2;
  if (hizmetGun <= 548) return 4;
  if (hizmetGun <= 1096) return 6;
  return 8;
}

export function ihbarTutari(hizmetGun: number, brutAylik: string): { hafta: number; tutar: string; uyari: string } {
  const hafta = ihbarHafta(hizmetGun);
  const tutar = para(money(brutAylik).div(30).mul(hafta).mul(7));
  return {
    hafta,
    tutar,
    uyari: "Tutar, ihbar hakkı doğmuşsa uygulanır. Fesih nedeni bu hesapta yoktur.",
  };
}

export function hizmetGunu(baslangic: Date, bitis: Date): number {
  const bas = Date.UTC(baslangic.getFullYear(), baslangic.getMonth(), baslangic.getDate());
  const son = Date.UTC(bitis.getFullYear(), bitis.getMonth(), bitis.getDate());
  return Math.round((son - bas) / 86400000);
}

export function oncekiDonem(donem: string): string | null {
  const eslesme = /^(\d{4})-(\d{2})$/.exec(donem);
  if (!eslesme) return null;
  const ay = Number(eslesme[2]);
  if (ay <= 1) return null;
  return `${eslesme[1]}-${String(ay - 1).padStart(2, "0")}`;
}

export function bildirimUygun(olay: Date, bildirim: Date, gun: number, yon: "once" | "sonra"): boolean {
  const fark = hizmetGunu(yon === "once" ? bildirim : olay, yon === "once" ? olay : bildirim);
  if (yon === "once") return fark >= gun;
  return fark >= 0 && fark <= gun;
}
