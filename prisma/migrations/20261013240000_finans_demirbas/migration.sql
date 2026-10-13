ALTER TABLE "cek_senetler" ADD COLUMN "yon" TEXT NOT NULL DEFAULT 'ALINAN';
ALTER TABLE "cek_senetler" ADD COLUMN "belge_hesap" TEXT NOT NULL DEFAULT '101';

CREATE TABLE "kasa_hesaplari" (
  "id" SERIAL PRIMARY KEY,
  "company_id" INTEGER NOT NULL,
  "kod" TEXT NOT NULL,
  "ad" TEXT NOT NULL,
  "hesap_kodu" TEXT NOT NULL DEFAULT '100',
  "doviz" TEXT NOT NULL DEFAULT 'TRY',
  "acilis" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "kasa_hesaplari_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id")
);
CREATE UNIQUE INDEX "kasa_hesaplari_company_id_kod_key" ON "kasa_hesaplari"("company_id", "kod");

CREATE TABLE "banka_hesaplari" (
  "id" SERIAL PRIMARY KEY,
  "company_id" INTEGER NOT NULL,
  "kod" TEXT NOT NULL,
  "ad" TEXT NOT NULL,
  "banka_adi" TEXT NOT NULL DEFAULT '',
  "iban" TEXT NOT NULL DEFAULT '',
  "hesap_kodu" TEXT NOT NULL DEFAULT '102',
  "doviz" TEXT NOT NULL DEFAULT 'TRY',
  "acilis" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "banka_hesaplari_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id")
);
CREATE UNIQUE INDEX "banka_hesaplari_company_id_kod_key" ON "banka_hesaplari"("company_id", "kod");

CREATE TABLE "nakit_hareketler" (
  "id" SERIAL PRIMARY KEY,
  "company_id" INTEGER NOT NULL,
  "kanal" TEXT NOT NULL,
  "hesap_id" INTEGER NOT NULL,
  "hedef_id" INTEGER,
  "tur" TEXT NOT NULL,
  "tarih" TIMESTAMP(3) NOT NULL,
  "tutar" DECIMAL(18,2) NOT NULL,
  "karsi_hesap" TEXT NOT NULL,
  "aciklama" TEXT NOT NULL,
  "fis_no" TEXT NOT NULL,
  "doviz" TEXT NOT NULL DEFAULT 'TRY',
  CONSTRAINT "nakit_hareketler_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id")
);
CREATE INDEX "nakit_hareketler_company_id_kanal_tarih_idx" ON "nakit_hareketler"("company_id", "kanal", "tarih");

CREATE TABLE "demirbaslar" (
  "id" SERIAL PRIMARY KEY,
  "company_id" INTEGER NOT NULL,
  "kod" TEXT NOT NULL,
  "ad" TEXT NOT NULL,
  "alis_tarihi" TIMESTAMP(3) NOT NULL,
  "maliyet" DECIMAL(18,2) NOT NULL,
  "birikmis" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "oran" DECIMAL(18,6) NOT NULL,
  "yontem" TEXT NOT NULL,
  "uretim" BOOLEAN NOT NULL DEFAULT false,
  "son_yil" INTEGER,
  CONSTRAINT "demirbaslar_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id")
);
CREATE UNIQUE INDEX "demirbaslar_company_id_kod_key" ON "demirbaslar"("company_id", "kod");

CREATE TABLE "doviz_kurlari" (
  "id" SERIAL PRIMARY KEY,
  "company_id" INTEGER NOT NULL,
  "doviz" TEXT NOT NULL,
  "tarih" TIMESTAMP(3) NOT NULL,
  "kur" DECIMAL(18,6) NOT NULL,
  CONSTRAINT "doviz_kurlari_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id")
);
CREATE UNIQUE INDEX "doviz_kurlari_company_id_doviz_tarih_key" ON "doviz_kurlari"("company_id", "doviz", "tarih");

CREATE TABLE "uretim_receteleri" (
  "id" SERIAL PRIMARY KEY,
  "company_id" INTEGER NOT NULL,
  "kod" TEXT NOT NULL,
  "ad" TEXT NOT NULL,
  "satirlar" JSONB NOT NULL,
  CONSTRAINT "uretim_receteleri_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id")
);
CREATE UNIQUE INDEX "uretim_receteleri_company_id_kod_key" ON "uretim_receteleri"("company_id", "kod");
