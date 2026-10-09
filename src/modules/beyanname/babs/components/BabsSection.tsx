import { useCallback, useEffect, useMemo, useState } from "react";
import { babsApi, type BabsLine, type BabsPeriod, type BabsPreview } from "../api/babsApi";

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
  YUKLENDI: { bg: "#dbeafe", color: "#1e40af" },
  HATA: { bg: "#fee2e2", color: "#991b1b" },
};

function money(v: number | string | undefined) {
  return Number(v ?? 0).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
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

function LimitBadge({ above }: { above: boolean }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 700,
        background: above ? "#dbeafe" : "#f3f4f6",
        color: above ? "#1e40af" : "#6b7280",
      }}
    >
      {above ? "Limit üstü" : "Limit altı"}
    </span>
  );
}

export function BabsSection() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [limitAmount, setLimitAmount] = useState(5000);
  const [onlyAbove, setOnlyAbove] = useState(true);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<BabsPeriod[]>([]);
  const [preview, setPreview] = useState<BabsPreview | null>(null);
  const [lines, setLines] = useState<BabsLine[]>([]);
  const [lineFilter, setLineFilter] = useState<"ALL" | "BA" | "BS">("ALL");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await babsApi.list({ page: 1, page_size: 100 });
      setItems(res?.items || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Dönem listesi alınamadı");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPreview = useCallback(async () => {
    try {
      const res = await babsApi.preview({ year, month, limit_amount: limitAmount });
      setPreview(res);
      setLines(res?.lines || []);
    } catch {
      setPreview(null);
      setLines([]);
    }
  }, [year, month, limitAmount]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    void loadPreview();
  }, [loadPreview]);

  const visibleLines = useMemo(
    () => (lines || []).filter((ln) => lineFilter === "ALL" || ln.declaration_type === lineFilter),
    [lines, lineFilter]
  );

  const years = Array.from({ length: 6 }, (_, i) => now.getFullYear() - i);

  async function handlePrepare() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await babsApi.prepare({
        year,
        month,
        limit_amount: limitAmount,
        include_only_above_limit: onlyAbove,
        notes: notes || undefined,
      });
      setMessage(res.message || `${year}/${String(month).padStart(2, "0")} Ba-Bs paketi hazırlandı`);
      setLines(res.lines || []);
      await loadList();
      await loadPreview();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Hazırlama başarısız");
    } finally {
      setBusy(false);
    }
  }

  async function handleUpload(id: number) {
    setBusy(true);
    setError(null);
    try {
      const res = await babsApi.upload(id);
      setMessage(res.message);
      await loadList();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "GİB yükleme başarısız");
    } finally {
      setBusy(false);
    }
  }

  async function handleSelectPeriod(id: number) {
    try {
      const detail = await babsApi.get(id);
      setLines(detail.lines || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Dönem detayı alınamadı");
    }
  }

  return (
    <div className="doc-hub-section doc-hub-section-active">
      <div className="doc-hub-section-header">
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Ba-Bs Bildirimleri</h3>
        <p style={{ margin: "6px 0 0", color: "var(--text-muted)", fontSize: 13 }}>
          Aylık cari bazlı mal/hizmet alış (Ba) ve satış (Bs) toplamlarını hazırlayın, limit kontrolü
          yapın, XML indirin ve GİB entegratörüne (stub) gönderin.
        </p>
      </div>

      <div className="card" style={{ marginTop: 12, padding: 16 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, fontWeight: 600 }}>
            Yıl
            <select className="input" value={year} onChange={(e) => setYear(Number(e.target.value))} style={{ minWidth: 100 }}>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, fontWeight: 600 }}>
            Ay
            <select className="input" value={month} onChange={(e) => setMonth(Number(e.target.value))} style={{ minWidth: 130 }}>
              {MONTHS.map((m) => (
                <option key={m.v} value={m.v}>
                  {m.l}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, fontWeight: 600 }}>
            Limit (TL)
            <input
              className="input"
              type="number"
              min={0}
              step={100}
              value={limitAmount}
              onChange={(e) => setLimitAmount(Number(e.target.value) || 0)}
              style={{ minWidth: 120 }}
            />
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 600, paddingBottom: 8 }}>
            <input type="checkbox" checked={onlyAbove} onChange={(e) => setOnlyAbove(e.target.checked)} />
            XML&apos;e yalnızca limit üstü
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, fontWeight: 600, flex: 1, minWidth: 160 }}>
            Not
            <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="İsteğe bağlı not" />
          </label>
          <button type="button" className="btn-top" disabled={busy} onClick={() => void handlePrepare()}>
            {busy ? "Hazırlanıyor…" : "Dönemi Hazırla"}
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
              BA {preview.ba_line_count} cari ({preview.ba_above_count} limit üstü) · {money(preview.ba_total)} ₺ ·
              BS {preview.bs_line_count} cari ({preview.bs_above_count} limit üstü) · {money(preview.bs_total)} ₺ ·
              Limit {money(preview.limit_amount)} ₺
            </span>
            {preview.existing_period_status && (
              <span style={{ marginLeft: 10 }}>
                Mevcut: <StatusBadge status={preview.existing_period_status} />
              </span>
            )}
          </div>
        )}

        {message && <div style={{ marginTop: 10, color: "#065f46", fontSize: 13, fontWeight: 600 }}>{message}</div>}
        {error && <div style={{ marginTop: 10, color: "#991b1b", fontSize: 13, fontWeight: 600 }}>{error}</div>}
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
                <th style={{ textAlign: "right", padding: "8px 12px" }}>BA</th>
                <th style={{ textAlign: "right", padding: "8px 12px" }}>BS</th>
                <th style={{ textAlign: "right", padding: "8px 12px" }}>Limit</th>
                <th style={{ textAlign: "left", padding: "8px 12px" }}>GİB Ref</th>
                <th style={{ textAlign: "left", padding: "8px 12px" }}>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} style={{ padding: 20, color: "var(--text-muted)", textAlign: "center" }}>
                    Henüz hazırlanmış dönem yok. Yukarıdan yıl/ay seçip paketi oluşturun.
                  </td>
                </tr>
              )}
              {items.map((row) => (
                <tr key={row.id}>
                  <td style={{ padding: "8px 12px", fontWeight: 600 }}>
                    <button
                      type="button"
                      style={{ fontWeight: 700, background: "none", border: 0, cursor: "pointer", color: "inherit" }}
                      onClick={() => void handleSelectPeriod(row.id)}
                    >
                      {row.period_year}/{String(row.period_month).padStart(2, "0")}
                    </button>
                  </td>
                  <td style={{ padding: "8px 12px" }}>
                    <StatusBadge status={row.status} />
                  </td>
                  <td style={{ padding: "8px 12px", textAlign: "right" }}>
                    {row.ba_line_count} · {money(row.ba_total)}
                  </td>
                  <td style={{ padding: "8px 12px", textAlign: "right" }}>
                    {row.bs_line_count} · {money(row.bs_total)}
                  </td>
                  <td style={{ padding: "8px 12px", textAlign: "right" }}>{money(row.limit_amount)}</td>
                  <td style={{ padding: "8px 12px", fontSize: 11, color: "var(--text-muted)" }}>{row.gib_ref || "—"}</td>
                  <td style={{ padding: "8px 12px" }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      <button
                        type="button"
                        className="btn-top"
                        style={{ fontSize: 11, padding: "4px 8px" }}
                        disabled={busy || !row.ba_xml_path}
                        onClick={() => void babsApi.downloadBaXml(row.id, row.period_year, row.period_month)}
                      >
                        Ba XML
                      </button>
                      <button
                        type="button"
                        className="btn-top"
                        style={{ fontSize: 11, padding: "4px 8px" }}
                        disabled={busy || !row.bs_xml_path}
                        onClick={() => void babsApi.downloadBsXml(row.id, row.period_year, row.period_month)}
                      >
                        Bs XML
                      </button>
                      <button
                        type="button"
                        className="btn-top"
                        style={{ fontSize: 11, padding: "4px 8px" }}
                        disabled={busy || row.status === "YUKLENDI" || row.status === "HAZIRLANIYOR"}
                        onClick={() => void handleUpload(row.id)}
                      >
                        GİB Gönder
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16, padding: 0, overflow: "hidden" }}>
        <div
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid var(--border)",
            fontWeight: 700,
            display: "flex",
            gap: 8,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <span>Cari satırları ({visibleLines.length})</span>
          {(["ALL", "BA", "BS"] as const).map((f) => (
            <button
              key={f}
              type="button"
              className="btn-top"
              style={{ fontSize: 11, padding: "3px 8px", opacity: lineFilter === f ? 1 : 0.6 }}
              onClick={() => setLineFilter(f)}
            >
              {f === "ALL" ? "Tümü" : f}
            </button>
          ))}
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="resizable-data-table" style={{ width: "100%", fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "8px 12px" }}>Tip</th>
                <th style={{ textAlign: "left", padding: "8px 12px" }}>VKN/TCKN</th>
                <th style={{ textAlign: "left", padding: "8px 12px" }}>Ünvan</th>
                <th style={{ textAlign: "right", padding: "8px 12px" }}>Belge</th>
                <th style={{ textAlign: "right", padding: "8px 12px" }}>Tutar (KDV hariç)</th>
                <th style={{ textAlign: "left", padding: "8px 12px" }}>Limit</th>
              </tr>
            </thead>
            <tbody>
              {visibleLines.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: 20, color: "var(--text-muted)", textAlign: "center" }}>
                    Satır yok — dönem hazırlayın veya listeden bir dönem seçin.
                  </td>
                </tr>
              )}
              {visibleLines.map((ln) => (
                <tr key={`${ln.declaration_type}-${ln.id}-${ln.account_id}`}>
                  <td style={{ padding: "8px 12px", fontWeight: 700 }}>{ln.declaration_type}</td>
                  <td style={{ padding: "8px 12px" }}>{ln.tax_number || "—"}</td>
                  <td style={{ padding: "8px 12px" }}>{ln.account_title || "—"}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right" }}>{ln.doc_count}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right" }}>{money(ln.total_amount)}</td>
                  <td style={{ padding: "8px 12px" }}>
                    <LimitBadge above={ln.above_limit} />
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
