import { useCallback, useEffect, useState } from "react";
import { FormProvider, useFieldArray, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CariSearchCombo } from "@/components/CariSearchCombo";
import { BranchRecordTypeFields } from "@/components/financial/BranchRecordTypeFields";
import { FisNoPreviewField } from "@/components/financial/FisNoPreviewField";
import { FinancialFormSync } from "@/components/financial/FinancialFormSync";
import { FormActionFooter } from "@/components/FormActionFooter";
import { CodeSelectFields } from "@/modules/ayarlar/components/CodeSelectFields";
import { kodTanimlariApi, type IstisnaCode } from "@/modules/kod-tanimlari/api/kodTanimlariApi";
import { faturaApi, type TaxRateLookup } from "@/modules/satis-satin-alma/fatura/api/faturaApi";
import { useAppStore, isAccountingEnabledForRecordType } from "@/store/appStore";
import { type DocumentSide } from "../../constants/documentContext";
import { irsaliyeApi, type OrderLookup, type StokLookup } from "../api/irsaliyeApi";
import { LineTable } from "./LineTable";
import { IrsaliyeTotalsPanel } from "./IrsaliyeTotalsPanel";
import { ParamsPanel, ShippingPanel } from "./ShippingPanel";
import { TypePillBar } from "./TypePillBar";
import { getWaybillType, type WaybillTypeCode } from "../constants/dispatchTypes";
import {
  buildShipmentDatetime,
  computeIrsaliyeTotals,
  emptyIrsaliyeForm,
  emptyLine,
  irsaliyeFormSchema,
  splitShipmentDatetime,
  type IrsaliyeFormValues,
} from "../schemas/irsaliyeSchema";

export type IrsaliyeFormPanelProps = {
  side: DocumentSide;
  editId: number | null;
  activeType: WaybillTypeCode;
  onTypeChange: (code: WaybillTypeCode) => void;
  onSaved: (id: number | null) => void;
  onCancel?: () => void;
  embedded?: boolean;
  showTypeBar?: boolean;
};

