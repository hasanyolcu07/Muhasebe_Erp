ALTER TABLE "hesap_plani" ADD COLUMN "kilitli" BOOLEAN NOT NULL DEFAULT false;

UPDATE "hesap_plani"
SET "kilitli" = true
WHERE "seviye" IN ('SINIF', 'ALT_SINIF', 'ANA')
   OR char_length("kod") <= 3;
