import { useEffect, useState } from "react";
import { useAppStore } from "@/store/appStore";
import { stokHareketApi, type StockMovementItem } from "../api/stokHareketApi";

type Props = {
  refreshKey: number;
  filterWarehouseId: number | null;
  dateFrom: string;
  dateTo: string;
  onDelete: (id: number) => void;
  onApprove: (id: number) => void;
};

export function StokHareketListView({
  refreshKey,
  filterWarehouseId,
  dateFrom,
  dateTo,
  onDelete,
  onApprove,
}: Props) {
  const branchId = useAppStore((s) => s.branchId);
  const recordTypeId = useAppStore((s) => s.recordTypeId);
  const [items, setItems] = useState<StockMovementItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    stokHareketApi
      .list({
        branch_id: branchId ?? undefined,
        record_type_id: recordTypeId ?? undefined,
        warehouse_id: filterWarehouseId,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        page: 1,
        page_size: 100,
      })
      .then((res) => {
        if (cancelled) return;
        setItems(res.items ?? []);
        setTotal(res.total ?? 0);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Liste yüklenemedi");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey, branchId, recordTypeId, filterWarehouseId, dateFrom, dateTo]);

  return (
    <div className="card" style={{ marginTop: 8 }}>
      <div className="card-header">
        <h3>Stok Hareket Listesi</h3>
        <span style={{ fontSize: 12.5, color: "#64748b" }}>{total} kayıt</span>
      </div>
      {error ? <div className="alert alert-error">{error}</div> : null}
      {loading ? (
        <div style={{ padding: 24, color: "#64748b" }}>Yükleniyor…</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Fiş No</th>
                <th>Tür</th>
                <th>Neden</th>
                <th>Depo</th>
                <th>Hedef</th>
                <th style={{ textAlign: "right" }}>Miktar</th>
                <th style={{ textAlign: "right" }}>Tutar</th>
                <th>Durum</th>
                <th>Yevmiye</th>
                <th>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ textAlign: "center", color: "#64748b", padding: 28 }}>
                    Kayıt bulunamadı. Yeni stok hareketi ekleyin.
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr key={row.id}>
                    <td>{row.movement_date}</td>
                    <td style={{ fontWeight: 700 }}>{row.fis_no || row.document_no || "—"}</td>
                    <td>
                      <span
                        className={`badge ${
                          row.movement_type === "GIRIS"
                            ? "badge-green"
                            : row.movement_type === "CIKIS" || row.movement_type === "FIRE"
                              ? "badge-red"
                              : "badge-blue"
                        }`}
                      >
                        {row.movement_type_label}
                      </span>
                    </td>
                    <td>{row.movement_reason_label}</td>
                    <td>
                      {row.warehouse_code} | {row.warehouse_name}
                    </td>
                    <td>{row.to_warehouse_label || "—"}</td>
                    <td style={{ textAlign: "right", fontWeight: 700 }}>
                      {Number(row.total_qty).toLocaleString("tr-TR")}
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 700 }}>
                      {Number(row.total_amount).toLocaleString("tr-TR", {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td>{row.status}</td>
                    <td style={{ fontWeight: 700, color: "#1e3a8a" }}>{row.yevmiye_fis_no || "—"}</td>
                    <td>
                      <div className="action-pills">
                        {row.status === "DRAFT" ? (
                          <>
                            <button type="button" className="pill-btn" onClick={() => onApprove(row.id)}>
                              ✅ Onayla
                            </button>
                            <button
                              type="button"
                              className="pill-btn delete"
                              onClick={() => {
                                if (window.confirm("Stok hareketi silinsin mi?")) onDelete(row.id);
                              }}
                            >
                              🗑️ Sil
                            </button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
