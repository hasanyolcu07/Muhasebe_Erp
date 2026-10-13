CREATE TABLE "year_end_runs" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "fiscal_year" INTEGER NOT NULL,
    "operation_key" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "preparation_mode" TEXT NOT NULL DEFAULT 'MANUAL',
    "parameter_version" TEXT NOT NULL,
    "preview_data" JSONB NOT NULL,
    "ai_suggestion" JSONB,
    "voucher_ids" JSONB NOT NULL DEFAULT '[]',
    "approved_by_id" INTEGER,
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "year_end_runs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "year_end_runs_company_id_fiscal_year_operation_key_idx" ON "year_end_runs"("company_id", "fiscal_year", "operation_key");

ALTER TABLE "year_end_runs" ADD CONSTRAINT "year_end_runs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
