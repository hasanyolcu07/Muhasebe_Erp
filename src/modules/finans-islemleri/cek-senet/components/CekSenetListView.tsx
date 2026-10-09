import { useEffect, useMemo, useState } from "react";
import { cekSenetApi, type CheckBondListItem } from "../api/cekSenetApi";
import { STATUS_BADGE } from "../schemas/cekSenetSchema";
import { ResizableDataTable } from "@/components/ResizableDataTable";

type Props = {
  refreshKey: number;
  branchId?: number | null;
  recordTypeId?: number | null;
  filterQ?: string;
  filterStatus?: string;
  filterInstrument?: string;
  dueFrom?: string;
  dueTo?: string;
  onEdit: (item: CheckBondListItem) => void;
  onDelete: (id: number) => void;
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_BADGE[status] ?? { label: status, color: "#64748b", bg: "#f1f5f9" };
  return (
    <span
      className="badge"
      style={{ background: cfg.bg, color: cfg.color, fontSize: 11.5, fontWeight: 700, padding: "3px 8px" }}
    >
      {cfg.label}
    </span>
  );
}

function DueCell({ item }: { item: CheckBondListItem }) {
  if (!item.due_date) return <span style={{ color: "#94a3b8" }}>—</span>;
  const style: React.CSSProperties = item.is_overdue
    ? { color: "#b91c1c", fontWeight: 800 }
    : item.days_to_due != null && item.days_to_due <= 7
      ? { color: "#c2410c", fontWeight: 700 }
      : { color: "#334155" };
  return (
    <span style={style}>
      {new Date(item.due_date).toLocaleDateString("tr-TR")}
      {item.days_to_due != null && (
        <span style={{ fontSize: 10.5, marginLeft: 4, opacity: 0.85 }}>
          ({item.days_to_due < 0 ? `${Math.abs(item.days_to_due)}g gecikmiş` : `${item.days_to_due}g`})
        </span>
      )}
    </span>
  );
}

function SectionTable({
  title,
  icon,
  tableKey,
  items,
  onEdit,
  onDelete,
}: {
  title: string;
  icon: string;
  tableKey: string;
  items: CheckBondListItem[];
  onEdit: (item: CheckBondListItem) => void;
  onDelete: (id: number) => void;
}) {
  const columns = useMemo(
    () => [
      {
        key: "doc",
        header: "Seri/No",
        width: 120,
        render: (item: CheckBondListItem) => <span style={{ fontWeight: 700, color: "#1e3a8a" }}>{item.document_no}</span>,
      },
      { key: "type", header: "Tür", width: 90, render: (item: CheckBondListItem) => item.instrument_type_label },
      { key: "cari", header: "Cari", width: 160, render: (item: CheckBondListItem) => item.account_label || "—" },
      {
        key: "amount",
        header: "Tutar",
        width: 120,
        align: "right" as const,
        render: (item: CheckBondListItem) => (
          <span style={{ fontWeight: 700 }}>
            {Number(item.amount).toLocaleString("tr-TR")} {item.currency_code || "₺"}
          </span>
        ),
      },
      { key: "due", header: "Vade", width: 130, render: (item: CheckBondListItem) => <DueCell item={item} /> },
      { key: "status", header: "Durum", width: 110, render: (item: CheckBondListItem) => <StatusBadge status={item.status} /> },
      {
        key: "yevmiye",
        header: "Yevmiye",
        width: 100,
        render: (item: CheckBondListItem) =>
          item.yevmiye_fis_no ? (
            <span style={{ color: "#047857", fontWeight: 600, fontSize: 11 }}>{item.yevmiye_fis_no}</span>
          ) : (
            <span style={{ color: "#94a3b8" }}>—</span>
          ),
      },
      {
        key: "action",
        header: "İşlem",
        width: 90,
        align: "center" as const,
        render: (item: CheckBondListItem) => (
          <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
            <button
              type="button"
              className="btn-top"
              style={{ padding: "3px 8px", fontSize: 11 }}
              onClick={() => onEdit(item)}
              title="Düzenle"
            >
              ✏️
            </button>
            <button
              type="button"
              className="btn-top"
              style={{ padding: "3px 8px", fontSize: 11, background: "#fee2e2", color: "#b91c1c" }}
              onClick={() => onDelete(item.id)}
              title="Sil"
            >
              🗑️
            </button>
          </div>
        ),
      },
    ],
    [onDelete, onEdit]
  );

  return (
    <div className="card" style={{ marginBottom: 20, padding: 0, overflow: "hidden" }}>
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid #e2e8f0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h3 style={{ margin: 0, fontSize: 15, color: "#1e3a8a", fontWeight: 800 }}>
          {icon} {title}
        </h3>
        <span className="badge badge-blue">{items.length} kayıt</span>
      </div>
      <ResizableDataTable
        tableKey={tableKey}
        columns={columns}
        data={items}
        rowKey={(item) => item.id}
        tableClassName="resizable-data-table auth-table"
        emptyMessage="Kayıt bulunamadı"
      />
    </div>
  );
}

export function CekSenetListView({
  refreshKey,
  branchId,
  recordTypeId,
  filterQ,
  filterStatus,
  filterInstrument,
  dueFrom,
  dueTo,
  onEdit,
  onDelete,
}: Props) {
  const [alinan, setAlinan] = useState<CheckBondListItem[]>([]);
  const [verilen, setVerilen] = useState<CheckBondListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    cekSenetApi
      .list({
        branch_id: branchId ?? undefined,
        record_type_id: recordTypeId ?? undefined,
        q: filterQ || undefined,
        status: filterStatus || undefined,
        instrument_type: filterInstrument || undefined,
        due_from: dueFrom || undefined,
        due_to: dueTo || undefined,
      })
      .then((res) => {
        setAlinan(res.items_alinan ?? []);
        setVerilen(res.items_verilen ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Liste yüklenemedi"))
      .finally(() => setLoading(false));
  }, [refreshKey, branchId, recordTypeId, filterQ, filterStatus, filterInstrument, dueFrom, dueTo]);

  if (loading) {
    return <div style={{ padding: 24, textAlign: "center", color: "#64748b" }}>Yükleniyor…</div>;
  }
  if (error) {
    return (
      <div style={{ padding: 16, background: "#fee2e2", color: "#b91c1c", borderRadius: 8 }}>{error}</div>
    );
  }

  return (
    <>
      <SectionTable
        title="Müşteri Çek/Senetleri (Alınan)"
        icon="🔵"
        tableKey="cek-senet-alinan"
        items={alinan}
        onEdit={onEdit}
        onDelete={onDelete}
      />
      <SectionTable
        title="Verilen Çek/Senetler"
        icon="🟠"
        tableKey="cek-senet-verilen"
        items={verilen}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </>
  );
}
