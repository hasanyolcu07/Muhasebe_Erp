import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { Decimal, toDecimal } from "../../lib/financialMath";
import { money } from "../money";
import { prisma } from "../prisma";
import { PublicError } from "../security/publicError";
import { getMevzuatParametre } from "../mevzuat/parametre";
import { MockEBelgeAdapter, ublBirimKodu, type UblTrFatura } from "../ebelge/adapter";
import { birimDonustur } from "./birimDonusum";
import { faturaFisSatirlari, stokHesabi, type FaturaKalem, type FaturaYon } from "./faturaFis.logic";
import { kdvBeyanHesapla } from "./kdvBeyan.logic";
import { fifoCikis, ortalamaCikis, ortalamaGiris, stokCikisKontrol } from "./stokDeger.logic";

export type FaturaGirdi = {
  companyId: number;
  kullaniciId: number | null;
  ipAdresi: string | null;
  belgeNo: string;
  tarih: Date;
  yon: FaturaYon;
  cariId: number | null;
  durum: "TASLAK" | "ONAYLI";
  tevkifatKodu: string | null;
  satirlar: Array<{
    aciklama: string;
    miktar: string;
    birim: string | null;
    birimFiyat: string;
    kdvOran: string;
    stokId: number | null;
  }>;
};

function tarihMetni(tarih: Date): string {
  return tarih.toISOString().slice(0, 10);
}

function katsayi(profil: Prisma.JsonValue | null): string | null {
  if (!profil || typeof profil !== "object" || Array.isArray(profil)) return null;
  const deger = (profil as { bobin_adet?: unknown }).bobin_adet;
  if (deger == null || deger === "") return null;
  return String(deger);
}

async function tevkifatOrani(kod: string | null, tarih: Date): Promise<string> {
  if (!kod) return "0";
  if (!/^\d{3}$/.test(kod)) throw new PublicError("Tevkifat kodu 3 haneli olmalıdır.", 400);
  const deger = await getMevzuatParametre(`kdv.tevkifat.${kod}`, tarihMetni(tarih));
  if (deger.lt(0) || deger.gt(1)) throw new PublicError("Tevkifat oranı 0 ile 1 arasında olmalıdır.", 422);
  return deger.toFixed(6);
}

