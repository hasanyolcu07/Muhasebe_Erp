import { useState } from "react";
import { useAppStore } from "@/store/appStore";
import { uretimApi, type MrpRun } from "../api/uretimApi";

export function MrpPanel() {
  const branchId = useAppStore((s) => s.branchId) ?? 1;
  const recordTypeId = useAppStore((s) => s.recordTypeId) ?? 1;
  const [orderId, setOrderId] = useState("1");
  const [run, setRun] = useState<MrpRun | null>(null);
  const [loading, setLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  function showToast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  }

  async function handleRun() {
    const oid = parseInt(orderId, 10);
    if (!oid) {
      showToast("Lütfen geçerli bir Sipariş ID girin.");
      return;
    }
    setLoading(true);
    try {
      const res = await uretimApi.runMrp({
        branch_id: branchId,
        record_type_id: recordTypeId,
        source_type: "SALES_ORDER",
        source_id: oid,
      });
      setRun(res);
      showToast("✔ MRP analizi tamamlandı — stok ihtiyaçları belirlendi.");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "MRP başarısız");
    } finally {
      setLoading(false);
    }
  }

  async function handleApply() {
    if (!run) return;
    try {
      const res = await uretimApi.applyMrp(run.id, { create_production_orders: true });
      setRun(res);
      showToast("✔ MRP uygulandı — üretim emirleri ve satın alma talepleri oluşturuldu.");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Uygulama başarısız");
    }
  }

  return (
    <div className="card" style={{ padding: 16 }}>
      {toastMsg && (
        <div
          style={{
            margin: "0 0 12px",
            padding: "8px 12px",
            borderRadius: 6,
            background: "#d1fae5",
            color: "#065f46",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {toastMsg}
        </div>
      )}
      <h3 style={{ marginBottom: 12 }}>MRP Çalıştır</h3>
      <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
        Sipariş → BOM patlatma → stok ihtiyaç → üretim / satın alma önerisi
      </p>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <input
          placeholder="Sipariş ID"
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
          style={{ padding: 8, border: "1px solid var(--border)", borderRadius: 6, width: 120 }}
        />
        <button type="button" className="btn-primary" disabled={loading} onClick={() => void handleRun()}>
          MRP Hesapla
        </button>
        {run && run.status === "COMPUTED" && (
          <button type="button" className="btn-save" onClick={() => void handleApply()}>
            Üretim Emirlerini Oluştur
          </button>
        )}
      </div>
      {run && (
        <>
          <p style={{ fontSize: 13 }}>
            <strong>{run.run_no}</strong> — {run.status}
          </p>
          <table className="data-table" style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <th>Stok</th>
                <th>Net İhtiyaç</th>
                <th>Öneri</th>
                <th>Miktar</th>
                <th>Üretim Emri</th>
              </tr>
            </thead>
            <tbody>
              {run.lines.map((l) => (
                <tr key={l.id}>
                  <td>{l.stock_code} {l.stock_name}</td>
                  <td>{l.net_requirement}</td>
                  <td>{l.suggestion_type}</td>
                  <td>{l.suggested_qty}</td>
                  <td>{l.production_order_id ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
