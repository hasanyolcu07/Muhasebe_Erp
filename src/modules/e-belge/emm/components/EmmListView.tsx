import { useMemo } from "react";
import { ResizableDataTable } from "@/components/ResizableDataTable";
import type { EmmListItem } from "../api/emmApi";

type Props = {
  items: EmmListItem[];
  loading: boolean;
  selectedId: number | null;
  onSelect: (id: number) => void;
  onDelete: (id: number) => void;
};

export function EmmListView({ items, loading, selectedId, onSelect, onDelete }: Props) {
  const columns = useMemo(
    () => [
      {
        key: "receipt_no",
        header: "Makbuz No",
        width: 130,
        render: (r: EmmListItem) => (
          <button
            type="button"
            className="linkish"
            style={{ fontWeight: 700, background: "none", border: 0, cursor: "pointer", color: "inherit" }}
            onClick={() => onSelect(r.id)}
          >
            {r.receipt_no || r.fis_no || `#${r.id}`}
          </button>
        ),
      },
      { key: "date", header: "Tarih", width: 100, render: (r: EmmListItem) => r.receipt_date },
      {
        key: "cari",
        header: "Müstahsil",
        width: 200,
        render: (r: EmmListItem) => r.account_title || r.account_code || "—",
      },
      {
        key: "total",
        header: "Net Tutar",
        width: 110,
        align: "right" as const,
        render: (r: EmmListItem) => (
          <span style={{ fontWeight: 700 }}>{Number(r.grand_total).toLocaleString("tr-TR")} ₺</span>
        ),
      },
      {
        key: "status",
        header: "Durum",
        width: 90,
        render: (r: EmmListItem) => (r.status === "APPROVED" ? "Onaylı" : "Taslak"),
      },
      {
        key: "gib",
        header: "GİB",
        width: 110,
        render: (r: EmmListItem) => r.gib_status_label || r.gib_status,
      },
      {
        key: "action",
        header: "",
        width: 70,
        align: "center" as const,
        render: (r: EmmListItem) =>
          r.status !== "APPROVED" ? (
            <button
              type="button"
              className="btn-top"
              style={{ fontSize: 11, padding: "4px 8px" }}
              onClick={() => onDelete(r.id)}
            >
              Sil
            </button>
          ) : null,
      },
    ],
    [onDelete, onSelect]
  );

  if (!loading && !items.length) {
    return (
      <div className="card" style={{ padding: 24, textAlign: "center", color: "var(--text-muted)" }}>
        Henüz e-Müstahsil makbuzu yok. Çiftçi alımı için yeni makbuz oluşturun.
      </div>
    );
  }

  return (
    <ResizableDataTable
      tableKey="emm-list"
      columns={columns}
      data={items}
      rowKey={(r) => r.id}
      tableClassName="resizable-data-table fatura-table"
      loading={loading}
      emptyMessage="Kayıt yok"
      rowClassName={(r) => (r.id === selectedId ? "row-selected" : undefined)}
    />
  );
}
