import { useCallback, useEffect, useState } from "react";
import { useAppStore } from "@/store/appStore";
import { uretimApi, type CapacityReport } from "../api/uretimApi";

function mondayOfWeek(d: Date): string {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(d);
  mon.setDate(diff);
  return mon.toISOString().slice(0, 10);
}

export function CapacityPanel() {
  const branchId = useAppStore((s) => s.branchId);
  const [weekStart, setWeekStart] = useState(() => mondayOfWeek(new Date()));
  const [report, setReport] = useState<CapacityReport | null>(null);

  const load = useCallback(async () => {
    if (!branchId) return;
    try {
      const res = await uretimApi.capacity(branchId, weekStart);
      setReport(res);
    } catch {
      setReport(null);
    }
  }, [branchId, weekStart]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="card" style={{ padding: 16 }}>
      <h3 style={{ marginBottom: 12 }}>Kapasite Raporu</h3>
      <div style={{ marginBottom: 12 }}>
        <label>
          Hafta başı:{" "}
          <input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} />
        </label>
        <button type="button" className="btn-secondary" style={{ marginLeft: 8 }} onClick={() => void load()}>
          Yenile
        </button>
      </div>
      {report && (
        <p style={{ marginBottom: 12, fontSize: 13 }}>
          Genel kullanım: <strong>{report.overall_usage_pct.toFixed(1)}%</strong>
        </p>
      )}
      <table className="data-table">
        <thead>
          <tr>
            <th>Makina</th>
            <th>Kapasite (sa)</th>
            <th>Planlanan</th>
            <th>Kullanım %</th>
            <th>Darboğaz</th>
          </tr>
        </thead>
        <tbody>
          {!report?.machines?.length && (
            <tr>
              <td colSpan={5} style={{ textAlign: "center", padding: 20, color: "var(--text-muted)" }}>
                Veri yok — önce makina ve plan slotları tanımlayın.
              </td>
            </tr>
          )}
          {report?.machines?.map((m) => (
            <tr key={m.machine_id}>
              <td>{m.machine_code} — {m.machine_name}</td>
              <td>{m.capacity_hours}</td>
              <td>{m.planned_hours}</td>
              <td>{m.usage_pct}%</td>
              <td>{m.is_bottleneck ? "⚠" : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
