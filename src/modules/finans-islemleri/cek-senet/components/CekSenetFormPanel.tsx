import { useCallback, useEffect, useState } from "react";
import { FormProvider, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BranchRecordTypeFields } from "@/components/financial/BranchRecordTypeFields";
import { FisNoPreviewField } from "@/components/financial/FisNoPreviewField";
import { FinancialFormSync } from "@/components/financial/FinancialFormSync";
import { QuickAddBankaPanel } from "@/components/quick-add/QuickAddBankaPanel";
import { QuickAddKasaPanel } from "@/components/quick-add/QuickAddKasaPanel";
import { QuickAddTrigger } from "@/components/quick-add/QuickAddTrigger";
import { DOC_TYPES } from "@/services/documentSeriesApi";
import { useAppStore, isAccountingEnabledForRecordType } from "@/store/appStore";
import { CodeSelectFields } from "@/modules/ayarlar/components/CodeSelectFields";
import {
  cekSenetApi,
  type BankaLookup,
  type CariLookup,
  type KasaLookup,
  type PortfoyLookup,
} from "../api/cekSenetApi";
import {
  ALINAN_TXN_OPTIONS,
  VERILEN_TXN_OPTIONS,
  cekSenetTxnSchema,
  emptyTxnForm,
  isEntryTxn,
  needsBank,
  needsBankOrCash,
  needsBouncedFlag,
  needsExistingCheck,
  needsTargetCari,
  type CekSenetTxnFormValues,
  type CekSenetTxnType,
  type Direction,
} from "../schemas/cekSenetSchema";

type Props = {
  open: boolean;
  direction: Direction;
  initialTxnType: CekSenetTxnType;
  onClose: () => void;
  onSaved: () => void;
};

