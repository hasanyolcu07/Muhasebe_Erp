import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { http } from "@/services/api";
import { useAppStore } from "@/store/appStore";

type Preview = {
  headers: string[];
  suggested_mapping: Record<string, string>;
  sample_rows: Record<string, unknown>[];
  confidence: number;
  detected_profile?: string;
  target_fields?: string[];
};

type Job = {
  id: number;
  target_entity: string;
  file_name: string;
  status: string;
  success_rows: number;
  total_rows: number;
  error_rows: number;
  progress_pct: number;
};

const TARGETS = [
  { value: "MIZAN", label: "Mizan" },
  { value: "CARI", label: "Cari Kart" },
  { value: "STOK", label: "Stok Kart" },
  { value: "FATURA", label: "Fatura Listesi" },
  { value: "FATURA_LINE", label: "Fatura Satırları (önizleme)" },
];

const FIELD_LABELS: Record<string, string> = {
  code: "Kod",
  title: "Ünvan",
  tax_no: "Vergi No",
  phone: "Telefon",
  email: "E-posta",
  name: "Ad",
  sale_price: "Satış Fiyatı",
  purchase_price: "Alış Fiyatı",
  account_code: "Hesap/Cari Kod",
  account_name: "Hesap Adı",
  debit: "Borç",
  credit: "Alacak",
  invoice_no: "Fatura No",
  invoice_date: "Tarih",
  account_title: "Cari Ünvan",
  grand_total: "Genel Toplam",
  tax_total: "KDV",
  stock_code: "Stok Kod",
  description: "Açıklama",
  qty: "Miktar",
  unit_price: "Birim Fiyat",
  discount_rate: "İskonto",
  tax_rate: "KDV %",
};

