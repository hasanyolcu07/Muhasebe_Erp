ALTER TABLE "personeller" ADD COLUMN "kumulatif_gv_matrah" DECIMAL(18,2) NOT NULL DEFAULT 0;
ALTER TABLE "personeller" ADD COLUMN "kumulatif_yil" INTEGER;

ALTER TABLE "bordrolar" ADD COLUMN "kumulatif_gv_matrah" DECIMAL(18,2) NOT NULL DEFAULT 0;
ALTER TABLE "bordrolar" ADD COLUMN "sgk_matrah" DECIMAL(18,2) NOT NULL DEFAULT 0;
ALTER TABLE "bordrolar" ADD COLUMN "damga" DECIMAL(18,2) NOT NULL DEFAULT 0;
ALTER TABLE "bordrolar" ADD COLUMN "eksik_gun" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "bordrolar" ADD COLUMN "eksik_gun_nedeni" TEXT;
