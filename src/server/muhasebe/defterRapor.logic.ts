import { Decimal } from "../../lib/financialMath";
import { money } from "../money";

export type DefterHareket = {
  fisNo: string;
  tarih: string;
  hesapKodu: string;
  aciklama: string;
  borc: string;
  alacak: string;
};

export type DefterRapor = {
  tur: "yevmiye" | "kebir" | "mizan" | "bilanco" | "gelir";
  satirlar: Array<Record<string, string>>;
  toplamBorc: string;
  toplamAlacak: string;
  bilgi: string | null;
  giderCesitleri: Array<Record<string, string>>;
};

function para(value: Decimal | string | number): string {
  return money(value).toFixed(2);
}

function sinif(kod: string): string {
  return kod.trim().charAt(0);
}

function kapanisMi(fisNo: string): boolean {
  return fisNo.startsWith("KAPANIS-");
}

function topla(satirlar: DefterHareket[]): { borc: Decimal; alacak: Decimal } {
  let borc = new Decimal(0);
  let alacak = new Decimal(0);
  for (const satir of satirlar) {
    borc = borc.plus(money(satir.borc));
    alacak = alacak.plus(money(satir.alacak));
  }
  return { borc, alacak };
}

function mizanSatirlari(hareketler: DefterHareket[]): Array<Record<string, string>> {
  const map = new Map<string, { borc: Decimal; alacak: Decimal }>();
  for (const satir of hareketler) {
    const kod = satir.hesapKodu.trim();
    const mevcut = map.get(kod) ?? { borc: new Decimal(0), alacak: new Decimal(0) };
    mevcut.borc = mevcut.borc.plus(money(satir.borc));
    mevcut.alacak = mevcut.alacak.plus(money(satir.alacak));
    map.set(kod, mevcut);
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], "tr"))
    .map(([hesapKodu, tutar]) => ({
      hesapKodu,
      borc: para(tutar.borc),
      alacak: para(tutar.alacak),
      bakiye: para(tutar.borc.minus(tutar.alacak)),
    }));
}

/**
 * Defter raporları kesin fiş satırlarından okunur. Fiş yazılmaz.
 * 120 ile 120.01 ayrı satırdır; biri diğerinin içine eklenip ikinci kez toplanmaz.
 * Gelir tablosu yalnız 6. sınıftır ve kapanış fişini içermez.
 * 7. sınıf ayrı gider çeşitleri bloğudur.
 */
export function defterRaporu(
  tur: DefterRapor["tur"],
  hareketler: DefterHareket[],
  hesap?: string
): DefterRapor {
  const sirali = [...hareketler].sort((a, b) => a.tarih.localeCompare(b.tarih) || a.fisNo.localeCompare(b.fisNo, "tr"));
  const filtre = hesap?.trim();
  const kapsam = filtre ? sirali.filter((satir) => satir.hesapKodu === filtre || satir.hesapKodu.startsWith(`${filtre}.`)) : sirali;

  if (tur === "yevmiye" || tur === "kebir") {
    const toplam = topla(kapsam);
    return {
      tur,
      satirlar: kapsam.map((satir) => ({ ...satir })),
      toplamBorc: para(toplam.borc),
      toplamAlacak: para(toplam.alacak),
      bilgi: null,
      giderCesitleri: [],
    };
  }

  if (tur === "mizan") {
    const satirlar = mizanSatirlari(kapsam);
    const toplam = topla(kapsam);
    return {
      tur,
      satirlar,
      toplamBorc: para(toplam.borc),
      toplamAlacak: para(toplam.alacak),
      bilgi: null,
      giderCesitleri: [],
    };
  }

  if (tur === "bilanco") {
    const bilanco = kapsam.filter((satir) => {
      const n = sinif(satir.hesapKodu);
      return n === "1" || n === "2" || n === "3" || n === "4" || n === "5";
    });
    const satirlar = mizanSatirlari(bilanco);
    const toplam = topla(bilanco);
    const altiveyedi = kapsam.filter((satir) => sinif(satir.hesapKodu) === "6" || sinif(satir.hesapKodu) === "7");
    const net = topla(altiveyedi);
    const fark = net.alacak.minus(net.borc);
    const bilgi = fark.isZero()
      ? null
      : `Dönem net kârı/zararı bilgi satırı (kapanış fişi kesilmedi): ${para(fark)}. Bu tutar bilanço toplamına eklenmez.`;
    return {
      tur,
      satirlar,
      toplamBorc: para(toplam.borc),
      toplamAlacak: para(toplam.alacak),
      bilgi,
      giderCesitleri: [],
    };
  }

  const gelirHareket = kapsam.filter((satir) => sinif(satir.hesapKodu) === "6" && !kapanisMi(satir.fisNo));
  const giderHareket = kapsam.filter((satir) => sinif(satir.hesapKodu) === "7" && !kapanisMi(satir.fisNo));
  const gelir = topla(gelirHareket);
  const gider = topla(giderHareket);
  return {
    tur: "gelir",
    satirlar: mizanSatirlari(gelirHareket),
    toplamBorc: para(gelir.borc),
    toplamAlacak: para(gelir.alacak),
    bilgi: "Gelir tablosu yalnız 6. sınıftır. 7. sınıf gider çeşitleri toplama eklenmez.",
    giderCesitleri: mizanSatirlari(giderHareket).concat(
      giderHareket.length
        ? [{ hesapKodu: "TOPLAM-7", borc: para(gider.borc), alacak: para(gider.alacak), bakiye: para(gider.borc.minus(gider.alacak)) }]
        : []
    ),
  };
}
