import { MEVZUAT_SEED_TASLAK, mevzuatEtiket } from "../../prisma/mevzuat.seed";
import type { PayrollParameterSet } from "../modules/personel/types/personelTypes";

export type MevzuatKalemGirdi = {
  anahtar: string;
  deger: string | null;
};

export type MevzuatYilPlani = {
  yil: number;
  baslangic: string;
  bitis: string;
  kaynak: string;
  yazilacak: Array<{ anahtar: string; deger: string }>;
  silinecek: string[];
};

const DEGER = /^(?:0|[1-9]\d{0,11})(?:\.\d{1,6})?$/;

export function yilSiniri(yil: number): { baslangic: string; bitis: string } {
  // TODO(MEVZUAT-DOGRULA): Asgari ücret, SGK taban/tavan ve kıdem tavanı yıl içinde birden fazla kez değişebilir. Bu fonksiyon takvim yılını tek aralıkta saklar.
  if (!Number.isInteger(yil) || yil < 2000 || yil > 2100) {
    throw new Error("Çalışma yılı 2000 ile 2100 arasında olmalıdır.");
  }
  return { baslangic: `${yil}-01-01`, bitis: `${yil}-12-31` };
}

function katalog(anahtar: string) {
  return MEVZUAT_SEED_TASLAK.find((satir) => satir.anahtar === anahtar);
}

function katalogBirimi(anahtar: string): "oran" | "tl" | "gun" | null {
  const tanim = katalog(anahtar);
  if (tanim) return tanim.birim;
  if (/^kdv\.tevkifat\.\d{3}$/.test(anahtar)) return "oran";
  return null;
}

/** Yıl kaydı 1 Ocak–31 Aralık aralığına yazılır. Boş değer o yılın satırını siler. */
export function mevzuatYilPlani(yil: number, kaynak: string, kalemler: MevzuatKalemGirdi[]): MevzuatYilPlani {
  const sinir = yilSiniri(yil);
  const gorulen = new Set<string>();
  const yazilacak: MevzuatYilPlani["yazilacak"] = [];
  const silinecek: string[] = [];

  for (const kalem of kalemler) {
    const tanimBirim = katalogBirimi(kalem.anahtar);
    if (!tanimBirim) throw new Error(`${kalem.anahtar} bilinen bir mevzuat anahtarı değil.`);
    if (gorulen.has(kalem.anahtar)) throw new Error(`${mevzuatEtiket(kalem.anahtar)} iki kez gönderildi.`);
    gorulen.add(kalem.anahtar);
    const ham = kalem.deger == null ? "" : String(kalem.deger).trim();
    if (!ham) {
      silinecek.push(kalem.anahtar);
      continue;
    }
    if (!DEGER.test(ham)) throw new Error(`${mevzuatEtiket(kalem.anahtar)} sayı olmalıdır.`);
    const sayi = Number(ham);
    if (tanimBirim === "oran" && sayi > 1) {
      throw new Error(`${mevzuatEtiket(kalem.anahtar)} 1'i aşamaz. 1, yüzde 100 demektir.`);
    }
    if (tanimBirim === "tl" && sayi <= 0) {
      throw new Error(`${mevzuatEtiket(kalem.anahtar)} sıfırdan büyük olmalıdır.`);
    }
    if (tanimBirim === "gun" && (!Number.isInteger(sayi) || sayi <= 0 || sayi > 366)) {
      throw new Error(`${mevzuatEtiket(kalem.anahtar)} 1 ile 366 arasında tam gün olmalıdır.`);
    }
    yazilacak.push({ anahtar: kalem.anahtar, deger: ham });
  }

  const dayanak = kaynak.trim();
  if (yazilacak.length > 0 && dayanak.length < 3) {
    throw new Error("Kaynak en az 3 karakter olmalıdır. Resmi gazete, tebliğ veya karar adını yazın.");
  }

  return {
    yil,
    baslangic: sinir.baslangic,
    bitis: sinir.bitis,
    kaynak: dayanak,
    yazilacak,
    silinecek,
  };
}

