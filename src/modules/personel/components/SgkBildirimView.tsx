import { useState } from "react";
import { personelStore } from "../services/personelStore";
import { attemptSgkSubmission } from "../services/sgkService";
import { SgkPersonelIslemleri } from "./SgkPersonelIslemleri";
import type { SgkNotificationRecord } from "../types/personelTypes";

export function SgkBildirimView() {
  const [notifications] = useState<SgkNotificationRecord[]>(() =>
    personelStore.getSgkNotifications()
  );
  const [previewXml, setPreviewXml] = useState<string | null>(null);

  const handleDownload = (n: SgkNotificationRecord) => {
    const blob = new Blob([n.xml_payload], { type: "application/xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SGK_4A_${n.type}_${n.tc_no}_${n.event_date}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSend = (n: SgkNotificationRecord) => {
    const res = attemptSgkSubmission(n.id);
    alert(`${res.message}\n\nÖnerilen İşlem:\n${res.recommendedAction}`);
  };

  return (
    <div className="sgk-bildirim-view">
      <div className="card" style={{ background: "#eff6ff", border: "1px solid #bfdbfe", padding: 16, marginBottom: 16 }}>
        <h4 style={{ margin: "0 0 6px 0", color: "#1e40af" }}>
          🏛️ SGK e-Sigorta ve MUHSGK Bildirim Hazırlık Merkezi
        </h4>
        <p style={{ margin: "0 0 8px 0", fontSize: 13, color: "#1e3a8a", lineHeight: 1.5 }}>
          Bu ekrandan 4A İşe Giriş Bildirgeleri, 4A İşten Ayrılış Bildirgeleri ve Aylık Muhtasar & Prim Hizmet Beyannamesi (MUHSGK) için SGK standartlarına uygun resmî XML paketleri üretilir ve kontrol edilir.
        </p>
        <div style={{ display: "flex", gap: 12, alignItems: "center", fontSize: 12, color: "#1d4ed8" }}>
          <span>• Güncel Standart: 2024.10 Versiyonu</span>
          <span>• Entegrasyon Türü: SGK e-Sigorta Portalı XML / Dosya Transferi</span>
          <a
            href="https://e.sgk.gov.tr/Uygulamalar/Detay/4a-Sigortali-Ise-Giris-ve-Isten-Ayrilis-Bildirgesi-2024-10-02-10-08-51"
            target="_blank"
            rel="noreferrer"
            style={{ color: "#1e40af", fontWeight: 700 }}
          >
            Resmî SGK Kılavuzunu İncele ↗
          </a>
        </div>
      </div>

      <SgkPersonelIslemleri />

      <div className="table-responsive card" style={{ padding: 0 }}>
        <table className="data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Bildirge Tipi</th>
              <th>Personel / TCKN</th>
              <th>Olay Tarihi</th>
              <th>Son Bildirim Tarihi</th>
              <th>Yasal Süre Durumu</th>
              <th>İşyeri Sicil No</th>
              <th>Gönderim Statüsü</th>
              <th style={{ textAlign: "right" }}>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {notifications.map((n) => (
              <tr key={n.id}>
                <td>#{n.id}</td>
                <td>
                  <strong>{n.type === "ISE_GIRIS" ? "İşe Giriş (4A)" : "İşten Ayrılış (4A)"}</strong>
                </td>
                <td>
                  <div>{n.personel_name}</div>
                  <div style={{ fontSize: 11, fontFamily: "monospace", color: "var(--text-muted)" }}>{n.tc_no}</div>
                </td>
                <td>{n.event_date}</td>
                <td style={{ fontWeight: 600 }}>{n.legal_deadline}</td>
                <td>
                  {n.is_within_legal_period ? (
                    <span className="badge" style={{ background: "#dcfce7", color: "#166534" }}>
                      Süresinde
                    </span>
                  ) : (
                    <span className="badge" style={{ background: "#fee2e2", color: "#991b1b" }}>
                      Yasal Süre Aşımı
                    </span>
                  )}
                </td>
                <td style={{ fontFamily: "monospace", fontSize: 11 }}>{n.workplace_sgk_no}</td>
                <td>
                  <span className="badge" style={{ background: "#fef3c7", color: "#92400e" }}>
                    {n.submission_status}
                  </span>
                </td>
                <td style={{ textAlign: "right" }}>
                  <div style={{ display: "inline-flex", gap: 6 }}>
                    <button
                      type="button"
                      className="btn-top"
                      style={{ fontSize: 11, padding: "2px 6px" }}
                      onClick={() => setPreviewXml(n.xml_payload)}
                    >
                      👁️ XML Gör
                    </button>
                    <button
                      type="button"
                      className="btn-top blue"
                      style={{ fontSize: 11, padding: "2px 6px" }}
                      onClick={() => handleDownload(n)}
                    >
                      📥 İndir
                    </button>
                    <button
                      type="button"
                      className="btn-top"
                      style={{ fontSize: 11, padding: "2px 6px" }}
                      onClick={() => handleSend(n)}
                    >
                      🚀 Gönder
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* XML Önizleme Modalı */}
      {previewXml && (
        <div className="modal-overlay show" role="dialog" style={{ zIndex: 99999 }}>
          <div className="modal-content" style={{ width: 640 }}>
            <div className="modal-header">
              <span>📄 SGK 4A Resmî XML Paketi Önizlemesi</span>
              <button type="button" className="btn-top" onClick={() => setPreviewXml(null)}>
                ✖
              </button>
            </div>
            <div className="modal-body">
              <pre
                style={{
                  background: "#1e293b",
                  color: "#e2e8f0",
                  padding: 12,
                  borderRadius: 6,
                  fontSize: 12,
                  maxHeight: 380,
                  overflow: "auto",
                }}
              >
                {previewXml}
              </pre>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-cancel" onClick={() => setPreviewXml(null)}>
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
