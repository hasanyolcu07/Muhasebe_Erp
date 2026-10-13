-- Dönem, personel tanımı, SGK, belge zinciri, cari ekstre ve yedek

ALTER TABLE "hesap_plani" ADD COLUMN "plan_tipi" TEXT NOT NULL DEFAULT 'ORTAK';
UPDATE "hesap_plani" SET "plan_tipi" = '7A' WHERE "kod" LIKE '7%' AND "kod" NOT LIKE '79%';
UPDATE "hesap_plani" SET "plan_tipi" = '7B' WHERE "kod" LIKE '79%';

ALTER TABLE "cari_hareketler" ADD COLUMN "kaynak_tip" TEXT;
ALTER TABLE "cari_hareketler" ADD COLUMN "kaynak_id" INTEGER;

ALTER TABLE "faturalar" ADD COLUMN "gib_durum" TEXT NOT NULL DEFAULT 'YOK';
ALTER TABLE "faturalar" ADD COLUMN "olusturan_id" INTEGER;
ALTER TABLE "faturalar" ADD COLUMN "onaylayan_id" INTEGER;

CREATE TABLE "company_ayar" (
    "company_id" INTEGER NOT NULL,
    "maliyet_yontemi" TEXT NOT NULL DEFAULT '7A',
    "kvkk_metin" TEXT NOT NULL DEFAULT '',
    "personel_saklama_yil" INTEGER NOT NULL DEFAULT 10,
    "cari_saklama_yil" INTEGER NOT NULL DEFAULT 10,
    "gorev_ayrimi" BOOLEAN NOT NULL DEFAULT true,
    "backup_folder" TEXT NOT NULL DEFAULT 'backups',
    "backup_max" INTEGER NOT NULL DEFAULT 14,
    "auto_delete_days" INTEGER NOT NULL DEFAULT 0,
    "backup_active" BOOLEAN NOT NULL DEFAULT false,
    "schedule" JSONB,
    "integrator_url" TEXT,
    "integrator_user" TEXT,
    "integrator_secret" TEXT,
    "integrator_env" TEXT NOT NULL DEFAULT 'test',
    CONSTRAINT "company_ayar_pkey" PRIMARY KEY ("company_id")
);

CREATE TABLE "departmanlar" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "departmanlar_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sgk_meslekler" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "kod" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "kaynak" TEXT NOT NULL DEFAULT 'ISCO-08',
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sgk_meslekler_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sgk_isyerleri" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "branch_id" INTEGER,
    "tip" TEXT NOT NULL,
    "isyeri_kodu" TEXT NOT NULL,
    "kullanici_adi" TEXT NOT NULL DEFAULT '',
    "sifre_sifreli" TEXT NOT NULL DEFAULT '',
    "unvan" TEXT NOT NULL DEFAULT '',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "sgk_isyerleri_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "backup_runs" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "run_type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "file_path" TEXT,
    "file_size" INTEGER,
    "message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "backup_runs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cek_senetler" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "cari_id" INTEGER,
    "tur" TEXT NOT NULL,
    "belge_no" TEXT NOT NULL,
    "tutar" DECIMAL(18,2) NOT NULL,
    "vade" TIMESTAMP(3) NOT NULL,
    "durum" TEXT NOT NULL DEFAULT 'PORTFOY',
    "ciro_edildi" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cek_senetler_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ticari_belgeler" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "tur" TEXT NOT NULL,
    "yon" TEXT NOT NULL,
    "belge_no" TEXT NOT NULL,
    "cari_id" INTEGER,
    "tarih" TIMESTAMP(3) NOT NULL,
    "tutar" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "durum" TEXT NOT NULL DEFAULT 'OPEN',
    "gib_durum" TEXT NOT NULL DEFAULT 'YOK',
    "kaynak_id" INTEGER,
    "olusturan_id" INTEGER,
    "onaylayan_id" INTEGER,
    "profil" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ticari_belgeler_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ticari_belge_satirlari" (
    "id" SERIAL NOT NULL,
    "belge_id" INTEGER NOT NULL,
    "satir_no" INTEGER NOT NULL,
    "aciklama" TEXT NOT NULL,
    "miktar" DECIMAL(18,4) NOT NULL,
    "birim_fiyat" DECIMAL(18,4) NOT NULL,
    "kdv_oran" DECIMAL(5,2) NOT NULL DEFAULT 20,
    "tutar" DECIMAL(18,2) NOT NULL,
    CONSTRAINT "ticari_belge_satirlari_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "departmanlar_company_id_code_key" ON "departmanlar"("company_id", "code");
CREATE UNIQUE INDEX "sgk_meslekler_company_id_kod_key" ON "sgk_meslekler"("company_id", "kod");
CREATE UNIQUE INDEX "sgk_isyerleri_company_id_isyeri_kodu_key" ON "sgk_isyerleri"("company_id", "isyeri_kodu");
CREATE UNIQUE INDEX "cek_senetler_company_id_belge_no_key" ON "cek_senetler"("company_id", "belge_no");
CREATE UNIQUE INDEX "ticari_belgeler_company_id_tur_belge_no_key" ON "ticari_belgeler"("company_id", "tur", "belge_no");
CREATE UNIQUE INDEX "ticari_belge_satirlari_belge_id_satir_no_key" ON "ticari_belge_satirlari"("belge_id", "satir_no");
CREATE INDEX "backup_runs_company_id_created_at_idx" ON "backup_runs"("company_id", "created_at");
CREATE INDEX "ticari_belgeler_company_id_kaynak_id_idx" ON "ticari_belgeler"("company_id", "kaynak_id");

ALTER TABLE "company_ayar" ADD CONSTRAINT "company_ayar_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "departmanlar" ADD CONSTRAINT "departmanlar_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sgk_meslekler" ADD CONSTRAINT "sgk_meslekler_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sgk_isyerleri" ADD CONSTRAINT "sgk_isyerleri_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "backup_runs" ADD CONSTRAINT "backup_runs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cek_senetler" ADD CONSTRAINT "cek_senetler_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cek_senetler" ADD CONSTRAINT "cek_senetler_cari_id_fkey" FOREIGN KEY ("cari_id") REFERENCES "cari_kartlar"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ticari_belgeler" ADD CONSTRAINT "ticari_belgeler_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ticari_belgeler" ADD CONSTRAINT "ticari_belgeler_cari_id_fkey" FOREIGN KEY ("cari_id") REFERENCES "cari_kartlar"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ticari_belge_satirlari" ADD CONSTRAINT "ticari_belge_satirlari_belge_id_fkey" FOREIGN KEY ("belge_id") REFERENCES "ticari_belgeler"("id") ON DELETE CASCADE ON UPDATE CASCADE;
