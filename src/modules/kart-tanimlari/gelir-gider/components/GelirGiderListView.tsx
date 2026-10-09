import { useEffect, useMemo, useState } from "react";
import { gelirGiderApi, type CardListItem } from "../api/gelirGiderApi";
import type { GelirGiderType } from "../schemas/gelirGiderSchema";
import { ResizableDataTable } from "@/components/ResizableDataTable";
import { useAppStore, useAuthStore } from "@/store/appStore";

type Props = {
  cardType: GelirGiderType;
  onOpen: (id: number | null) => void;
  refreshKey?: number;
};

export function GelirGiderListView({ cardType, onOpen, refreshKey = 0 }: Props) {
  const branchId = useAppStore((s) => s.branchId);
  const accessToken = useAuthStore((s) => s.accessToken);
  const guardNavigate = useAppStore((s) => s.guardNavigate);
  const [items, setItems] = useState<CardListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    setLoading(true);
    gelirGiderApi
      .list({ card_type: cardType, q: q || undefined, branch_id: branchId ?? undefined, page_size: 100 })
      .then((res) => {
        setItems(res.items ?? []);
        setTotal(res.total ?? 0);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Liste yüklenemedi"))
      .finally(() => setLoading(false));
  }, [q, branchId, cardType, refreshKey, accessToken]);

  const typeLabel = cardType === "GIDER" ? "Gider" : "Gelir";

  const columns = useMemo(
    () => [
      { key: "code", header: "Kod", width: 110, render: (row: CardListItem) => <strong>{row.code}</strong> },
      { key: "name", header: "Ad", width: 180, render: (row: CardListItem) => row.name },
      { key: "coa", header: "Muhasebe Hesabı", width: 140, render: (row: CardListItem) => row.coa_code || "—" },
      { key: "vat", header: "KDV", width: 70, render: (row: CardListItem) => `%${Number(row.default_vat_rate)}` },
      { key: "group", header: "Grup", width: 120, render: (row: CardListItem) => row.card_group || "—" },
      { key: "ratio", header: "Şube Oranı", width: 100, render: (row: CardListItem) => (row.branch_ratio != null ? `%${row.branch_ratio}` : "—") },
      { key: "links", header: "Bağlantı", width: 90, render: (row: CardListItem) => `${row.link_count} bağlantı` },
      { key: "status", header: "Durum", width: 80, render: (row: CardListItem) => (row.is_passive ? "Pasif" : "Aktif") },
      {
        key: "action",
        header: "İşlem",
        width: 140,
        align: "center" as const,
        render: (row: CardListItem) => (
          <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
            <button type="button" className="btn-top blue" onClick={() => guardNavigate(() => onOpen(row.id))}>
              Düzenle
            </button>
            <button
              type="button"
              className="btn-top"
              style={{ color: "#ef4444", borderColor: "#fca5a5" }}
              onClick={() => {
                if (!window.confirm(`"${row.name}" kartını silmek istediğinize emin misiniz?`)) return;
                gelirGiderApi
                  .remove(row.id)
                  .then(() => {
                    setItems((prev) => prev.filter((item) => item.id !== row.id));
                    setTotal((t) => Math.max(0, t - 1));
                  })
                  .catch(() => alert("Silme işlemi başarısız"));
              }}
            >
              Sil
            </button>
          </div>
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
          placeholder={`${typeLabel} kodu veya adı ara…`}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <span className="text-muted">{total} kayıt</span>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}
      <ResizableDataTable
        tableKey={`gelir-gider-list-${cardType}`}
        columns={columns}
        data={items}
        rowKey={(row) => row.id}
        tableClassName="resizable-data-table auth-table"
        loading={loading}
        emptyMessage={`Kayıt bulunamadı. Yeni ${typeLabel.toLowerCase()} kartı ekleyin.`}
      />
    </>
  );
}
