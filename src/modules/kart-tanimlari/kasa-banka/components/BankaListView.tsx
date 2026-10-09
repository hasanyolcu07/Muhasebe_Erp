import { useEffect, useMemo, useState } from "react";
import { kasaBankaApi, type BankaListItem } from "../api/kasaBankaApi";
import { ResizableDataTable } from "@/components/ResizableDataTable";
import { useAppStore, useAuthStore } from "@/store/appStore";

type Props = {
  onOpen: (id: number | null) => void;
  refreshKey?: number;
};

export function BankaListView({ onOpen, refreshKey = 0 }: Props) {
  const branchId = useAppStore((s) => s.branchId);
  const accessToken = useAuthStore((s) => s.accessToken);
  const guardNavigate = useAppStore((s) => s.guardNavigate);
  const [items, setItems] = useState<BankaListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    setLoading(true);
    kasaBankaApi
      .listBanka({ q: q || undefined, branch_id: branchId ?? undefined, page_size: 100 })
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
      { key: "code", header: "Kod", width: 90, render: (row: BankaListItem) => <strong>{row.code}</strong> },
      { key: "bank", header: "Banka", width: 140, render: (row: BankaListItem) => row.bank_name || "—" },
      { key: "name", header: "Hesap Adı", width: 160, render: (row: BankaListItem) => row.name },
      { key: "iban", header: "IBAN", width: 200, render: (row: BankaListItem) => row.iban || "—" },
      { key: "currency", header: "Para Birimi", width: 100, render: (row: BankaListItem) => row.currency_code || "—" },
      { key: "opening", header: "Açılış Bakiyesi", width: 130, align: "right" as const, render: (row: BankaListItem) => fmt(Number(row.opening_balance)) },
      { key: "status", header: "Durum", width: 80, render: (row: BankaListItem) => (row.is_passive ? "Pasif" : "Aktif") },
      {
        key: "action",
        header: "İşlem",
        width: 100,
        align: "center" as const,
        render: (row: BankaListItem) => (
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
          placeholder="Banka, IBAN veya kod ara…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <span className="text-muted">{total} kayıt</span>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}
      <ResizableDataTable
        tableKey="banka-list"
        columns={columns}
        data={items}
        rowKey={(row) => row.id}
        tableClassName="resizable-data-table auth-table"
        loading={loading}
        emptyMessage="Kayıt bulunamadı. Yeni banka hesabı ekleyin."
      />
    </>
  );
}
