import { useCallback, useEffect, useState } from "react";
import {
  edefterApi,
  type EdefterPeriod,
  type EdefterPreview,
} from "../api/edefterApi";

const MONTHS = [
  { v: 1, l: "Ocak" },
  { v: 2, l: "Şubat" },
  { v: 3, l: "Mart" },
  { v: 4, l: "Nisan" },
  { v: 5, l: "Mayıs" },
  { v: 6, l: "Haziran" },
  { v: 7, l: "Temmuz" },
  { v: 8, l: "Ağustos" },
  { v: 9, l: "Eylül" },
  { v: 10, l: "Ekim" },
  { v: 11, l: "Kasım" },
  { v: 12, l: "Aralık" },
];

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  HAZIRLANIYOR: { bg: "#fef3c7", color: "#92400e" },
  HAZIR: { bg: "#d1fae5", color: "#065f46" },
  ARSIVLENDI: { bg: "#e0e7ff", color: "#3730a3" },
  YUKLENDI: { bg: "#dbeafe", color: "#1e40af" },
  HATA: { bg: "#fee2e2", color: "#991b1b" },
};

function money(v: number | string | undefined) {
  const n = Number(v ?? 0);
  return n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLE[status] || { bg: "#f3f4f6", color: "#374151" };
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 700,
        background: s.bg,
        color: s.color,
      }}
    >
      {status}
    </span>
  );
}

