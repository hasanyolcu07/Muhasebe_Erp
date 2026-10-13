CREATE TABLE "ortaklar" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "ad" TEXT NOT NULL,
    "rol" TEXT NOT NULL,
    "hisse_oran" DECIMAL(8,2) NOT NULL,
    "sermaye" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ortaklar_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "yatirim_giderleri" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "tarih" TIMESTAMP(3) NOT NULL,
    "aciklama" TEXT NOT NULL,
    "kategori" TEXT NOT NULL DEFAULT 'KURULUS',
    "tutar" DECIMAL(18,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "yatirim_giderleri_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ortak_dagitimlari" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "net_kar" DECIMAL(18,2) NOT NULL,
    "stopaj_oran" DECIMAL(5,2) NOT NULL DEFAULT 10,
    "durum" TEXT NOT NULL DEFAULT 'TASLAK',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ortak_dagitimlari_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ortaklar_company_id_idx" ON "ortaklar"("company_id");
CREATE INDEX "yatirim_giderleri_company_id_tarih_idx" ON "yatirim_giderleri"("company_id", "tarih");
CREATE INDEX "ortak_dagitimlari_company_id_idx" ON "ortak_dagitimlari"("company_id");

ALTER TABLE "ortaklar" ADD CONSTRAINT "ortaklar_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "yatirim_giderleri" ADD CONSTRAINT "yatirim_giderleri_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ortak_dagitimlari" ADD CONSTRAINT "ortak_dagitimlari_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
