import { useEffect, useState } from "react";
import { useAppStore } from "@/store/appStore";
import {
  sistemAyarlariApi,
  type YearEndOperation,
  type YearEndOperationRun,
} from "@/modules/ayarlar/api/sistemAyarlariApi";

const STATUS_LABEL: Record<string, string> = {
  KONTROL_EDILDI: "Kontrol edildi",
  TASLAK: "Taslak",
  ONAY_BEKLIYOR: "Onay bekliyor",
  PREVIEW: "Onay bekliyor",
  KAPANDI: "Kapandı",
  HATA: "Hata",
};

type PreviewLine = { code?: string; name?: string; debit?: number; credit?: number; reason?: string };
type ChecklistRow = { level?: string; text?: string };

export function YearEndOperationsPanel() {
  const branchId = useAppStore((s) => s.branchId);
  const recordTypeId = useAppStore((s) => s.recordTypeId);
  const [operations, setOperations] = useState<YearEndOperation[]>([]);
  const [selectedOp, setSelectedOp] = useState("kapanis-fisi");
  const [mode, setMode] = useState<"MANUAL" | "AI">("MANUAL");
  const [year, setYear] = useState(new Date().getFullYear());
  const [reason, setReason] = useState("");
  const [result, setResult] = useState<YearEndOperationRun | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void sistemAyarlariApi.listYearEndOperations().then((r) => {
      setOperations(r.items ?? []);
    }).catch((e: unknown) => {
      setError(e instanceof Error ? e.message : "İşlem listesi alınamadı");
    });
  }, []);

  async function preview() {
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
      const res = await sistemAyarlariApi.yearEndApprove(result.id, { reason });
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
        {selectedOp === "yeniden-ac" ? (
          <label style={{ flex: 1, minWidth: 240 }}>
            Yeniden açma gerekçesi
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="En az 10 karakter" />
          </label>
        ) : null}
        <button type="button" disabled={loading} onClick={() => void preview()}>
          Önizleme
        </button>
        {result?.status === "PREVIEW" || result?.status === "ONAY_BEKLIYOR" ? (
          <button type="button" disabled={loading} onClick={() => void approve()}>
            Onayla ve Kesinleştir
          </button>
        ) : null}
      </div>

      {error ? <div className="reports-error">{error}</div> : null}

      {result ? (
        <YearEndPreview result={result} />
      ) : null}
    </div>
  );
}

function YearEndPreview({ result }: { result: YearEndOperationRun }) {
  const preview = result.preview_data ?? {};
  const checklist = Array.isArray(preview.checklist) ? (preview.checklist as ChecklistRow[]) : [];
  const lines = Array.isArray(preview.lines) ? (preview.lines as PreviewLine[]) : [];
  const note = typeof preview.message === "string" ? preview.message : "";
  const rationale = typeof preview.hesaplama_gerekcesi === "string" ? preview.hesaplama_gerekcesi : "";
  const impact = typeof preview.impact === "string" ? preview.impact : "";
  const previewError = typeof preview.error === "string" ? preview.error : "";
  const version = typeof preview.parameter_version === "string" ? preview.parameter_version : "";

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 13, color: "#64748b" }}>
        Durum: {STATUS_LABEL[result.status] ?? result.status} · Mod: {result.preparation_mode === "AI" ? "Yapay zeka önerisi" : "Manuel"}
        {version ? ` · Parametre ${version}` : ""}
      </div>
      {note ? <p style={{ marginTop: 8 }}>{note}</p> : null}
      {impact ? <p style={{ marginTop: 8 }}>{impact}</p> : null}
      {rationale ? <p style={{ marginTop: 8 }}>{rationale}</p> : null}
      {previewError ? <div className="reports-error">{previewError}</div> : null}
      {result.ai_suggestion?.summary ? (
        <div style={{ marginTop: 8, padding: 10, background: "#eff6ff", borderRadius: 8 }}>
          Öneri: {String(result.ai_suggestion.summary)}
        </div>
      ) : null}
      {checklist.length ? (
        <ul style={{ marginTop: 12, paddingLeft: 18 }}>
          {checklist.map((item) => (
            <li key={`${item.level}-${item.text}`} style={{ color: item.level === "hata" ? "#b91c1c" : item.level === "uyari" ? "#a16207" : "#166534" }}>
              {item.text}
            </li>
          ))}
        </ul>
      ) : null}
      {lines.length ? (
        <table className="data-table" style={{ marginTop: 12 }}>
          <thead>
            <tr>
              <th>Hesap</th>
              <th>Ad</th>
              <th>Borç</th>
              <th>Alacak</th>
              <th>Gerekçe</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => (
              <tr key={`${line.code}-${index}`}>
                <td>{line.code}</td>
                <td>{line.name}</td>
                <td>{Number(line.debit || 0).toFixed(2)}</td>
                <td>{Number(line.credit || 0).toFixed(2)}</td>
                <td>{line.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}
