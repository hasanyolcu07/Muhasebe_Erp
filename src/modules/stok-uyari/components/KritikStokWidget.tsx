import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  SEVERITY_STYLE,
  stokUyariApi,
  type AlertItem,
  type AlertSummary,
} from "../api/stokUyariApi";

type Props = {
  branchId?: number | null;
};

export function KritikStokWidget({ branchId }: Props) {
  const [summary, setSummary] = useState<AlertSummary | null>(null);
  const [items, setItems] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = { branch_id: branchId ?? undefined, limit: 8 };
    Promise.all([
      stokUyariApi.summary({ branch_id: branchId ?? undefined }),
      stokUyariApi.alerts(params),
    ])
      .then(([sum, alerts]) => {
        setSummary(sum);
        setItems(alerts ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Uyarılar yüklenemedi"))
      .finally(() => setLoading(false));
  }, [branchId]);

  const kpi = [
    { label: "Min kritik", value: summary?.min_critical ?? 0, color: "#b91c1c" },
    { label: "Min düşük", value: summary?.min_low ?? 0, color: "#c2410c" },
    { label: "Max aşımı", value: summary?.max_overstock ?? 0, color: "#3730a3" },
    {
      label: "SKT",
      value:
        (summary?.skt_expired ?? 0) +
        (summary?.skt_critical ?? 0) +
        (summary?.skt_high ?? 0) +
        (summary?.skt_warn ?? 0),
      color: "#a16207",
    },
  ];

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: 10,
        padding: 18,
        marginTop: 20,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>
            Kritik Stok &amp; SKT Uyarıları
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4, color: "#9f1239" }}>
            ⚠️ Toplam {summary?.total ?? 0} uyarı
          </div>
        </div>
        <Link
          to="/app/kart-tanimlari/stok-fiyat-listeleri"
          className="btn-top blue"
          style={{ padding: "6px 12px", fontSize: 12 }}
        >
          Stok Listesi →
        </Link>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10, marginBottom: 14 }}>
        {kpi.map((k) => (
          <div
            key={k.label}
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              padding: "10px 12px",
            }}
          >
            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>{k.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: k.color, marginTop: 4 }}>{k.value}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ color: "#94a3b8", fontSize: 13 }}>Yükleniyor…</div>
      ) : error ? (
        <div className="alert alert-error" style={{ margin: 0 }}>
          {error}
        </div>
      ) : items.length === 0 ? (
        <div style={{ color: "#94a3b8", fontSize: 13, padding: "8px 0" }}>
          Aktif kritik stok / SKT uyarısı yok.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map((item) => {
            const cfg = SEVERITY_STYLE[item.severity] ?? {
              label: item.severity,
              color: "#64748b",
              bg: "#f1f5f9",
            };
            return (
              <div
                key={item.fingerprint}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 10px",
                  borderRadius: 8,
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  fontSize: 12.5,
                  gap: 10,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <span style={{ fontWeight: 800, color: "#1e3a8a" }}>
                    {item.stock_code || `#${item.stock_id}`}
                  </span>
                  <span style={{ marginLeft: 8, color: "#64748b" }}>{item.message}</span>
                </div>
                <span
                  className="badge"
                  style={{ background: cfg.bg, color: cfg.color, fontSize: 10.5, padding: "2px 6px", flexShrink: 0 }}
                >
                  {item.alert_type} · {cfg.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
