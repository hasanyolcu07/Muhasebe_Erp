import { useEffect, useState } from "react";
import { useAppStore } from "@/store/appStore";
import {
  sistemAyarlariApi,
  type YearEndOperation,
  type YearEndOperationRun,
} from "@/modules/ayarlar/api/sistemAyarlariApi";

export function YearEndOperationsPanel() {
  const branchId = useAppStore((s) => s.branchId);
  const recordTypeId = useAppStore((s) => s.recordTypeId);
  const [operations, setOperations] = useState<YearEndOperation[]>([]);
  const [selectedOp, setSelectedOp] = useState("kapanis-fisi");
  const [mode, setMode] = useState<"MANUAL" | "AI">("MANUAL");
  const [year, setYear] = useState(new Date().getFullYear());
  const [result, setResult] = useState<YearEndOperationRun | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void sistemAyarlariApi.listYearEndOperations().then((r) => {
      setOperations(r.items ?? []);
    });
  }, []);

  async function preview() {
    if (!branchId || !recordTypeId) {
      setError("Şube ve kayıt türü seçin");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await sistemAyarlariApi.yearEndPreview({
        branch_id: branchId,
        record_type_id: recordTypeId,
        fiscal_year: year,
        operation_key: selectedOp,
        preparation_mode: mode,
      });
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Önizleme başarısız");
    } finally {
      setLoading(false);
    }
  }

  async function approve() {
    if (!result?.id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await sistemAyarlariApi.yearEndApprove(result.id);
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Onay başarısız");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="panel">
      <h2>Yıl Sonu İşlemleri</h2>
      <p style={{ color: "#64748b", fontSize: 13, marginBottom: 12 }}>
        Her işlem için Manuel Hazırla veya Yapay Zeka ile Hazırla. AI yalnızca öneri üretir; kritik fişler
        kullanıcı onayı olmadan kesinleşmez.
      </p>

      <div className="hub-tabs" style={{ flexWrap: "wrap" }}>
        {operations.map((op) => (
          <button
            key={op.key}
            type="button"
            className={selectedOp === op.key ? "hub-tab active" : "hub-tab"}
            onClick={() => setSelectedOp(op.key)}
          >
            {op.label}
          </button>
        ))}
      </div>

      <div className="form-row" style={{ marginTop: 12, gap: 12, flexWrap: "wrap" }}>
        <label>
          Yıl
          <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} />
        </label>
        <label>
          Hazırlama
          <select value={mode} onChange={(e) => setMode(e.target.value as "MANUAL" | "AI")}>
            <option value="MANUAL">Manuel Hazırla</option>
            <option value="AI">Yapay Zeka ile Hazırla</option>
          </select>
        </label>
        <button type="button" disabled={loading} onClick={() => void preview()}>
          Önizleme
        </button>
        {result?.status === "PREVIEW" ? (
          <button type="button" disabled={loading} onClick={() => void approve()}>
            Onayla ve Kesinleştir
          </button>
        ) : null}
      </div>

      {error ? <div className="reports-error">{error}</div> : null}

      {result ? (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 13, color: "#64748b" }}>
            Durum: {result.status} · Mod: {result.preparation_mode}
          </div>
          {result.ai_suggestion?.summary ? (
            <div style={{ marginTop: 8, padding: 10, background: "#eff6ff", borderRadius: 8 }}>
              AI: {String(result.ai_suggestion.summary)}
            </div>
          ) : null}
          <pre className="code-block">{JSON.stringify(result.preview_data, null, 2)}</pre>
        </div>
      ) : null}
    </div>
  );
}
