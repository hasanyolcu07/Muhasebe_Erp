import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { cekSenetApi, type UpcomingCheckItem } from "@/modules/finans-islemleri/cek-senet/api/cekSenetApi";
import { STATUS_BADGE } from "@/modules/finans-islemleri/cek-senet/schemas/cekSenetSchema";

type Props = {
  branchId?: number | null;
};

export function UpcomingChecksWidget({ branchId }: Props) {
  const [items, setItems] = useState<UpcomingCheckItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    cekSenetApi
      .upcoming({ branch_id: branchId ?? undefined, days_ahead: 30, limit: 8 })
      .then((res) => setItems(res.items ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [branchId]);

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
            Vadesi Yaklaşan Çek/Senetler
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4, color: "#1e3a8a" }}>📅 30 Gün İçinde</div>
        </div>
        <Link to="/app/finans-islemleri/cek-senet" className="btn-top blue" style={{ padding: "6px 12px", fontSize: 12 }}>
          Tümünü Gör →
        </Link>
      </div>

      {loading ? (
        <div style={{ color: "#94a3b8", fontSize: 13 }}>Yükleniyor…</div>
      ) : items.length === 0 ? (
        <div style={{ color: "#94a3b8", fontSize: 13, padding: "12px 0" }}>
          Önümüzdeki 30 günde vadesi dolacak çek/senet yok.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map((item) => {
            const cfg = STATUS_BADGE[item.status] ?? { label: item.status, color: "#64748b", bg: "#f1f5f9" };
            const urgent = item.days_to_due <= 7;
            return (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 10px",
                  borderRadius: 8,
                  background: urgent ? "#fff7ed" : "#f8fafc",
                  border: urgent ? "1px solid #fed7aa" : "1px solid #e2e8f0",
                  fontSize: 12.5,
                }}
              >
                <div>
                  <span style={{ fontWeight: 800, color: "#1e3a8a" }}>{item.document_no}</span>
                  <span style={{ marginLeft: 8, color: "#64748b" }}>
                    {item.instrument_type === "CEK" ? "Çek" : "Senet"} · {item.account_label || "—"}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontWeight: 700 }}>{Number(item.amount).toLocaleString("tr-TR")} ₺</span>
                  <span style={{ color: urgent ? "#c2410c" : "#334155", fontWeight: 700 }}>
                    {new Date(item.due_date).toLocaleDateString("tr-TR")} ({item.days_to_due}g)
                  </span>
                  <span
                    className="badge"
                    style={{ background: cfg.bg, color: cfg.color, fontSize: 10.5, padding: "2px 6px" }}
                  >
                    {cfg.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
