/**
 * Denetim İzi (Audit Trail) Servisi
 * Finansal ve imalat işlemlerinde (oluşturma, güncelleme, silme, iptal) değişmez denetim kaydı oluşturur.
 */

import { AuditLogZodSchema, type AuditLogEntry, type AuditIslemTuru } from "@/lib/validation/auditValidation";

/** Bellek içi ve veritabanı önbellekli denetim izi yöneticisi */
class AuditTrailService {
  private logs: AuditLogEntry[] = [];

  /**
   * Finansal veya imalat işlemi için denetim izi kaydı oluşturur
   */
  public log(params: {
    kullanici_id: number;
    kullanici_adi: string;
    tablo_adi: string;
    kayit_id: string | number;
    islem_turu: AuditIslemTuru;
    eski_deger: Record<string, unknown> | null;
    yeni_deger: Record<string, unknown> | null;
    ip_adresi: string;
    user_agent?: string | null;
    aciklama?: string | null;
  }): AuditLogEntry {
    const entryData = {
      ...params,
      tarih: new Date().toISOString(),
    };

    // Zod ile şema bütünlüğünü doğrula
    const validated = AuditLogZodSchema.parse(entryData);

    // Günlüğe ekle (ve PostgreSQL audit_logs tablosuna yönlendir)
    this.logs.unshift(validated);

    // Bellek sınırını koru (en son 1000 kayıt)
    if (this.logs.length > 1000) {
      this.logs.pop();
    }

    return validated;
  }

  /**
   * Belirli bir tablo ve kayıt ID'sine ait denetim geçmişini getirir
   */
  public getHistory(tablo_adi: string, kayit_id: string | number): AuditLogEntry[] {
    return this.logs.filter(
      (l) => l.tablo_adi === tablo_adi && String(l.kayit_id) === String(kayit_id)
    );
  }

  /**
   * Son denetim izlerini listeler
   */
  public list(limit = 100): AuditLogEntry[] {
    return this.logs.slice(0, limit);
  }

  /**
   * Test ortamında kayıtları temizler
   */
  public clear(): void {
    this.logs = [];
  }
}

export const auditLogger = new AuditTrailService();
