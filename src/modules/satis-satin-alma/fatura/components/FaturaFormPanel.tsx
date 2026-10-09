import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FormProvider, useFieldArray, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CariSearchCombo } from "@/components/CariSearchCombo";
import { BranchRecordTypeFields } from "@/components/financial/BranchRecordTypeFields";
import { FisNoPreviewField } from "@/components/financial/FisNoPreviewField";
import { FinancialFormSync } from "@/components/financial/FinancialFormSync";
import { FormActionFooter } from "@/components/FormActionFooter";
import { CodeSelectFields } from "@/modules/ayarlar/components/CodeSelectFields";
import { kodTanimlariApi, type IstisnaCode } from "@/modules/kod-tanimlari/api/kodTanimlariApi";
import { useAppStore, isAccountingEnabledForRecordType } from "@/store/appStore";
import {
  type DocumentSide,
} from "../../constants/documentContext";
import {
  faturaApi,
  type CurrencyLookup,
  type DispatchLookup,
  type OrderLookup,
  type StokLookup,
  type TaxRateLookup,
  type TevkifatCodeLookup,
} from "../api/faturaApi";
import { FaturaLineTable } from "./FaturaLineTable";
import { FaturaTotalsPanel } from "./FaturaTotalsPanel";
import { FaturaTypePillBar } from "./FaturaTypePillBar";
import { getInvoiceType, type InvoiceTypeCode } from "../constants/invoiceTypes";
import {
  computeClientTotals,
  emptyFaturaForm,
  emptyLine,
  faturaFormSchema,
  type FaturaFormValues,
} from "../schemas/faturaSchema";

export type FaturaFormPanelProps = {
  side: DocumentSide;
  editId: number | null;
  activeType: InvoiceTypeCode;
  onTypeChange: (code: InvoiceTypeCode) => void;
  onSaved: (id: number | null) => void;
  onCancel?: () => void;
  embedded?: boolean;
  showTypeBar?: boolean;
};

