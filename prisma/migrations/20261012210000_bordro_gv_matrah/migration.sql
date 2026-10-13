ALTER TABLE "bordrolar" ADD COLUMN "gv_matrah" DECIMAL(18,2) NOT NULL DEFAULT 0;

UPDATE "bordrolar"
SET "gv_matrah" = GREATEST(0, "brut" - "sgk_isci" - ROUND(("sgk_isci" / 0.14) * 0.01, 2))
WHERE "sgk_isci" > 0;
