import { useCallback, useEffect, useState } from "react";
import { faturaApi, type InvoiceDetail } from "@/modules/satis-satin-alma/fatura/api/faturaApi";
import { GibStatusBadge } from "@/modules/satis-satin-alma/utils/gibStatusBadge";
import { formatMoney } from "@/modules/satis-satin-alma/fatura/constants/invoiceTypes";

type Props = {
  invoiceId: number | null;
  onClose: () => void;
};

function isEarsiv(inv: InvoiceDetail | null): boolean {
  if (!inv) return false;
  const ch = (inv.document_channel || inv.e_fatura_type || "").toUpperCase();
  return ch === "E_ARSIV" || ch === "EARSIV";
}

export function DocumentPreviewModal({ invoiceId, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [htmlPreview, setHtmlPreview] = useState<string | null>(null);
  const [emailTo, setEmailTo] = useState("");
  const [activeTab, setActiveTab] = useState<"ozet" | "html">("ozet");

  const load = useCallback(async () => {
    if (!invoiceId) return;
    setLoading(true);
    setError(null);
    setHtmlPreview(null);
    setActiveTab("ozet");
    try {
      const data = await faturaApi.get(invoiceId);
      setInvoice(data);
      setEmailTo("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fatura yüklenemedi");
      setInvoice(null);
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    if (invoiceId) load();
    else setInvoice(null);
  }, [invoiceId, load]);

  if (!invoiceId) return null;

  const earsiv = isEarsiv(invoice);
  const showGibPreview =
    invoice?.gib_status === "GONDERILDI" || invoice?.gib_status === "ONAYLANDI";

  async function runAction(action: "pdf" | "xml" | "ubl" | "html" | "email") {
    if (!invoiceId) return;
    try {
      if (action === "pdf") {
        if (earsiv) {
          await faturaApi.downloadEarsivBlob(invoiceId, "pdf");
          setActionMsg("e-Arşiv PDF indirildi");
        } else {
          const res = await faturaApi.downloadPdf(invoiceId);
          setActionMsg(res.message);
        }
      } else if (action === "xml" || action === "ubl") {
        if (earsiv) {
          await faturaApi.downloadEarsivBlob(invoiceId, action === "ubl" ? "ubl" : "xml");
          setActionMsg(action === "ubl" ? "e-Arşiv UBL indirildi" : "e-Arşiv XML indirildi");
        } else {
          const res = await faturaApi.downloadXml(invoiceId);
          setActionMsg(res.message);
        }
      } else if (action === "html") {
        const html = await faturaApi.fetchEarsivHtml(invoiceId);
        setHtmlPreview(html);
        setActiveTab("html");
        setActionMsg("HTML önizleme yüklendi");
      } else {
        if (earsiv) {
          const to = emailTo.trim() || "musteri@ornek.local";
          const res = await faturaApi.sendEarsivEmail(invoiceId, { to_email: to });
          setActionMsg(res.message);
        } else {
          const res = await faturaApi.sendEmail(invoiceId);
          setActionMsg(res.message);
        }
      }
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : "İşlem başarısız");
    }
  }

  return (
    <div className="modal-overlay show" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal-card document-preview-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            {earsiv ? "e-Arşiv" : "Fatura"} Önizleme — {invoice?.invoice_no ?? "…"}
          </h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Kapat">
            ×
          </button>
        </div>

        {loading && <div className="modal-body">Yükleniyor…</div>}
        {error && <div className="modal-body" style={{ color: "#b91c1c" }}>{error}</div>}

        {!loading && invoice && (
          <div className="modal-body">
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
              <div>
                <strong>Cari:</strong> {invoice.account_title ?? "—"}
              </div>
              <div>
                <strong>Tarih:</strong> {invoice.invoice_date}
              </div>
              <div>
                <strong>Belge:</strong> {invoice.document_channel_label ?? invoice.document_channel ?? "—"}
              </div>
              <div>
                <strong>GİB:</strong> <GibStatusBadge status={invoice.gib_status} label={invoice.gib_status_label} />
              </div>
              <div>
                <strong>Toplam:</strong> {formatMoney(Number(invoice.grand_total))}
              </div>
            </div>

            {earsiv && (
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <button
                  type="button"
                  className={`btn-top${activeTab === "ozet" ? " blue" : ""}`}
                  onClick={() => setActiveTab("ozet")}
                >
                  Özet
                </button>
                <button
                  type="button"
                  className={`btn-top${activeTab === "html" ? " blue" : ""}`}
                  onClick={() => runAction("html")}
                >
                  HTML Önizleme
                </button>
              </div>
            )}

            {activeTab === "html" && htmlPreview ? (
              <iframe
                title="e-Arşiv HTML"
                srcDoc={htmlPreview}
                style={{ width: "100%", height: 320, border: "1px solid #cbd5e1", borderRadius: 4 }}
              />
            ) : showGibPreview && !earsiv ? (
              <div className="document-preview-gib-pdf">
                <div className="document-preview-gib-placeholder">
                  <p>GİB e-Fatura PDF Önizleme (stub)</p>
                  <p style={{ fontSize: 12, color: "#64748b" }}>
                    ETTN: {invoice.ettn ?? "—"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="document-preview-summary">
                <p>
                  {earsiv ? "e-Arşiv Fatura" : invoice.invoice_type_label} —{" "}
                  {invoice.status === "APPROVED" ? "Onaylı" : "Taslak"}
                </p>
                <p style={{ fontSize: 13, color: "#64748b" }}>
                  {invoice.lines?.length ?? 0} kalem · Matrah {formatMoney(Number(invoice.subtotal ?? 0))}
                  {earsiv ? " · PDF / UBL / HTML çıktı hazır" : ""}
                </p>
              </div>
            )}

            {earsiv && (
              <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center" }}>
                <label style={{ fontSize: 12 }}>E-posta:</label>
                <input
                  type="email"
                  className="form-control"
                  style={{ maxWidth: 240 }}
                  placeholder="musteri@ornek.com"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                />
              </div>
            )}

            {actionMsg && (
              <div style={{ marginTop: 10, fontSize: 13, color: "#0369a1" }}>{actionMsg}</div>
            )}
          </div>
        )}

        <div className="modal-footer">
          <button type="button" className="btn-top" disabled={!invoice} onClick={() => runAction("pdf")}>
            {earsiv ? "e-Arşiv PDF" : "PDF İndir"}
          </button>
          <button type="button" className="btn-top" disabled={!invoice} onClick={() => runAction("xml")}>
            {earsiv ? "XML / UBL" : "XML İndir"}
          </button>
          {earsiv && (
            <button type="button" className="btn-top" disabled={!invoice} onClick={() => runAction("html")}>
              HTML
            </button>
          )}
          <button type="button" className="btn-top blue" disabled={!invoice} onClick={() => runAction("email")}>
            E-Posta Gönder
          </button>
          <button type="button" className="btn-cancel" onClick={onClose}>
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
