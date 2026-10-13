/**
 * Yevmiye Kaydı Denetleyicisi (Yevmiye Controller)
 * Türkiye Muhasebe Standartları (TMS) ve Vergi Usul Kanunu (VUK) Uyumlu
 * Çift Kayıt (Borç = Alacak) Kesinliği ve Denetim İzi (Audit Trail)
 */

import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { Prisma } from "@prisma/client";
import { PublicError, toPublicMessage } from "../security/publicError";
import { clientIp } from "../security/clientIp";
import { assertPeriodOpen } from "../services/period.service";
import { Decimal } from "../../lib/financialMath";
import { money } from "../money";

// Zod Giriş Doğrulama Şemaları
const YevmiyeSatirInputSchema = z
  .object({
    satirNo: z.number().int().positive("Satır numarası 1 veya daha büyük olmalıdır."),
    hesapKodu: z
      .string()
      .min(3, "Hesap kodu en az 3 basamaklı olmalıdır.")
      .regex(/^[1-7]\d{2}(\.\d{2,3})*$/, "Geçersiz Tekdüzen Hesap Planı (TDHP) kodu formatı."),
    aciklama: z.string().min(2, "Satır açıklaması zorunludur.").trim(),
    borc: z.number().nonnegative("Borç tutarı negatif olamaz.").default(0),
    alacak: z.number().nonnegative("Alacak tutarı negatif olamaz.").default(0),
  })
  .refine(
    (row) => {
      // Bir satırda ya borç ya da alacak olmalıdır (aynı anda ikisi birden pozitif olamaz)
      return (row.borc > 0 && row.alacak === 0) || (row.borc === 0 && row.alacak > 0);
    },
    {
      message: "Her yevmiye satırında borç veya alacaktan yalnızca biri sıfırdan büyük olmalıdır.",
    }
  );

const CreateYevmiyeInputSchema = z.object({
  fisNo: z.string().min(1, "Fiş numarası zorunludur.").trim(),
  tarih: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  aciklama: z.string().min(3, "Fiş genel açıklaması zorunludur.").trim(),
  satirlar: z
    .array(YevmiyeSatirInputSchema)
    .min(2, "Çift kayıt ilkesi gereği fişte en az 2 satır (biri borç, biri alacak) bulunmalıdır."),
});

