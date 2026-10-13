CREATE TABLE "edefter_paketleri" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "defter_turu" TEXT NOT NULL DEFAULT 'YEVMIYE',
    "berat_turu" TEXT NOT NULL DEFAULT 'YEVMIYE_BERAT',
    "status" TEXT NOT NULL,
    "file_hash" TEXT,
    "validation" JSONB NOT NULL,
    "payload" JSONB NOT NULL,
    "prepared_by_id" INTEGER,
    "branch_code" TEXT,
    "attempts" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "edefter_paketleri_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "edefter_paketleri_company_id_year_month_revision_key" ON "edefter_paketleri"("company_id", "year", "month", "revision");
CREATE INDEX "edefter_paketleri_company_id_year_month_idx" ON "edefter_paketleri"("company_id", "year", "month");

ALTER TABLE "edefter_paketleri" ADD CONSTRAINT "edefter_paketleri_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