export function IrsaliyeFormPanel({
  side,
  editId: externalEditId,
  activeType,
  onTypeChange,
  onSaved,
  onCancel,
  embedded = false,
  showTypeBar = true,
}: IrsaliyeFormPanelProps) {
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
  const [gibStatus, setGibStatus] = useState<string | null>(null);
  const [gibStatusLabel, setGibStatusLabel] = useState<string | null>(null);
  const [docChannel, setDocChannel] = useState<string | null>(null);
  const [stockList, setStockList] = useState<StokLookup[]>([]);
  const [orders, setOrders] = useState<OrderLookup[]>([]);
  const [quotations, setQuotations] = useState<OrderLookup[]>([]);
  const [istisnaCodes, setIstisnaCodes] = useState<IstisnaCode[]>([]);
  const [taxRates, setTaxRates] = useState<TaxRateLookup[]>([]);
  const [editingLineIndex, setEditingLineIndex] = useState<number | null>(0);

  const typeDef = getWaybillType(activeType);
  const isPurchase = side === "purchase";

  const methods = useForm<IrsaliyeFormValues>({
    resolver: zodResolver(irsaliyeFormSchema) as Resolver<IrsaliyeFormValues>,
    defaultValues: emptyIrsaliyeForm(defaultBranch, defaultRt, activeType),
    mode: "onBlur",
  });

  const { handleSubmit, reset, register, watch, setValue, control, formState } = methods;
  const { fields, append, remove } = useFieldArray({ control, name: "lines" });

  const formBranchId = watch("branch_id");
  const formRecordTypeId = watch("record_type_id");
  const accountId = watch("account_id");
  const waybillDate = watch("waybill_date");
  const lines = watch("lines");
  const eIrsaliyeType = watch("e_irsaliye_type");
  const accountingEnabled = isAccountingEnabledForRecordType(recordTypes, formRecordTypeId);

  const canCreateEirsaliye = !!editId && activeType === "SATIS";
  const canSendEirsaliye =
    !!editId && activeType === "SATIS" && (eIrsaliyeType === "E_IRSALIYE" || docChannel === "E_IRSALIYE");
  const showEirsaliyeDownloads =
    !!editId &&
    (eIrsaliyeType === "E_IRSALIYE" ||
      docChannel === "E_IRSALIYE" ||
      docChannel === "ENTEGRATOR_INCOMING");
  const showReceive = !!editId && isPurchase;

  useEffect(() => {
    setDirty(formState.isDirty);
  }, [formState.isDirty, setDirty]);

  useEffect(() => {
    setEditId(externalEditId);
    if (externalEditId === null) {
      reset(emptyIrsaliyeForm(formBranchId ?? defaultBranch, formRecordTypeId ?? defaultRt, activeType));
      setEttn(null);
      setGibStatus(null);
      setGibStatusLabel(null);
      setDocChannel(null);
      setEditingLineIndex(0);
      setDirty(false);
    }
  }, [externalEditId]);

  useEffect(() => {
    setValue("waybill_type", activeType);
  }, [activeType, setValue]);

  const loadLookups = useCallback(async () => {
    try {
      const [stokRes, ordRes, tekRes, istRes, taxRes] = await Promise.all([
        irsaliyeApi.lookupStok({ branch_id: formBranchId ?? undefined }),
        irsaliyeApi.lookupOrders({ branch_id: formBranchId ?? undefined, doc_kind: "SIPARIS" }),
        irsaliyeApi.lookupOrders({ branch_id: formBranchId ?? undefined, doc_kind: "TEKLIF" }),
        kodTanimlariApi.listIstisna(),
        faturaApi.lookupTaxRates(),
      ]);
      setStockList(stokRes?.items ?? (Array.isArray(stokRes) ? (stokRes as any) : []));
      setOrders(ordRes?.items ?? (Array.isArray(ordRes) ? (ordRes as any) : []));
      setQuotations(tekRes?.items ?? (Array.isArray(tekRes) ? (tekRes as any) : []));
      const rawIst = istRes?.items ?? (Array.isArray(istRes) ? istRes : []);
      setIstisnaCodes(Array.isArray(rawIst) ? rawIst.filter((x: any) => x && x.is_active) : []);
      setTaxRates(taxRes?.items ?? (Array.isArray(taxRes) ? (taxRes as any) : []));
    } catch {
      /* ignore */
    }
  }, [formBranchId]);

  const searchCari = useCallback(
    async (q: string) => {
      const res = await irsaliyeApi.lookupCari({ branch_id: formBranchId ?? undefined, q: q || undefined });
      return res.items ?? [];
    },
    [formBranchId]
  );

  useEffect(() => {
    loadLookups();
  }, [loadLookups]);

  useEffect(() => {
    if (!externalEditId) return;
    irsaliyeApi
      .get(externalEditId)
      .then((wb) => {
        setEditId(wb.id);
        setEttn(wb.ettn ?? null);
        setGibStatus(wb.gib_status ?? null);
        setGibStatusLabel(wb.gib_status_label ?? null);
        setDocChannel(wb.document_channel ?? null);
        setEditingLineIndex(null);
        const ship = splitShipmentDatetime(wb.shipment_datetime);
        reset({
          branch_id: wb.branch_id,
          record_type_id: wb.record_type_id,
          waybill_type: wb.waybill_type,
          account_id: wb.account_id,
          waybill_date: wb.waybill_date,
          waybill_no: wb.waybill_no,
          warehouse_id: wb.warehouse_id,
          order_id: wb.order_id,
          shipping_address: wb.shipping_address,
          carrier_name: wb.carrier_name,
          carrier_code: wb.carrier_code,
          plate_no: wb.plate_no,
          driver_name: wb.driver_name,
          shipment_date: ship.date,
          shipment_time: ship.time,
          e_irsaliye_type: (wb.e_irsaliye_type as IrsaliyeFormValues["e_irsaliye_type"]) || "KAGIT",
          document_no: wb.document_no,
          tracking_no: wb.tracking_no,
          description: wb.description,
          project_code: (wb as { project_code?: string | null }).project_code ?? "",
          cost_center_code: (wb as { cost_center_code?: string | null }).cost_center_code ?? "",
          lines: wb.lines.map((ln) => ({
            stock_id: ln.stock_id,
            description: ln.description,
            qty: Number(ln.qty),
            unit_id: ln.unit_id,
            unit_price: Number(ln.unit_price ?? 0),
            discount_pct: Number(ln.discount_pct ?? 0),
            tax_rate_id: ln.tax_rate_id ?? null,
            tax_rate: Number(ln.tax_rate ?? 20),
          })),
        });
        onTypeChange(wb.waybill_type as WaybillTypeCode);
        setDirty(false);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "İrsaliye yüklenemedi"));
  }, [externalEditId]);

  function switchType(code: WaybillTypeCode) {
    guardNavigate(() => {
      onTypeChange(code);
      setValue("waybill_type", code, { shouldDirty: true });
    });
  }

  function buildPayload(values: IrsaliyeFormValues, saveMode: "draft" | "approve") {
    return {
      branch_id: values.branch_id,
      record_type_id: values.record_type_id,
      waybill_type: values.waybill_type,
      account_id: values.account_id,
      waybill_date: values.waybill_date,
      waybill_no: values.waybill_no?.trim() || null,
      warehouse_id: values.warehouse_id || null,
      order_id: values.order_id || null,
      shipping_address: values.shipping_address?.trim() || null,
      carrier_name: values.carrier_name?.trim() || null,
      carrier_code: values.carrier_code?.trim() || null,
      plate_no: values.plate_no?.trim() || null,
      driver_name: values.driver_name?.trim() || null,
      shipment_datetime: buildShipmentDatetime(values.shipment_date, values.shipment_time),
      e_irsaliye_type: values.e_irsaliye_type,
      document_no: values.document_no?.trim() || null,
      tracking_no: values.tracking_no?.trim() || null,
      description: (() => {
        const base = values.description?.trim() || "";
        const ist = values.istisna_code?.trim();
        if (!ist) return base || null;
        if (base.includes(`İstisna:${ist}`)) return base;
        return [base, `İstisna:${ist}`].filter(Boolean).join(" | ");
      })(),
      project_code: values.project_code?.trim() || null,
      cost_center_code: values.cost_center_code?.trim() || null,
      lines: values.lines.map((ln) => ({
        stock_id: ln.stock_id || null,
        description: ln.description?.trim() || null,
        qty: Number(ln.qty),
        unit_id: ln.unit_id || null,
        unit_price: Number(ln.unit_price || 0),
        discount_pct: Number(ln.discount_pct || 0),
        tax_rate_id: ln.tax_rate_id || null,
        tax_rate: Number(ln.tax_rate || 20),
      })),
      save_mode: saveMode,
    };
  }

  async function saveWaybill(saveMode: "draft" | "approve") {
    await handleSubmit(async (values) => {
      setSaving(true);
      setError(null);
      try {
        const payload = buildPayload(values, saveMode);
        if (editId) {
          await irsaliyeApi.update(editId, payload);
          onSaved(editId);
        } else {
          const created = await irsaliyeApi.create(payload);
          setEditId(created.id);
          setEttn(created.ettn ?? null);
          onSaved(created.id);
        }
        setDirty(false);
        window.alert(saveMode === "approve" ? "✔ İrsaliye kaydedildi ve onaylandı." : "✔ İrsaliye taslağı kaydedildi.");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Kayıt başarısız");
      } finally {
        setSaving(false);
      }
    })();
  }

  async function handleConvert() {
    if (!editId) return;
    try {
      const res = await irsaliyeApi.convertToInvoice(editId);
      window.alert(`${res.message}\nFatura No: ${res.invoice_no}`);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Faturaya dönüşüm başarısız");
    }
  }

  async function handleCreateEirsaliye() {
    if (!editId) {
      window.alert("Önce irsaliyeyi kaydedin.");
      return;
    }
    try {
      setValue("e_irsaliye_type", "E_IRSALIYE", { shouldDirty: true });
      const res = await irsaliyeApi.eirsaliyeCreate(editId);
      setEttn(res.ettn ?? ettn);
      setGibStatus(res.gib_status ?? "BEKLEMEDE");
      setGibStatusLabel(res.gib_status_label ?? "Beklemede");
      setDocChannel("E_IRSALIYE");
      window.alert(res.message);
      onSaved(editId);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "e-İrsaliye oluşturulamadı");
    }
  }

  async function handleSendEirsaliye() {
    if (!editId) {
      window.alert("Önce irsaliyeyi kaydedin.");
      return;
    }
    try {
      const res = await irsaliyeApi.eirsaliyeSend(editId);
      setGibStatus(res.gib_status ?? "GONDERILDI");
      setGibStatusLabel(res.gib_status_label ?? "Gönderildi");
      if (res.ettn) setEttn(res.ettn);
      window.alert(res.message);
      onSaved(editId);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "GİB gönderimi başarısız");
    }
  }

  async function handleQueryStatus() {
    if (!editId) return;
    try {
      const res = await irsaliyeApi.eirsaliyeQueryStatus(editId);
      setGibStatus(res.gib_status);
      setGibStatusLabel(res.gib_status_label);
      const last = res.history?.[0]?.message;
      window.alert(
        `GİB Durum: ${res.gib_status_label}\nETTN: ${res.ettn ?? "—"}${last ? `\n${last}` : ""}`
      );
      onSaved(editId);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Durum sorgulanamadı");
    }
  }

  async function handleReceiveEirsaliye() {
    if (!editId) return;
    try {
      const res = await irsaliyeApi.eirsaliyeReceive(editId);
      setDocChannel("ENTEGRATOR_INCOMING");
      setGibStatus(res.gib_status ?? null);
      window.alert(res.message);
      onSaved(editId);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Alım başarısız");
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

      {showTypeBar && <TypePillBar activeType={activeType} onSelect={switchType} side={side} />}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          saveWaybill("draft");
        }}
      >
        <div className="fatura-form-top-grid">
          <div className="fatura-box fatura-cari-panel">
            <div className="fatura-box-title">
              <span>👥 Cari Hesap</span>
            </div>
            <CariSearchCombo
              accountId={accountId ?? 0}
              onAccountChange={(id) => setValue("account_id", id, { shouldDirty: true, shouldValidate: true })}
              onSearch={searchCari}
              branchId={formBranchId}
            />
          </div>

          <div className="fatura-box fatura-params-panel">
            <div className="fatura-box-title">
              <span>📋 İrsaliye Bilgileri</span>
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
                entityType="WAYBILL"
                values={{
                  project_code: watch("project_code") ?? "",
                  cost_center_code: watch("cost_center_code") ?? "",
                  group_code: watch("group_code") ?? "",
                  special_code: watch("special_code") ?? "",
                }}
                onChange={(patch) => {
                  if (patch.project_code !== undefined) {
                    setValue("project_code", patch.project_code ?? "", { shouldDirty: true });
                  }
                  if (patch.cost_center_code !== undefined) {
                    setValue("cost_center_code", patch.cost_center_code ?? "", { shouldDirty: true });
                  }
                  if (patch.group_code !== undefined) {
                    setValue("group_code", patch.group_code ?? "", { shouldDirty: true });
                  }
                  if (patch.special_code !== undefined) {
                    setValue("special_code", patch.special_code ?? "", { shouldDirty: true });
                  }
                }}
              />
              {gibStatus && (
                <div className="form-row compact">
                  <label>GİB Durum</label>
                  <input
                    type="text"
                    className="form-control"
                    readOnly
                    value={gibStatusLabel ?? gibStatus}
                    style={{ fontWeight: 600, background: "#f8fafc" }}
                  />
                </div>
              )}
              {isPurchase ? (
                <div className="form-row compact">
                  <label>İrsaliye No</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Tedarikçi / manuel irsaliye no"
                    {...register("waybill_no")}
                  />
                </div>
              ) : (
                <>
                  <FisNoPreviewField
                    documentType={typeDef?.documentType ?? "IRS_SATIS"}
                    branchId={formBranchId}
                    recordTypeId={formRecordTypeId}
                    transactionDate={waybillDate}
                    label="İrsaliye No"
                  />
                  <div className="form-row compact">
                    <label>Manuel No</label>
                    <input type="text" className="form-control" placeholder="Boş = otomatik" {...register("waybill_no")} />
                  </div>
                </>
              )}
              <div className="form-row compact">
                <label>İrsaliye Tarihi</label>
                <input type="date" className="form-control required" {...register("waybill_date")} />
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
                <label>İrsaliye Tipi</label>
                <select className="form-control" {...register("e_irsaliye_type")}>
                  <option value="KAGIT">Kağıt İrsaliye</option>
                  <option value="E_IRSALIYE">e-İrsaliye</option>
                  <option value="OKC">ÖKC Bilgi Fişi</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="fatura-form-secondary-grid">
          <ShippingPanel register={register} />
          <ParamsPanel
            register={register}
            orders={orders}
            quotations={quotations}
            istisnaCodes={istisnaCodes}
            showIstisnaAi={!isPurchase}
            istisnaCode={watch("istisna_code")}
            onIstisnaChange={(code) => setValue("istisna_code", code || null, { shouldDirty: true })}
            onAiIstisna={() => {
              const desc = (lines?.[0]?.description || "").toLowerCase();
              const match =
                istisnaCodes.find(
                  (c) =>
                    desc &&
                    (`${c.code} ${c.name} ${c.description ?? ""}`.toLowerCase().includes(desc.slice(0, 12)) ||
                      desc.includes(c.code.toLowerCase()))
                ) || istisnaCodes[0];
              if (match) setValue("istisna_code", match.code, { shouldDirty: true });
            }}
          />
        </div>

        <div className="fatura-line-actions">
          <button type="button" className="btn-top green" onClick={handleAddLine}>
            ➕ Malzeme Ekle (F1)
          </button>
        </div>

        <LineTable
          fields={fields}
          lines={lines ?? []}
          stockList={stockList}
          taxRates={taxRates}
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

        {(() => {
          const t = computeIrsaliyeTotals(lines ?? []);
          return (
            <IrsaliyeTotalsPanel
              subtotal={t.subtotal}
              discountTotal={t.discountTotal}
              taxByRate={t.taxByRate}
              taxTotal={t.taxTotal}
              grandTotal={t.grandTotal}
            />
          );
        })()}

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
          {canCreateEirsaliye && (
            <button type="button" className="btn-top" disabled={saving} onClick={handleCreateEirsaliye}>
              e-İrsaliye Oluştur
            </button>
          )}
          {canSendEirsaliye && (
            <button type="button" className="btn-top blue" disabled={saving} onClick={handleSendEirsaliye}>
              GİB Gönder
            </button>
          )}
          {showEirsaliyeDownloads && (
            <>
              <button type="button" className="btn-top" disabled={saving} onClick={handleQueryStatus}>
                Durum Sorgula
              </button>
              <button
                type="button"
                className="btn-top"
                disabled={saving}
                onClick={() => editId && irsaliyeApi.downloadEirsaliye(editId, "pdf")}
              >
                PDF
              </button>
              <button
                type="button"
                className="btn-top"
                disabled={saving}
                onClick={() => editId && irsaliyeApi.downloadEirsaliye(editId, "ubl")}
              >
                UBL
              </button>
            </>
          )}
          {showReceive && (
            <button type="button" className="btn-top blue" disabled={saving} onClick={handleReceiveEirsaliye}>
              Gelen e-İrsaliye Al
            </button>
          )}
          <button type="button" className="btn-top" disabled={saving || !editId} onClick={handleConvert}>
            🧾 İrsaliye→Fatura
          </button>
          <button type="submit" className="btn-top" disabled={saving}>
            💾 Kaydet (Taslak)
          </button>
          <button
            type="button"
            className="btn-save"
            style={{ background: "#0284c7" }}
            disabled={saving}
            onClick={() => saveWaybill("approve")}
          >
            ✔ Kaydet ve Onayla
          </button>
        </FormActionFooter>
      </form>
    </FormProvider>
  );
}
