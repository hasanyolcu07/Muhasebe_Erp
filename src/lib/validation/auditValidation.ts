/**
 * Denetim İzi (Audit Trail) Doğrulama Modülü
 * Tüm finansal ve operasyonel işlemlerde değişmez denetim kaydı şeması
 */

import { z } from "zod";

export const AuditIslemTuruEnum = z.enum(["CREATE", "UPDATE", "DELETE", "POST", "CANCEL"]);
export type AuditIslemTuru = z.infer<typeof AuditIslemTuruEnum>;

/** Denetim İzi (Audit Log) Zod Şeması */
export const AuditLogZodSchema = z.object({
  id: z.string().uuid().optional(),
  kullanici_id: z.number().int().positive("Kullanıcı ID zorunludur."),
  kullanici_adi: z.string().min(1, "Kullanıcı adı veya e-posta zorunludur."),
  tarih: z.union([z.date(), z.string()]),
  tablo_adi: z.string().min(1, "Değişen tablo adı zorunludur."),
  kayit_id: z.union([z.string(), z.number()]),
  islem_turu: AuditIslemTuruEnum,
  /** Değişiklik öncesi durum (CREATE işleminde null olabilir) */
  eski_deger: z.record(z.string(), z.unknown()).nullable(),
  /** Değişiklik sonrası durum (DELETE işleminde null olabilir) */
  yeni_deger: z.record(z.string(), z.unknown()).nullable(),
  /** İstemci IP Adresi (IPv4 / IPv6 veya yerel döngü) */
  ip_adresi: z.string().min(1, "IP adresi zorunludur."),
  user_agent: z.string().optional().nullable(),
  aciklama: z.string().optional().nullable(),
});

export type AuditLogEntry = z.infer<typeof AuditLogZodSchema>;
