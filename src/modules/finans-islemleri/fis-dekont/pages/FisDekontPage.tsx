import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FormProvider, useFieldArray, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FisNoPreviewField } from "@/components/financial/FisNoPreviewField";
import { BranchRecordTypeFields } from "@/components/financial/BranchRecordTypeFields";
import { QuickAddBankaPanel } from "@/components/quick-add/QuickAddBankaPanel";
import { QuickAddKasaPanel } from "@/components/quick-add/QuickAddKasaPanel";
import { QuickAddTrigger } from "@/components/quick-add/QuickAddTrigger";
import { DOC_TYPES } from "@/services/documentSeriesApi";
import { FinancialFormSync } from "@/components/financial/FinancialFormSync";
import { useAppStore, isAccountingEnabledForRecordType } from "@/store/appStore";
import { CodeSelectFields } from "@/modules/ayarlar/components/CodeSelectFields";
import { fisDekontApi, type BankaLookup, type CariLookup, type KasaLookup, type VoucherListItem } from "../api/fisDekontApi";
import { CARI_ODEME_TYPE, FIS_TYPES, getFisType, type FisTypeCode } from "../constants/fisTypes";
import { FisDekontListView } from "../components/FisDekontListView";
import { FisKalemTable } from "../components/FisKalemTable";
import { FisTypePillBar } from "../components/FisTypePillBar";
import { KurFarkiModal } from "../components/KurFarkiModal";
import {
  buildBalancedLinesForType,
  emptyFisForm,
  fisDekontFormSchema,
  type FisDekontFormValues,
} from "../schemas/fisDekontSchema";

function parseInitialType(search: URLSearchParams): FisTypeCode {
  const t = (search.get("type") || "TAH").toUpperCase();
  if (t === "CARI_ODEME") return CARI_ODEME_TYPE;
  return (FIS_TYPES.some((f) => f.code === t) ? t : "TAH") as FisTypeCode;
}

