import { useEffect, useMemo, useState } from "react";
import { stokApi, type StokListItem } from "../api/stokApi";
import { STOCK_TYPES } from "../constants";
import { ResizableDataTable } from "@/components/ResizableDataTable";
import { useAppStore, useAuthStore } from "@/store/appStore";

type Props = {
  onOpen: (id: number | null) => void;
  refreshKey?: number;
};

export function StokListView({ onOpen, refreshKey = 0 }: Props) {
  const branchId = useAppStore((s) => s.branchId);
  const accessToken = useAuthStore((s) => s.accessToken);
  const guardNavigate = useAppStore((s) => s.guardNavigate);
  const [items, setItems] = useState<StokListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    setLoading(true);
    stokApi
      .list({ q: q || undefined, branch_id: branchId ?? undefined, page_size: 100 })
      .then((res) => {
        setItems(res.items ?? []);
        setTotal(res.total ?? 0);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Liste yüklenemedi"))
      .finally(() => setLoading(false));
  }, [q, branchId, refreshKey, accessToken]);

  function stockTypeLabel(v: string) {
    return STOCK_TYPES.find((t) => t.value === v)?.label ?? v;
  }

  const columns = useMemo(
    () => [
      { key: "code", header: "Kod", width: 100, render: (row: StokListItem) => <strong>{row.code}</strong> },
      { key: "name", header: "Ad", width: 180, render: (row: StokListItem) => row.name },
      { key: "type", header: "Tip", width: 100, render: (row: StokListItem) => stockTypeLabel(row.stock_type) },
      { key: "barcode", header: "Barkod", width: 120, render: (row: StokListItem) => row.barcode ?? "—" },
      {
        key: "levels",
        header: "Min/Max/Kritik",
        width: 130,
        render: (row: StokListItem) => `${row.min_stock} / ${row.max_stock} / ${row.critical_level}`,
      },
      {
        key: "alerts",
        header: "Uyarılar",
        width: 180,
        render: (row: StokListItem) => (
          <span style={{ display: "inline-flex", gap: 4, flexWrap: "wrap" }}>
            {row.alert_min ? (
              <span
                className="badge"
                style={{
                  background: row.alert_min_severity === "CRITICAL" ? "#fee2e2" : "#ffedd5",
                  color: row.alert_min_severity === "CRITICAL" ? "#b91c1c" : "#c2410c",
                  fontSize: 10.5,
                }}
                title="Min seviye altı"
              >
                {row.alert_min_severity === "CRITICAL" ? "Kritik" : "Min altı"}
              </span>
            ) : null}
            {row.alert_max ? (
              <span className="badge" style={{ background: "#e0e7ff", color: "#3730a3", fontSize: 10.5 }} title="Max seviye aşımı">
                Max aşımı
              </span>
            ) : null}
            {row.alert_skt ? (
              <span
                className="badge"
                style={{
                  background: row.alert_skt_severity === "EXPIRED" || row.alert_skt_severity === "CRITICAL" ? "#fecaca" : "#fef3c7",
                  color: row.alert_skt_severity === "EXPIRED" || row.alert_skt_severity === "CRITICAL" ? "#991b1b" : "#b45309",
                  fontSize: 10.5,
                }}
                title="Son kullanma tarihi uyarısı"
              >
                SKT
              </span>
            ) : null}
            {!row.alert_min && !row.alert_max && !row.alert_skt ? (
              <span style={{ color: "#94a3b8", fontSize: 12 }}>—</span>
            ) : null}
          </span>
        ),
      },
      { key: "purchase", header: "Alış", width: 90, align: "right" as const, render: (row: StokListItem) => row.purchase_price },
      { key: "sale", header: "Satış", width: 90, align: "right" as const, render: (row: StokListItem) => row.sale_price },
      {
        key: "status",
        header: "Durum",
        width: 80,
        render: (row: StokListItem) => (
          <span className={`badge ${row.is_passive ? "badge-red" : "badge-green"}`}>
            {row.is_passive ? "Pasif" : "Aktif"}
          </span>
        ),
      },
      {
        key: "action",
        header: "İşlem",
        width: 90,
        align: "center" as const,
        render: (row: StokListItem) => (
          <button type="button" className="pill-btn" onClick={() => guardNavigate(() => onOpen(row.id))}>
            Düzenle
          </button>
        ),
      },
    ],
    [guardNavigate, onOpen]
  );

  return (
    <>
      <div className="cari-list-toolbar">
        <input
          className="form-control"
          placeholder="Kod, ad veya barkod ara…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <span className="text-muted">{total} kayıt</span>
        <button type="button" className="btn-save" onClick={() => guardNavigate(() => onOpen(null))}>
          + Yeni Stok Kartı
        </button>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}
      <ResizableDataTable
        tableKey="stok-list"
        columns={columns}
        data={items}
        rowKey={(row) => row.id}
        tableClassName="resizable-data-table auth-table"
        loading={loading}
        emptyMessage="Kayıt bulunamadı"
      />
    </>
  );
}
