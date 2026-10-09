import { useMemo, useState } from "react";
import { DocumentPreviewModal } from "@/components/DocumentPreviewModal";
import { ResizableDataTable, type ResizableColumn } from "@/components/ResizableDataTable";
import { DocTypeBadgesInline } from "../../components/DocTypeBadgesInline";
import type { DocumentSide } from "../../constants/documentContext";
import { faturaApi, type InvoiceListItem } from "../api/faturaApi";
import { formatMoney } from "../constants/invoiceTypes";
import { GibStatusBadge } from "../../utils/gibStatusBadge";

const COLUMN_PREFS_KEY = "tabia_fatura_list_columns";

const ALL_COLUMN_KEYS = [
  "invoice_no",
  "doc_type",
  "type",
  "date",
  "cari",
  "gib_status",
  "matrah",
  "kdv_pct",
  "kdv_tutar",
  "toplam",
  "status",
  "actions",
] as const;

type ColumnKey = (typeof ALL_COLUMN_KEYS)[number];

const DEFAULT_VISIBLE: ColumnKey[] = [
  "invoice_no",
  "doc_type",
  "type",
  "date",
  "cari",
  "gib_status",
  "matrah",
  "kdv_pct",
  "kdv_tutar",
  "toplam",
  "status",
  "actions",
];

function loadVisibleColumns(): ColumnKey[] {
  try {
    const raw = localStorage.getItem(COLUMN_PREFS_KEY);
    if (!raw) return DEFAULT_VISIBLE;
    const parsed = JSON.parse(raw) as string[];
    return ALL_COLUMN_KEYS.filter((k) => parsed.includes(k));
  } catch {
    return DEFAULT_VISIBLE;
  }
}

function saveVisibleColumns(cols: ColumnKey[]) {
  localStorage.setItem(COLUMN_PREFS_KEY, JSON.stringify(cols));
}

function primaryTaxRate(tb?: Record<string, number>): string {
  if (!tb || Object.keys(tb).length === 0) return "—";
  const rates = Object.keys(tb)
    .map(Number)
    .filter((n) => !Number.isNaN(n));
  if (!rates.length) return "—";
  return `%${Math.max(...rates)}`;
}

type Props = {
  items: InvoiceListItem[];
  loading?: boolean;
  title?: string;
  compact?: boolean;
  side?: DocumentSide;
  onOpen: (id: number) => void;
  onCopy: (id: number) => void;
  onDelete: (id: number) => void;
  onRefresh?: () => void;
};

