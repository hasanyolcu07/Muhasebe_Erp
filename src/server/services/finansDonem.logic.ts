import { Decimal } from "../../lib/financialMath";
import { PublicError } from "../security/publicError";
import { addMoney, money } from "../money";

export type FisSatiri = { hesap: string; borc: string; alacak: string; aciklama: string };

function satir(hesap: string, borc: string, alacak: string, aciklama: string): FisSatiri {
  return { hesap, borc: money(borc).toFixed(2), alacak: money(alacak).toFixed(2), aciklama };
}

export function denkFis(satirlar: FisSatiri[]): FisSatiri[] {
  const kalan = satirlar.filter((line) => !money(line.borc).isZero() || !money(line.alacak).isZero());
  const borc = addMoney(kalan.map((line) => line.borc));
  const alacak = addMoney(kalan.map((line) => line.alacak));
  if (!borc.equals(alacak) || borc.lessThanOrEqualTo(0)) {
    throw new PublicError("Fiş denk değil. Kayıt yazılmadı.", 422);
  }
  return kalan;
}

/** Tahsilat, ödeme, virman ve banka masrafı. Karşı hesap çağıran verir. */
export function nakitFisi(
  tur: "TAHSILAT" | "ODEME" | "VIRMAN" | "MASRAF",
  kaynak: string,
  karsi: string,
  tutar: string,
): FisSatiri[] {
  const t = money(tutar);
  if (t.lessThanOrEqualTo(0)) throw new PublicError("Tutar pozitif olmalıdır.", 400);
  if (tur === "TAHSILAT") {
    return denkFis([satir(kaynak, t.toFixed(2), "0", "Tahsilat"), satir(karsi, "0", t.toFixed(2), "Tahsilat")]);
  }
  if (tur === "ODEME" || tur === "MASRAF") {
    return denkFis([satir(karsi, t.toFixed(2), "0", tur === "MASRAF" ? "Banka masrafı" : "Ödeme"), satir(kaynak, "0", t.toFixed(2), "Ödeme")]);
  }
  return denkFis([satir(karsi, t.toFixed(2), "0", "Virman giriş"), satir(kaynak, "0", t.toFixed(2), "Virman çıkış")]);
}

export function cekHesabi(tur: "CEK" | "SENET", yon: "ALINAN" | "VERILEN"): string {
  if (yon === "ALINAN") return tur === "CEK" ? "101" : "121";
  return tur === "SENET" ? "321" : "103";
}

export function cekFisi(
  islem: "GIRIS" | "CIRO" | "TAHSIL" | "KARSILIKSIZ" | "ODEME",
  belgeHesap: string,
  kasaVeyaBanka: string,
  tutar: string,
): FisSatiri[] {
  const t = money(tutar).toFixed(2);
  if (islem === "GIRIS" && (belgeHesap === "101" || belgeHesap === "121")) {
    return denkFis([satir(belgeHesap, t, "0", "Portföy giriş"), satir("120", "0", t, "Alıcı")]);
  }
  if (islem === "GIRIS") {
    return denkFis([satir("320", t, "0", "Satıcı"), satir(belgeHesap, "0", t, "Keşide")]);
  }
  if (islem === "CIRO") return denkFis([satir("320", t, "0", "Ciro"), satir(belgeHesap, "0", t, "Ciro")]);
  if (islem === "TAHSIL") return denkFis([satir(kasaVeyaBanka, t, "0", "Tahsil"), satir(belgeHesap, "0", t, "Çek veya senet")]);
  if (islem === "KARSILIKSIZ") return denkFis([satir("120", t, "0", "Karşılıksız"), satir(belgeHesap, "0", t, "Portföyden çıkış")]);
  return denkFis([satir(belgeHesap, t, "0", "Ödeme"), satir(kasaVeyaBanka, "0", t, "Ödeme")]);
}

/**
 * Normal: matrah aktif maliyettir. Azalan: matrah maliyet eksi birikmiştir.
 * Oran kullanıcıdandır. İki kat ve yüzde 50 tavanı uygulanmaz.
 * TODO(MEVZUAT-DOGRULA): VUK 320 kıst. Bu tutar yılı tam oranla ayırır.
 * TODO(MEVZUAT-DOGRULA): VUK 315 azalan bakiyede oranın iki katı ve son yıl itfası.
 */
export function amortismanTutari(
  maliyet: string,
  birikmis: string,
  oran: string,
  yontem: "NORMAL" | "AZALAN",
): { tutar: string; uyari: string } {
  const uyari = "Kıst uygulanmadı. Oran kullanıcıdan gelir. Azalan bakiyede iki kat ve yüzde 50 tavanı hesaplanmaz.";
  const aktif = money(maliyet);
  const ayrilmis = money(birikmis);
  const kalan = aktif.minus(ayrilmis);
  if (kalan.lessThanOrEqualTo(0)) return { tutar: "0.00", uyari };
  const yuzde = new Decimal(oran);
  if (!Number.isFinite(Number(oran)) || yuzde.lessThanOrEqualTo(0) || yuzde.greaterThan(1)) {
    throw new PublicError("Amortisman oranı 0 ile 1 arasında olmalıdır. Resmi ömür tablosu kullanılmaz.", 422);
  }
  const matrah = yontem === "AZALAN" ? kalan : aktif;
  let tutar = money(matrah.mul(yuzde).toString());
  if (tutar.greaterThan(kalan)) tutar = kalan;
  return { tutar: tutar.toFixed(2), uyari };
}

