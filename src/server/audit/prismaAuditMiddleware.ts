/**
 * Prisma Denetim İzi (Audit Log) Middleware & Interceptor
 * 
 * Veritabanında gerçekleşen CREATE (INSERT), UPDATE ve DELETE işlemlerini
 * (özellikle YevmiyeKaydi, CariKart ve StokKart modelleri için)
 * otomatik olarak yakalar ve `audit_logs` tablosuna değişmez denetim kaydı oluşturur.
 */

import { Prisma, PrismaClient } from "@prisma/client";
import { AsyncLocalStorage } from "node:async_hooks";

// Denetim bağlamı: HTTP isteğinden gelen kullanıcı ID'si ve IP adresini asenkron saklar
export interface AuditContext {
  userId?: number;
  ip?: string;
  userAgent?: string;
}

export const auditContextStorage = new AsyncLocalStorage<AuditContext>();

/**
 * Express middleware veya servis seviyesinde kullanıcı bağlamını ayarlamak için yardımcı fonksiyon
 */
export function runWithAuditContext<T>(context: AuditContext, fn: () => T): T {
  return auditContextStorage.run(context, fn);
}

// Otomatik denetim izi tutulacak modeller ve veritabanı tablo adı eşleştirmeleri
const TRACKED_MODELS: Record<string, string> = {
  YevmiyeKaydi: "yevmiye_kayitlari",
  CariKart: "cari_kartlar",
  StokKart: "stok_kartlar",
  User: "users",
};

/**
 * Prisma Client'a otomatik denetim izi (AuditLog) middleware'ini kaydeder
 */
export function registerAuditMiddleware(client: PrismaClient): void {
  client.$use(async (params, next) => {
    // 1. AuditLog tablosunun kendi işlemlerinde sonsuz döngüyü engelle
    if (params.model === "AuditLog") {
      const blocked = ["update", "updateMany", "delete", "deleteMany", "upsert"];
      if (blocked.includes(params.action)) {
        throw new Error("Denetim kayıtları değiştirilemez veya silinemez.");
      }
      return next(params);
    }

    // 2. Takip edilmeyen modeller için doğrudan devam et
    const targetTableName = params.model ? TRACKED_MODELS[params.model] : null;
    if (!targetTableName) {
      return next(params);
    }

    // 3. İşlem tipini belirle (INSERT / UPDATE / DELETE)
    let islemTipi: "INSERT" | "UPDATE" | "DELETE" | null = null;
    if (params.action === "create" || params.action === "createMany") {
      islemTipi = "INSERT";
    } else if (params.action === "update" || params.action === "updateMany" || params.action === "upsert") {
      islemTipi = "UPDATE";
    } else if (params.action === "delete" || params.action === "deleteMany") {
      islemTipi = "DELETE";
    }

    if (!islemTipi) {
      return next(params);
    }

    // 4. Güncelleme veya silme öncesi eski veriyi (eskiVeri) yakalamaya çalış
    let eskiVeri: any = null;
    if ((islemTipi === "UPDATE" || islemTipi === "DELETE") && params.args?.where) {
      try {
        const delegate = (client as any)[params.model!.charAt(0).toLowerCase() + params.model!.slice(1)];
        if (delegate?.findUnique) {
          eskiVeri = await delegate.findUnique({
            where: params.args.where,
          });
        }
      } catch {
        // Eski veri sorgulanırken hata oluşursa işlem akışını bozma
        eskiVeri = params.args?.where || null;
      }
    }

    // 5. Asıl veritabanı işlemini yürüt
    const result = await next(params);

    // 6. Asenkron bağlamdan kullanıcı ve IP bilgilerini oku
    const context = auditContextStorage.getStore();
    const kullaniciId = context?.userId ?? null;
    const ipAdresi = context?.ip ?? "127.0.0.1";

    // 7. Yeni veriyi (yeniVeri) hazırla
    let yeniVeri: any = null;
    if (islemTipi === "INSERT" || islemTipi === "UPDATE") {
      yeniVeri = result ? JSON.parse(JSON.stringify(result)) : params.args?.data;
    }

    // 8. AuditLog tablosuna otomatik olarak değişmez denetim kaydını yaz
    try {
      await client.auditLog.create({
        data: {
          tabloAdi: targetTableName,
          islemTipi,
          kullaniciId,
          eskiVeri: eskiVeri ? JSON.parse(JSON.stringify(eskiVeri)) : Prisma.JsonNull,
          yeniVeri: yeniVeri ? JSON.parse(JSON.stringify(yeniVeri)) : Prisma.JsonNull,
          ipAdresi,
        },
      });
    } catch (auditErr: any) {
      // Denetim logu yazılırken oluşan hatalar ana işlemi engellememeli, ancak konsola kaydedilmeli
      console.warn(`[AuditMiddleware] ${targetTableName} için denetim izi yazılamadı:`, auditErr?.message);
    }

    return result;
  });
}
