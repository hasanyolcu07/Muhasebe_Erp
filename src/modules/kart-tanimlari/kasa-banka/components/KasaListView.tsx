import { useEffect, useMemo, useState } from "react";
import { kasaBankaApi, type KasaListItem } from "../api/kasaBankaApi";
import { ResizableDataTable } from "@/components/ResizableDataTable";
import { useAppStore, useAuthStore } from "@/store/appStore";

type Props = {
  onOpen: (id: number | null) => void;
  refreshKey?: number;
};

export function KasaListView({ onOpen, refreshKey = 0 }: Props) {
  const branchId = useAppStore((s) => s.branchId);
  const accessToken = useAuthStore((s) => s.accessToken);
  const guardNavigate = useAppStore((s) => s.guardNavigate);
  const [items, setItems] = useState<KasaListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    setLoading(true);
    kasaBankaApi
      .listKasa({ q: q || undefined, branch_id: branchId ?? undefined, page_size: 100 })
      .then((res) => {
        setItems(res.items ?? []);
        setTotal(res.total ?? 0);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Liste yüklenemedi"))
      .finally(() => setLoading(false));
  }, [q, branchId, refreshKey, accessToken]);

  const fmt = (n: number) => Number(n).toLocaleString("tr-TR", { minimumFractionDigits: 2 });

  const columns = useMemo(
    () => [
      { key: "code", header: "Kod", width: 90, render: (row: KasaListItem) => <strong>{row.code}</strong> },
      { key: "name", header: "Kasa Adı", width: 180, render: (row: KasaListItem) => row.name },
      { key: "currency", header: "Para Birimi", width: 100, render: (row: KasaListItem) => row.currency_code || "—" },
      { key: "opening", header: "Açılış Bakiyesi", width: 130, align: "right" as const, render: (row: KasaListItem) => fmt(Number(row.opening_balance)) },
      { key: "balance", header: "Güncel Bakiye", width: 130, align: "right" as const, render: (row: KasaListItem) => fmt(Number(row.balance)) },
      { key: "coa", header: "Hesap Kodu", width: 120, render: (row: KasaListItem) => row.coa_code || "—" },
      { key: "status", header: "Durum", width: 80, render: (row: KasaListItem) => (row.is_passive ? "Pasif" : "Aktif") },
      {
        key: "action",
        header: "İşlem",
        width: 100,
        align: "center" as const,
        render: (row: KasaListItem) => (
          <button
            type="button"
            className="btn-top blue"
            style={{ padding: "4px 10px", fontSize: 11 }}
            onClick={() => guardNavigate(() => onOpen(row.id))}
          >
            Düzenle
          </button>
        ),
      },
    ],
    [guardNavigate, onOpen]
  );

  return (
    <>
      <div className="kasa-list-toolbar">
        <input
          className="form-control"
          placeholder="Kasa kodu veya adı ara…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <span className="text-muted">{total} kayıt</span>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}
      <ResizableDataTable
        tableKey="kasa-list"
        columns={columns}
        data={items}
        rowKey={(row) => row.id}
        tableClassName="resizable-data-table auth-table"
        loading={loading}
        emptyMessage="Kayıt bulunamadı. Yeni kasa ekleyin."
      />
    </>
  );
}
