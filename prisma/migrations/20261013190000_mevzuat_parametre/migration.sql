CREATE TABLE "mevzuat_parametreleri" (
    "id" SERIAL NOT NULL,
    "anahtar" TEXT NOT NULL,
    "deger" DECIMAL(18,6) NOT NULL,
    "gecerlilik_baslangic" DATE NOT NULL,
    "gecerlilik_bitis" DATE,
    "kaynak" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mevzuat_parametreleri_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "mevzuat_parametreleri_anahtar_gecerlilik_baslangic_key" ON "mevzuat_parametreleri"("anahtar", "gecerlilik_baslangic");

CREATE INDEX "mevzuat_parametreleri_anahtar_gecerlilik_baslangic_idx" ON "mevzuat_parametreleri"("anahtar", "gecerlilik_baslangic");
