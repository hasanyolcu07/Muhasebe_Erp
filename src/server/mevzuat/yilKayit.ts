import { Prisma } from "@prisma/client";
import { MEVZUAT_SEED_TASLAK, mevzuatEtiket } from "../../../prisma/mevzuat.seed";
import { mevzuatYilPlani, payrollSetFromDegerler, yilSiniri, type MevzuatKalemGirdi } from "../../lib/mevzuatYil";
import type { PayrollParameterSet } from "../../modules/personel/types/personelTypes";
import { prisma } from "../prisma";
import { PublicError } from "../security/publicError";

function gun(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function utcGun(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

export async function mevzuatYiliOku(yil: number) {
  let sinir: { baslangic: string; bitis: string };
  try {
    sinir = yilSiniri(yil);
  } catch (error) {
    throw new PublicError(error instanceof Error ? error.message : "Çalışma yılı geçersiz.", 400);
  }
  const rows = await prisma.mevzuatParametre.findMany({
    where: { gecerlilikBaslangic: utcGun(sinir.baslangic) },
    orderBy: { anahtar: "asc" },
  });
  const kaynak = rows.find((row) => row.kaynak.trim())?.kaynak || "";
  const deger = new Map(rows.map((row) => [row.anahtar, sadeDeger(row.deger.toFixed(6))]));
  return {
    yil,
    baslangic: sinir.baslangic,
    bitis: sinir.bitis,
    kaynak,
    kalemler: [
      ...MEVZUAT_SEED_TASLAK.map((satir) => ({
        anahtar: satir.anahtar,
        etiket: mevzuatEtiket(satir.anahtar),
        birim: satir.birim,
        deger: deger.get(satir.anahtar) ?? null,
      })),
      ...rows
        .filter((row) => /^kdv\.tevkifat\.\d{3}$/.test(row.anahtar))
        .map((row) => ({
          anahtar: row.anahtar,
          etiket: `Tevkifat ${row.anahtar.slice(-3)}`,
          birim: "oran" as const,
          deger: deger.get(row.anahtar) ?? null,
        })),
    ],
  };
}

function sadeDeger(value: string): string {
  if (!value.includes(".")) return value;
  return value.replace(/0+$/, "").replace(/\.$/, "");
}

export async function mevzuatYiliKaydet(input: {
  yil: number;
  kaynak: string;
  kalemler: MevzuatKalemGirdi[];
  kullaniciId: number | null;
  ipAdresi: string | null;
}) {
  let plan;
  try {
    plan = mevzuatYilPlani(input.yil, input.kaynak, input.kalemler);
  } catch (error) {
    throw new PublicError(error instanceof Error ? error.message : "Parametre doğrulanamadı.", 400);
  }
  const baslangic = utcGun(plan.baslangic);
  const bitis = utcGun(plan.bitis);
  await prisma.$transaction(async (tx) => {
    const onceki = await tx.mevzuatParametre.findMany({ where: { gecerlilikBaslangic: baslangic } });
    for (const satir of plan.yazilacak) {
      await tx.mevzuatParametre.upsert({
        where: { anahtar_gecerlilikBaslangic: { anahtar: satir.anahtar, gecerlilikBaslangic: baslangic } },
        create: {
          anahtar: satir.anahtar,
          deger: new Prisma.Decimal(satir.deger),
          gecerlilikBaslangic: baslangic,
          gecerlilikBitis: bitis,
          kaynak: plan.kaynak,
        },
        update: {
          deger: new Prisma.Decimal(satir.deger),
          gecerlilikBitis: bitis,
          kaynak: plan.kaynak,
        },
      });
    }
    if (plan.silinecek.length > 0) {
      await tx.mevzuatParametre.deleteMany({
        where: { gecerlilikBaslangic: baslangic, anahtar: { in: plan.silinecek } },
      });
    }
    await tx.auditLog.create({
      data: {
        tabloAdi: "mevzuat_parametreleri",
        islemTipi: "UPDATE",
        kullaniciId: input.kullaniciId,
        eskiVeri: onceki.map((row) => ({
          anahtar: row.anahtar,
          deger: row.deger.toString(),
          baslangic: gun(row.gecerlilikBaslangic),
        })),
        yeniVeri: {
          yil: plan.yil,
          kaynak: plan.kaynak,
          yazilan: plan.yazilacak,
          silinen: plan.silinecek,
        },
        ipAdresi: input.ipAdresi,
      },
    });
  });
  return mevzuatYiliOku(plan.yil);
}

export async function payrollSetForYear(yil: number): Promise<PayrollParameterSet> {
  const kayit = await mevzuatYiliOku(yil);
  const degerler: Record<string, string> = {};
  for (const kalem of kayit.kalemler) {
    if (kalem.deger) degerler[kalem.anahtar] = kalem.deger;
  }
  try {
    return payrollSetFromDegerler(yil, kayit.kaynak, degerler);
  } catch (error) {
    throw new PublicError(error instanceof Error ? error.message : "Yıl parametresi eksik.", 422);
  }
}