export function CekSenetFormPanel({ open, direction, initialTxnType, onClose, onSaved }: Props) {
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
  const [cariList, setCariList] = useState<CariLookup[]>([]);
  const [bankaList, setBankaList] = useState<BankaLookup[]>([]);
  const [kasaList, setKasaList] = useState<KasaLookup[]>([]);
  const [portfoyList, setPortfoyList] = useState<PortfoyLookup[]>([]);
  const [quickBankaOpen, setQuickBankaOpen] = useState(false);
  const [quickKasaOpen, setQuickKasaOpen] = useState(false);

  const txnOptions = direction === "ALINAN" ? ALINAN_TXN_OPTIONS : VERILEN_TXN_OPTIONS;

  const methods = useForm<CekSenetTxnFormValues>({
    resolver: zodResolver(cekSenetTxnSchema) as Resolver<CekSenetTxnFormValues>,
    defaultValues: emptyTxnForm(defaultBranch, defaultRt, initialTxnType, direction),
    mode: "onBlur",
  });

  const { handleSubmit, reset, register, watch, setValue, formState } = methods;
  const txnType = watch("transaction_type");
  const formBranchId = watch("branch_id");
  const formRecordTypeId = watch("record_type_id");
  const txnDate = watch("transaction_date");
  const accountingEnabled = isAccountingEnabledForRecordType(recordTypes, formRecordTypeId);

  useEffect(() => {
    setDirty(open && formState.isDirty);
  }, [formState.isDirty, open, setDirty]);

  useEffect(() => {
    if (!open) {
      setDirty(false);
      return;
    }
    reset(emptyTxnForm(defaultBranch, defaultRt, initialTxnType, direction));
  }, [open, initialTxnType, direction, defaultBranch, defaultRt, reset, setDirty]);

  const loadLookups = useCallback(async () => {
    try {
      const [cariRes, bankaRes, kasaRes] = await Promise.all([
        cekSenetApi.lookupCari({ branch_id: formBranchId }),
        cekSenetApi.lookupBanka({ branch_id: formBranchId }),
        cekSenetApi.lookupKasa({ branch_id: formBranchId }),
      ]);
      setCariList(cariRes.items ?? []);
      setBankaList(bankaRes.items ?? []);
      setKasaList(kasaRes.items ?? []);
    } catch {
      /* ignore */
    }
  }, [formBranchId]);

  useEffect(() => {
    if (open) loadLookups();
  }, [open, loadLookups]);

  useEffect(() => {
    if (!open || isEntryTxn(txnType)) {
      setPortfoyList([]);
      return;
    }
    cekSenetApi
      .lookupPortfoy({ direction, branch_id: formBranchId })
      .then((res) => setPortfoyList(res.items ?? []))
      .catch(() => setPortfoyList([]));
  }, [open, txnType, direction, formBranchId]);

  const onSubmit = async (values: CekSenetTxnFormValues) => {
    setSaving(true);
    setError(null);
    try {
      await cekSenetApi.createTransaction(values);
      setDirty(false);
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kayıt başarısız");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="accordion-panel show" style={{ marginBottom: 20 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 16px",
          borderBottom: "1px solid #e2e8f0",
          background: "#f8fafc",
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 800, color: "#1e3a8a" }}>
          📝 {direction === "ALINAN" ? "Alınan" : "Verilen"} Çek/Senet İşlemi
        </span>
        <button
          type="button"
          className="btn-top"
          style={{ background: "#fee2e2", color: "#b91c1c", border: "none", fontWeight: 800 }}
          onClick={() => guardNavigate(onClose)}
        >
          Kapat ✖
        </button>
      </div>

      <FormProvider {...methods}>
        <FinancialFormSync syncFromTopbar />
        <form onSubmit={handleSubmit(onSubmit)} style={{ padding: 16 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <BranchRecordTypeFields variant="form-row" />

            <div>
              <div className="field-label-row">
                <label>İşlem Türü</label>
              </div>
              <select className="form-control" {...register("transaction_type")} style={{ fontWeight: 700 }}>
                {txnOptions.map((o) => (
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
              <input type="date" className="form-control" {...register("transaction_date")} />
            </div>

            <FisNoPreviewField
              documentType={DOC_TYPES.cek(txnType)}
              branchId={formBranchId}
              recordTypeId={formRecordTypeId}
              transactionDate={txnDate}
            />

            {needsExistingCheck(txnType) && (
              <div style={{ gridColumn: "1 / -1" }}>
                <div className="field-label-row">
                  <label>Portföydeki Çek/Senet</label>
                </div>
                <select
                  className="form-control"
                  value={watch("check_bond_id") ?? ""}
                  onChange={(e) => {
                    const id = e.target.value ? Number(e.target.value) : null;
                    setValue("check_bond_id", id, { shouldDirty: true });
                    const sel = portfoyList.find((p) => p.id === id);
                    if (sel) {
                      setValue("amount", Number(sel.amount), { shouldDirty: true });
                      setValue("document_no", sel.document_no, { shouldDirty: true });
                    }
                  }}
                >
                  <option value="">Seçin…</option>
                  {portfoyList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.document_no} | {p.status_label} | {Number(p.amount).toLocaleString("tr-TR")} ₺
                    </option>
                  ))}
                </select>
              </div>
            )}

            {isEntryTxn(txnType) && (
              <>
                <div>
                  <div className="field-label-row">
                    <label>Enstrüman</label>
                  </div>
                  <select className="form-control" {...register("instrument_type")}>
                    <option value="CEK">Çek</option>
                    <option value="SENET">Senet</option>
                  </select>
                </div>
                <div>
                  <div className="field-label-row">
                    <label>Seri / No</label>
                  </div>
                  <input type="text" className="form-control" placeholder="A-12345678" {...register("document_no")} />
                </div>
                <div>
                  <div className="field-label-row">
                    <label>Vade Tarihi</label>
                  </div>
                  <input type="date" className="form-control" {...register("due_date")} />
                </div>
              </>
            )}

            <div>
              <div className="field-label-row">
                <label>Tutar (₺)</label>
              </div>
              <input type="number" step="0.01" className="form-control" {...register("amount")} />
            </div>

            <div>
              <div className="field-label-row">
                <label>Cari Hesap</label>
              </div>
              <select
                className="form-control"
                value={watch("account_id") ?? ""}
                onChange={(e) => setValue("account_id", e.target.value ? Number(e.target.value) : null, { shouldDirty: true })}
              >
                <option value="">Seçin…</option>
                {cariList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} | {c.title}
                  </option>
                ))}
              </select>
            </div>

            {needsTargetCari(txnType) && (
              <div>
                <div className="field-label-row">
                  <label>Ciro Hedef Cari</label>
                </div>
                <select
                  className="form-control"
                  value={watch("target_account_id") ?? ""}
                  onChange={(e) =>
                    setValue("target_account_id", e.target.value ? Number(e.target.value) : null, { shouldDirty: true })
                  }
                >
                  <option value="">Seçin…</option>
                  {cariList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} | {c.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {(needsBankOrCash(txnType) || needsBank(txnType)) && (
              <div>
                <div className="field-label-row">
                  <label>Banka Hesabı</label>
                  <QuickAddTrigger label="Yeni Ekle" onClick={() => setQuickBankaOpen(true)} />
                </div>
                <select
                  className="form-control"
                  value={watch("bank_account_id") ?? ""}
                  onChange={(e) =>
                    setValue("bank_account_id", e.target.value ? Number(e.target.value) : null, { shouldDirty: true })
                  }
                >
                  <option value="">Seçin…</option>
                  {bankaList.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.code} | {b.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {needsBankOrCash(txnType) && (
              <div>
                <div className="field-label-row">
                  <label>Kasa (alternatif)</label>
                  <QuickAddTrigger label="Yeni Ekle" onClick={() => setQuickKasaOpen(true)} />
                </div>
                <select
                  className="form-control"
                  value={watch("cash_account_id") ?? ""}
                  onChange={(e) =>
                    setValue("cash_account_id", e.target.value ? Number(e.target.value) : null, { shouldDirty: true })
                  }
                >
                  <option value="">Seçin…</option>
                  {kasaList.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.code} | {k.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {needsBouncedFlag(txnType) && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 22 }}>
                <input type="checkbox" id="is_bounced" {...register("is_bounced")} />
                <label htmlFor="is_bounced" style={{ fontSize: 12.5, fontWeight: 700, color: "#b91c1c" }}>
                  Karşılıksız
                </label>
              </div>
            )}

            <div style={{ gridColumn: "1 / -1" }}>
              <div className="field-label-row">
                <label>Açıklama</label>
              </div>
              <input type="text" className="form-control" {...register("description")} />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <CodeSelectFields
                entityType="CHEQUE"
                values={{}}
                onChange={() => undefined}
              />
            </div>
          </div>

          {!accountingEnabled && (
            <div
              style={{
                background: "#fef3c7",
                border: "1px solid #fde68a",
                borderRadius: 8,
                padding: "8px 12px",
                marginBottom: 12,
                fontSize: 12.5,
                color: "#92400e",
              }}
            >
              Gayri resmi kayıt türü — yevmiye oluşturulmayacaktır.
            </div>
          )}

          {error && (
            <div style={{ background: "#fee2e2", color: "#b91c1c", padding: 10, borderRadius: 8, marginBottom: 12 }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button type="button" className="btn-cancel" onClick={() => guardNavigate(onClose)}>
              Vazgeç
            </button>
            <button type="submit" className="btn-save" disabled={saving}>
              {saving ? "Kaydediliyor…" : "💾 İşlemi Kaydet"}
            </button>
          </div>
        </form>
      </FormProvider>

      <QuickAddBankaPanel
        open={quickBankaOpen}
        onClose={() => setQuickBankaOpen(false)}
        onCreated={async (id) => {
          await loadLookups();
          setValue("bank_account_id", id, { shouldDirty: true, shouldValidate: true });
        }}
      />
      <QuickAddKasaPanel
        open={quickKasaOpen}
        onClose={() => setQuickKasaOpen(false)}
        onCreated={async (id) => {
          await loadLookups();
          setValue("cash_account_id", id, { shouldDirty: true, shouldValidate: true });
        }}
      />
    </div>
  );
}