export async function kaydetFatura(girdi: FaturaGirdi) {
  if (girdi.durum === "ONAYLI" && !girdi.cariId) {
    throw new PublicError("Onaylı faturada cari kart zorunludur.", 400);
  }
  if (girdi.cariId) {
    const cari = await prisma.cariKart.findFirst({ where: { id: girdi.cariId, companyId: girdi.companyId } });
    if (!cari) throw new PublicError("Cari kart bulunamadı.", 404);
  }
  const tevkifatOran = await tevkifatOrani(girdi.tevkifatKodu, girdi.tarih);
  const ayar = await prisma.companyAyar.findUnique({ where: { companyId: girdi.companyId } });
  const degerleme = ayar?.stokDegerleme === "FIFO" ? "FIFO" : "ORTALAMA";

  return prisma.$transaction(async (tx) => {
    const kalemler: FaturaKalem[] = [];
    const stokYazimlari: Array<{
      stokId: number;
      giris: string;
      cikis: string;
      birimMaliyet: string;
      kalan: string;
    }> = [];
    let ara = new Decimal(0);
    let kdv = new Decimal(0);

    for (const satir of girdi.satirlar) {
      const belgeMiktar = toDecimal(satir.miktar);
      let stokMiktar = belgeMiktar;
      let stokHesap: FaturaKalem["stokHesap"] = null;
      let maliyet: string | null = null;
      const matrah = money(belgeMiktar.mul(satir.birimFiyat));
      const kdvTutar = money(matrah.mul(satir.kdvOran).div(100));
      if (satir.stokId && girdi.durum === "ONAYLI") {
        const kart = await tx.stokKart.findFirst({ where: { id: satir.stokId, companyId: girdi.companyId } });
        if (!kart) throw new PublicError("Stok kartı bulunamadı.", 404);
        if (satir.birim && satir.birim.toUpperCase() !== kart.birim.toUpperCase()) {
          try {
            stokMiktar = toDecimal(birimDonustur(satir.miktar, satir.birim, kart.birim, katsayi(kart.profil)));
          } catch (error) {
            throw new PublicError(error instanceof Error ? error.message : "Birim dönüşümü yapılamadı.", 422);
          }
        }
        stokHesap = stokHesabi(kart.stokTipi, kart.tur);
        const katmanlar = await tx.stokHareket.findMany({
          where: { companyId: girdi.companyId, stokId: kart.id, kalanMiktar: { gt: 0 } },
          orderBy: [{ tarih: "asc" }, { id: "asc" }],
        });
        const birimAlis = stokMiktar.eq(0) ? new Decimal(0) : matrah.div(stokMiktar);
        const cikisYon = girdi.yon === "SATIS" || girdi.yon === "ALIS_IADE";
        if (cikisYon) {
          try {
            stokCikisKontrol(kart.mevcutMiktar.toString(), stokMiktar.toFixed(4));
          } catch (error) {
            throw new PublicError(error instanceof Error ? error.message : "Stok yetersiz.", 422);
          }
        }
        if (girdi.yon === "SATIS" || girdi.yon === "SATIS_IADE") {
          if (stokHesap === "150" || stokHesap === "151") {
            throw new PublicError("150 ve 151 hesabındaki stok için satış maliyet hesabı doğrulanmadı.", 422);
          }
          if (girdi.yon === "SATIS") {
            if (degerleme === "FIFO") {
              try {
                const sonuc = fifoCikis(
                  katmanlar.map((katman) => ({
                    kalan: katman.kalanMiktar.toString(),
                    birimMaliyet: katman.birimMaliyet.toString(),
                  })),
                  stokMiktar.toFixed(4),
                );
                maliyet = sonuc.maliyet;
                for (let i = 0; i < katmanlar.length; i += 1) {
                  await tx.stokHareket.updateMany({
                    where: { id: katmanlar[i].id, companyId: girdi.companyId },
                    data: { kalanMiktar: new Prisma.Decimal(sonuc.kalanlar[i].kalan) },
                  });
                }
              } catch (error) {
                throw new PublicError(error instanceof Error ? error.message : "FIFO çıkışı yapılamadı.", 422);
              }
            } else {
              try {
                maliyet = ortalamaCikis(kart.mevcutMiktar.toString(), kart.ortalamaMaliyet.toString(), stokMiktar.toFixed(4));
              } catch (error) {
                throw new PublicError(error instanceof Error ? error.message : "Ortalama maliyet çıkışı yapılamadı.", 422);
              }
            }
            stokYazimlari.push({
              stokId: kart.id,
              giris: "0",
              cikis: stokMiktar.toFixed(4),
              birimMaliyet: stokMiktar.eq(0) ? "0" : money(maliyet).div(stokMiktar).toFixed(6),
              kalan: "0",
            });
          } else {
            const birim = kart.ortalamaMaliyet.gt(0) ? kart.ortalamaMaliyet : katmanlar.at(-1)?.birimMaliyet;
            if (!birim || birim.lte(0)) throw new PublicError("Satış iadesi için birim maliyet yok.", 422);
            maliyet = money(stokMiktar.mul(birim.toString())).toFixed(2);
            const yeniOrtalama = ortalamaGiris(
              kart.mevcutMiktar.toString(),
              kart.ortalamaMaliyet.toString(),
              stokMiktar.toFixed(4),
              birim.toString(),
            );
            await tx.stokKart.updateMany({
              where: { id: kart.id, companyId: girdi.companyId },
              data: { ortalamaMaliyet: new Prisma.Decimal(yeniOrtalama) },
            });
            stokYazimlari.push({
              stokId: kart.id,
              giris: stokMiktar.toFixed(4),
              cikis: "0",
              birimMaliyet: birim.toFixed(6),
              kalan: stokMiktar.toFixed(4),
            });
          }
        } else if (girdi.yon === "ALIS") {
          const yeniOrtalama = ortalamaGiris(
            kart.mevcutMiktar.toString(),
            kart.ortalamaMaliyet.toString(),
            stokMiktar.toFixed(4),
            birimAlis.toFixed(6),
          );
          await tx.stokKart.updateMany({
            where: { id: kart.id, companyId: girdi.companyId },
            data: { ortalamaMaliyet: new Prisma.Decimal(yeniOrtalama) },
          });
          stokYazimlari.push({
            stokId: kart.id,
            giris: stokMiktar.toFixed(4),
            cikis: "0",
            birimMaliyet: birimAlis.toFixed(6),
            kalan: stokMiktar.toFixed(4),
          });
        } else {
          const yeniMiktar = toDecimal(kart.mevcutMiktar.toString()).minus(stokMiktar);
          const yeniDeger = toDecimal(kart.mevcutMiktar.toString()).mul(kart.ortalamaMaliyet.toString()).minus(matrah);
          if (yeniDeger.lt(0)) throw new PublicError("Alış iadesi stok değerini eksiye düşürür.", 422);
          if (degerleme === "FIFO") {
            try {
              const sonuc = fifoCikis(
                katmanlar.map((katman) => ({
                  kalan: katman.kalanMiktar.toString(),
                  birimMaliyet: katman.birimMaliyet.toString(),
                })),
                stokMiktar.toFixed(4),
              );
              for (let i = 0; i < katmanlar.length; i += 1) {
                await tx.stokHareket.updateMany({
                  where: { id: katmanlar[i].id, companyId: girdi.companyId },
                  data: { kalanMiktar: new Prisma.Decimal(sonuc.kalanlar[i].kalan) },
                });
              }
            } catch (error) {
              throw new PublicError(error instanceof Error ? error.message : "FIFO iadesi yapılamadı.", 422);
            }
          }
          const yeniOrtalama = yeniMiktar.eq(0) ? "0.000000" : yeniDeger.div(yeniMiktar).toFixed(6);
          await tx.stokKart.updateMany({
            where: { id: kart.id, companyId: girdi.companyId },
            data: { ortalamaMaliyet: new Prisma.Decimal(yeniOrtalama) },
          });
          stokYazimlari.push({
            stokId: kart.id,
            giris: "0",
            cikis: stokMiktar.toFixed(4),
            birimMaliyet: birimAlis.toFixed(6),
            kalan: "0",
          });
        }
        const agg = await tx.stokHareket.aggregate({
          where: { companyId: girdi.companyId, stokId: kart.id },
          _sum: { giris: true, cikis: true },
        });
        const hareketGiris = stokYazimlari.filter((row) => row.stokId === kart.id).reduce((s, row) => s.plus(row.giris), new Decimal(0));
        const hareketCikis = stokYazimlari.filter((row) => row.stokId === kart.id).reduce((s, row) => s.plus(row.cikis), new Decimal(0));
        const elde = toDecimal(String(agg._sum.giris || 0)).minus(String(agg._sum.cikis || 0)).plus(hareketGiris).minus(hareketCikis);
        await tx.stokKart.updateMany({
          where: { id: kart.id, companyId: girdi.companyId },
          data: { mevcutMiktar: new Prisma.Decimal(elde.toFixed(4)) },
        });
      }

      ara = ara.plus(matrah);
      kdv = kdv.plus(kdvTutar);
      kalemler.push({
        matrah: matrah.toFixed(2),
        kdv: kdvTutar.toFixed(2),
        stokHesap,
        maliyet,
      });
    }

    const tevkifat = money(kdv.mul(tevkifatOran));
    const genel = ara.plus(kdv).minus(tevkifat);
    let fisSatirlari: ReturnType<typeof faturaFisSatirlari> = [];
    if (girdi.durum === "ONAYLI") {
      try {
        fisSatirlari = faturaFisSatirlari({
          yon: girdi.yon,
          belgeNo: girdi.belgeNo,
          tevkifatOran,
          kalemler,
        });
      } catch (error) {
        throw new PublicError(error instanceof Error ? error.message : "Fatura fişi kurulamadı.", 422);
      }
    }

    const fatura = await tx.fatura.create({
      data: {
        companyId: girdi.companyId,
        belgeNo: girdi.belgeNo,
        tarih: girdi.tarih,
        yon: girdi.yon,
        cariId: girdi.cariId,
        araToplam: new Prisma.Decimal(ara.toFixed(2)),
        kdvTutari: new Prisma.Decimal(kdv.toFixed(2)),
        genelToplam: new Prisma.Decimal(genel.toFixed(2)),
        durum: girdi.durum,
        profil: {
          tevkifat_kodu: girdi.tevkifatKodu,
          tevkifat_oran: tevkifatOran,
          tevkifat_tutar: tevkifat.toFixed(2),
        },
        satirlar: {
          create: girdi.satirlar.map((satir, index) => ({
            satirNo: index + 1,
            stokId: satir.stokId,
            aciklama: satir.aciklama,
            miktar: new Prisma.Decimal(toDecimal(satir.miktar).toFixed(4)),
            birimFiyat: new Prisma.Decimal(money(satir.birimFiyat).toFixed(2)),
            kdvOran: new Prisma.Decimal(satir.kdvOran),
            tutar: new Prisma.Decimal(kalemler[index].matrah),
          })),
        },
      },
      include: { cari: true, satirlar: true },
    });

    if (girdi.durum !== "ONAYLI") return fatura;

    for (const hareket of stokYazimlari) {
      await tx.stokHareket.create({
        data: {
          companyId: girdi.companyId,
          stokId: hareket.stokId,
          tarih: girdi.tarih,
          giris: new Prisma.Decimal(hareket.giris),
          cikis: new Prisma.Decimal(hareket.cikis),
          birimMaliyet: new Prisma.Decimal(hareket.birimMaliyet),
          kalanMiktar: new Prisma.Decimal(hareket.kalan),
          aciklama: `Fatura ${girdi.belgeNo}`,
          belgeNo: girdi.belgeNo,
        },
      });
    }

    const fisNo = `FTR-${girdi.belgeNo}`.slice(0, 40);
    const cakisma = await tx.yevmiyeKaydi.findUnique({
      where: { companyId_fisNo: { companyId: girdi.companyId, fisNo } },
    });
    if (cakisma) throw new PublicError("Bu fatura numarası için yevmiye fişi zaten var.", 409);
    const toplam = fisSatirlari.reduce((sum, satir) => sum.plus(satir.borc), new Decimal(0));
    const yevmiye = await tx.yevmiyeKaydi.create({
      data: {
        companyId: girdi.companyId,
        fisNo,
        tarih: girdi.tarih,
        aciklama: `Fatura ${girdi.belgeNo}`,
        toplamBorc: new Prisma.Decimal(money(toplam).toFixed(2)),
        toplamAlacak: new Prisma.Decimal(money(toplam).toFixed(2)),
        durum: "KESIN",
        isLocked: true,
        satirlar: {
          create: fisSatirlari.map((satir, index) => ({
            satirNo: index + 1,
            hesapKodu: satir.hesapKodu,
            aciklama: satir.aciklama,
            borc: new Prisma.Decimal(satir.borc),
            alacak: new Prisma.Decimal(satir.alacak),
          })),
        },
      },
    });
    await tx.fatura.updateMany({
      where: { id: fatura.id, companyId: girdi.companyId },
      data: { yevmiyeFisNo: fisNo },
    });
    if (girdi.cariId) {
      const satis = girdi.yon === "SATIS" || girdi.yon === "ALIS_IADE";
      await tx.cariHareket.create({
        data: {
          companyId: girdi.companyId,
          cariId: girdi.cariId,
          tarih: girdi.tarih,
          borc: new Prisma.Decimal(satis ? genel.toFixed(2) : "0.00"),
          alacak: new Prisma.Decimal(satis ? "0.00" : genel.toFixed(2)),
          aciklama: `Fatura ${girdi.belgeNo}`,
          belgeNo: girdi.belgeNo,
          yevmiyeKaydiId: yevmiye.id,
          kaynakTip: "FATURA",
          kaynakId: fatura.id,
        },
      });
      const bakiye = await tx.cariHareket.aggregate({
        where: { companyId: girdi.companyId, cariId: girdi.cariId },
        _sum: { borc: true, alacak: true },
      });
      await tx.cariKart.updateMany({
        where: { id: girdi.cariId, companyId: girdi.companyId },
        data: {
          bakiye: new Prisma.Decimal(money(bakiye._sum.borc).minus(money(bakiye._sum.alacak)).toFixed(2)),
        },
      });
    }
    await tx.auditLog.create({
      data: {
        tabloAdi: "faturalar",
        islemTipi: "INSERT",
        kullaniciId: girdi.kullaniciId,
        ipAdresi: girdi.ipAdresi,
        yeniVeri: { belgeNo: girdi.belgeNo, fisNo, yon: girdi.yon, genel: genel.toFixed(2) },
      },
    });
    return tx.fatura.findFirstOrThrow({
      where: { id: fatura.id, companyId: girdi.companyId },
      include: { cari: true, satirlar: true },
    });
  });
}

