import { useEffect, useMemo, useState } from "react";
import { stokApi, type PriceListListItem } from "../api/stokApi";
import { PRICE_LIST_TYPES } from "../constants";
import { ResizableDataTable } from "@/components/ResizableDataTable";
import { useAppStore, useAuthStore } from "@/store/appStore";

type Props = {
  onOpen: (id: number | null) => void;
  refreshKey?: number;
};

export function FiyatListesiListView({ onOpen, refreshKey = 0 }: Props) {
  const branchId = useAppStore((s) => s.branchId);
  const accessToken = useAuthStore((s) => s.accessToken);
  const guardNavigate = useAppStore((s) => s.guardNavigate);
  const [items, setItems] = useState<PriceListListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    setLoading(true);
    stokApi
      .listPriceLists({ q: q || undefined, branch_id: branchId ?? undefined })
      .then((res) => {
        setItems(res.items ?? []);
        setTotal(res.total ?? 0);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Liste yüklenemedi"))
      .finally(() => setLoading(false));
  }, [q, branchId, refreshKey, accessToken]);

  function typeLabel(v: string) {
    return PRICE_LIST_TYPES.find((t) => t.value === v)?.label ?? v;
  }

  const columns = useMemo(
    () => [
      { key: "code", header: "Kod", width: 100, render: (row: PriceListListItem) => <strong>{row.code}</strong> },
      { key: "name", header: "Ad", width: 180, render: (row: PriceListListItem) => row.name },
      { key: "type", header: "Tip", width: 120, render: (row: PriceListListItem) => typeLabel(row.list_type) },
      { key: "currency", header: "Para Birimi", width: 100, render: (row: PriceListListItem) => row.currency_code ?? "—" },
      {
        key: "validity",
        header: "Geçerlilik",
        width: 180,
        render: (row: PriceListListItem) => `${row.valid_from ?? "—"} — ${row.valid_to ?? "—"}`,
      },
      {
        key: "status",
        header: "Durum",
        width: 80,
        render: (row: PriceListListItem) => (
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
        render: (row: PriceListListItem) => (
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
          placeholder="Liste kodu veya adı ara…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <span className="text-muted">{total} kayıt</span>
        <button type="button" className="btn-save" onClick={() => guardNavigate(() => onOpen(null))}>
          + Yeni Fiyat Listesi
        </button>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}
      <ResizableDataTable
        tableKey="fiyat-listesi-list"
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
