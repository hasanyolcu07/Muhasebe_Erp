import { useCallback, useEffect, useMemo, useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { useAppStore } from "@/store/appStore";
import { yevmiyeApi, type MissingYevmiyeItem } from "../api/yevmiyeApi";

function money(v: number) {
  return Number(v ?? 0).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function MissingYevmiyePanel() {
  const branchId = useAppStore((s) => s.branchId);
  const [items, setItems] = useState<MissingYevmiyeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [creatingId, setCreatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await yevmiyeApi.listMissing({
        branch_id: branchId ?? undefined,
        limit: 200,
      });
      setItems(res.items ?? []);
    } catch (e) {
      setItems([]);
      setError(e instanceof Error ? e.message : "Liste alınamadı");
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createOne(row: MissingYevmiyeItem) {
    const key = `${row.source_type}-${row.source_id}`;
    setCreatingId(key);
    try {
      await yevmiyeApi.createFromSource(row.source_type, row.source_id);
      await load();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Oluşturulamadı");
    } finally {
      setCreatingId(null);
    }
  }

  const columns: DataTableColumn<MissingYevmiyeItem>[] = useMemo(
    () => [
      { key: "doc_date", header: "Tarih", width: 110, render: (r) => String(r.doc_date).slice(0, 10) },
      { key: "source_type", header: "Tür", width: 100, render: (r) => r.source_type },
      { key: "doc_no", header: "Belge No", width: 140, render: (r) => r.doc_no || "—" },
      {
        key: "amount",
        header: "Tutar",
        width: 120,
        align: "right",
        render: (r) => money(r.amount),
      },
      {
        key: "status",
        header: "Durum",
        width: 140,
        render: () => (
          <span style={{ color: "#b45309", fontWeight: 700, fontSize: 12 }}>Yevmiye oluşmadı</span>
        ),
      },
      {
        key: "actions",
        header: "İşlem",
        width: 140,
        render: (r) => {
          const key = `${r.source_type}-${r.source_id}`;
          return (
            <button
              type="button"
              className="btn-top green"
              style={{ fontSize: 12, padding: "4px 10px" }}
              disabled={creatingId === key}
              onClick={() => void createOne(r)}
            >
              {creatingId === key ? "Oluşturuluyor…" : "Yevmiye Oluştur"}
            </button>
          );
        },
      },
    ],
    [creatingId]
  );

  return (
    <div className="ayar-form-card">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Yevmiye Oluşmayan Kayıtlar</h3>
        <button type="button" className="btn-top" onClick={() => void load()}>
          Yenile
        </button>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      <DataTable
        tableKey="yevmiye-olusmayan"
        columns={columns}
        data={items}
        rowKey={(r) => `${r.source_type}-${r.source_id}`}
        zebra
        loading={loading}
        emptyMessage="Tüm kayıtlar muhasebeleşmiş."
      />
    </div>
  );
}