export async function kdvBeyanRaporu(companyId: number, yil: number, ay: number) {
  if (!Number.isInteger(yil) || ay < 1 || ay > 12) throw new PublicError("Beyan dönemi yıl ve ay olmalıdır.", 400);
  const bas = new Date(Date.UTC(yil, ay - 1, 1));
  const bit = new Date(Date.UTC(yil, ay, 1));
  const hesap = {
    OR: [
      { hesapKodu: { startsWith: "191" } },
      { hesapKodu: { startsWith: "391" } },
      { hesapKodu: { startsWith: "190" } },
      { hesapKodu: { startsWith: "360.01" } },
    ],
  };
  const [donem, onceki] = await Promise.all([
    prisma.yevmiyeSatir.findMany({
      where: { ...hesap, yevmiyeKaydi: { companyId, durum: "KESIN", tarih: { gte: bas, lt: bit } } },
    }),
    prisma.yevmiyeSatir.findMany({
      where: {
        yevmiyeKaydi: { companyId, durum: "KESIN", tarih: { lt: bas } },
        OR: [{ hesapKodu: "190" }, { hesapKodu: { startsWith: "190." } }],
      },
    }),
  ]);
  const oncekiDevreden = onceki.reduce((sum, satir) => sum.plus(money(satir.borc)).minus(money(satir.alacak)), new Decimal(0));
  return {
    donem: `${yil}-${String(ay).padStart(2, "0")}`,
    ...kdvBeyanHesapla({
      oncekiDevreden: oncekiDevreden.toFixed(2),
      hareketler: donem.map((satir) => ({
        hesapKodu: satir.hesapKodu,
        borc: satir.borc.toString(),
        alacak: satir.alacak.toString(),
      })),
    }),
  };
}

