import { useMemo } from "react";
import { type VoucherListItem } from "../api/fisDekontApi";
import { ResizableDataTable } from "@/components/ResizableDataTable";

type Props = {
  items: VoucherListItem[];
  loading: boolean;
  onDelete: (id: number) => void;
};

export function FisDekontListView({ items, loading, onDelete }: Props) {
  const columns = useMemo(
    () => [
      {
        key: "fis_no",
        header: "Fiş No",
        width: 100,
        render: (v: VoucherListItem) => <span style={{ fontWeight: 700 }}>{v.fis_no || `#${v.id}`}</span>,
      },
      { key: "type", header: "Tür", width: 120, render: (v: VoucherListItem) => v.voucher_type_label },
      { key: "date", header: "Tarih", width: 110, render: (v: VoucherListItem) => v.voucher_date },
      { key: "desc", header: "Açıklama", width: 220, render: (v: VoucherListItem) => v.description },
      {
        key: "amount",
        header: "Tutar",
        width: 120,
        align: "right" as const,
        render: (v: VoucherListItem) => (
          <span style={{ fontWeight: 700 }}>{Number(v.total_debit).toLocaleString("tr-TR")} ₺</span>
        ),
      },
      { key: "yevmiye", header: "Yevmiye", width: 110, render: (v: VoucherListItem) => v.yevmiye_fis_no || "—" },
      {
        key: "posted",
        header: "Muhasebe",
        width: 90,
        align: "center" as const,
        render: (v: VoucherListItem) => (v.is_posted ? "🟢" : "🔴"),
      },
      {
        key: "action",
        header: "",
        width: 70,
        align: "center" as const,
        render: (v: VoucherListItem) =>
          !v.is_posted ? (
            <button type="button" className="btn-top" style={{ fontSize: 11, padding: "4px 8px" }} onClick={() => onDelete(v.id)}>
              Sil
            </button>
          ) : null,
      },
    ],
    [onDelete]
  );

  if (!loading && !items.length) {
    return (
      <div className="card" style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", marginTop: 24 }}>
        Henüz fiş / dekont kaydı yok.
      </div>
    );
  }

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", fontWeight: 700, background: "#fff", borderRadius: "8px 8px 0 0", border: "1px solid var(--border)", borderBottomWidth: 0 }}>
        📋 Son Fiş / Dekont Kayıtları
      </div>
      <ResizableDataTable
        tableKey="fis-dekont-recent"
        columns={columns}
        data={items}
        rowKey={(v) => v.id}
        tableClassName="resizable-data-table fatura-table"
        loading={loading}
        emptyMessage="Henüz fiş / dekont kaydı yok."
      />
    </div>
  );
}