export function FaturaFormPanel({
  side,
  editId: externalEditId,
  activeType,
  onTypeChange,
  onSaved,
  onCancel,
  embedded = false,
  showTypeBar = true,
}: FaturaFormPanelProps) {
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
  const [editId, setEditId] = useState<number | null>(externalEditId);
  const [ettn, setEttn] = useState<string | null>(null);
  const [stockList, setStockList] = useState<StokLookup[]>([]);
  const [taxRates, setTaxRates] = useState<TaxRateLookup[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyLookup[]>([]);
  const [orders, setOrders] = useState<OrderLookup[]>([]);
  const [quotations, setQuotations] = useState<OrderLookup[]>([]);
  const [dispatches, setDispatches] = useState<DispatchLookup[]>([]);
  const [tevkifatCodes, setTevkifatCodes] = useState<TevkifatCodeLookup[]>([]);
  const [istisnaCodes, setIstisnaCodes] = useState<IstisnaCode[]>([]);
  const [editingLineIndex, setEditingLineIndex] = useState<number | null>(0);
  const [cariHint, setCariHint] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const typeDef = getInvoiceType(activeType);
  const showEfatura = activeType === "SATIS";
  const isPurchase = side === "purchase";

  const methods = useForm<FaturaFormValues>({
    resolver: zodResolver(faturaFormSchema) as Resolver<FaturaFormValues>,
    defaultValues: emptyFaturaForm(defaultBranch, defaultRt, activeType),
    mode: "onBlur",
  });

  const { handleSubmit, reset, register, watch, setValue, control, formState } = methods;
  const { fields, append, remove, replace } = useFieldArray({ control, name: "lines" });

  const documentChannel = watch("document_channel");
  const formBranchId = watch("branch_id");
  const formRecordTypeId = watch("record_type_id");
  const accountId = watch("account_id");
  const invoiceDate = watch("invoice_date");
  const lines = watch("lines");
  const vatIncluded = watch("vat_included");
  const footerDisc = watch("footer_discount_pct");
  const footerDisc2 = watch("footer_discount_pct_2");
  const footerDisc3 = watch("footer_discount_pct_3");
  const tevkifatRate = watch("tevkifat_rate");
  const tevkifatCode = watch("tevkifat_code");
  const currencyId = watch("currency_id");
  const accountingEnabled = isAccountingEnabledForRecordType(recordTypes, formRecordTypeId);

  const totals = useMemo(
    () =>
      computeClientTotals(
        lines ?? [],
        vatIncluded,
        footerDisc ?? 0,
        tevkifatRate ?? 0,
        footerDisc2 ?? 0,
        footerDisc3 ?? 0
      ),
    [lines, vatIncluded, footerDisc, footerDisc2, footerDisc3, tevkifatRate]
  );

  useEffect(() => {
    setDirty(formState.isDirty);
  }, [formState.isDirty, setDirty]);

  useEffect(() => {
    setEditId(externalEditId);
    if (externalEditId === null) {
      reset(emptyFaturaForm(formBranchId ?? defaultBranch, formRecordTypeId ?? defaultRt, activeType));
      setEttn(null);
      setEditingLineIndex(0);
      setDirty(false);
    }
  }, [externalEditId]);

  useEffect(() => {
    setValue("invoice_type", activeType);
  }, [activeType, setValue]);

  const loadLookups = useCallback(async () => {
    const [stokRes, taxRes, curRes, ordRes, tekRes, dispRes, tevRes, istRes] = await Promise.allSettled([
      faturaApi.lookupStok({ branch_id: formBranchId ?? undefined }),
      faturaApi.lookupTaxRates(),
      faturaApi.lookupCurrencies(),
      faturaApi.lookupOrders({ branch_id: formBranchId ?? undefined, doc_kind: "SIPARIS" }),
      faturaApi.lookupOrders({ branch_id: formBranchId ?? undefined, doc_kind: "TEKLIF" }),
      faturaApi.lookupDispatches({ branch_id: formBranchId ?? undefined }),
      faturaApi.lookupTevkifatCodes(),
      kodTanimlariApi.listIstisna(),
    ]);
    if (stokRes.status === "fulfilled") setStockList(stokRes.value?.items ?? (Array.isArray(stokRes.value) ? (stokRes.value as any) : []));
    if (taxRes.status === "fulfilled") setTaxRates(taxRes.value?.items ?? (Array.isArray(taxRes.value) ? (taxRes.value as any) : []));
    if (curRes.status === "fulfilled") setCurrencies(curRes.value?.items ?? (Array.isArray(curRes.value) ? (curRes.value as any) : []));
    if (ordRes.status === "fulfilled") setOrders(ordRes.value?.items ?? (Array.isArray(ordRes.value) ? (ordRes.value as any) : []));
    if (tekRes.status === "fulfilled") setQuotations(tekRes.value?.items ?? (Array.isArray(tekRes.value) ? (tekRes.value as any) : []));
    if (dispRes.status === "fulfilled") setDispatches(dispRes.value?.items ?? (Array.isArray(dispRes.value) ? (dispRes.value as any) : []));
    if (tevRes.status === "fulfilled") setTevkifatCodes(tevRes.value?.items ?? (Array.isArray(tevRes.value) ? (tevRes.value as any) : []));
    if (istRes.status === "fulfilled") {
      const raw = istRes.value?.items ?? (Array.isArray(istRes.value) ? istRes.value : []);
      setIstisnaCodes(Array.isArray(raw) ? raw.filter((x: any) => x && x.is_active) : []);
    }
  }, [formBranchId]);

  const searchCari = useCallback(
    async (q: string) => {
      const res = await faturaApi.lookupCari({ branch_id: formBranchId ?? undefined, q: q || undefined });
      return res.items ?? [];
    },
    [formBranchId]
  );

  useEffect(() => {
    loadLookups();
  }, [loadLookups]);

  useEffect(() => {
    if (currencyId) return;
    const tl = currencies.find((c) => c.code === "TRY" || c.code === "TL");
    if (tl) setValue("currency_id", tl.id);
  }, [currencies, currencyId, setValue]);

  useEffect(() => {
    if (!externalEditId) return;
    faturaApi
      .get(externalEditId)
      .then((inv) => {
        setEditId(inv.id);
        setEttn(inv.ettn ?? null);
        setEditingLineIndex(null);
        reset({
          branch_id: inv.branch_id,
          record_type_id: inv.record_type_id,
          invoice_type: inv.invoice_type,
          account_id: inv.account_id,
          invoice_date: inv.invoice_date,
          due_date: inv.due_date,
          invoice_no: inv.invoice_no,
          currency_id: null,
          exchange_rate: Number(inv.exchange_rate ?? 1),
          vat_included: inv.vat_included,
          footer_discount_pct: Number(inv.footer_discount_pct ?? 0),
          footer_discount_pct_2: Number(inv.footer_discount_pct_2 ?? 0),
          footer_discount_pct_3: Number(inv.footer_discount_pct_3 ?? 0),
          description: inv.description,
          order_id: inv.order_id,
          dispatch_id: inv.dispatch_id,
          tevkifat_code: inv.tevkifat_code,
          tevkifat_rate: Number(inv.tevkifat_rate ?? 0),
          istisna_code: inv.istisna_code,
          ozel_matrah_code: inv.ozel_matrah_code,
          ozel_matrah_amount: 0,
          document_channel: (inv.document_channel as FaturaFormValues["document_channel"]) || "KAGIT",
          project_code: (inv as { project_code?: string | null }).project_code ?? "",
          cost_center_code: (inv as { cost_center_code?: string | null }).cost_center_code ?? "",
          lines: inv.lines.map((ln) => ({
            stock_id: ln.stock_id,
            description: ln.description,
            qty: Number(ln.qty),
            unit_id: ln.unit_id,
            unit_price: Number(ln.unit_price),
            discount_pct: Number(ln.discount_pct ?? 0),
            discount_pct_2: Number(ln.discount_pct_2 ?? 0),
            discount_pct_3: Number(ln.discount_pct_3 ?? 0),
            discount_amount: Number(ln.discount_amount ?? 0),
            tax_rate_id: ln.tax_rate_id,
            tax_rate: Number(ln.tax_rate ?? 20),
            istisna_code: ln.istisna_code ?? "",
            tevkifat_code: ln.tevkifat_code ?? "",
            tevkifat_rate: Number(ln.tevkifat_rate ?? 0),
            override_istisna: Boolean(ln.override_istisna),
            override_tevkifat: Boolean(ln.override_tevkifat),
          })),
        });
        onTypeChange(inv.invoice_type as InvoiceTypeCode);
        setDirty(false);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Fatura yüklenemedi"));
  }, [externalEditId]);

  function switchType(code: InvoiceTypeCode) {
    guardNavigate(() => {
      onTypeChange(code);
      setValue("invoice_type", code, { shouldDirty: true });
    });
  }

  function onTevkifatSelect(code: string) {
    setValue("tevkifat_code", code || null, { shouldDirty: true });
    const match = tevkifatCodes.find((t) => t.code === code);
    if (match) setValue("tevkifat_rate", Number(match.rate), { shouldDirty: true });
  }

  function buildPayload(values: FaturaFormValues, saveMode: "draft" | "approve") {
    const channel = values.document_channel || "KAGIT";
    return {
      ...values,
      document_channel: channel,
      e_fatura_type: channel === "KAGIT" ? null : channel,
      invoice_no: values.invoice_no?.trim() || null,
      due_date: values.due_date || null,
      currency_id: values.currency_id || null,
      order_id: values.order_id || null,
      dispatch_id: values.dispatch_id || null,
      quotation_order_id: values.quotation_order_id || null,
      irsaliyeli_fatura: Boolean(values.irsaliyeli_fatura),
      description: values.description?.trim() || null,
      tevkifat_code: values.tevkifat_code?.trim() || null,
      istisna_code: values.istisna_code?.trim() || null,
      ozel_matrah_code: values.ozel_matrah_code?.trim() || null,
      project_code: values.project_code?.trim() || null,
      cost_center_code: values.cost_center_code?.trim() || null,
      lines: values.lines.map((ln) => ({
        ...ln,
        stock_id: ln.stock_id || null,
        unit_id: ln.unit_id || null,
        tax_rate_id: ln.tax_rate_id || null,
        qty: Number(ln.qty),
        unit_price: Number(ln.unit_price),
        discount_pct: Number(ln.discount_pct || 0),
        discount_pct_2: Number(ln.discount_pct_2 || 0),
        discount_pct_3: Number(ln.discount_pct_3 || 0),
        discount_amount: Number(ln.discount_amount || 0),
        tax_rate: Number(ln.tax_rate ?? 20),
      })),
      save_mode: saveMode,
    };
  }

  async function saveInvoice(saveMode: "draft" | "approve") {
    await handleSubmit(async (values) => {
      setSaving(true);
      setError(null);
      try {
        const payload = buildPayload(values, saveMode);
        if (editId) {
          await faturaApi.update(editId, payload);
          onSaved(editId);
        } else {
          const created = await faturaApi.create(payload);
          setEditId(created.id);
          setEttn(created.ettn ?? null);
          onSaved(created.id);
        }
        setDirty(false);
        window.alert(saveMode === "approve" ? "✔ Fatura kaydedildi ve onaylandı." : "✔ Fatura taslağı kaydedildi.");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Kayıt başarısız");
      } finally {
        setSaving(false);
      }
    })();
  }

  async function handleExcelImport(file: File) {
    try {
      const res = await faturaApi.importLines(file);
      const imported = res.lines.map((ln) => ({
        ...emptyLine(),
        stock_id: null,
        description: String(ln.description ?? ""),
        qty: Number(ln.qty ?? 1),
        unit_id: null,
        unit_price: Number(ln.unit_price ?? 0),
        discount_pct: Number(ln.discount_pct ?? 0),
        discount_pct_2: Number(ln.discount_pct_2 ?? 0),
        discount_pct_3: Number(ln.discount_pct_3 ?? 0),
        discount_amount: Number(ln.discount_amount ?? 0),
        tax_rate_id: null,
        tax_rate: Number(ln.tax_rate ?? 20),
      }));
      replace(imported);
      setEditingLineIndex(imported.length > 0 ? imported.length - 1 : 0);
      if (res.warnings?.length) window.alert(res.warnings.join("\n"));
      window.alert(`${res.imported_count} satır içe aktarıldı.`);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Excel içe aktarma başarısız");
    }
  }

  async function handleStub(action: "print" | "efatura") {
    if (!editId) {
      window.alert("Önce faturayı kaydedin.");
      return;
    }
    try {
      const res = action === "print" ? await faturaApi.print(editId) : await faturaApi.sendEfatura(editId);
      window.alert(res.message);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "İşlem başarısız");
    }
  }

  function handleAddLine() {
    const newIdx = fields.length;
    append(emptyLine());
    setEditingLineIndex(newIdx);
  }

  return (
    <FormProvider {...methods}>
      <FinancialFormSync syncFromTopbar />

      {!embedded && (
        <div className="header-btns" style={{ marginBottom: 8 }}>
          <BranchRecordTypeFields variant="header" showAccountingBadge={accountingEnabled} />
        </div>
      )}

      {showTypeBar && (
        <FaturaTypePillBar activeType={activeType} onSelect={switchType} side={side} />
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          saveInvoice("draft");
        }}
      >
        <div className="fatura-form-top-grid">
          <div className="fatura-box fatura-cari-panel">
            <div className="fatura-box-title">
              <span>👥 Müşteri / Tedarikçi</span>
            </div>
            <CariSearchCombo
              accountId={accountId ?? 0}
              onAccountChange={(id, item) => {
                setValue("account_id", id, { shouldDirty: true, shouldValidate: true });
                if (!item || isPurchase) {
                  setCariHint(null);
                  return;
                }
                const tax = (item.tax_number || "").trim();
                const isBireysel = !item.is_efatura || tax.length === 11;
                if (isBireysel) {
                  setValue("document_channel", "E_ARSIV", { shouldDirty: true });
                  setCariHint(
                    item.is_efatura
                      ? "TCKN’li cari — e-Arşiv önerilir"
                      : "Cari e-Fatura mükellefi değil — Fatura Tipi E-Arşiv olarak ayarlandı"
                  );
                } else if (item.is_efatura) {
                  setValue("document_channel", "E_FATURA", { shouldDirty: true });
                  setCariHint("e-Fatura mükellefi — E-Fatura kanalı seçildi");
                } else {
                  setCariHint(null);
                }
              }}
              onSearch={searchCari}
              branchId={formBranchId}
            />
            {cariHint && (
              <div style={{ marginTop: 6, fontSize: 12, color: "#0369a1" }}>{cariHint}</div>
            )}
          </div>

          <div className="fatura-box fatura-params-panel">
            <div className="fatura-box-title">
              <span>📋 Fatura Bilgileri</span>
            </div>
            <div className="fatura-params-grid fatura-params-grid-3col">
              <div className="form-row compact">
                <label>İşlem Tipi</label>
                <input
                  type="text"
                  className="form-control"
                  readOnly
                  value={`${typeDef?.icon ?? ""} ${typeDef?.label ?? activeType}`.trim()}
                  style={{ fontWeight: 600, background: "#f8fafc" }}
                />
              </div>
              <div className="form-row compact span-2">
                <label>ETTN No</label>
                <input
                  type="text"
                  className="form-control"
                  readOnly
                  value={ettn ?? "Kayıt sonrası otomatik üretilir"}
                  style={{ fontFamily: "monospace", fontSize: 12, color: ettn ? "#1e3a8a" : "#94a3b8" }}
                />
              </div>
              <div className="form-row compact">
                <label>Şube</label>
                <select className="form-control" {...register("branch_id", { valueAsNumber: true })}>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.code} — {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-row compact">
                <label>Kayıt Türü</label>
                <select className="form-control" {...register("record_type_id", { valueAsNumber: true })}>
                  {recordTypes.map((rt) => (
                    <option key={rt.id} value={rt.id}>
                      {rt.code} — {rt.name}
                    </option>
                  ))}
                </select>
              </div>
              <CodeSelectFields
                entityType="INVOICE"
                values={{
                  project_code: watch("project_code") ?? "",
                  cost_center_code: watch("cost_center_code") ?? "",
                }}
                onChange={(patch) => {
                  if (patch.project_code !== undefined) {
                    setValue("project_code", patch.project_code ?? "", { shouldDirty: true });
                  }
                  if (patch.cost_center_code !== undefined) {
                    setValue("cost_center_code", patch.cost_center_code ?? "", { shouldDirty: true });
                  }
                }}
              />
              {isPurchase ? (
                <div className="form-row compact">
                  <label>Fatura No</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Tedarikçi / manuel fatura no"
                    {...register("invoice_no")}
                  />
                </div>
              ) : (
                <>
                  <FisNoPreviewField
                    documentType={typeDef?.documentType ?? "FAT_SATIS"}
                    branchId={formBranchId}
                    recordTypeId={formRecordTypeId}
                    transactionDate={invoiceDate}
                    label="Fatura No"
                  />
                  <div className="form-row compact">
                    <label>Manuel No</label>
                    <input type="text" className="form-control" placeholder="Boş = otomatik" {...register("invoice_no")} />
                  </div>
                </>
              )}
              <div className="form-row compact">
                <label>Fatura Tipi</label>
                <select className="form-control" {...register("document_channel")}>
                  <option value="KAGIT">Kağıt Fatura</option>
                  <option value="E_FATURA">E-Fatura</option>
                  <option value="E_ARSIV">E-Arşiv</option>
                </select>
                {documentChannel === "E_ARSIV" && (
                  <small style={{ display: "block", marginTop: 4, color: "#64748b", fontSize: 11 }}>
                    e-Arşiv: genelde e-Fatura mükellefi olmayan / bireysel müşteriler için
                  </small>
                )}
              </div>
              <div className="form-row compact">
                <label>Fatura Tarihi</label>
                <input type="date" className="form-control required" {...register("invoice_date")} />
              </div>
              <div className="form-row compact">
                <label>Vade Tarihi</label>
                <input type="date" className="form-control" {...register("due_date")} />
              </div>
              <div className="form-row compact">
                <label>Döviz</label>
                <select className="form-control" {...register("currency_id", { valueAsNumber: true })}>
                  <option value="">TL</option>
                  {currencies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-row compact">
                <label>Kur</label>
                <input type="number" step="0.0001" className="form-control" {...register("exchange_rate")} />
              </div>
              <div className="form-row compact">
                <label>KDV Durumu</label>
                <select className="form-control" {...register("vat_included", { setValueAs: (v) => v === "true" || v === true })}>
                  <option value="false">KDV Hariç</option>
                  <option value="true">KDV Dahil</option>
                </select>
              </div>
              <div className="form-row compact">
                <label>Teklif Ref.</label>
                <select className="form-control" {...register("quotation_order_id", { setValueAs: (v) => (v ? Number(v) : null) })}>
                  <option value="">—</option>
                  {quotations.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.order_no} — {o.account_title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-row compact">
                <label>Sipariş Ref.</label>
                <select className="form-control" {...register("order_id", { setValueAs: (v) => (v ? Number(v) : null) })}>
                  <option value="">—</option>
                  {orders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.order_no} — {o.account_title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-row compact">
                <label>İrsaliye Ref.</label>
                <select className="form-control" {...register("dispatch_id", { setValueAs: (v) => (v ? Number(v) : null) })}>
                  <option value="">—</option>
                  {dispatches.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.waybill_no} — {d.account_title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-row compact" style={{ alignItems: "center" }}>
                <label>
                  <input type="checkbox" {...register("irsaliyeli_fatura")} style={{ marginRight: 6 }} />
                  İrsaliyeli Fatura
                </label>
                <span style={{ fontSize: 11, color: "#64748b" }}>GİB dışı sistem irsaliye no üretir</span>
              </div>
            </div>
          </div>
        </div>

        <div className="fatura-box fatura-tevkifat-panel">
          <div className="fatura-box-title">
            <span>⚖️ Tevkifat / İstisna / Özel Matrah</span>
          </div>
          <div className="fatura-tevkifat-grid">
            <div className="form-row compact">
              <label>Tevkifat</label>
              <select className="form-control" value={tevkifatCode ?? ""} onChange={(e) => onTevkifatSelect(e.target.value)}>
                <option value="">— Tevkifat kodu —</option>
                {tevkifatCodes.map((t) => (
                  <option key={t.id} value={t.code}>
                    {t.code} — {t.name} (%{t.rate})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-row compact">
              <label>Tevk. %</label>
              <input type="number" className="form-control" {...register("tevkifat_rate")} />
            </div>
            <div className="form-row compact">
              <label>İstisna (GİB)</label>
              <div style={{ display: "flex", gap: 6 }}>
                <select
                  className="form-control"
                  value={watch("istisna_code") ?? ""}
                  onChange={(e) => setValue("istisna_code", e.target.value || null, { shouldDirty: true })}
                >
                  <option value="">— İstisna kodu —</option>
                  {istisnaCodes.map((c) => (
                    <option key={c.id} value={c.code}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </select>
                {!isPurchase && (
                  <button
                    type="button"
                    className="btn-top"
                    style={{ fontSize: 11, whiteSpace: "nowrap" }}
                    title="Açıklama / stok varsayılanına göre öner"
                    onClick={() => {
                      const desc = (lines?.[0]?.description || "").toLowerCase();
                      const fromStock = stockList.find((s) => s.id === lines?.[0]?.stock_id)?.default_istisna_code;
                      const match =
                        (fromStock && istisnaCodes.find((c) => c.code === fromStock)) ||
                        istisnaCodes.find(
                          (c) =>
                            desc &&
                            (`${c.code} ${c.name} ${c.description ?? ""}`.toLowerCase().includes(desc.slice(0, 12)) ||
                              desc.includes(c.code.toLowerCase()))
                        ) ||
                        istisnaCodes[0];
                      if (match) setValue("istisna_code", match.code, { shouldDirty: true });
                    }}
                  >
                    ✨ AI
                  </button>
                )}
              </div>
            </div>
            <div className="form-row compact">
              <label>Özel Matrah</label>
              <input type="text" className="form-control" {...register("ozel_matrah_code")} placeholder="Özel matrah kodu" />
            </div>
          </div>
        </div>

        <div className="fatura-line-actions">
          <button type="button" className="btn-top green" onClick={handleAddLine}>
            ➕ Kalem Ekle (F1)
          </button>
          <button type="button" className="btn-top blue" onClick={() => fileInputRef.current?.click()}>
            📥 Excel Satır İçe Aktar
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleExcelImport(f);
              e.target.value = "";
            }}
          />
        </div>

        <FaturaLineTable
          fields={fields}
          lines={lines ?? []}
          stockList={stockList}
          taxRates={taxRates}
          vatIncluded={vatIncluded}
          editingLineIndex={editingLineIndex}
          onEditLine={setEditingLineIndex}
          onLineChange={(idx, patch) => {
            const next = [...(lines ?? [])];
            next[idx] = { ...next[idx], ...patch };
            setValue("lines", next, { shouldDirty: true });
          }}
          onRemove={(idx) => {
            remove(idx);
            if (editingLineIndex === idx) setEditingLineIndex(null);
            else if (editingLineIndex !== null && editingLineIndex > idx) {
              setEditingLineIndex(editingLineIndex - 1);
            }
          }}
        />

        <div className="fatura-bottom-card" style={{ marginTop: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 30 }}>
            <div>
              <div className="form-row" style={{ gridTemplateColumns: "140px 1fr", display: "grid", gap: 8, marginBottom: 8 }}>
                <label>Alt İskonto %1</label>
                <input type="number" className="form-control" style={{ width: 120 }} {...register("footer_discount_pct")} />
              </div>
              <div className="form-row" style={{ gridTemplateColumns: "140px 1fr", display: "grid", gap: 8, marginBottom: 8 }}>
                <label>Alt İskonto %2</label>
                <input type="number" className="form-control" style={{ width: 120 }} {...register("footer_discount_pct_2")} />
              </div>
              <div className="form-row" style={{ gridTemplateColumns: "140px 1fr", display: "grid", gap: 8, marginBottom: 8 }}>
                <label>Alt İskonto %3</label>
                <input type="number" className="form-control" style={{ width: 120 }} {...register("footer_discount_pct_3")} />
              </div>
              <div className="form-row" style={{ gridTemplateColumns: "140px 1fr" }}>
                <label>Açıklama</label>
                <textarea className="form-control" rows={3} {...register("description")} />
              </div>
            </div>
            <FaturaTotalsPanel
              subtotal={totals.subtotal}
              discountTotal={totals.discountTotal}
              taxByRate={totals.taxByRate}
              taxTotal={totals.taxTotal}
              tevkifat={totals.tevkifat}
              grandTotal={totals.grandTotal}
            />
          </div>
        </div>

        {error && (
          <div className="card" style={{ marginTop: 12, color: "#b91c1c", padding: 12 }}>
            {error}
          </div>
        )}

        <FormActionFooter sticky={!embedded}>
          {onCancel && (
            <button type="button" className="btn-cancel" onClick={() => guardNavigate(onCancel)}>
              Vazgeç
            </button>
          )}
          <button type="button" className="btn-top" disabled={saving} onClick={() => handleStub("print")}>
            🖨️ Kaydet ve Yazdır
          </button>
          {showEfatura && (
            <button type="button" className="btn-top blue" disabled={saving} onClick={() => handleStub("efatura")}>
              📨 e-Fatura Gönder
            </button>
          )}
          <button type="submit" className="btn-top" disabled={saving}>
            💾 Kaydet (Taslak)
          </button>
          <button type="button" className="btn-save" disabled={saving} onClick={() => saveInvoice("approve")}>
            ✔ Kaydet ve Onayla
          </button>
        </FormActionFooter>
      </form>
    </FormProvider>
  );
}