export function amortismanGiderHesabi(maliyetYontemi: string, uretim: boolean): "796" | "730" | "770" {
  if (maliyetYontemi === "7B") return "796";
  return uretim ? "730" : "770";
}

export function amortismanFisi(tutar: string, giderHesabi: string): FisSatiri[] {
  return denkFis([
    satir(giderHesabi, tutar, "0", "Dönem amortismanı"),
    satir("257", "0", tutar, "Birikmiş amortisman"),
  ]);
}

/** Kur Decimal(18,6) kalır. TL fark kuruşa yuvarlanır. 646 kambiyo karı, 656 kambiyo zararı. */
export function kurFarkiFisi(
  hesap: string,
  dovizTutar: string,
  eskiKur: string,
  yeniKur: string,
  aktif: boolean,
): FisSatiri[] {
  const eski = new Decimal(eskiKur);
  const yeni = new Decimal(yeniKur);
  if (!Number.isFinite(Number(eskiKur)) || !Number.isFinite(Number(yeniKur)) || eski.lessThanOrEqualTo(0) || yeni.lessThanOrEqualTo(0)) {
    throw new PublicError("Kur pozitif olmalıdır. Resmi kur seçilmez, kullanıcı girer.", 422);
  }
  const ham = new Decimal(dovizTutar).mul(yeni.minus(eski));
  const tutar = money(ham.abs().toString());
  if (tutar.isZero()) throw new PublicError("Kur farkı yok. Fiş yazılmadı.", 422);
  const gelir = aktif ? ham.greaterThan(0) : ham.lessThan(0);
  if (gelir) {
    return denkFis([satir(hesap, tutar.toFixed(2), "0", "Kur artışı"), satir("646", "0", tutar.toFixed(2), "Kambiyo kârı")]);
  }
  return denkFis([satir("656", tutar.toFixed(2), "0", "Kambiyo zararı"), satir(hesap, "0", tutar.toFixed(2), "Kur azalışı")]);
}

export function sarfMiktari(net: string, fireYuzde: string): string {
  const fire = new Decimal(fireYuzde || "0");
  if (!Number.isFinite(Number(fireYuzde || "0")) || fire.lessThan(0) || fire.greaterThan(50)) {
    throw new PublicError("Fire yüzdesi 0 ile 50 arasında olmalıdır.", 400);
  }
  const brut = new Decimal(net).mul(new Decimal(1).plus(fire.div(100)));
  if (brut.lessThanOrEqualTo(0)) throw new PublicError("Sarf miktarı pozitif olmalıdır.", 400);
  return brut.toDecimalPlaces(4, Decimal.ROUND_HALF_UP).toFixed(4);
}

export function sarfTutari(miktar: string, birimMaliyet: string): string {
  return money(new Decimal(miktar).mul(new Decimal(birimMaliyet)).toString()).toFixed(2);
}

/**
 * 7/B: yalnız 790 borç, 150 alacak.
 * 7/A: 710/150 sarf ve 152/711 yansıtma kapanışı. İşçilik ve 791 yazılmaz.
 * TODO(MEVZUAT-DOGRULA): 7/B'de mamulün 152'ye alınması ve 798/799 yansıtması. Bu fiş yazmaz.
 */
export function hammaddeFisi(maliyetYontemi: string, tutar: string): { satirlar: FisSatiri[]; uyari: string } {
  const t = money(tutar);
  if (t.lessThanOrEqualTo(0)) throw new PublicError("Hammadde maliyeti yok. Fiş yazılmadı.", 422);
  if (maliyetYontemi === "7B") {
    return {
      satirlar: denkFis([
        satir("790", t.toFixed(2), "0", "İlk madde ve malzeme gideri"),
        satir("150", "0", t.toFixed(2), "Hammadde sarfı"),
      ]),
      uyari: "7/B fişi 790/150. İşçilik, 152 ve 798/799 yazılmadı.",
    };
  }
  const deger = t.toFixed(2);
  return {
    satirlar: denkFis([
      satir("710", deger, "0", "Direkt ilk madde"),
      satir("150", "0", deger, "Hammadde sarfı"),
      satir("152", deger, "0", "Mamul girişi"),
      satir("711", "0", deger, "İlk madde yansıtma"),
      satir("711", deger, "0", "Yansıtma kapanışı"),
      satir("710", "0", deger, "Yansıtma kapanışı"),
    ]),
    uyari: "7/A reçete fişi yalnız hammadde. İşçilik ve genel üretim tekrar yazılmadı.",
  };
}
