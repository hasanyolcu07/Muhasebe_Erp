import { Decimal, toDecimal, roundMoney } from "../../lib/financialMath";

export type StokHesapKodu = "150" | "151" | "152" | "153";
export type FaturaYon = "SATIS" | "ALIS" | "SATIS_IADE" | "ALIS_IADE";

export type FisSatiri = {
  hesapKodu: string;
  aciklama: string;
  borc: string;
  alacak: string;
};

export type FaturaKalem = {
  matrah: string;
  kdv: string;
  stokHesap: StokHesapKodu | null;
  maliyet: string | null;
};

const TEVKIFAT_HESAP = "360.01";

export function stokHesabi(stokTipi: string, tur: string): StokHesapKodu {
  if (stokTipi === "TICARI_MAL") return "153";
  if (stokTipi === "MAMUL" || tur === "MAMUL") return "152";
  if (stokTipi === "YARI_MAMUL" || tur === "YARI_MAMUL") return "151";
  return "150";
}

/** Mamul 620, ticari mal 621. 150 ve 151 satış maliyeti bu adımda yoktur. */
export function satisMaliyetHesabi(stokHesap: StokHesapKodu): "620" | "621" | null {
  if (stokHesap === "152") return "620";
  if (stokHesap === "153") return "621";
  return null;
}

function ekle(
  kova: Map<string, { borc: Decimal; alacak: Decimal }>,
  hesap: string,
  borc: Decimal,
  alacak: Decimal,
) {
  const once = kova.get(hesap) || { borc: new Decimal(0), alacak: new Decimal(0) };
  kova.set(hesap, { borc: once.borc.plus(borc), alacak: once.alacak.plus(alacak) });
}

/**
 * Onaylı fatura yevmiye satırları.
 * Tevkifat oranı KDV içindeki paydır (1 = tamamı). Resmi oran burada yok.
 * TODO(MEVZUAT-DOGRULA): Tevkifatlı alış iadesinde tutar önceki dönemde ödendiyse 360.01 yerine hangi hesap kullanılacağı.
 * TODO(MEVZUAT-DOGRULA): 150 ve 151 satıldığında maliyet ve gelir hesabı.
 */
export function faturaFisSatirlari(input: {
  yon: FaturaYon;
  belgeNo: string;
  tevkifatOran: string;
  kalemler: FaturaKalem[];
}): FisSatiri[] {
  const oran = toDecimal(input.tevkifatOran || "0");
  if (oran.lt(0) || oran.gt(1)) throw new Error("Tevkifat oranı 0 ile 1 arasında olmalıdır.");
  let matrah = new Decimal(0);
  let kdv = new Decimal(0);
  const kova = new Map<string, { borc: Decimal; alacak: Decimal }>();
  const aciklama = `Fatura ${input.belgeNo}`;

  for (const kalem of input.kalemler) {
    const m = roundMoney(kalem.matrah);
    const k = roundMoney(kalem.kdv);
    matrah = matrah.plus(m);
    kdv = kdv.plus(k);
    if (!kalem.stokHesap) continue;
    if ((input.yon === "SATIS" || input.yon === "SATIS_IADE") && !satisMaliyetHesabi(kalem.stokHesap)) {
      throw new Error("150 ve 151 hesabındaki stok için satış maliyet hesabı doğrulanmadı. Fiş yazılmadı.");
    }
    const maliyetHesap = kalem.stokHesap ? satisMaliyetHesabi(kalem.stokHesap) : null;
    if (input.yon === "ALIS") ekle(kova, kalem.stokHesap, m, new Decimal(0));
    if (input.yon === "ALIS_IADE") ekle(kova, kalem.stokHesap, new Decimal(0), m);
    if ((input.yon === "SATIS" || input.yon === "SATIS_IADE") && maliyetHesap && kalem.maliyet) {
      const maliyet = roundMoney(kalem.maliyet);
      if (input.yon === "SATIS") {
        ekle(kova, maliyetHesap, maliyet, new Decimal(0));
        ekle(kova, kalem.stokHesap, new Decimal(0), maliyet);
      } else {
        ekle(kova, kalem.stokHesap, maliyet, new Decimal(0));
        ekle(kova, maliyetHesap, new Decimal(0), maliyet);
      }
    }
  }

  const tevkifat = roundMoney(kdv.mul(oran));
  const kalanKdv = kdv.minus(tevkifat);
  const tahsil = matrah.plus(kalanKdv);

  if (input.yon === "SATIS") {
    ekle(kova, "120", tahsil, new Decimal(0));
    ekle(kova, "600", new Decimal(0), matrah);
    ekle(kova, "391", new Decimal(0), kalanKdv);
  } else if (input.yon === "SATIS_IADE") {
    ekle(kova, "610", matrah, new Decimal(0));
    ekle(kova, "391", kalanKdv, new Decimal(0));
    ekle(kova, "120", new Decimal(0), tahsil);
  } else if (input.yon === "ALIS") {
    ekle(kova, "191", kdv, new Decimal(0));
    ekle(kova, TEVKIFAT_HESAP, new Decimal(0), tevkifat);
    ekle(kova, "320", new Decimal(0), tahsil);
  } else {
    ekle(kova, "320", tahsil, new Decimal(0));
    ekle(kova, TEVKIFAT_HESAP, tevkifat, new Decimal(0));
    ekle(kova, "191", new Decimal(0), kdv);
  }

  const satirlar: FisSatiri[] = [];
  for (const [hesapKodu, tutar] of kova) {
    const borc = roundMoney(tutar.borc);
    const alacak = roundMoney(tutar.alacak);
    if (borc.isZero() && alacak.isZero()) continue;
    satirlar.push({
      hesapKodu,
      aciklama,
      borc: borc.toFixed(2),
      alacak: alacak.toFixed(2),
    });
  }
  const toplamBorc = satirlar.reduce((sum, satir) => sum.plus(satir.borc), new Decimal(0));
  const toplamAlacak = satirlar.reduce((sum, satir) => sum.plus(satir.alacak), new Decimal(0));
  if (!roundMoney(toplamBorc).eq(roundMoney(toplamAlacak))) {
    throw new Error("Fatura fişi denk değil.");
  }
  if (satirlar.length < 2) throw new Error("Fatura fişi en az iki satır olmalıdır.");
  return satirlar;
}
