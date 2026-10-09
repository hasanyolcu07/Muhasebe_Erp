import { useCallback, useEffect, useState } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { SidePanel } from "@/components/ui/side-panel";
import { ResizableDataTable, type ResizableColumn } from "@/components/ResizableDataTable";
import { BranchRecordTypeFields } from "@/components/financial/BranchRecordTypeFields";
import { FisNoPreviewField } from "@/components/financial/FisNoPreviewField";
import { FinancialFormSync } from "@/components/financial/FinancialFormSync";
import { QuickAddCariPanel } from "@/components/quick-add/QuickAddCariPanel";
import { QuickAddTrigger } from "@/components/quick-add/QuickAddTrigger";
import { CodeSelectFields } from "@/modules/ayarlar/components/CodeSelectFields";
import { formatMoney } from "@/modules/satis-satin-alma/fatura/constants/invoiceTypes";
import { useAppStore } from "@/store/appStore";
import { faturaApi, type InvoiceDetail } from "@/modules/satis-satin-alma/fatura/api/faturaApi";
import { irsaliyeApi, type WaybillDetail } from "@/modules/satis-satin-alma/irsaliye/api/irsaliyeApi";
import {
  siparisApi,
  type DocKind,
  type OrderDetail,
  type OrderDirection,
  type OrderLineInput,
  type OrderListItem,
} from "../api/siparisApi";

type BranchRtForm = {
  branch_id: number;
  record_type_id: number;
};

const STATUS_OPTIONS = [
  { value: "OPEN", label: "Açık" },
  { value: "CONFIRMED", label: "Onaylandı" },
  { value: "PARTIAL_DELIVERY", label: "Kısmi Teslim" },
  { value: "DELIVERED", label: "Teslim Edildi" },
  { value: "INVOICED", label: "Faturalandı" },
  { value: "CLOSED", label: "Kapandı" },
  { value: "CANCELLED", label: "İptal" },
];

type PreviewKind = "order" | "invoice" | "waybill";

type PreviewState = {
  kind: PreviewKind;
  id: number;
  title: string;
};