const BORDRO_ZORUNLU = [
  "sgk.isci.oran",
  "sgk.isveren.oran",
  "sgk.issizlik.isci.oran",
  "sgk.issizlik.isveren.oran",
  "sgk.taban",
  "sgk.tavan",
  "gv.dilim.1.oran",
  "gv.dilim.1.ust",
  "gv.dilim.2.oran",
  "gv.dilim.2.ust",
  "gv.dilim.3.oran",
  "gv.dilim.3.ust",
  "gv.dilim.4.oran",
  "gv.dilim.4.ust",
  "gv.dilim.5.oran",
  "damga.oran",
  "asgari_ucret.brut",
] as const;

function sayi(degerler: Record<string, string>, anahtar: string): number {
  const ham = degerler[anahtar];
  if (ham == null || ham === "") {
    throw new Error(`${mevzuatEtiket(anahtar)} için değer yok.`);
  }
  return Number(ham);
}

/** Kayıtlı yıl değerlerinden bordro parametresi üretir. Eksik anahtar varsa hata verir. */
export function payrollSetFromDegerler(
  yil: number,
  kaynak: string,
  degerler: Record<string, string>,
): PayrollParameterSet {
  const eksik = BORDRO_ZORUNLU.filter((anahtar) => !degerler[anahtar]);
  if (eksik.length > 0) {
    throw new Error(
      `${yil} yılı için bordro parametresi eksik: ${eksik.map((anahtar) => mevzuatEtiket(anahtar)).join(", ")}.`,
    );
  }
  const sinir = yilSiniri(yil);
  const dilimler = [1, 2, 3, 4].map((n) => ({
    limit: sayi(degerler, `gv.dilim.${n}.ust`),
    rate: sayi(degerler, `gv.dilim.${n}.oran`),
  }));
  for (let i = 1; i < dilimler.length; i += 1) {
    if (dilimler[i].limit <= dilimler[i - 1].limit) {
      throw new Error("Gelir vergisi dilim üst sınırları artan sırada olmalıdır.");
    }
  }
  const taban = sayi(degerler, "sgk.taban");
  const tavan = sayi(degerler, "sgk.tavan");
  if (tavan < taban) throw new Error("SGK tavanı tabandan küçük olamaz.");
  const tesvik = degerler["sgk.tesvik.5510.oran"];
  const gvIstisna = degerler["asgari_ucret.istisna.gelir_vergisi"];
  const dvIstisna = degerler["asgari_ucret.istisna.damga"];
  return {
    period_year: yil,
    valid_from: sinir.baslangic,
    valid_to: sinir.bitis,
    source: kaynak.trim() || `${yil} yılı kayıtlı parametre`,
    asgari_ucret_brut: sayi(degerler, "asgari_ucret.brut"),
    sgk_taban: taban,
    sgk_tavan: tavan,
    sgk_isci_orani: sayi(degerler, "sgk.isci.oran"),
    issizlik_isci_orani: sayi(degerler, "sgk.issizlik.isci.oran"),
    sgk_isveren_orani: sayi(degerler, "sgk.isveren.oran"),
    sgk_5510_tesvik_orani: tesvik ? Number(tesvik) : 0,
    issizlik_isveren_orani: sayi(degerler, "sgk.issizlik.isveren.oran"),
    damga_vergisi_orani: sayi(degerler, "damga.oran"),
    tax_brackets: [...dilimler, { limit: Number.POSITIVE_INFINITY, rate: sayi(degerler, "gv.dilim.5.oran") }],
    asgari_ucret_istisnasi_var: true,
    gv_istisna_tutari: gvIstisna ? Number(gvIstisna) : null,
    dv_istisna_tutari: dvIstisna ? Number(dvIstisna) : null,
  };
}
