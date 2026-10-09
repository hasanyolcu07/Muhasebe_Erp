import { useCallback, useEffect, useState } from "react";
import { FormProvider, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BranchRecordTypeFields } from "@/components/financial/BranchRecordTypeFields";
import { CheckBondPicker, type CheckBondPick } from "@/components/financial/CheckBondPicker";
import { ChartOfAccountsPicker } from "@/components/ChartOfAccountsPicker";
import { FisNoPreviewField } from "@/components/financial/FisNoPreviewField";
import { FinancialFormSync } from "@/components/financial/FinancialFormSync";
import { QuickAddBankaPanel } from "@/components/quick-add/QuickAddBankaPanel";
import { QuickAddTrigger } from "@/components/quick-add/QuickAddTrigger";
import { DOC_TYPES } from "@/services/documentSeriesApi";
import { useAppStore, isAccountingEnabledForRecordType } from "@/store/appStore";
import { bankaIslemleriApi, type BankaLookup, type CariLookup } from "../api/bankaIslemleriApi";
import { ActionPillBar } from "@/components/ActionPillBar";
import {
  bankIslemFormSchema,
  emptyBankIslemForm,
  needsCheckRef,
  needsDirection,
  needsKurFarkiFields,
  needsPosFields,
  needsTargetBank,
  TXN_TYPE_OPTIONS,
  type BankTxnType,
  type BankIslemFormValues,
} from "../schemas/bankaIslemleriSchema";

type Props = {
  open: boolean;
  initialTxnType?: BankTxnType;
  filterBankAccountId?: number | null;
  onClose: () => void;
  onSaved: () => void;
};

