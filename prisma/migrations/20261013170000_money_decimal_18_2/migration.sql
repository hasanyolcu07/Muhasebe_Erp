-- Para alanları kuruş hassasiyetinde. Miktar sütunları (18,4) kalır.
ALTER TABLE "stok_kartlar"
  ALTER COLUMN "alis_fiyati" TYPE DECIMAL(18, 2),
  ALTER COLUMN "satis_fiyati" TYPE DECIMAL(18, 2);

ALTER TABLE "fatura_satirlari"
  ALTER COLUMN "birim_fiyat" TYPE DECIMAL(18, 2);

ALTER TABLE "ticari_belge_satirlari"
  ALTER COLUMN "birim_fiyat" TYPE DECIMAL(18, 2);
