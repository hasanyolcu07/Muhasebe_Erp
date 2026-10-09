import { useEffect, useState } from "react";
import {
  SEVERITY_STYLE,
  stokUyariApi,
  type AlertItem,
} from "../api/stokUyariApi";

type Props = {
  branchId?: number | null;
  compact?: boolean;
};

export function StokUyariMiniPanel({ branchId, compact = false }: Props) {
  const [items, setItems] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function load() {
    setLoading(true);
    stokUyariApi
      .alerts({ branch_id: branchId ?? undefined, limit: compact ? 5 : 12 })
      .then((res) => setItems(res ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [branchId]);

  async function runScan() {
    setScanning(true);
    setMsg(null);
    try {
      const res = await stokUyariApi.scan({
        enqueue_email: false,
        branch_id: branchId ?? null,
      });
      setMsg(res.message);
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Tarama başarısız");
    } finally {
      setScanning(false);
    }
  }

  return (
    <div
      style={{
        background: compact ? "#fff7ed" : "#fff",
        border: "1px solid #fed7aa",
        borderRadius: 10,
        padding: compact ? 12 : 16,
        marginBottom: 16,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <div style={{ fontWeight: 800, fontSize: 13.5, color: "#9a3412" }}>
          Stok Uyarıları {loading ? "" : `(${items.length})`}
        </div>
        <button type="button" className="btn-top" style={{ fontSize: 12, padding: "4px 10px" }} onClick={runScan} disabled={scanning}>
          {scanning ? "Taranıyor…" : "Yeniden Tara"}
        </button>
      </div>
      {msg ? <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>{msg}</div> : null}
      {loading ? (
        <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 8 }}>Yükleniyor…</div>
      ) : items.length === 0 ? (
        <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 8 }}>Aktif uyarı yok.</div>
      ) : (
        <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 12.5 }}>
          {items.map((a) => {
            const cfg = SEVERITY_STYLE[a.severity];
            return (
              <li key={a.fingerprint} style={{ marginBottom: 4 }}>
                <span
                  className="badge"
                  style={{
                    background: cfg?.bg,
                    color: cfg?.color,
                    fontSize: 10,
                    marginRight: 6,
                  }}
                >
                  {a.alert_type}
                </span>
                {a.message}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