export function BankaHareketFormPanel({
  open,
  initialTxnType = "HAVALE_EFT",
  filterBankAccountId,
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
  const [bankaList, setBankaList] = useState<BankaLookup[]>([]);
  const [cariList, setCariList] = useState<CariLookup[]>([]);
  const [quickBankaOpen, setQuickBankaOpen] = useState(false);
  const [quickTargetBankaOpen, setQuickTargetBankaOpen] = useState(false);

  const methods = useForm<BankIslemFormValues>({
    resolver: zodResolver(bankIslemFormSchema) as Resolver<BankIslemFormValues>,
    defaultValues: emptyBankIslemForm(defaultBranch, defaultRt, initialTxnType),
    mode: "onBlur",
  });

  const { handleSubmit, reset, register, watch, setValue, formState } = methods;
  const txnType = watch("txn_type");
  const formBranchId = watch("branch_id");
  const formRecordTypeId = watch("record_type_id");
  const txnDate = watch("txn_date");
  const direction = watch("direction");
  const bankAccountId = watch("bank_account_id");
  const accountingEnabled = isAccountingEnabledForRecordType(recordTypes, formRecordTypeId);

  useEffect(() => {
    setDirty(open && formState.isDirty);
  }, [formState.isDirty, open, setDirty]);

  useEffect(() => {
    if (!open) {
      setDirty(false);
      return;
    }
    reset(emptyBankIslemForm(defaultBranch, defaultRt, initialTxnType));
    if (filterBankAccountId) {
      setValue("bank_account_id", filterBankAccountId);
    }
  }, [open, initialTxnType, defaultBranch, defaultRt, filterBankAccountId, reset, setValue, setDirty]);

  const loadLookups = useCallback(
    async (opts?: { skipAutoSelect?: boolean }) => {
      try {
        const [bankaRes, cariRes] = await Promise.all([
          bankaIslemleriApi.lookupBanka({ branch_id: formBranchId ?? undefined }),
          bankaIslemleriApi.lookupCari({ branch_id: formBranchId ?? undefined }),
        ]);
        const items = bankaRes.items ?? [];
        setBankaList(items);
        setCariList(cariRes.items ?? []);
        if (!opts?.skipAutoSelect) {
          const preferredId = filterBankAccountId ?? items[0]?.id;
          if (preferredId) {
            setValue("bank_account_id", preferredId, { shouldValidate: true });
          }
        }
        return items;
      } catch {
        return [] as BankaLookup[];
      }
    },
    [formBranchId, filterBankAccountId, setValue]
  );

  useEffect(() => {
    if (open) void loadLookups();
  }, [open, loadLookups]);

  async function handleBankaCreated(id: number, field: "bank_account_id" | "target_bank_account_id") {
    const items = await loadLookups({ skipAutoSelect: true });
    if (!items.some((b) => b.id === id)) {
      setBankaList((prev) => [
        ...prev,
        {
          id,
          code: `BN-${id}`,
          name: "Yeni banka",
          bank_name: null,
          iban: null,
          account_no: null,
          balance: 0,
          currency_code: "TRY",
          is_passive: false,
        },
      ]);
    }
    setValue(field, id, { shouldDirty: true, shouldValidate: true });
  }

  const title =
    TXN_TYPE_OPTIONS.find((o) => o.value === txnType)?.label ?? "Banka Fişi / Hareket Kayıt Ekranı";

  const onSubmit = async (values: BankIslemFormValues) => {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...values,
        target_bank_account_id: needsTargetBank(values.txn_type) ? values.target_bank_account_id : null,
        direction: needsDirection(values.txn_type) ? values.direction : null,
        account_id: values.account_id || null,
        document_no: values.document_no?.trim() || null,
        check_ref: values.check_ref?.trim() || null,
        check_bond_id: values.check_bond_id || null,
        coa_id: needsKurFarkiFields(values.txn_type) ? values.coa_id || null : null,
        pos_batch_no: values.pos_batch_no?.trim() || null,
        commission_amount: values.commission_amount || null,
        kur_farki_type: needsKurFarkiFields(values.txn_type) ? values.kur_farki_type : null,
        exchange_rate: needsKurFarkiFields(values.txn_type) ? values.exchange_rate : null,
        foreign_amount: needsKurFarkiFields(values.txn_type) ? values.foreign_amount : null,
      };
      await bankaIslemleriApi.create(payload);
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

  const handleTypeChange = (type: BankTxnType) => {
    setValue("txn_type", type, { shouldDirty: true, shouldValidate: true });
    setValue("check_bond_id", null, { shouldDirty: true });
    setValue("check_ref", null, { shouldDirty: true });
    if (needsDirection(type)) {
      setValue("direction", "GELEN", { shouldDirty: true });
    } else {
      setValue("direction", null, { shouldDirty: true });
    }
    if (needsKurFarkiFields(type)) {
      setValue("kur_farki_type", "GELIR", { shouldDirty: true });
    }
  };

  function handleCheckSelect(item: CheckBondPick | null) {
    setValue("check_bond_id", item?.id ?? null, { shouldDirty: true, shouldValidate: true });
    setValue("check_ref", item?.document_no ?? null, { shouldDirty: true });
    if (item) {
      setValue("amount", Number(item.amount), { shouldDirty: true, shouldValidate: true });
      if (item.account_id) {
        setValue("account_id", item.account_id, { shouldDirty: true });
      }
      const bank = bankaList.find((b) => b.id === bankAccountId);
      const bankNo = bank?.account_no || bank?.iban || bank?.code || "";
      const cariUnvan = item.account_label?.split("|")[1]?.trim() || item.account_label || "";
      const vade = item.due_date
        ? new Date(item.due_date).toLocaleDateString("tr-TR")
        : "—";
      const desc = `${item.document_no} - ${vade} - ${cariUnvan} - ${bankNo}`;
      setValue("description", desc, { shouldDirty: true, shouldValidate: true });
    }
  }

  if (!open) return null;

  return (
    <FormProvider {...methods}>
      <FinancialFormSync />
      <div id="bankaHareketEntryPanel" className="accordion-panel">
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
          <span id="bankaHareketTitleText" style={{ fontSize: 15, fontWeight: 800, color: "#2563eb" }}>
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

        <ActionPillBar
          pills={TXN_TYPE_OPTIONS.map((opt) => ({
            id: opt.value,
            label: opt.shortLabel,
            variant:
              opt.value === "HAVALE_EFT"
                ? "blue"
                : opt.value === "POS_BLOKE_COZUMU" || opt.value === "POS_TAHSILAT"
                  ? "green"
                  : opt.value === "VIRMAN"
                    ? "amber"
                    : opt.value === "KUR_FARKI"
                      ? "orange"
                      : opt.value === "BANKA_MASRAFI"
                        ? "red"
                        : "default",
            onClick: () => handleTypeChange(opt.value),
          }))}
          activeId={txnType}
        />
        <input type="hidden" {...register("txn_type")} />

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
              <label>Banka Hesabı</label>
              <QuickAddTrigger label="Yeni Ekle" onClick={() => setQuickBankaOpen(true)} />
            </div>
            <select
              className="form-control required"
              style={{ fontWeight: 700, color: "#1e3a8a" }}
              {...register("bank_account_id", { valueAsNumber: true })}
            >
              <option value={0}>— Banka seçin —</option>
              {bankaList.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.code} | {b.name} — Bakiye: {Number(b.balance).toLocaleString("tr-TR")}{" "}
                  {b.currency_code || "₺"}
                </option>
              ))}
            </select>
            {formState.errors.bank_account_id ? (
              <span className="field-error">{formState.errors.bank_account_id.message}</span>
            ) : null}
          </div>
          <div>
            <div className="field-label-row">
              <label>İşlem Tarihi</label>
            </div>
            <input type="date" className="form-control required" {...register("txn_date")} />
          </div>
          <div>
            <div className="field-label-row">
              <label>Belge / Dekont No</label>
            </div>
            <input type="text" className="form-control" {...register("document_no")} placeholder="DEK-2026-0001" />
          </div>
          <FisNoPreviewField
            documentType={DOC_TYPES.bank[txnType]}
            branchId={formBranchId}
            recordTypeId={formRecordTypeId}
            transactionDate={txnDate}
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 14,
            marginBottom: 14,
          }}
        >
          {needsDirection(txnType) ? (
            <div>
              <div className="field-label-row">
                <label>İşlem Yönü</label>
              </div>
              <select className="form-control required" {...register("direction")}>
                <option value="GELEN">Gelen (Tahsilat)</option>
                <option value="GIDEN">Giden (Ödeme)</option>
              </select>
            </div>
          ) : null}

          {needsTargetBank(txnType) ? (
            <div>
              <div className="field-label-row">
                <label>Hedef Banka Hesabı</label>
                <QuickAddTrigger label="Yeni Ekle" onClick={() => setQuickTargetBankaOpen(true)} />
              </div>
              <select
                className="form-control required"
                {...register("target_bank_account_id", {
                  setValueAs: (v) => (v === "" || v === "0" ? null : Number(v)),
                })}
              >
                <option value="">— Hedef banka —</option>
                {bankaList.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code} | {b.name}
                  </option>
                ))}
              </select>
              {formState.errors.target_bank_account_id ? (
                <span className="field-error">{formState.errors.target_bank_account_id.message}</span>
              ) : null}
            </div>
          ) : null}

          <div>
            <div className="field-label-row">
              <label>Karşı Hesap / Cari (opsiyonel)</label>
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
              <label>Giriş Tutar (Yerel TL)</label>
            </div>
            <input
              type="number"
              step="0.01"
              min="0"
              id="bh-giris"
              className="form-control required"
              style={{ fontWeight: 800, color: "#10b981" }}
              {...register("amount", { valueAsNumber: true })}
            />
            {formState.errors.amount ? (
              <span className="field-error">{formState.errors.amount.message}</span>
            ) : null}
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

        {(needsPosFields(txnType) || needsCheckRef(txnType) || needsKurFarkiFields(txnType)) && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 14,
              marginBottom: 14,
            }}
          >
            {needsPosFields(txnType) ? (
              <>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#334155", display: "block", marginBottom: 4 }}>
                    POS Batch No
                  </label>
                  <input type="text" className="form-control" {...register("pos_batch_no")} />
                </div>
                {txnType === "POS_BLOKE_COZUMU" ? (
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: "#334155", display: "block", marginBottom: 4 }}>
                      Komisyon Tutarı (opsiyonel)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="form-control"
                      {...register("commission_amount", {
                        setValueAs: (v) => (v === "" || v == null ? null : Number(v)),
                      })}
                    />
                  </div>
                ) : null}
              </>
            ) : null}

            {needsCheckRef(txnType) ? (
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#334155", display: "block", marginBottom: 4 }}>
                  Çek / Senet Seç
                </label>
                <CheckBondPicker
                  value={watch("check_bond_id") ?? null}
                  direction={(direction as "GELEN" | "GIDEN") || "GELEN"}
                  branchId={formBranchId}
                  onChange={handleCheckSelect}
                />
                {formState.errors.check_bond_id ? (
                  <span className="field-error">{formState.errors.check_bond_id.message}</span>
                ) : null}
              </div>
            ) : null}

            {needsKurFarkiFields(txnType) ? (
              <>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#334155", display: "block", marginBottom: 4 }}>
                    Muhasebe Hesap Kodu (opsiyonel)
                  </label>
                  <ChartOfAccountsPicker
                    value={watch("coa_id") ?? null}
                    onChange={(id) => setValue("coa_id", id, { shouldDirty: true })}
                    initialSearch="646"
                    placeholder="646 / 656 veya hesap planından seç…"
                  />
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                    Boş bırakılırsa muhasebeleştirme kod tanımı kullanılır (yakında)
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#334155", display: "block", marginBottom: 4 }}>
                    Kur Farkı Tipi
                  </label>
                  <select className="form-control required" {...register("kur_farki_type")}>
                    <option value="GELIR">Gelir (Kambiyo Karı)</option>
                    <option value="GIDER">Gider (Kambiyo Zararı)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#334155", display: "block", marginBottom: 4 }}>
                    Döviz Kuru
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    min="0"
                    className="form-control required"
                    {...register("exchange_rate", {
                      setValueAs: (v) => (v === "" || v == null ? null : Number(v)),
                    })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#334155", display: "block", marginBottom: 4 }}>
                    Döviz Tutarı (opsiyonel)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-control"
                    {...register("foreign_amount", {
                      setValueAs: (v) => (v === "" || v == null ? null : Number(v)),
                    })}
                  />
                </div>
              </>
            ) : null}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
          <BranchRecordTypeFields variant="form-row" />
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#334155", display: "block", marginBottom: 4 }}>
              İşlem Genel Açıklaması / Mahsup Notu
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
          <button type="button" className="btn-save" disabled={saving} onClick={handleSubmit(onSubmit)}>
            {saving ? "Kaydediliyor…" : "💾 BANKA FİŞİNİ KAYDET"}
          </button>
        </div>
      </div>

      <QuickAddBankaPanel
        open={quickBankaOpen}
        onClose={() => setQuickBankaOpen(false)}
        onCreated={(id) => void handleBankaCreated(id, "bank_account_id")}
      />
      <QuickAddBankaPanel
        open={quickTargetBankaOpen}
        onClose={() => setQuickTargetBankaOpen(false)}
        onCreated={(id) => void handleBankaCreated(id, "target_bank_account_id")}
      />
    </FormProvider>
  );
}