export function EdefterSection() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<EdefterPeriod[]>([]);
  const [preview, setPreview] = useState<EdefterPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await edefterApi.list({ page: 1, page_size: 100 });
      setItems(res.items);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Dönem listesi alınamadı");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPreview = useCallback(async () => {
    try {
      const res = await edefterApi.preview({ year, month });
      setPreview(res);
    } catch {
      setPreview(null);
    }
  }, [year, month]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    void loadPreview();
  }, [loadPreview]);

  async function handlePrepare() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await edefterApi.prepare({
        year,
        month,
        notes: notes || undefined,
      });
      setMessage(res.message || `${year}/${String(month).padStart(2, "0")} paketi hazırlandı`);
      await loadList();
      await loadPreview();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Hazırlama başarısız");
    } finally {
      setBusy(false);
    }
  }

  async function handleArchive(id: number) {
    setBusy(true);
    setError(null);
    try {
      const res = await edefterApi.archive(id);
      setMessage(res.message);
      await loadList();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Arşivleme başarısız");
    } finally {
      setBusy(false);
    }
  }

  async function handleUpload(id: number) {
    setBusy(true);
    setError(null);
    try {
      const res = await edefterApi.upload(id);
      setMessage(res.message);
      await loadList();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "GİB yükleme başarısız");
    } finally {
      setBusy(false);
    }
  }

  const years = Array.from({ length: 6 }, (_, i) => now.getFullYear() - i);

  return (
    <div className="doc-hub-section doc-hub-section-active">
      <div className="doc-hub-section-header">
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>e-Defter (Berat + Defter)</h3>
        <p style={{ margin: "6px 0 0", color: "var(--text-muted)", fontSize: 13 }}>
          Yevmiye fişlerinden dönem paketi hazırlayın, Berat/Defter XML indirin, arşivleyin ve GİB
          entegratörüne (stub) yükleyin.
        </p>
      </div>

      <div className="card" style={{ marginTop: 12, padding: 16 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, fontWeight: 600 }}>
            Yıl
            <select
              className="input"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              style={{ minWidth: 100 }}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, fontWeight: 600 }}>
            Ay
            <select
              className="input"
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              style={{ minWidth: 130 }}
            >
              {MONTHS.map((m) => (
                <option key={m.v} value={m.v}>
                  {m.l}
                </option>
              ))}
            </select>
          </label>
          <label
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
              fontSize: 12,
              fontWeight: 600,
              flex: 1,
              minWidth: 180,
            }}
          >
            Not
            <input
              className="input"
              value={notes ?? ""}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="İsteğe bağlı not"
            />
          </label>
          <button type="button" className="btn-top" disabled={busy} onClick={() => void handlePrepare()}>
            {busy ? "Hazırlanıyor…" : "Dönem Paketi Hazırla"}
          </button>
        </div>

        {preview && (
          <div
            style={{
              marginTop: 14,
              padding: "10px 12px",
              background: "var(--placeholder-bg, #f8fafc)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 13,
            }}
          >
            <strong>
              Önizleme · {preview.year}/{String(preview.month).padStart(2, "0")}
            </strong>
            <span style={{ marginLeft: 12, color: "var(--text-muted)" }}>
              {preview.journal_count} fiş · {preview.line_count} satır · Borç {money(preview.total_debit)} ·
              Alacak {money(preview.total_credit)}
            </span>
            {preview.existing_period_status && (
              <span style={{ marginLeft: 10 }}>
                Mevcut: <StatusBadge status={preview.existing_period_status} />
              </span>
            )}
          </div>
        )}

        {message && (
          <div style={{ marginTop: 10, color: "#065f46", fontSize: 13, fontWeight: 600 }}>{message}</div>
        )}
        {error && (
          <div style={{ marginTop: 10, color: "#991b1b", fontSize: 13, fontWeight: 600 }}>{error}</div>
        )}
      </div>

      <div className="card" style={{ marginTop: 16, padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", fontWeight: 700 }}>
          Dönemler {loading ? "…" : `(${items.length})`}
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="resizable-data-table" style={{ width: "100%", fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "8px 12px" }}>Dönem</th>
                <th style={{ textAlign: "left", padding: "8px 12px" }}>Durum</th>
                <th style={{ textAlign: "right", padding: "8px 12px" }}>Fiş</th>
                <th style={{ textAlign: "right", padding: "8px 12px" }}>Satır</th>
                <th style={{ textAlign: "right", padding: "8px 12px" }}>Borç</th>
                <th style={{ textAlign: "right", padding: "8px 12px" }}>Alacak</th>
                <th style={{ textAlign: "left", padding: "8px 12px" }}>GİB Ref</th>
                <th style={{ textAlign: "left", padding: "8px 12px" }}>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} style={{ padding: 20, color: "var(--text-muted)", textAlign: "center" }}>
                    Henüz hazırlanmış dönem yok. Yukarıdan yıl/ay seçip paket oluşturun.
                  </td>
                </tr>
              )}
              {items.map((row) => (
                <tr key={row.id}>
                  <td style={{ padding: "8px 12px", fontWeight: 600 }}>
                    {row.period_year}/{String(row.period_month).padStart(2, "0")}
                  </td>
                  <td style={{ padding: "8px 12px" }}>
                    <StatusBadge status={row.status} />
                  </td>
                  <td style={{ padding: "8px 12px", textAlign: "right" }}>{row.journal_count}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right" }}>{row.line_count}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right" }}>{money(row.total_debit)}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right" }}>{money(row.total_credit)}</td>
                  <td style={{ padding: "8px 12px", fontSize: 11, color: "var(--text-muted)" }}>
                    {row.gib_ref || "—"}
                  </td>
                  <td style={{ padding: "8px 12px" }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      <button
                        type="button"
                        className="btn-top"
                        style={{ fontSize: 11, padding: "4px 8px" }}
                        disabled={busy || !row.berat_path}
                        onClick={() =>
                          void edefterApi.downloadBerat(row.id, row.period_year, row.period_month)
                        }
                      >
                        Berat
                      </button>
                      <button
                        type="button"
                        className="btn-top"
                        style={{ fontSize: 11, padding: "4px 8px" }}
                        disabled={busy || !row.defter_path}
                        onClick={() =>
                          void edefterApi.downloadDefter(row.id, row.period_year, row.period_month)
                        }
                      >
                        Defter
                      </button>
                      <button
                        type="button"
                        className="btn-top"
                        style={{ fontSize: 11, padding: "4px 8px" }}
                        disabled={busy || (!row.berat_path && !row.defter_path)}
                        onClick={() =>
                          void edefterApi.downloadZip(row.id, row.period_year, row.period_month)
                        }
                      >
                        ZIP
                      </button>
                      <button
                        type="button"
                        className="btn-top"
                        style={{ fontSize: 11, padding: "4px 8px" }}
                        disabled={busy || row.status === "HAZIRLANIYOR" || row.status === "HATA"}
                        onClick={() => void handleArchive(row.id)}
                      >
                        Arşivle
                      </button>
                      <button
                        type="button"
                        className="btn-top"
                        style={{ fontSize: 11, padding: "4px 8px" }}
                        disabled={
                          busy ||
                          row.status === "HAZIRLANIYOR" ||
                          row.status === "HATA" ||
                          row.status === "YUKLENDI"
                        }
                        onClick={() => void handleUpload(row.id)}
                      >
                        GİB Yükle
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
