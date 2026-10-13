import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { PublicError } from "../security/publicError";
import { addMoney, money } from "../money";
import { hesapFiseUygun } from "../muhasebe/thpKilit.logic";
import { fisTarihiUygun, sonrakiFisNo, tarihGun } from "../muhasebe/yevmiyeNo.logic";
import type { FisSatiri } from "./finansDonem.logic";

export async function yazKesinFis(
  db: Prisma.TransactionClient,
  input: {
    companyId: number;
    tarih: Date;
    aciklama: string;
    satirlar: FisSatiri[];
    kullaniciId: number | null;
    ip: string | null;
    maliyetYontemi: string;
  },
): Promise<{ id: number; fisNo: string }> {
  const year = input.tarih.getFullYear();
  const period = await db.fiscalPeriod.findUnique({ where: { companyId_year: { companyId: input.companyId, year } } });
  if (period?.isClosed) throw new PublicError(`${year} mali dönemi kilitli. Bu tarihe kayıt yapılamaz.`, 409);
  for (const line of input.satirlar) {
    const red = hesapFiseUygun(line.hesap, input.maliyetYontemi);
    if (red) throw new PublicError(red, 422);
  }
  const kodlar = [...new Set(input.satirlar.map((line) => line.hesap))];
  const planda = await db.hesapPlani.findMany({
    where: { companyId: input.companyId, kod: { in: kodlar } },
    select: { kod: true },
  });
  const varOlan = new Set(planda.map((hesap) => hesap.kod));
  const yok = kodlar.find((kod) => !varOlan.has(kod));
  if (yok) throw new PublicError(`${yok} hesap planında yok. Fiş yazılmadı.`, 422);
  const baslangic = new Date(year, 0, 1);
  const bitis = new Date(year + 1, 0, 1);
  const kesinler = await db.yevmiyeKaydi.findMany({
    where: { companyId: input.companyId, durum: "KESIN", tarih: { gte: baslangic, lt: bitis } },
    select: { fisNo: true, tarih: true },
  });
  const son = kesinler.reduce<Date | null>((en, fis) => (!en || fis.tarih > en ? fis.tarih : en), null);
  if (!fisTarihiUygun(son, input.tarih)) {
    throw new PublicError("Fiş tarihi, aynı yıldaki son kesin fişten önce olamaz.", 409);
  }
  const fisNo = sonrakiFisNo(year, kesinler.map((fis) => fis.fisNo));
  const borc = addMoney(input.satirlar.map((line) => line.borc));
  const alacak = addMoney(input.satirlar.map((line) => line.alacak));
  if (!borc.equals(alacak) || borc.lessThanOrEqualTo(0)) {
    throw new PublicError("Fiş denk değil. Kayıt yazılmadı.", 422);
  }
  const yevmiye = await db.yevmiyeKaydi.create({
    data: {
      companyId: input.companyId,
      fisNo,
      tarih: input.tarih,
      aciklama: input.aciklama,
      toplamBorc: borc.toFixed(2),
      toplamAlacak: alacak.toFixed(2),
      durum: "KESIN",
      isLocked: true,
      satirlar: {
        create: input.satirlar.map((line, index) => ({
          satirNo: index + 1,
          hesapKodu: line.hesap,
          aciklama: line.aciklama,
          borc: line.borc,
          alacak: line.alacak,
        })),
      },
    },
  });
  await db.auditLog.create({
    data: {
      tabloAdi: "yevmiye_kayitlari",
      islemTipi: "INSERT",
      kullaniciId: input.kullaniciId,
      ipAdresi: input.ip,
      yeniVeri: { fisNo, tarih: tarihGun(input.tarih), kaynak: input.aciklama.slice(0, 80) },
    },
  });
  return { id: yevmiye.id, fisNo };
}

export async function maliyetYontemi(companyId: number): Promise<string> {
  const ayar = await prisma.companyAyar.findUnique({ where: { companyId } });
  return ayar?.maliyetYontemi === "7B" ? "7B" : "7A";
}

export function bakiyeTl(
  acilis: unknown,
  hareketler: Array<{ hesapId: number; hedefId: number | null; tur: string; tutar: unknown }>,
  id: number,
): string {
  let toplam = money(acilis);
  for (const hareket of hareketler) {
    const tutar = money(hareket.tutar);
    if (hareket.hesapId === id && (hareket.tur === "TAHSILAT" || hareket.tur === "KUR_ARTIS")) toplam = toplam.plus(tutar);
    if (hareket.hesapId === id && (hareket.tur === "ODEME" || hareket.tur === "MASRAF" || hareket.tur === "VIRMAN" || hareket.tur === "KUR_AZALIS")) {
      toplam = toplam.minus(tutar);
    }
    if (hareket.hedefId === id && hareket.tur === "VIRMAN") toplam = toplam.plus(tutar);
  }
  return toplam.toFixed(2);
}
