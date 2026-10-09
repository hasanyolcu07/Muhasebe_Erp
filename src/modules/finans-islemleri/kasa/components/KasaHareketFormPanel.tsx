import { useCallback, useEffect, useState } from "react";
import { FormProvider, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BranchRecordTypeFields } from "@/components/financial/BranchRecordTypeFields";
import { FisNoPreviewField } from "@/components/financial/FisNoPreviewField";
import { FinancialFormSync } from "@/components/financial/FinancialFormSync";
import { QuickAddKasaPanel } from "@/components/quick-add/QuickAddKasaPanel";
import { QuickAddTrigger } from "@/components/quick-add/QuickAddTrigger";
import { DOC_TYPES } from "@/services/documentSeriesApi";
import { useAppStore, isAccountingEnabledForRecordType } from "@/store/appStore";
import { kasaIslemleriApi, type CariLookup, type FaturaLookup, type KasaLookup } from "../api/kasaIslemleriApi";
import {
  emptyKasaIslemForm,
  kasaIslemFormSchema,
  TXN_TYPE_OPTIONS,
  type CashTxnType,
  type KasaIslemFormValues,
} from "../schemas/kasaIslemleriSchema";

type Props = {
  open: boolean;
  initialTxnType?: CashTxnType;
  filterCashAccountId?: number | null;
  onClose: () => void;
  onSaved: () => void;
};