function money(v: number | string | undefined) {
  return Number(v ?? 0).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function orderLineNet(ln: OrderLineInput): number {
  const gross = Number(ln.qty || 0) * Number(ln.unit_price || 0);
  let remaining = gross;
  for (const pct of [ln.discount_pct, ln.discount_pct_2, ln.discount_pct_3]) {
    if (pct && pct > 0) remaining -= remaining * (pct / 100);
  }
  if (ln.discount_amount && ln.discount_amount > 0) remaining -= ln.discount_amount;
  return Math.max(remaining, 0);
}

function orderLineTax(ln: OrderLineInput, taxRates: Array<{ id: number; rate: number }>): number {
  const rate =
    ln.tax_rate ??
    taxRates.find((t) => t.id === ln.tax_rate_id)?.rate ??
    20;
  return orderLineNet(ln) * (Number(rate) / 100);
}

function emptyLine(): OrderLineInput {
  return {
    stock_id: null,
    description: "",
    qty: 1,
    unit_price: 0,
    discount_pct: 0,
    discount_pct_2: 0,
    discount_pct_3: 0,
    tax_rate_id: null,
    tax_rate: 20,
  };
}

function sectionMeta(docKind: DocKind) {
  if (docKind === "TEKLIF") {
    return {
      breadcrumb: "Satışlar / Teklifler",
      noun: "Teklif",
      newLabel: "+ Yeni Teklif",
      searchPlaceholder: "Teklif no / cari ara",
      sections: [
        { direction: "ALINAN" as OrderDirection, title: "Satış Teklifleri", icon: "📤" },
        { direction: "VERILEN" as OrderDirection, title: "Alış Teklifleri", icon: "📥" },
      ],
    };
  }
  return {
    breadcrumb: "Satışlar / Siparişler",
    noun: "Sipariş",
    newLabel: "+ Yeni Sipariş",
    searchPlaceholder: "Sipariş no / cari ara",
    sections: [
      { direction: "ALINAN" as OrderDirection, title: "Satış Siparişleri", icon: "🛒" },
      { direction: "VERILEN" as OrderDirection, title: "Alış Siparişleri", icon: "🛍️" },
    ],
  };
}

type Props = {
  docKind: DocKind;
  /** Hub gömülü kullanım: tek yön */
  fixedDirection?: OrderDirection;
  hideDirectionSwitcher?: boolean;
};

export function BelgeAkisiHubPage({ docKind, fixedDirection, hideDirectionSwitcher }: Props) {
  const meta = sectionMeta(docKind);
  const branchId = useAppStore((s) => s.branchId);
  const recordTypeId = useAppStore((s) => s.recordTypeId);
  const guardNavigate = useAppStore((s) => s.guardNavigate);

  const formMethods = useForm<BranchRtForm>({
    defaultValues: {
      branch_id: branchId ?? 0,
      record_type_id: recordTypeId ?? 0,
    },
  });
  const formBranchId = useWatch({ control: formMethods.control, name: "branch_id" });
  const formRecordTypeId = useWatch({ control: formMethods.control, name: "record_type_id" });

  const [direction, setDirection] = useState<OrderDirection>(fixedDirection ?? "ALINAN");
  const [items, setItems] = useState<OrderListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [lines, setLines] = useState<OrderLineInput[]>([emptyLine()]);
  const [accountId, setAccountId] = useState<number | null>(null);
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [deliveryDate, setDeliveryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("OPEN");
  const [projectCode, setProjectCode] = useState("");
  const [costCenterCode, setCostCenterCode] = useState("");
  const [accounts, setAccounts] = useState<Array<{ id: number; code: string; title: string }>>([]);
  const [stocks, setStocks] = useState<Array<{ id: number; code: string; name: string; sale_price?: number | null }>>([]);
  const [taxRates, setTaxRates] = useState<Array<{ id: number; name: string; rate: number }>>([]);
  const [editingLineIndex, setEditingLineIndex] = useState<number | null>(0);
  const [quickCariOpen, setQuickCariOpen] = useState(false);

  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewOrder, setPreviewOrder] = useState<OrderDetail | null>(null);
  const [previewInvoice, setPreviewInvoice] = useState<InvoiceDetail | null>(null);
  const [previewWaybill, setPreviewWaybill] = useState<WaybillDetail | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [changePanel, setChangePanel] = useState<{ no: string; summary: string } | null>(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await siparisApi.list({
        branch_id: branchId ?? undefined,
        record_type_id: recordTypeId ?? undefined,
        doc_kind: docKind,
        direction,
        status: statusFilter || undefined,
        q: q || undefined,
        page_size: 50,
      });
      setItems(res.items ?? []);
      setTotal(res.total ?? 0);
    } catch (e) {
      setItems([]);
      setTotal(0);
      setError(e instanceof Error ? e.message : "Liste alınamadı");
    } finally {
      setLoading(false);
    }
  }, [branchId, recordTypeId, docKind, direction, statusFilter, q]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    if (!formOpen) return;
    const bid = formBranchId || branchId;
    faturaApi.lookupCari({ branch_id: bid ?? undefined }).then((r) => setAccounts(r.items ?? []));
    faturaApi.lookupStok({ branch_id: bid ?? undefined }).then((r) => setStocks(r.items ?? []));
    faturaApi.lookupTaxRates().then((r) => setTaxRates(r.items ?? []));
  }, [formOpen, branchId, formBranchId]);

  useEffect(() => {
    if (!preview) {
      setPreviewOrder(null);
      setPreviewInvoice(null);
      setPreviewWaybill(null);
      setPreviewError(null);
      return;
    }
    let cancelled = false;
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewOrder(null);
    setPreviewInvoice(null);
    setPreviewWaybill(null);

    (async () => {
      try {
        if (preview.kind === "order") {
          const d = await siparisApi.get(preview.id);
          if (!cancelled) setPreviewOrder(d);
        } else if (preview.kind === "invoice") {
          const d = await faturaApi.get(preview.id);
          if (!cancelled) setPreviewInvoice(d);
        } else {
          const d = await irsaliyeApi.get(preview.id);
          if (!cancelled) setPreviewWaybill(d);
        }
      } catch (e) {
        if (!cancelled) setPreviewError(e instanceof Error ? e.message : "Belge yüklenemedi");
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [preview]);

  function switchDirection(next: OrderDirection) {
    guardNavigate(() => setDirection(next));
  }

  function openNew() {
    guardNavigate(() => {
      setEditId(null);
      setDetail(null);
      setAccountId(null);
      setOrderDate(new Date().toISOString().slice(0, 10));
      setDeliveryDate("");
      setNotes("");
      setStatus("OPEN");
      setProjectCode("");
      setCostCenterCode("");
      setLines([emptyLine()]);
      formMethods.reset({
        branch_id: branchId ?? 0,
        record_type_id: recordTypeId ?? 0,
      });
      setFormOpen(true);
    });
  }

  async function openEdit(id: number) {
    guardNavigate(async () => {
      setBusy(true);
      try {
        const d = await siparisApi.get(id);
        setEditId(id);
        setDetail(d);
        setAccountId(d.account_id);
        setOrderDate(d.order_date);
        setDeliveryDate(d.delivery_date ?? "");
        setNotes(d.notes ?? "");
        setStatus(d.status);
        setProjectCode((d as { project_code?: string | null }).project_code ?? "");
        setCostCenterCode((d as { cost_center_code?: string | null }).cost_center_code ?? "");
        formMethods.reset({
          branch_id: d.branch_id,
          record_type_id: d.record_type_id,
        });
        setLines(
          d.lines.length
            ? d.lines.map((ln) => ({
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
                tax_rate: ln.tax_rate != null ? Number(ln.tax_rate) : null,
                delivery_date: ln.delivery_date,
              }))
            : [emptyLine()]
        );
        setFormOpen(true);
      } catch (e) {
        window.alert(e instanceof Error ? e.message : `${meta.noun} yüklenemedi`);
      } finally {
        setBusy(false);
      }
    });
  }

  async function save() {
    const saveBranchId = formBranchId || branchId;
    const saveRecordTypeId = formRecordTypeId || recordTypeId;
    if (!saveBranchId || !saveRecordTypeId || !accountId) {
      window.alert("Şube, kayıt tipi ve cari zorunlu");
      return;
    }
    setBusy(true);
    try {
      const body = {
        branch_id: saveBranchId,
        record_type_id: saveRecordTypeId,
        account_id: accountId,
        direction,
        doc_kind: docKind,
        order_date: orderDate,
        delivery_date: deliveryDate || null,
        notes: notes || null,
        status,
        project_code: projectCode || null,
        cost_center_code: costCenterCode || null,
        lines,
      };
      if (editId) {
        await siparisApi.update(editId, body);
      } else {
        await siparisApi.create(body);
      }
      setFormOpen(false);
      await loadList();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Kayıt başarısız");
    } finally {
      setBusy(false);
    }
  }

  async function removeItem(id: number) {
    if (!window.confirm(`${meta.noun} silinsin mi?`)) return;
    setBusy(true);
    try {
      await siparisApi.delete(id);
      await loadList();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Silme başarısız");
    } finally {
      setBusy(false);
    }
  }

  async function convertToOrder(id: number) {
    setBusy(true);
    try {
      const res = await siparisApi.convertOrder(id);
      window.alert(res.message);
      await loadList();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Siparişe çevirme başarısız");
    } finally {
      setBusy(false);
    }
  }

  async function convertInvoice(id: number) {
    setBusy(true);
    try {
      const res = await siparisApi.convertInvoice(id);
      window.alert(res.message);
      await loadList();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Faturaya çevirme başarısız");
    } finally {
      setBusy(false);
    }
  }

  async function convertWaybill(id: number) {
    setBusy(true);
    try {
      const res = await siparisApi.convertWaybill(id);
      window.alert(res.message);
      await loadList();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "İrsaliyeye çevirme başarısız");
    } finally {
      setBusy(false);
    }
  }

  function updateLine(idx: number, patch: Partial<OrderLineInput>) {
    setLines((prev) => prev.map((ln, i) => (i === idx ? { ...ln, ...patch } : ln)));
  }

  function addLine() {
    setLines((prev) => [...prev, emptyLine()]);
  }

  function removeLine(idx: number) {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)));
  }

  function onStockPick(idx: number, stockId: number) {
    const st = stocks.find((s) => s.id === stockId);
    if (!st) return;
    updateLine(idx, {
      stock_id: stockId,
      description: st.name,
      unit_price: Number(st.sale_price ?? 0),
    });
  }

  function openLinked(kind: PreviewKind, id: number | null | undefined, no: string | null | undefined) {
    if (!id || !no) return;
    const titles: Record<PreviewKind, string> = {
      order: `Sipariş ${no}`,
      invoice: `Fatura ${no}`,
      waybill: `İrsaliye ${no}`,
    };
    setPreview({ kind, id, title: titles[kind] });
  }

  const cariLabel = direction === "ALINAN" ? "Müşteri" : "Tedarikçi";
  const activeSection = meta.sections.find((s) => s.direction === direction)!;

  return (
    <>
      <div className="header-bar">
        <div className="header-breadcrumb">{meta.breadcrumb}</div>
        <div className="header-btns">
          <button type="button" className="btn-top blue" onClick={openNew}>
            {meta.newLabel}
          </button>
        </div>
      </div>

      {!hideDirectionSwitcher && (
        <div className="doc-hub-type-switcher">
          {meta.sections.map((sec) => (
            <div
              key={sec.direction}
              className={`doc-hub-type-btn${direction === sec.direction ? " active-fatura" : ""}`}
              role="button"
              tabIndex={0}
              onClick={() => switchDirection(sec.direction)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") switchDirection(sec.direction);
              }}
            >
              <span>{sec.icon}</span>
              <strong>{sec.title}</strong>
            </div>
          ))}
        </div>
      )}

      <div className="card" style={{ marginBottom: 12, padding: 12 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <strong style={{ marginRight: 8 }}>{activeSection.title}</strong>
          <input
            className="form-control"
            placeholder={meta.searchPlaceholder}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ minWidth: 200 }}
          />
          <select className="form-control" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Tüm durumlar</option>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <button type="button" className="btn-top" onClick={() => void loadList()}>
            Filtrele
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {formOpen ? (
        <div className="doc-hub-form-panel doc-hub-form-panel-top form-frame-blue" style={{ marginBottom: 12 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 8,
              marginBottom: 12,
              flexWrap: "wrap",
            }}
          >
            <strong style={{ fontSize: 14 }}>
              {editId ? `${meta.noun} ${detail?.order_no ?? editId}` : `Yeni ${meta.noun}`}
            </strong>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="btn-secondary" onClick={() => setFormOpen(false)}>
                Kapat
              </button>
              <button type="button" className="btn-save" disabled={busy} onClick={() => void save()}>
                Kaydet
              </button>
            </div>
          </div>

          <FormProvider {...formMethods}>
            <FinancialFormSync isEdit={!!editId} syncFromTopbar={!editId} />

            <div className="header-btns" style={{ marginBottom: 8 }}>
              <BranchRecordTypeFields variant="header" />
            </div>

            <div className="fatura-form-top-grid">
              <div className="fatura-box fatura-cari-panel">
                <div className="fatura-box-title">
                  <span>👥 {cariLabel}</span>
                </div>
                <div>
                  <div className="field-label-row">
                    <label>{cariLabel}</label>
                    <QuickAddTrigger
                      placement="inline"
                      label="Yeni Cari Ekle"
                      onClick={() => setQuickCariOpen(true)}
                    />
                  </div>
                  <select
                    className="form-control"
                    value={accountId ?? ""}
                    onChange={(e) => setAccountId(Number(e.target.value))}
                  >
                    <option value="">Seçin</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.code} — {a.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="fatura-box fatura-params-panel">
                <div className="fatura-box-title">
                  <span>📋 {meta.noun} Bilgileri</span>
                </div>
                <div className="fatura-params-grid fatura-params-grid-3col">
                  <FisNoPreviewField
                    documentType={docKind}
                    branchId={formBranchId || branchId}
                    recordTypeId={formRecordTypeId || recordTypeId}
                    transactionDate={orderDate}
                    savedValue={editId ? detail?.order_no : null}
                    label={`${meta.noun} No`}
                  />
                  <div className="form-row compact">
                    <label>{meta.noun} Tarihi</label>
                    <input
                      type="date"
                      className="form-control required"
                      value={orderDate}
                      onChange={(e) => setOrderDate(e.target.value)}
                    />
                  </div>
                  <div className="form-row compact">
                    <label>Teslim Tarihi</label>
                    <input
                      type="date"
                      className="form-control"
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                    />
                  </div>
                  <div className="form-row compact">
                    <label>Durum</label>
                    <select className="form-control" value={status} onChange={(e) => setStatus(e.target.value)}>
                      {STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <CodeSelectFields
                    entityType={docKind === "TEKLIF" ? "QUOTE" : "ORDER"}
                    values={{
                      project_code: projectCode,
                      cost_center_code: costCenterCode,
                    }}
                    onChange={(patch) => {
                      if (patch.project_code !== undefined) setProjectCode(patch.project_code ?? "");
                      if (patch.cost_center_code !== undefined) setCostCenterCode(patch.cost_center_code ?? "");
                    }}
                  />
                  <div className="form-row compact span-2">
                    <label>Notlar</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {(() => {
              type LineRow = OrderLineInput & { _idx: number; _id: string };
              const rows: LineRow[] = lines.map((ln, idx) => ({ ...ln, _idx: idx, _id: `ln-${idx}` }));
              const isEditable = (idx: number) => editingLineIndex === idx;
              const columns: ResizableColumn<LineRow>[] = [
                {
                  key: "stock",
                  header: "Stok Kodu",
                  width: 150,
                  minWidth: 100,
                  render: (row) => (
                    <select
                      className="form-control"
                      value={row.stock_id ?? ""}
                      disabled={!isEditable(row._idx)}
                      onChange={(e) => onStockPick(row._idx, Number(e.target.value))}
                    >
                      <option value="">Seçin</option>
                      {stocks.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.code}
                        </option>
                      ))}
                    </select>
                  ),
                },
                {
                  key: "description",
                  header: "Ürün / Açıklama",
                  width: 200,
                  minWidth: 120,
                  render: (row) => (
                    <input
                      type="text"
                      className="form-control"
                      value={row.description ?? ""}
                      disabled={!isEditable(row._idx)}
                      onChange={(e) => updateLine(row._idx, { description: e.target.value })}
                    />
                  ),
                },
                {
                  key: "qty",
                  header: "Miktar",
                  width: 90,
                  minWidth: 70,
                  align: "right",
                  render: (row) => (
                    <input
                      type="number"
                      className="form-control item-qty"
                      value={row.qty ?? 1}
                      min={0.0001}
                      step="any"
                      disabled={!isEditable(row._idx)}
                      onChange={(e) => updateLine(row._idx, { qty: Number(e.target.value) })}
                    />
                  ),
                },
                {
                  key: "unit_price",
                  header: "Birim Fiyat",
                  width: 100,
                  minWidth: 80,
                  align: "right",
                  render: (row) => (
                    <input
                      type="number"
                      className="form-control item-price"
                      value={row.unit_price ?? 0}
                      min={0}
                      step="any"
                      disabled={!isEditable(row._idx)}
                      onChange={(e) => updateLine(row._idx, { unit_price: Number(e.target.value) })}
                    />
                  ),
                },
                {
                  key: "discount_pct",
                  header: "İsk.%",
                  width: 72,
                  minWidth: 56,
                  align: "right",
                  render: (row) => (
                    <input
                      type="number"
                      className="form-control item-disc"
                      value={row.discount_pct ?? 0}
                      min={0}
                      max={100}
                      disabled={!isEditable(row._idx)}
                      onChange={(e) => updateLine(row._idx, { discount_pct: Number(e.target.value) })}
                    />
                  ),
                },
                {
                  key: "tax",
                  header: "KDV %",
                  width: 90,
                  minWidth: 70,
                  align: "right",
                  render: (row) => (
                    <select
                      className="form-control item-kdv"
                      value={row.tax_rate_id ?? ""}
                      disabled={!isEditable(row._idx)}
                      onChange={(e) => {
                        const tid = e.target.value ? Number(e.target.value) : null;
                        const tr = taxRates.find((t) => t.id === tid);
                        updateLine(row._idx, {
                          tax_rate_id: tid,
                          tax_rate: tr ? Number(tr.rate) : row.tax_rate,
                        });
                      }}
                    >
                      <option value="">—</option>
                      {taxRates.map((t) => (
                        <option key={t.id} value={t.id}>
                          %{t.rate}
                        </option>
                      ))}
                    </select>
                  ),
                },
                {
                  key: "line_total",
                  header: "Satır Toplamı",
                  width: 120,
                  minWidth: 90,
                  align: "right",
                  render: (row) => (
                    <span style={{ fontWeight: 800, color: "#1e3a8a" }}>
                      {formatMoney(orderLineNet(row) + orderLineTax(row, taxRates))}
                    </span>
                  ),
                },
                {
                  key: "actions",
                  header: "İşlem",
                  width: 100,
                  minWidth: 80,
                  align: "center",
                  render: (row) => (
                    <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                      {!isEditable(row._idx) && (
                        <button
                          type="button"
                          className="btn-top blue"
                          style={{ padding: "4px 8px", fontSize: 11 }}
                          onClick={() => setEditingLineIndex(row._idx)}
                        >
                          Değiştir
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn-top"
                        style={{ background: "#fee2e2", color: "#b91c1c", border: "none", padding: "4px 8px" }}
                        onClick={() => removeLine(row._idx)}
                        disabled={lines.length <= 1}
                      >
                        🗑️
                      </button>
                    </div>
                  ),
                },
              ];
              let subtotal = 0;
              let discountTotal = 0;
              let taxTotal = 0;
              const taxByRate: Record<string, number> = {};
              for (const ln of lines) {
                const gross = Number(ln.qty || 0) * Number(ln.unit_price || 0);
                const net = orderLineNet(ln);
                const tax = orderLineTax(ln, taxRates);
                subtotal += net;
                discountTotal += Math.max(gross - net, 0);
                taxTotal += tax;
                const rateKey = String(
                  ln.tax_rate ?? taxRates.find((t) => t.id === ln.tax_rate_id)?.rate ?? 20
                );
                taxByRate[rateKey] = (taxByRate[rateKey] || 0) + tax;
              }
              return (
                <>
                  <div className="fatura-items-card" style={{ marginTop: 12 }}>
                    <div className="fatura-items-toolbar">
                      <span>📦 {meta.noun} Kalemleri</span>
                      <span className="badge badge-yellow">{lines.length} Kalem</span>
                    </div>
                    <ResizableDataTable
                      tableKey={`${docKind.toLowerCase()}-line-table`}
                      columns={columns}
                      data={rows}
                      rowKey={(row) => row._id}
                      tableClassName="fatura-table resizable-data-table"
                      rowClassName={(row) =>
                        isEditable(row._idx)
                          ? "line-row-editing"
                          : editingLineIndex !== null
                            ? "line-row-locked"
                            : ""
                      }
                      emptyMessage="Henüz kalem eklenmedi."
                    />
                    <button type="button" className="btn-top" style={{ margin: 8 }} onClick={addLine}>
                      + Satır
                    </button>
                  </div>
                  <div
                    style={{
                      background: "#f8fafc",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      padding: 18,
                      marginTop: 12,
                      maxWidth: 360,
                      marginLeft: "auto",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13.5 }}>
                      <span>Ara Toplam:</span>
                      <strong>{formatMoney(subtotal)}</strong>
                    </div>
                    {discountTotal > 0 && (
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: 8,
                          fontSize: 13.5,
                          color: "#ef4444",
                        }}
                      >
                        <span>İskonto Toplamı:</span>
                        <strong>- {formatMoney(discountTotal)}</strong>
                      </div>
                    )}
                    {Object.entries(taxByRate).map(([rate, amt]) => (
                      <div
                        key={rate}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: 8,
                          fontSize: 13.5,
                          color: "#2563eb",
                        }}
                      >
                        <span>KDV (%{rate}):</span>
                        <strong>{formatMoney(amt)}</strong>
                      </div>
                    ))}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        paddingTop: 12,
                        borderTop: "2px dashed #cbd5e1",
                        fontSize: 18,
                        fontWeight: 800,
                        color: "#1e3a8a",
                      }}
                    >
                      <span>GENEL TOPLAM:</span>
                      <strong>{formatMoney(subtotal + taxTotal)}</strong>
                    </div>
                  </div>
                </>
              );
            })()}

            {detail?.document_links?.length ? (
              <div className="fatura-box" style={{ marginTop: 12 }}>
                <div className="fatura-box-title">
                  <span>🔗 Bağlantılar</span>
                </div>
                <ul style={{ fontSize: 12, margin: 0 }}>
                  {detail.document_links.map((l) => (
                    <li key={l.id}>
                      {l.link_type}: {l.document_type} #{l.document_no ?? l.document_id} — {money(l.amount)}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </FormProvider>
        </div>
      ) : null}

      <div className="card" style={{ padding: 0, overflow: "auto" }}>
        <table className="data-table belge-list-table" style={{ width: "100%", fontSize: 13 }}>
          <thead>
            <tr>
              <th>Belge No</th>
              <th>Tarih</th>
              <th>Cari</th>
              <th style={{ textAlign: "right" }}>Tutar</th>
              <th>Durum</th>
              <th>Bağlantılar</th>
              <th>İşlem</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} style={{ padding: 16 }}>
                  Yükleniyor…
                </td>
              </tr>
            )}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: 16 }}>
                  Kayıt bulunamadı.
                </td>
              </tr>
            )}
            {!loading &&
              items.map((it) => (
                <tr key={it.id}>
                  <td>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className="link-btn"
                        style={{ background: "none", border: "none", color: "#5b21b6", cursor: "pointer", padding: 0, fontWeight: 600 }}
                        onClick={() => openLinked("order", it.id, it.order_no)}
                      >
                        {it.order_no}
                      </button>
                      {it.change_flag ? (
                        <button
                          type="button"
                          className="badge badge-orange"
                          style={{ cursor: "pointer", border: "none" }}
                          title="Değişiklik özeti"
                          onClick={() =>
                            setChangePanel({
                              no: it.order_no,
                              summary: it.change_summary || "Değişiklik özeti bulunamadı.",
                            })
                          }
                        >
                          Değişti
                        </button>
                      ) : null}
                    </div>
                  </td>
                  <td>{it.order_date}</td>
                  <td>{it.account_title ?? it.account_code}</td>
                  <td style={{ textAlign: "right" }}>{money(it.grand_total)}</td>
                  <td>{it.status_label}</td>
                  <td style={{ fontSize: 12 }}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {docKind === "TEKLIF" && (
                        <LinkedChip
                          label="Sipariş"
                          no={it.linked_order_no}
                          onClick={() => openLinked("order", it.linked_order_id, it.linked_order_no)}
                        />
                      )}
                      <LinkedChip
                        label="İrsaliye"
                        no={it.linked_waybill_no}
                        onClick={() => openLinked("waybill", it.linked_waybill_id, it.linked_waybill_no)}
                      />
                      <LinkedChip
                        label="Fatura"
                        no={it.linked_invoice_no}
                        onClick={() => openLinked("invoice", it.linked_invoice_id, it.linked_invoice_no)}
                      />
                    </div>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {docKind === "TEKLIF" ? (
                        <button
                          type="button"
                          className="btn-top"
                          style={{ fontSize: 11 }}
                          disabled={busy}
                          onClick={() => void convertToOrder(it.id)}
                        >
                          Siparişe çevir
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="btn-top"
                            style={{ fontSize: 11 }}
                            disabled={busy}
                            onClick={() => void convertWaybill(it.id)}
                          >
                            İrsaliyeye çevir
                          </button>
                          <button
                            type="button"
                            className="btn-top"
                            style={{ fontSize: 11 }}
                            disabled={busy}
                            onClick={() => void convertInvoice(it.id)}
                          >
                            Faturaya çevir
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        className="btn-top"
                        style={{ fontSize: 11 }}
                        onClick={() => void openEdit(it.id)}
                      >
                        Düzelt
                      </button>
                      <button
                        type="button"
                        className="pill-btn delete"
                        style={{ fontSize: 11 }}
                        disabled={busy}
                        onClick={() => void removeItem(it.id)}
                      >
                        Sil
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        <div style={{ padding: 8, fontSize: 12, color: "#64748b" }}>{total} kayıt</div>
      </div>

      <SidePanel open={!!preview} title={preview?.title ?? "Belge Önizleme"} onClose={() => setPreview(null)} size="lg">
        {previewLoading && <p>Yükleniyor…</p>}
        {previewError && <div className="alert alert-error">{previewError}</div>}
        {!previewLoading && !previewError && preview?.kind === "order" && previewOrder && (
          <DocPreviewBlock
            fields={[
              ["Belge No", previewOrder.order_no],
              ["Tarih", previewOrder.order_date],
              ["Cari", previewOrder.account_title ?? previewOrder.account_code ?? "—"],
              ["Durum", previewOrder.status_label],
              ["Tutar", money(previewOrder.grand_total)],
              ["Not", previewOrder.notes || "—"],
            ]}
            lines={previewOrder.lines.map((ln) => ({
              desc: ln.description || ln.stock_name || ln.stock_code || "—",
              qty: Number(ln.qty),
              total: money(ln.line_total),
            }))}
          />
        )}
        {!previewLoading && !previewError && preview?.kind === "invoice" && previewInvoice && (
          <DocPreviewBlock
            fields={[
              ["Fatura No", previewInvoice.invoice_no],
              ["Tarih", previewInvoice.invoice_date],
              ["Cari", previewInvoice.account_title ?? previewInvoice.account_code ?? "—"],
              ["Durum", previewInvoice.gib_status_label || previewInvoice.status],
              ["Tutar", money(previewInvoice.grand_total)],
            ]}
            lines={previewInvoice.lines.map((ln) => ({
              desc: ln.description || ln.stock_code || "—",
              qty: Number(ln.qty),
              total: money(ln.line_total),
            }))}
          />
        )}
        {!previewLoading && !previewError && preview?.kind === "waybill" && previewWaybill && (
          <DocPreviewBlock
            fields={[
              ["İrsaliye No", previewWaybill.waybill_no],
              ["Tarih", previewWaybill.waybill_date],
              ["Cari", previewWaybill.account_title ?? previewWaybill.account_code ?? "—"],
              ["Durum", previewWaybill.gib_status_label || previewWaybill.status],
              ["Taşıyıcı", previewWaybill.carrier_name || "—"],
            ]}
            lines={previewWaybill.lines.map((ln) => ({
              desc: ln.description || ln.stock_code || "—",
              qty: Number(ln.qty),
              total: "—",
            }))}
          />
        )}
      </SidePanel>

      <SidePanel
        open={!!changePanel}
        title={`Değişiklik — ${changePanel?.no ?? ""}`}
        onClose={() => setChangePanel(null)}
        size="md"
      >
        <pre
          style={{
            whiteSpace: "pre-wrap",
            fontFamily: "inherit",
            fontSize: 13,
            margin: 0,
            lineHeight: 1.5,
            color: "#334155",
          }}
        >
          {changePanel?.summary}
        </pre>
      </SidePanel>

      <QuickAddCariPanel
        open={quickCariOpen}
        onClose={() => setQuickCariOpen(false)}
        onCreated={async (id) => {
          const bid = formBranchId || branchId;
          const r = await faturaApi.lookupCari({ branch_id: bid ?? undefined });
          setAccounts(r.items ?? []);
          setAccountId(id);
        }}
      />
    </>
  );
}

function LinkedChip({
  label,
  no,
  onClick,
}: {
  label: string;
  no?: string | null;
  onClick: () => void;
}) {
  if (!no) {
    return (
      <span style={{ color: "#94a3b8" }}>
        {label}: —
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: "none",
        border: "none",
        padding: 0,
        color: "#5b21b6",
        cursor: "pointer",
        textDecoration: "underline",
        fontSize: 12,
      }}
    >
      {label}: {no}
    </button>
  );
}

function DocPreviewBlock({
  fields,
  lines,
}: {
  fields: Array<[string, string]>;
  lines: Array<{ desc: string; qty: number; total: string }>;
}) {
  return (
    <div>
      <dl style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: "6px 12px", fontSize: 13, margin: 0 }}>
        {fields.map(([k, v]) => (
          <div key={k} style={{ display: "contents" }}>
            <dt style={{ color: "#64748b" }}>{k}</dt>
            <dd style={{ margin: 0, fontWeight: 500 }}>{v}</dd>
          </div>
        ))}
      </dl>
      <h4 style={{ marginTop: 16, marginBottom: 8 }}>Kalemler</h4>
      <table className="fatura-table" style={{ width: "100%", fontSize: 12 }}>
        <thead>
          <tr>
            <th>Açıklama</th>
            <th style={{ textAlign: "right" }}>Miktar</th>
            <th style={{ textAlign: "right" }}>Tutar</th>
          </tr>
        </thead>
        <tbody>
          {lines.length === 0 && (
            <tr>
              <td colSpan={3} style={{ padding: 8 }}>
                Kalem yok
              </td>
            </tr>
          )}
          {lines.map((ln, i) => (
            <tr key={i}>
              <td>{ln.desc}</td>
              <td style={{ textAlign: "right" }}>{ln.qty}</td>
              <td style={{ textAlign: "right" }}>{ln.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
