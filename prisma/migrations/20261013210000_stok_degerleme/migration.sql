ALTER TABLE "stok_kartlar" ADD COLUMN "ortalama_maliyet" DECIMAL(18,6) NOT NULL DEFAULT 0;
ALTER TABLE "stok_hareketler" ADD COLUMN "birim_maliyet" DECIMAL(18,6) NOT NULL DEFAULT 0;
ALTER TABLE "stok_hareketler" ADD COLUMN "kalan_miktar" DECIMAL(18,4) NOT NULL DEFAULT 0;
ALTER TABLE "company_ayar" ADD COLUMN "stok_degerleme" TEXT NOT NULL DEFAULT 'ORTALAMA';
