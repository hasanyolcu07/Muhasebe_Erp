-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'MUHASEBE_UZMANI', 'DEPO_SORUMLUSU');

-- CreateEnum
CREATE TYPE "StokTuru" AS ENUM ('HAMMADDE', 'YARI_MAMUL', 'MAMUL');

-- CreateEnum
CREATE TYPE "AuditIslemTipi" AS ENUM ('INSERT', 'UPDATE', 'DELETE');

-- CreateTable
CREATE TABLE "companies" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "vkn" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branches" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fiscal_periods" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "is_closed" BOOLEAN NOT NULL DEFAULT false,
    "closed_at" TIMESTAMP(3),

    CONSTRAINT "fiscal_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_companies" (
    "user_id" INTEGER NOT NULL,
    "company_id" INTEGER NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'MUHASEBE_UZMANI',

    CONSTRAINT "user_companies_pkey" PRIMARY KEY ("user_id","company_id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "vkn" TEXT,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'MUHASEBE_UZMANI',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "failed_login_count" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "password_changed_at" TIMESTAMP(3),
    "token_version" INTEGER NOT NULL DEFAULT 0,
    "totp_secret" TEXT,
    "totp_pending_secret" TEXT,
    "totp_enabled" BOOLEAN NOT NULL DEFAULT false,
    "amount_limit" DECIMAL(18,2),
    "dashboard_layout" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "ip_adresi" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hesap_plani" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "kod" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "seviye" TEXT NOT NULL DEFAULT 'ANA',
    "is_postable" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "hesap_plani_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "depolar" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "depolar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fiyat_listeleri" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "fiyat_listeleri_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cari_kartlar" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "branch_id" INTEGER NOT NULL DEFAULT 1,
    "kod" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "vergi_no" TEXT NOT NULL DEFAULT '',
    "vergi_dairesi" TEXT,
    "iban" TEXT,
    "bakiye" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "telefon" TEXT,
    "eposta" TEXT,
    "adres" TEXT,
    "hesap_kodu" TEXT,
    "profil" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cari_kartlar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cari_hareketler" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "cari_id" INTEGER NOT NULL,
    "tarih" TIMESTAMP(3) NOT NULL,
    "borc" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "alacak" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "aciklama" TEXT NOT NULL,
    "belge_no" TEXT,
    "yevmiye_kaydi_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cari_hareketler_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stok_kartlar" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "branch_id" INTEGER NOT NULL DEFAULT 1,
    "stok_kodu" TEXT NOT NULL,
    "stok_adi" TEXT NOT NULL,
    "tur" "StokTuru" NOT NULL DEFAULT 'HAMMADDE',
    "stok_tipi" TEXT NOT NULL DEFAULT 'HAMMADDE',
    "birim" TEXT NOT NULL DEFAULT 'ADET',
    "alis_fiyati" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "satis_fiyati" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "mevcut_miktar" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "kritik_miktar" DECIMAL(18,4) DEFAULT 0,
    "profil" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stok_kartlar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stok_hareketler" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "stok_id" INTEGER NOT NULL,
    "tarih" TIMESTAMP(3) NOT NULL,
    "giris" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "cikis" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "aciklama" TEXT NOT NULL,
    "belge_no" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stok_hareketler_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "yevmiye_kayitlari" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "fis_no" TEXT NOT NULL,
    "tarih" TIMESTAMP(3) NOT NULL,
    "aciklama" TEXT NOT NULL,
    "toplam_borc" DECIMAL(18,2) NOT NULL,
    "toplam_alacak" DECIMAL(18,2) NOT NULL,
    "durum" TEXT NOT NULL DEFAULT 'KESIN',
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "madde_no" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "yevmiye_kayitlari_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "yevmiye_satirlari" (
    "id" SERIAL NOT NULL,
    "yevmiye_kaydi_id" INTEGER NOT NULL,
    "satir_no" INTEGER NOT NULL,
    "hesap_kodu" TEXT NOT NULL,
    "aciklama" TEXT NOT NULL,
    "borc" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "alacak" DECIMAL(18,2) NOT NULL DEFAULT 0,

    CONSTRAINT "yevmiye_satirlari_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faturalar" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "belge_no" TEXT NOT NULL,
    "tarih" TIMESTAMP(3) NOT NULL,
    "yon" TEXT NOT NULL,
    "cari_id" INTEGER,
    "ara_toplam" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "kdv_tutari" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "genel_toplam" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "durum" TEXT NOT NULL DEFAULT 'TASLAK',
    "yevmiye_fis_no" TEXT,
    "profil" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "faturalar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fatura_satirlari" (
    "id" SERIAL NOT NULL,
    "fatura_id" INTEGER NOT NULL,
    "satir_no" INTEGER NOT NULL,
    "stok_id" INTEGER,
    "aciklama" TEXT NOT NULL,
    "miktar" DECIMAL(18,4) NOT NULL,
    "birim_fiyat" DECIMAL(18,4) NOT NULL,
    "kdv_oran" DECIMAL(5,2) NOT NULL DEFAULT 20,
    "tutar" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "fatura_satirlari_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personeller" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "ad_soyad" TEXT NOT NULL,
    "tckn" TEXT NOT NULL,
    "gorev" TEXT,
    "ise_giris" TIMESTAMP(3),
    "ise_cikis" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "profil" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "personeller_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bordrolar" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "personel_id" INTEGER NOT NULL,
    "donem" TEXT NOT NULL,
    "brut" DECIMAL(18,2) NOT NULL,
    "net" DECIMAL(18,2) NOT NULL,
    "sgk_isci" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "sgk_isveren" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "gelir_vergisi" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "durum" TEXT NOT NULL DEFAULT 'TASLAK',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bordrolar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_state" (
    "company_id" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_state_pkey" PRIMARY KEY ("company_id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "tablo_adi" TEXT NOT NULL,
    "islem_tipi" "AuditIslemTipi" NOT NULL,
    "kullanici_id" INTEGER,
    "tarih" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eski_veri" JSONB,
    "yeni_veri" JSONB,
    "ip_adresi" TEXT,
    "onceki_hash" TEXT,
    "kayit_hash" TEXT,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "companies_code_key" ON "companies"("code");

-- CreateIndex
CREATE UNIQUE INDEX "branches_company_id_code_key" ON "branches"("company_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "fiscal_periods_company_id_year_key" ON "fiscal_periods"("company_id", "year");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_vkn_idx" ON "users"("vkn");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "hesap_plani_company_id_ad_idx" ON "hesap_plani"("company_id", "ad");

-- CreateIndex
CREATE UNIQUE INDEX "hesap_plani_company_id_kod_key" ON "hesap_plani"("company_id", "kod");

-- CreateIndex
CREATE UNIQUE INDEX "depolar_company_id_code_key" ON "depolar"("company_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "fiyat_listeleri_company_id_code_key" ON "fiyat_listeleri"("company_id", "code");

-- CreateIndex
CREATE INDEX "cari_kartlar_company_id_vergi_no_idx" ON "cari_kartlar"("company_id", "vergi_no");

-- CreateIndex
CREATE UNIQUE INDEX "cari_kartlar_company_id_kod_key" ON "cari_kartlar"("company_id", "kod");

-- CreateIndex
CREATE INDEX "cari_hareketler_company_id_cari_id_tarih_idx" ON "cari_hareketler"("company_id", "cari_id", "tarih");

-- CreateIndex
CREATE INDEX "stok_kartlar_company_id_tur_idx" ON "stok_kartlar"("company_id", "tur");

-- CreateIndex
CREATE UNIQUE INDEX "stok_kartlar_company_id_stok_kodu_key" ON "stok_kartlar"("company_id", "stok_kodu");

-- CreateIndex
CREATE INDEX "stok_hareketler_company_id_stok_id_tarih_idx" ON "stok_hareketler"("company_id", "stok_id", "tarih");

-- CreateIndex
CREATE INDEX "yevmiye_kayitlari_company_id_tarih_idx" ON "yevmiye_kayitlari"("company_id", "tarih");

-- CreateIndex
CREATE UNIQUE INDEX "yevmiye_kayitlari_company_id_fis_no_key" ON "yevmiye_kayitlari"("company_id", "fis_no");

-- CreateIndex
CREATE INDEX "yevmiye_satirlari_hesap_kodu_idx" ON "yevmiye_satirlari"("hesap_kodu");

-- CreateIndex
CREATE UNIQUE INDEX "yevmiye_satirlari_yevmiye_kaydi_id_satir_no_key" ON "yevmiye_satirlari"("yevmiye_kaydi_id", "satir_no");

-- CreateIndex
CREATE INDEX "faturalar_company_id_tarih_idx" ON "faturalar"("company_id", "tarih");

-- CreateIndex
CREATE UNIQUE INDEX "faturalar_company_id_belge_no_key" ON "faturalar"("company_id", "belge_no");

-- CreateIndex
CREATE UNIQUE INDEX "fatura_satirlari_fatura_id_satir_no_key" ON "fatura_satirlari"("fatura_id", "satir_no");

-- CreateIndex
CREATE UNIQUE INDEX "personeller_company_id_tckn_key" ON "personeller"("company_id", "tckn");

-- CreateIndex
CREATE UNIQUE INDEX "bordrolar_company_id_personel_id_donem_key" ON "bordrolar"("company_id", "personel_id", "donem");

-- CreateIndex
CREATE INDEX "audit_logs_tablo_adi_idx" ON "audit_logs"("tablo_adi");

-- CreateIndex
CREATE INDEX "audit_logs_tarih_idx" ON "audit_logs"("tarih");

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fiscal_periods" ADD CONSTRAINT "fiscal_periods_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_companies" ADD CONSTRAINT "user_companies_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_companies" ADD CONSTRAINT "user_companies_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hesap_plani" ADD CONSTRAINT "hesap_plani_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "depolar" ADD CONSTRAINT "depolar_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fiyat_listeleri" ADD CONSTRAINT "fiyat_listeleri_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cari_kartlar" ADD CONSTRAINT "cari_kartlar_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cari_hareketler" ADD CONSTRAINT "cari_hareketler_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cari_hareketler" ADD CONSTRAINT "cari_hareketler_cari_id_fkey" FOREIGN KEY ("cari_id") REFERENCES "cari_kartlar"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stok_kartlar" ADD CONSTRAINT "stok_kartlar_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stok_hareketler" ADD CONSTRAINT "stok_hareketler_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stok_hareketler" ADD CONSTRAINT "stok_hareketler_stok_id_fkey" FOREIGN KEY ("stok_id") REFERENCES "stok_kartlar"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "yevmiye_kayitlari" ADD CONSTRAINT "yevmiye_kayitlari_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "yevmiye_satirlari" ADD CONSTRAINT "yevmiye_satirlari_yevmiye_kaydi_id_fkey" FOREIGN KEY ("yevmiye_kaydi_id") REFERENCES "yevmiye_kayitlari"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faturalar" ADD CONSTRAINT "faturalar_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faturalar" ADD CONSTRAINT "faturalar_cari_id_fkey" FOREIGN KEY ("cari_id") REFERENCES "cari_kartlar"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fatura_satirlari" ADD CONSTRAINT "fatura_satirlari_fatura_id_fkey" FOREIGN KEY ("fatura_id") REFERENCES "faturalar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personeller" ADD CONSTRAINT "personeller_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bordrolar" ADD CONSTRAINT "bordrolar_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bordrolar" ADD CONSTRAINT "bordrolar_personel_id_fkey" FOREIGN KEY ("personel_id") REFERENCES "personeller"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_state" ADD CONSTRAINT "workspace_state_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_kullanici_id_fkey" FOREIGN KEY ("kullanici_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