export function ExcelImportPage() {
  const navigate = useNavigate();
  const branchId = useAppStore((s) => s.branchId);
  const recordTypeId = useAppStore((s) => s.recordTypeId);
  const [step, setStep] = useState(1);
  const [target, setTarget] = useState("MIZAN");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadJobs = useCallback(async () => {
    try {
      const res = await http.get<Job[]>("/excel-import/isler?limit=8");
      setJobs(res.data || []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void loadJobs();
  }, [loadJobs]);

  const fields = useMemo(() => {
    if (preview?.target_fields?.length) return preview.target_fields;
    return Object.keys(preview?.suggested_mapping || {});
  }, [preview]);

  function acceptFile(f: File | null) {
    if (!f) return;
    const ok = /\.(xlsx|xls|csv)$/i.test(f.name);
    if (!ok) {
      setMessage("Sadece .xlsx, .xls veya .csv desteklenir");
      return;
    }
    setFile(f);
    setPreview(null);
    setMapping({});
    setMessage(null);
    setStep(1);
  }

  async function onPreview() {
    if (!file) return;
    setBusy(true);
    setMessage(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("target_entity", target);
      const res = await http.post<Preview>("/excel-import/onizleme", fd);
      setPreview(res.data);
      setMapping({ ...(res.data.suggested_mapping || {}) });
      setStep(2);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Önizleme başarısız");
    } finally {
      setBusy(false);
    }
  }

  async function onImport() {
    if (!file) return;
    setBusy(true);
    setMessage(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("target_entity", target);
      if (branchId) fd.append("branch_id", String(branchId));
      if (recordTypeId) fd.append("record_type_id", String(recordTypeId));
      fd.append("column_mapping", JSON.stringify(mapping));
      const res = await http.post<Job>("/excel-import/yukle", fd);
      setMessage(
        `Aktarım tamam: İş #${res.data.id} · ${res.data.status} · ${res.data.success_rows}/${res.data.total_rows} başarılı`,
      );
      setStep(3);
      await loadJobs();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "İçe aktarma başarısız");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="excel-wiz">
      <div className="header-bar">
        <div className="header-breadcrumb">Raporlar › Excel Akıllı Rapor & Mizan Sihirbazı</div>
      </div>

      <div className="excel-steps">
        <span className={step >= 1 ? "active" : ""}>1. Dosya</span>
        <span className={step >= 2 ? "active" : ""}>2. AI Eşleme</span>
        <span className={step >= 3 ? "active" : ""}>3. Aktarım</span>
      </div>

      <div className="excel-grid">
        <div className="excel-card">
          <h3>Hedef & Dosya</h3>
          <label className="excel-label">Aktarım tipi</label>
          <select className="form-control" value={target} onChange={(e) => setTarget(e.target.value)}>
            {TARGETS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>

          <div
            className={`excel-drop${dragOver ? " over" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              acceptFile(e.dataTransfer.files?.[0] || null);
            }}
            onClick={() => inputRef.current?.click()}
          >
            <strong>Excel / CSV sürükleyin veya tıklayın</strong>
            <span>.xlsx · .xls · .csv — Logo, Tiger, Zirve, Mikro veya serbest</span>
            {file ? <em>{file.name}</em> : null}
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              hidden
              onChange={(e) => acceptFile(e.target.files?.[0] || null)}
            />
          </div>

          <div className="excel-actions">
            <button type="button" className="btn-primary" disabled={!file || busy} onClick={() => void onPreview()}>
              AI Sütun Eşle
            </button>
            <button type="button" className="btn-save" disabled={!preview || busy} onClick={() => void onImport()}>
              Sisteme Aktar
            </button>
          </div>
          {message ? <div className="excel-msg">{message}</div> : null}
        </div>

        <div className="excel-card">
          <h3>
            AI Eşleme{" "}
            {preview?.detected_profile ? (
              <span className="excel-badge">Profil: {preview.detected_profile}</span>
            ) : null}
            {preview ? (
              <span className="excel-badge muted">Güven %{Math.round((preview.confidence || 0) * 100)}</span>
            ) : null}
          </h3>
          {!preview ? (
            <p className="excel-muted">Dosya yükleyip AI eşlemeyi başlatın.</p>
          ) : (
            <>
              <table className="data-table" style={{ width: "100%", fontSize: 13 }}>
                <thead>
                  <tr>
                    <th>Sistem Alanı</th>
                    <th>Excel Sütunu</th>
                  </tr>
                </thead>
                <tbody>
                  {fields.map((f) => (
                    <tr key={f}>
                      <td>{FIELD_LABELS[f] || f}</td>
                      <td>
                        <select
                          className="form-control"
                          value={mapping[f] || ""}
                          onChange={(e) => setMapping((m) => ({ ...m, [f]: e.target.value }))}
                        >
                          <option value="">— seçin —</option>
                          {preview.headers.map((h) => (
                            <option key={h} value={h}>
                              {h}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <h4 style={{ marginTop: 16, fontSize: 13 }}>Örnek satırlar</h4>
              <div className="excel-sample">
                <pre>{JSON.stringify(preview.sample_rows.slice(0, 3), null, 2)}</pre>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="excel-card" style={{ marginTop: 14 }}>
        <h3>Son Aktarımlar</h3>
        <table className="data-table" style={{ width: "100%", fontSize: 12 }}>
          <thead>
            <tr>
              <th>#</th>
              <th>Dosya</th>
              <th>Hedef</th>
              <th>Durum</th>
              <th>Başarılı</th>
              <th>%</th>
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", color: "#94a3b8" }}>
                  Kayıt yok
                </td>
              </tr>
            ) : (
              jobs.map((j) => (
                <tr key={j.id}>
                  <td>{j.id}</td>
                  <td>{j.file_name}</td>
                  <td>{j.target_entity}</td>
                  <td>{j.status}</td>
                  <td>
                    {j.success_rows}/{j.total_rows}
                    {j.error_rows ? ` (hata ${j.error_rows})` : ""}
                  </td>
                  <td>{j.progress_pct}%</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="page-footer-actions">
        <button type="button" className="btn-cancel" onClick={() => navigate("/app/dashboard")}>
          Vazgeç
        </button>
      </div>
    </div>
  );
}