export function FaturaListView({
  items,
  loading,
  title = "Son Faturalar",
  compact,
  side,
  onOpen,
  onCopy,
  onDelete,
  onRefresh,
}: Props) {
  const isSales = side === "sales";
  const [previewId, setPreviewId] = useState<number | null>(null);
  const [showColSettings, setShowColSettings] = useState(false);
  const [visibleCols, setVisibleCols] = useState<ColumnKey[]>(() => loadVisibleColumns());

  async function handleSendGib(id: number) {
    try {
      const res = await faturaApi.sendEfatura(id);
      window.alert(res.message);
      onRefresh?.();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "GİB gönderimi başarısız");
    }
  }

  function toggleColumn(key: ColumnKey) {
    setVisibleCols((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      saveVisibleColumns(next);
      return next;
    });
  }

  const allColumns: ResizableColumn<InvoiceListItem>[] = useMemo(
    () => [
      {
        key: "invoice_no",
        header: "Fatura No",
        width: 120,
        render: (r) =>
          isSales ? (
            <button
              type="button"
              className="link-btn"
              style={{ background: "none", border: "none", color: "#1d4ed8", cursor: "pointer", padding: 0 }}
              onClick={() => setPreviewId(r.id)}
            >
              {r.invoice_no}
            </button>
          ) : (
            r.invoice_no
          ),
      },
      {
        key: "doc_type",
        header: "Belge Tipi",
        width: 160,
        render: (r) => <DocTypeBadgesInline kind="invoice" row={r} showDirection={side === "purchase"} />,
      },
      { key: "type", header: "İşlem Türü", width: 120, render: (r) => r.invoice_type_label },
      { key: "date", header: "Tarih", width: 100, render: (r) => r.invoice_date },
      { key: "cari", header: "Cari", width: 180, render: (r) => r.account_title ?? "—" },
      {
        key: "gib_status",
        header: "GİB Durum",
        width: 110,
        render: (r) => <GibStatusBadge status={r.gib_status} label={r.gib_status_label} />,
      },
      {
        key: "matrah",
        header: "Matrah",
        width: 100,
        align: "right",
        render: (r) => formatMoney(Number(r.subtotal ?? 0)),
      },
      {
        key: "kdv_pct",
        header: "KDV %",
        width: 70,
        align: "right",
        render: (r) => primaryTaxRate(r.tax_breakdown),
      },
      {
        key: "kdv_tutar",
        header: "KDV Tutar",
        width: 100,
        align: "right",
        render: (r) => formatMoney(Number(r.tax_total ?? 0)),
      },
      {
        key: "toplam",
        header: "Toplam",
        width: 110,
        align: "right",
        render: (r) => formatMoney(Number(r.grand_total)),
      },
      {
        key: "status",
        header: "Durum",
        width: 90,
        render: (r) => (
          <span className={`badge ${r.status === "APPROVED" ? "badge-green" : "badge-yellow"}`}>
            {r.status === "APPROVED" ? "Onaylı" : "Taslak"}
          </span>
        ),
      },
      {
        key: "actions",
        header: "İşlem",
        width: isSales ? 220 : 140,
        render: (r) => (
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            <button type="button" className="btn-top blue" style={{ padding: "2px 8px", fontSize: 11 }} onClick={() => onOpen(r.id)}>
              Aç
            </button>
            {isSales && r.status === "APPROVED" && (
              <button
                type="button"
                className="btn-top"
                style={{ padding: "2px 8px", fontSize: 11, background: "#dbeafe", color: "#1e40af" }}
                onClick={() => handleSendGib(r.id)}
              >
                GİB Onayla Gönder
              </button>
            )}
            <button type="button" className="btn-top" style={{ padding: "2px 8px", fontSize: 11 }} onClick={() => onCopy(r.id)}>
              Kopyala
            </button>
            {r.status === "DRAFT" && (
              <button
                type="button"
                className="btn-top"
                style={{ padding: "2px 8px", fontSize: 11, background: "#fee2e2", color: "#b91c1c" }}
                onClick={() => onDelete(r.id)}
              >
                Sil
              </button>
            )}
          </div>
        ),
      },
    ],
    [isSales, onCopy, onDelete, onOpen, side]
  );

  const columns = allColumns.filter((c) => visibleCols.includes(c.key as ColumnKey));

  return (
    <>
      <div className={`card${compact ? " doc-hub-list-card" : ""}`} style={compact ? undefined : { marginTop: 16 }}>
        <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3>{title}</h3>
          <button
            type="button"
            className="btn-top"
            style={{ fontSize: 11, padding: "4px 10px" }}
            onClick={() => setShowColSettings((v) => !v)}
          >
            ⚙ Sütunlar
          </button>
        </div>

        {showColSettings && (
          <div className="fatura-column-settings" style={{ padding: "8px 12px", borderBottom: "1px solid #e2e8f0" }}>
            {ALL_COLUMN_KEYS.map((key) => (
              <label key={key} style={{ marginRight: 12, fontSize: 12 }}>
                <input
                  type="checkbox"
                  checked={visibleCols.includes(key)}
                  onChange={() => toggleColumn(key)}
                />{" "}
                {allColumns.find((c) => c.key === key)?.header ?? key}
              </label>
            ))}
          </div>
        )}

        <ResizableDataTable
          tableKey={`fatura-list-${side ?? "all"}`}
          columns={columns}
          data={items}
          rowKey={(r) => r.id}
          tableClassName="resizable-data-table fatura-table fatura-table-tax-group"
          loading={loading}
          emptyMessage="Henüz fatura kaydı yok."
        />
      </div>

      <DocumentPreviewModal invoiceId={previewId} onClose={() => setPreviewId(null)} />
    </>
  );
}