export async function ebelgeTaslagi(companyId: number, faturaId: number) {
  const fatura = await prisma.fatura.findFirst({
    where: { id: faturaId, companyId },
    include: { satirlar: true, cari: true, company: true },
  });
  if (!fatura) throw new PublicError("Fatura bulunamadı.", 404);
  const belge: UblTrFatura = {
    uuid: randomUUID(),
    id: fatura.belgeNo,
    issueDate: tarihMetni(fatura.tarih),
    invoiceTypeCode: fatura.yon.includes("IADE") ? "IADE" : "SATIS",
    profileId: "TEMELFATURA",
    documentCurrencyCode: "TRY",
    supplierVkn: fatura.company.vkn || "",
    customerVkn: fatura.cari?.vergiNo || "",
    taxExclusiveAmount: fatura.araToplam.toFixed(2),
    taxAmount: fatura.kdvTutari.toFixed(2),
    payableAmount: fatura.genelToplam.toFixed(2),
    lines: fatura.satirlar.map((satir) => ({
      id: String(satir.satirNo),
      name: satir.aciklama,
      quantity: satir.miktar.toString(),
      unitCode: ublBirimKodu("ADET"),
      priceAmount: satir.birimFiyat.toFixed(2),
      lineExtensionAmount: satir.tutar.toFixed(2),
      taxPercent: satir.kdvOran.toString(),
      taxAmount: money(satir.tutar.toString()).mul(satir.kdvOran.toString()).div(100).toFixed(2),
    })),
  };
  const sonuc = await new MockEBelgeAdapter().gonder(belge);
  await prisma.fatura.updateMany({
    where: { id: fatura.id, companyId },
    data: { gibDurum: sonuc.durum },
  });
  return { ...sonuc, ubl: belge };
}