export class YevmiyeController {
  /**
   * Yeni Yevmiye Fişi Oluşturma (Transaction + Çift Kayıt + Audit Trail)
   * KURAL: Toplam Borç === Toplam Alacak olmalıdır, aksi halde transaction hata fırlatır!
   */
  public static async create(req: Request, res: Response): Promise<void> {
    try {
      // 1. Zod ile girdi doğrulama (Girdi Güvenliği)
      const parseResult = CreateYevmiyeInputSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          success: false,
          error: "Girdi doğrulama hatası",
          details: parseResult.error.format(),
        });
        return;
      }

      const { fisNo, tarih, aciklama, satirlar } = parseResult.data;

      // 2. Kuruş bazında kesin Borç ve Alacak toplamı hesaplama
      let toplamBorc = new Decimal(0);
      let toplamAlacak = new Decimal(0);

      for (const satir of satirlar) {
        toplamBorc = toplamBorc.plus(money(satir.borc));
        toplamAlacak = toplamAlacak.plus(money(satir.alacak));
      }

      // 3. ÇİFT KAYIT KURALI KONTROLÜ (BORÇ === ALACAK)
      if (!toplamBorc.equals(toplamAlacak) || toplamBorc.lessThanOrEqualTo(0)) {
        const fark = toplamBorc.minus(toplamAlacak).abs();
        res.status(422).json({
          success: false,
          error: "VUK/TMS Çift Kayıt İlkesi İhlali",
          message: `Toplam Borç (${toplamBorc.toFixed(2)} TL) ile Toplam Alacak (${toplamAlacak.toFixed(2)} TL) eşit olmalıdır. Fark: ${fark.toFixed(2)} TL.`,
        });
        return;
      }

      // Kullanıcı ve IP bilgisi
      const kullaniciId = req.user?.id;
      const companyId = req.user?.companyId;
      if (!kullaniciId || !companyId) {
        res.status(401).json({ success: false, error: "Yetkisiz Erişim" });
        return;
      }
      const ipAdresi = clientIp(req);
      await assertPeriodOpen(companyId, new Date(tarih));

      // 4. ATOMİK PRİSMA TRANSACTION: Fiş Kaydı + Satırlar + Denetim İzi (Audit Log)
      const result = await prisma.$transaction(async (tx) => {
        // Mevcut mükerrer fiş numarası kontrolü
        const existing = await tx.yevmiyeKaydi.findFirst({
          where: { fisNo, companyId },
        });

        if (existing) {
          throw new PublicError("Bu fiş numarası sistemde zaten kayıtlı. Mükerrer fiş açılamaz.", 409);
        }

        // Ana Yevmiye Fişi ve Satırlarını Oluştur
        const yevmiyeKaydi = await tx.yevmiyeKaydi.create({
          data: {
            companyId,
            fisNo,
            tarih: new Date(tarih),
            aciklama,
            durum: "KESIN",
            isLocked: true,
            toplamBorc: new Prisma.Decimal(toplamBorc.toFixed(2)),
            toplamAlacak: new Prisma.Decimal(toplamAlacak.toFixed(2)),
            satirlar: {
              create: satirlar.map((s) => ({
                satirNo: s.satirNo,
                hesapKodu: s.hesapKodu,
                aciklama: s.aciklama,
                borc: new Prisma.Decimal(s.borc),
                alacak: new Prisma.Decimal(s.alacak),
              })),
            },
          },
          include: {
            satirlar: {
              orderBy: { satirNo: "asc" },
            },
          },
        });

        // Denetim İzi (Audit Trail) Kaydı: INSERT
        await tx.auditLog.create({
          data: {
            tabloAdi: "yevmiye_kayitlari",
            islemTipi: "INSERT",
            kullaniciId,
            eskiVeri: Prisma.JsonNull,
            yeniVeri: {
              id: yevmiyeKaydi.id,
              fisNo: yevmiyeKaydi.fisNo,
              tarih: yevmiyeKaydi.tarih,
              toplamBorc: toplamBorc.toNumber(),
              toplamAlacak: toplamAlacak.toNumber(),
              satirSayisi: satirlar.length,
            },
            ipAdresi,
          },
        });

        return yevmiyeKaydi;
      });

      res.status(201).json({
        success: true,
        message: "Yevmiye kaydı başarıyla oluşturuldu.",
        data: result,
      });
    } catch (error: unknown) {
      if (error instanceof PublicError) {
        res.status(error.status).json({ success: false, error: error.message });
        return;
      }
      const pub = toPublicMessage(error, "Yevmiye kaydı oluşturulurken sunucu hatası oluştu.");
      res.status(pub.status).json({ success: false, error: pub.message });
    }
  }

  /**
   * Yevmiye Fişlerini Listeleme
   */
  public static async list(req: Request, res: Response): Promise<void> {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
      const skip = (page - 1) * limit;

      const companyId = req.user?.companyId;
      if (!companyId) {
        res.status(401).json({ success: false, error: "Yetkisiz Erişim" });
        return;
      }
      const where = { companyId };
      const [total, items] = await Promise.all([
        prisma.yevmiyeKaydi.count({ where }),
        prisma.yevmiyeKaydi.findMany({
          where,
          skip,
          take: limit,
          orderBy: { tarih: "desc" },
          include: {
            satirlar: {
              orderBy: { satirNo: "asc" },
            },
          },
        }),
      ]);

      res.json({
        success: true,
        data: {
          items,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error: unknown) {
      const pub = toPublicMessage(error, "Yevmiye fişleri listelenirken hata oluştu.");
      res.status(pub.status).json({ success: false, error: pub.message });
    }
  }

  /**
   * Tekil Yevmiye Fişi Getirme
   */
  public static async getById(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ success: false, error: "Geçersiz fiş ID." });
        return;
      }

      const companyId = req.user?.companyId;
      if (!companyId) {
        res.status(401).json({ success: false, error: "Yetkisiz Erişim" });
        return;
      }
      const kayit = await prisma.yevmiyeKaydi.findFirst({
        where: { id, companyId },
        include: {
          satirlar: {
            orderBy: { satirNo: "asc" },
          },
        },
      });

      if (!kayit) {
        res.status(404).json({ success: false, error: "Yevmiye fişi bulunamadı." });
        return;
      }

      res.json({ success: true, data: kayit });
    } catch (error: unknown) {
      const pub = toPublicMessage(error, "Yevmiye fişi okunamadı.");
      res.status(pub.status).json({ success: false, error: pub.message });
    }
  }

  /**
   * Yevmiye Fişi Silme (Kilit Denetimi ve Audit Log ile)
   */
  public static async delete(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      const kullaniciId = req.user?.id;
      const companyId = req.user?.companyId;
      if (!kullaniciId || !companyId) {
        res.status(401).json({ success: false, error: "Yetkisiz Erişim" });
        return;
      }
      const ipAdresi = clientIp(req);

      await prisma.$transaction(async (tx) => {
        const kayit = await tx.yevmiyeKaydi.findFirst({
          where: { id, companyId },
          include: { satirlar: true },
        });

        if (!kayit) {
          throw new PublicError("Silinmek istenen yevmiye fişi bulunamadı.", 404);
        }

        await assertPeriodOpen(companyId, kayit.tarih);

        if (kayit.isLocked || kayit.durum === "KESIN") {
          throw new PublicError("Kesinleşmiş yevmiye fişi silinemez. Ters kayıt oluşturulmalıdır.", 409);
        }

        // Audit Log: DELETE
        await tx.auditLog.create({
          data: {
            tabloAdi: "yevmiye_kayitlari",
            islemTipi: "DELETE",
            kullaniciId,
            eskiVeri: {
              id: kayit.id,
              fisNo: kayit.fisNo,
              tarih: kayit.tarih,
              toplamBorc: kayit.toplamBorc,
              toplamAlacak: kayit.toplamAlacak,
            },
            yeniVeri: Prisma.JsonNull,
            ipAdresi,
          },
        });

        const removed = await tx.yevmiyeKaydi.deleteMany({
          where: { id, companyId },
        });
        if (removed.count !== 1) {
          throw new PublicError("Silinmek istenen yevmiye fişi bulunamadı.", 404);
        }
      });

      res.json({
        success: true,
        message: "Yevmiye fişi başarıyla silindi ve denetim günlüğüne kaydedildi.",
      });
    } catch (error: unknown) {
      const pub = toPublicMessage(error, "Fiş silinirken hata oluştu.");
      res.status(pub.status).json({ success: false, error: pub.message });
    }
  }
}
