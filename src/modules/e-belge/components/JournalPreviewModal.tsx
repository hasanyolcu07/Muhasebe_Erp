import { useEffect, useState } from "react";
import { ebelgeApi, type EBelgeDocType, type JournalPreview } from "../api/ebelgeApi";

type Props = {
  docType: EBelgeDocType | null;
  docId: number | null;
  onClose: () => void;
};

function money(v: number | string | undefined) {
  return Number(v ?? 0).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function JournalPreviewModal({ docType, docId, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<JournalPreview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!docType || !docId) {
      setData(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    ebelgeApi
      .journal(docType, docId)
      .then((res) => {
        setData(res);
        if (!res.ok) setError(res.message || "Yevmiye fişi bulunamadı");
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Yevmiye yüklenemedi");
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [docType, docId]);

  if (!docType || !docId) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.45)",
        zIndex: 80,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          width: "min(720px, 96vw)",
          maxHeight: "90vh",
          overflow: "auto",
          padding: 16,
          background: "#fff",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 16, color: "#1e3a8a" }}>Yevmiye Fişi Önizleme</h3>
          <button type="button" className="btn-top" onClick={onClose}>
            ✖ Kapat
          </button>
        </div>

        {loading && <div style={{ color: "#64748b" }}>Yükleniyor…</div>}
        {error && !loading && (
          <div className="alert alert-error" style={{ marginBottom: 8 }}>
            {error}
          </div>
        )}

        {data?.ok && (
          <>
            <div style={{ fontSize: 13, marginBottom: 10, color: "#334155" }}>
              <div>
                <strong>Fiş No:</strong> {data.voucher_no}
              </div>
              <div>
                <strong>Tarih:</strong> {data.voucher_date}
              </div>
              {data.description && (
                <div>
                  <strong>Açıklama:</strong> {data.description}
                </div>
              )}
              <div>
                <strong>Durum:</strong> {data.status} · Borç {money(data.total_debit)} / Alacak{" "}
                {money(data.total_credit)}
              </div>
            </div>
            <table className="fatura-table" style={{ width: "100%", fontSize: 13 }}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Hesap</th>
                  <th>Açıklama</th>
                  <th style={{ textAlign: "right" }}>Borç</th>
                  <th style={{ textAlign: "right" }}>Alacak</th>
                </tr>
              </thead>
              <tbody>
                {(data.lines || []).map((ln) => (
                  <tr key={ln.line_no}>
                    <td>{ln.line_no}</td>
                    <td>
                      {ln.coa_code} {ln.coa_name}
                    </td>
                    <td>{ln.description || "—"}</td>
                    <td style={{ textAlign: "right" }}>{money(ln.debit)}</td>
                    <td style={{ textAlign: "right" }}>{money(ln.credit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