export function FisDekontPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const branchId = useAppStore((s) => s.branchId);
  const recordTypeId = useAppStore((s) => s.recordTypeId);
  const branches = useAppStore((s) => s.branches);
  const recordTypes = useAppStore((s) => s.recordTypes);
  const setDirty = useAppStore((s) => s.setDirty);
  const guardNavigate = useAppStore((s) => s.guardNavigate);

  const defaultBranch = branchId ?? branches[0]?.id ?? 1;
  const defaultRt = recordTypeId ?? recordTypes[0]?.id ?? 1;
  const initialType = parseInitialType(searchParams);

  const [activeType, setActiveType] = useState<FisTypeCode>(initialType);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kurModalOpen, setKurModalOpen] = useState(false);
  const [kasaList, setKasaList] = useState<KasaLookup[]>([]);
  const [bankaList, setBankaList] = useState<BankaLookup[]>([]);
  const [cariList, setCariList] = useState<CariLookup[]>([]);
  const [recentItems, setRecentItems] = useState<VoucherListItem[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [quickKasaOpen, setQuickKasaOpen] = useState(false);
  const [quickBankaOpen, setQuickBankaOpen] = useState(false);

  const fisDef = getFisType(activeType);

  const methods = useForm<FisDekontFormValues>({
    resolver: zodResolver(fisDekontFormSchema) as Resolver<FisDekontFormValues>,
    defaultValues: emptyFisForm(defaultBranch, defaultRt, initialType),
    mode: "onBlur",
  });

  const { handleSubmit, reset, register, watch, setValue, control, formState } = methods;
  const { fields, append, remove } = useFieldArray({ control, name: "lines" });

  const formBranchId = watch("branch_id");
  const formRecordTypeId = watch("record_type_id");
  const voucherDate = watch("voucher_date");
  const accountingEnabled = isAccountingEnabledForRecordType(recordTypes, formRecordTypeId);

  useEffect(() => {
    setDirty(formState.isDirty);
  }, [formState.isDirty, setDirty]);

  const loadLookups = useCallback(async () => {
    try {
      const [kasaRes, bankaRes, cariRes] = await Promise.all([
        fisDekontApi.lookupKasa({ branch_id: formBranchId ?? undefined }),
        fisDekontApi.lookupBanka({ branch_id: formBranchId ?? undefined }),
        fisDekontApi.lookupCari({ branch_id: formBranchId ?? undefined }),
      ]);
      setKasaList(kasaRes.items ?? []);
      setBankaList(bankaRes.items ?? []);
      setCariList(cariRes.items ?? []);
    } catch {
      /* ignore */
    }
  }, [formBranchId]);

  const loadRecent = useCallback(async () => {
    setListLoading(true);
    try {
      const res = await fisDekontApi.list({
        branch_id: formBranchId ?? undefined,
        record_type_id: formRecordTypeId ?? undefined,
        page_size: 15,
      });
      setRecentItems(res.items ?? []);
    } catch {
      setRecentItems([]);
    } finally {
      setListLoading(false);
    }
  }, [formBranchId, formRecordTypeId, refreshKey]);

  useEffect(() => {
    loadLookups();
  }, [loadLookups]);

  useEffect(() => {
    loadRecent();
  }, [loadRecent]);

  function switchType(code: FisTypeCode) {
    guardNavigate(() => {
      setActiveType(code);
      setValue("voucher_type", code, { shouldDirty: true });
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("type", code);
          next.set("section", "fis-dekont");
          return next;
        },
        { replace: true }
      );
      const def = getFisType(code);
      if (def && cariList[0]) {
        const lines = buildBalancedLinesForType(code, 15000, cariList[0].id, !!def.isCredit);
        setValue("lines", lines, { shouldDirty: true });
      }
    });
  }

  async function onSubmit(values: FisDekontFormValues) {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...values,
        cash_account_id: values.cash_account_id || null,
        bank_account_id: values.bank_account_id || null,
        lines: values.lines.map((ln) => ({
          ...ln,
          account_id: ln.account_id || null,
          debit: Number(ln.debit || 0),
          credit: Number(ln.credit || 0),
        })),
      };
      await fisDekontApi.create(payload);
      setDirty(false);
      reset(emptyFisForm(formBranchId ?? defaultBranch, formRecordTypeId ?? defaultRt, activeType));
      setRefreshKey((k) => k + 1);
      window.alert("✔ Fiş / Dekont başarıyla kaydedildi.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kayıt başarısız");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm("Bu fiş kaydını silmek istiyor musunuz?")) return;
    try {
      await fisDekontApi.remove(id);
      setRefreshKey((k) => k + 1);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Silme başarısız");
    }
  }

  const kasaLabel = fisDef?.needsKasa ? "Kasa Kodu" : fisDef?.needsPos ? "POS / Banka Terminali" : "Kasa / Banka";

  return (
    <FormProvider {...methods}>
      <FinancialFormSync syncFromTopbar />

      <div className="header-bar">
        <div className="header-breadcrumb">
          Cari İşlemler &amp; Fişler / ({activeType}) {fisDef?.fullName ?? ""} Girişi
        </div>
        <div className="header-btns">
          <BranchRecordTypeFields variant="header" />
          <button type="button" className="btn-cancel" onClick={() => guardNavigate(() => navigate("/app/kart-tanimlari/cari-kartlar"))}>
            ✖ VAZGEÇ / GERİ DÖN
          </button>
          <button type="button" className="btn-save" disabled={saving} onClick={handleSubmit(onSubmit)}>
            💾 FİŞİ / DEKONTU KAYDET
          </button>
        </div>
      </div>

      <FisTypePillBar activeType={activeType} onSelect={switchType} />

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="fis-split-header">
          <div className="fis-box">
            <div className="fis-box-title">
              <span>📋 1. Fiş Türü &amp; Kasa / Banka / POS</span>
            </div>
            <div className="form-row" style={{ gridTemplateColumns: "100px 1fr" }}>
              <label>Fiş Türü</label>
              <input
                type="text"
                className="form-control"
                id="f-tur-display"
                value={activeType === "ODM" ? "Cari Ödeme" : `(${activeType}) ${fisDef?.fullName ?? ""}`}
                disabled
                style={{ fontWeight: 700, color: "#1e3a8a" }}
              />
            </div>

            {fisDef?.needsKasa && (
              <div id="kasaRow" style={{ marginBottom: 10 }}>
                <div className="field-label-row">
                  <label>{kasaLabel}</label>
                  <QuickAddTrigger label="Yeni Ekle" onClick={() => setQuickKasaOpen(true)} />
                </div>
                <select className="form-control required" {...register("cash_account_id", { valueAsNumber: true })}>
                  <option value="">— Kasa seç —</option>
                  {kasaList.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.code} | {k.name} ({k.currency_code || "TL"})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {fisDef?.needsPos && (
              <div id="posTerminalRow" style={{ marginBottom: 10 }}>
                <div className="field-label-row">
                  <label>POS Terminali</label>
                  <QuickAddTrigger label="Yeni Ekle" onClick={() => setQuickBankaOpen(true)} />
                </div>
                <select className="form-control required" {...register("bank_account_id", { valueAsNumber: true })}>
                  <option value="">— Banka/POS seç —</option>
                  {bankaList.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.code} | {b.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-row" style={{ gridTemplateColumns: "100px 1fr" }}>
              <label>Fiş No</label>
              <FisNoPreviewField
                documentType={DOC_TYPES.fis(activeType)}
                branchId={formBranchId}
                recordTypeId={formRecordTypeId}
                transactionDate={voucherDate}
              />
            </div>
            <div className="form-row" style={{ gridTemplateColumns: "100px 1fr" }}>
              <label>Belge No</label>
              <input type="text" className="form-control" placeholder="Makbuz / Belge no..." {...register("document_no")} />
            </div>
            <div className="form-row" style={{ gridTemplateColumns: "100px 1fr", marginBottom: 0 }}>
              <label>Tarih &amp; Saat</label>
              <div style={{ display: "flex", gap: 6 }}>
                <input type="date" className="form-control" {...register("voucher_date")} />
                <input type="text" className="form-control" style={{ width: 85 }} {...register("voucher_time")} />
              </div>
            </div>
          </div>

          <div className="fis-box">
            <div className="fis-box-title">
              <span>📌 2. Detay &amp; Proje Parametreleri</span>
              <span className="badge badge-blue">Tek Ekranda Birleşik</span>
            </div>
            <div className="form-row" style={{ gridTemplateColumns: "100px 1fr" }}>
              <label>Belge Türü</label>
              <select className="form-control" {...register("document_type")}>
                <option value="">—</option>
                <option value="Makbuz">Makbuz</option>
                <option value="Dekont">Dekont</option>
                <option value="Fatura">Fatura</option>
              </select>
            </div>
            <div className="form-row" style={{ gridTemplateColumns: "100px 1fr", marginBottom: 0 }}>
              <label>Muhasebe</label>
              <input
                type="text"
                className="form-control"
                disabled
                value={accountingEnabled ? "🟢 Muhasebeleşir (GR)" : "🔴 Takip kaydı — muhasebeleşmez"}
              />
            </div>
            <CodeSelectFields
              entityType="VOUCHER"
              values={{}}
              onChange={() => undefined}
            />
          </div>

          <div className="fis-box">
            <div className="fis-box-title">
              <span>🏛️ 3. Muhasebeleşme &amp; Döviz</span>
            </div>
            <div className="form-row" style={{ gridTemplateColumns: "110px 1fr" }}>
              <label>Rapor. Dövizi</label>
              <div style={{ display: "flex", gap: 6 }}>
                <select className="form-control">
                  <option>TL</option>
                  <option>USD</option>
                </select>
                <input type="number" className="form-control" value={1} disabled style={{ width: 70 }} />
              </div>
            </div>
            {fisDef?.needsKurFarki && (
              <div id="box-kur-fark-btn" style={{ marginTop: 14 }}>
                <button
                  type="button"
                  className="btn-top blue"
                  style={{ width: "100%", justifyContent: "center", background: "#f59e0b", color: "#000" }}
                  onClick={() => setKurModalOpen(true)}
                >
                  💱 Kur Farkı Sihirbazını Aç
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="form-row" style={{ marginBottom: 16 }}>
          <label style={{ fontWeight: 700 }}>Fiş Genel Açıklaması</label>
          <textarea className="form-control" rows={2} {...register("description")} placeholder="Fiş / dekont genel açıklaması..." />
        </div>

        {error && (
          <div style={{ color: "#b91c1c", marginBottom: 12, fontWeight: 600 }} role="alert">
            {error}
          </div>
        )}

        <FisKalemTable
          fields={fields}
          append={append}
          remove={remove}
          register={register}
          watch={watch}
          setValue={setValue}
          cariList={cariList}
          showBankaKasaCol={!!fisDef?.needsKasa || !!fisDef?.needsPos}
        />
      </form>

      <KurFarkiModal
        open={kurModalOpen}
        onClose={() => setKurModalOpen(false)}
        voucherType={activeType}
        setValue={setValue}
        defaultAccountId={cariList[0]?.id ?? null}
      />

      <QuickAddKasaPanel
        open={quickKasaOpen}
        onClose={() => setQuickKasaOpen(false)}
        onCreated={async (id) => {
          await loadLookups();
          setValue("cash_account_id", id, { shouldDirty: true, shouldValidate: true });
        }}
      />
      <QuickAddBankaPanel
        open={quickBankaOpen}
        onClose={() => setQuickBankaOpen(false)}
        onCreated={async (id) => {
          await loadLookups();
          setValue("bank_account_id", id, { shouldDirty: true, shouldValidate: true });
        }}
      />

      <FisDekontListView items={recentItems} loading={listLoading} onDelete={handleDelete} />
    </FormProvider>
  );
}