export function KasaHareketFormPanel({
  open,
  initialTxnType = "TAHSILAT",
  filterCashAccountId,
  onClose,
  onSaved,
}: Props) {
  const branchId = useAppStore((s) => s.branchId);
  const recordTypeId = useAppStore((s) => s.recordTypeId);
  const branches = useAppStore((s) => s.branches);
  const recordTypes = useAppStore((s) => s.recordTypes);
  const setDirty = useAppStore((s) => s.setDirty);
  const guardNavigate = useAppStore((s) => s.guardNavigate);

  const defaultBranch = branchId ?? branches[0]?.id ?? 1;
  const defaultRt = recordTypeId ?? recordTypes[0]?.id ?? 1;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kasaList, setKasaList] = useState<KasaLookup[]>([]);
  const [cariList, setCariList] = useState<CariLookup[]>([]);
  const [faturaList, setFaturaList] = useState<FaturaLookup[]>([]);
  const [quickKasaOpen, setQuickKasaOpen] = useState(false);
  const [quickTargetKasaOpen, setQuickTargetKasaOpen] = useState(false);

  const methods = useForm<KasaIslemFormValues>({
    resolver: zodResolver(kasaIslemFormSchema) as Resolver<KasaIslemFormValues>,
    defaultValues: emptyKasaIslemForm(defaultBranch, defaultRt, initialTxnType),
    mode: "onBlur",
  });

  const { handleSubmit, reset, register, watch, setValue, formState } = methods;
  const txnType = watch("txn_type");
  const formBranchId = watch("branch_id");
  const formRecordTypeId = watch("record_type_id");
  const txnDate = watch("txn_date");
  const accountingEnabled = isAccountingEnabledForRecordType(recordTypes, formRecordTypeId);

  useEffect(() => {
    setDirty(open && formState.isDirty);
  }, [formState.isDirty, open, setDirty]);

  useEffect(() => {
    if (!open) {
      setDirty(false);
      return;
    }
    reset(emptyKasaIslemForm(defaultBranch, defaultRt, initialTxnType));
    if (filterCashAccountId) {
      setValue("cash_account_id", filterCashAccountId);
    }
  }, [open, initialTxnType, defaultBranch, defaultRt, filterCashAccountId, reset, setValue, setDirty]);

  const loadLookups = useCallback(
    async (opts?: { selectCashId?: number | null; skipAutoSelect?: boolean }) => {
      try {
        const [kasaRes, cariRes, faturaRes] = await Promise.all([
          kasaIslemleriApi.lookupKasa({ branch_id: formBranchId ?? undefined }),
          kasaIslemleriApi.lookupCari({ branch_id: formBranchId ?? undefined }),
          kasaIslemleriApi.lookupFatura({ branch_id: formBranchId ?? undefined }),
        ]);
        const kasaItems = kasaRes.items ?? [];
        setKasaList(kasaItems);
        setCariList(cariRes.items ?? []);
        setFaturaList(faturaRes.items ?? []);
        if (opts?.selectCashId) {
          setValue("cash_account_id", opts.selectCashId, { shouldDirty: true, shouldValidate: true });
        } else if (!opts?.skipAutoSelect) {
          const preferredId = filterCashAccountId ?? kasaItems[0]?.id;
          if (preferredId) {
            setValue("cash_account_id", preferredId, { shouldValidate: true });
          }
        }
        return kasaItems;
      } catch {
        return [] as KasaLookup[];
      }
    },
    [formBranchId, filterCashAccountId, setValue]
  );

  useEffect(() => {
    if (open) void loadLookups();
  }, [open, loadLookups]);

  async function handleKasaCreated(id: number, field: "cash_account_id" | "target_cash_account_id") {
    const items = await loadLookups({ skipAutoSelect: true });
    if (!items.some((k) => k.id === id)) {
      setKasaList((prev) => [
        ...prev,
        { id, code: `KS-${id}`, name: "Yeni kasa", balance: 0, currency_code: "TRY", is_passive: false },
      ]);
    }
    setValue(field, id, { shouldDirty: true, shouldValidate: true });
  }

  const title =
    TXN_TYPE_OPTIONS.find((o) => o.value === txnType)?.label ?? "Kasa Hareket Kayıt Ekranı";

  const onSubmit = async (values: KasaIslemFormValues) => {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...values,
        target_cash_account_id: values.txn_type === "VIRMAN" ? values.target_cash_account_id : null,
        account_id: values.account_id || null,
        invoice_id: values.invoice_id || null,
      };
      await kasaIslemleriApi.create(payload);
      setDirty(false);
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kayıt başarısız");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    guardNavigate(() => {
      setDirty(false);
      onClose();
    });
  };

  if (!open) return null;

  return (
    <FormProvider {...methods}>
      <FinancialFormSync />
      <div id="kasaHareketEntryPanel" className="accordion-panel">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 14,
            borderBottom: "2px solid #cbd5e1",
            paddingBottom: 8,
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 800, color: "#10b981" }}>
            ➕ {title}
          </span>
          <button
            type="button"
            className="btn-top"
            style={{ background: "#fee2e2", color: "#b91c1c", border: "none", fontWeight: 800 }}
            onClick={handleClose}
          >
            Kapat ✖
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          {TXN_TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`btn-islem${txnType === opt.value ? " add-green" : ""}`}
              style={
                txnType === opt.value
                  ? { background: opt.color, color: "#fff", borderColor: opt.color, fontWeight: 700 }
                  : undefined
              }
              onClick={() => setValue("txn_type", opt.value, { shouldDirty: true, shouldValidate: true })}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {error ? <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div> : null}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 14,
            marginBottom: 14,
          }}
        >
          <div>
            <div className="field-label-row">
              <label>İşlem Türü</label>
            </div>
            <select className="form-control required" style={{ fontWeight: 700, color: "#10b981" }} {...register("txn_type")}>
              {TXN_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="field-label-row">
              <label>İşlem Tarihi</label>
            </div>
            <input type="date" className="form-control required" {...register("txn_date")} />
            {formState.errors.txn_date ? (
              <span className="field-error">{formState.errors.txn_date.message}</span>
            ) : null}
          </div>
          <div>
            <div className="field-label-row">
              <label>Kasa</label>
              <QuickAddTrigger label="Yeni Ekle" onClick={() => setQuickKasaOpen(true)} />
            </div>
            <select
              className="form-control required"
              style={{ fontWeight: 700, color: "#1e3a8a" }}
              {...register("cash_account_id", { valueAsNumber: true })}
            >
              <option value={0}>— Kasa seçin —</option>
              {kasaList.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.code} | {k.name} — Bakiye: {Number(k.balance).toLocaleString("tr-TR")} {k.currency_code || "₺"}
                </option>
              ))}
            </select>
            {formState.errors.cash_account_id ? (
              <span className="field-error">{formState.errors.cash_account_id.message}</span>
            ) : null}
          </div>
          <div>
            <div className="field-label-row">
              <label>Tutar (₺)</label>
            </div>
            <input
              type="number"
              step="0.01"
              min="0"
              className="form-control required"
              style={{ fontWeight: 800, color: "#10b981" }}
              {...register("amount", { valueAsNumber: true })}
            />
            {formState.errors.amount ? (
              <span className="field-error">{formState.errors.amount.message}</span>
            ) : null}
          </div>
          <FisNoPreviewField
            documentType={DOC_TYPES.kasa[txnType]}
            branchId={formBranchId}
            recordTypeId={formRecordTypeId}
            transactionDate={txnDate}
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: txnType === "VIRMAN" ? "repeat(4, 1fr)" : "repeat(3, 1fr)",
            gap: 14,
            marginBottom: 14,
          }}
        >
          {txnType === "VIRMAN" ? (
            <div>
              <div className="field-label-row">
                <label>Hedef Kasa</label>
                <QuickAddTrigger label="Yeni Ekle" onClick={() => setQuickTargetKasaOpen(true)} />
              </div>
              <select
                className="form-control required"
                {...register("target_cash_account_id", {
                  setValueAs: (v) => (v === "" || v === "0" ? null : Number(v)),
                })}
              >
                <option value="">— Hedef kasa —</option>
                {kasaList.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.code} | {k.name}
                  </option>
                ))}
              </select>
              {formState.errors.target_cash_account_id ? (
                <span className="field-error">{formState.errors.target_cash_account_id.message}</span>
              ) : null}
            </div>
          ) : null}

          <div>
            <div className="field-label-row">
              <label>İlgili Cari (opsiyonel)</label>
            </div>
            <select
              className="form-control"
              {...register("account_id", {
                setValueAs: (v) => (v === "" || v === "0" ? null : Number(v)),
              })}
            >
              <option value="">— Cari seçin —</option>
              {cariList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} | {c.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="field-label-row">
              <label>Fatura Bağı (opsiyonel)</label>
            </div>
            <select
              className="form-control"
              {...register("invoice_id", {
                setValueAs: (v) => (v === "" || v === "0" ? null : Number(v)),
              })}
            >
              <option value="">— Fatura —</option>
              {faturaList.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.invoice_no} | {f.account_title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="field-label-row">
              <label>Muhasebeleşme</label>
            </div>
            <div className="form-control" style={{ fontWeight: 700, color: accountingEnabled ? "#10b981" : "#b91c1c" }}>
              {accountingEnabled ? "🟢 Evet — Kayıt türü muhasebeleşir" : "🔴 Hayır — Gayri Resmi (takip kaydı)"}
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
          <BranchRecordTypeFields variant="form-row" />
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#334155", display: "block", marginBottom: 4 }}>
              Açıklama / Detay Notu
            </label>
            <input type="text" className="form-control required" {...register("description")} />
            {formState.errors.description ? (
              <span className="field-error">{formState.errors.description.message}</span>
            ) : null}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button type="button" className="btn-cancel" onClick={handleClose}>
            ✖ VAZGEÇ
          </button>
          <button
            type="button"
            className="btn-save"
            disabled={saving}
            onClick={handleSubmit(onSubmit)}
          >
            {saving ? "Kaydediliyor…" : "💾 KASA HAREKETİNİ KAYDET"}
          </button>
        </div>
      </div>

      <QuickAddKasaPanel
        open={quickKasaOpen}
        onClose={() => setQuickKasaOpen(false)}
        onCreated={(id) => void handleKasaCreated(id, "cash_account_id")}
      />
      <QuickAddKasaPanel
        open={quickTargetKasaOpen}
        onClose={() => setQuickTargetKasaOpen(false)}
        onCreated={(id) => void handleKasaCreated(id, "target_cash_account_id")}
      />
    </FormProvider>
  );
}
