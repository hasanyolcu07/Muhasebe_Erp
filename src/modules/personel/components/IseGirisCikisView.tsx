import { useState } from "react";
import { personelStore } from "../services/personelStore";
import { attemptSgkSubmission } from "../services/sgkService";
import { SgkPersonelIslemleri } from "./SgkPersonelIslemleri";
import type { SgkNotificationRecord } from "../types/personelTypes";

export function IseGirisCikisView() {
  const [notifications, setNotifications] = useState<SgkNotificationRecord[]>(() =>
    personelStore.getSgkNotifications()
  );
  const [selectedPersonelId, setSelectedPersonelId] = useState<number>(1);
  const [eventDate, setEventDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [docType, setDocType] = useState<"ISE_GIRIS" | "ISTEN_AYRILIS">("ISE_GIRIS");
  const [reasonCode, setReasonCode] = useState<string>("03");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submissionNotice, setSubmissionNotice] = useState<{
    show: boolean;
    title: string;
    message: string;
    action: string;
  } | null>(null);

  const personelList = personelStore.getPersonelList();

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = personelStore.createSgkNotification(
        docType,
        selectedPersonelId,
        eventDate,
        docType === "ISTEN_AYRILIS" ? reasonCode : undefined
      );
      setNotifications(personelStore.getSgkNotifications());
      setIsModalOpen(false);
      alert(`SGK ${docType === "ISE_GIRIS" ? "İşe Giriş" : "İşten Ayrılış"} bildirgesi hazırlandı (ID: ${created.id}).`);
    } catch (err: any) {
      alert(`HATA: ${err?.message || "Bildirge hazırlanamadı."}`);
    }
  };

  const handleDownloadXml = (notif: SgkNotificationRecord) => {
    const blob = new Blob([notif.xml_payload], { type: "application/xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SGK_4A_${notif.type}_${notif.tc_no}_${notif.event_date}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSendToSgk = (notif: SgkNotificationRecord) => {
    const result = attemptSgkSubmission(notif.id);
    setSubmissionNotice({
      show: true,
      title: "SGK Canlı Web Servis Güvenlik Uyarısı",
      message: result.message,
      action: result.recommendedAction,
    });
  };

  return (
    <div className="ise-giris-cikis-view">
      <div className="notice-banner" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: 12, borderRadius: 6, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <span style={{ fontSize: 20 }}>🏛️</span>
          <div style={{ fontSize: 13, color: "#166534" }}>
            <strong>Resmî 4A Sigortalı İşe Giriş ve İşten Ayrılış İş Akışı:</strong>
            <p style={{ margin: "4px 0 0 0" }}>
              Bildirgeler Sosyal Güvenlik Kurumu (SGK) güncel teknik şartnamesine uygun XML paketleri olarak hazırlanır.
              İşe giriş bildirgeleri en geç işe başlamadan 1 gün önce, işten ayrılış bildirgeleri ise ayrılış tarihini takip eden 10 gün içinde bildirilmelidir.
            </p>
          </div>
        </div>
      </div>

      <SgkPersonelIslemleri />

      <div className="section-toolbar" style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <h4 style={{ margin: 0 }}>4A Bildirge Listesi ve Gönderim Durumu</h4>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            className="btn-top green"
            onClick={() => {
              setDocType("ISE_GIRIS");
              setIsModalOpen(true);
            }}
          >
            ➕ Yeni İşe Giriş Bildirgesi
          </button>
          <button
            type="button"
            className="btn-top amber"
            onClick={() => {
              setDocType("ISTEN_AYRILIS");
              setIsModalOpen(true);
            }}
          >
            🚪 Yeni İşten Ayrılış Bildirgesi
          </button>
        </div>
      </div>

      <div className="table-responsive card" style={{ padding: 0 }}>
        <table className="data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Bildirge Türü</th>
              <th>Personel</th>
              <th>TC Kimlik No</th>
              <th>Olay Tarihi</th>
              <th>Yasal Son Gün</th>
              <th>Süre Uyumu</th>
              <th>Durum</th>
              <th style={{ textAlign: "right" }}>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {notifications.map((n) => (
              <tr key={n.id}>
                <td>#{n.id}</td>
                <td>
                  <strong>
                    {n.type === "ISE_GIRIS" ? "🟢 İşe Giriş Bildirgesi" : "🔴 İşten Ayrılış Bildirgesi"}
                  </strong>
                </td>
                <td>{n.personel_name}</td>
                <td style={{ fontFamily: "monospace" }}>{n.tc_no}</td>
                <td>{n.event_date}</td>
                <td style={{ fontWeight: 600 }}>{n.legal_deadline}</td>
                <td>
                  {n.is_within_legal_period ? (
                    <span className="badge" style={{ background: "#dcfce7", color: "#166534" }}>
                      Süresinde
                    </span>
                  ) : (
                    <span className="badge" style={{ background: "#fee2e2", color: "#991b1b" }}>
                      Süre Aşımı Uyarısı
                    </span>
                  )}
                </td>
                <td>
                  <span className="badge" style={{ background: "#e0e7ff", color: "#3730a3" }}>
                    {n.submission_status}
                  </span>
                </td>
                <td style={{ textAlign: "right" }}>
                  <div style={{ display: "inline-flex", gap: 6 }}>
                    <button
                      type="button"
                      className="btn-top blue"
                      style={{ fontSize: 11, padding: "3px 8px" }}
                      onClick={() => handleDownloadXml(n)}
                      title="SGK Portalına yüklenecek XML dosyasını indir"
                    >
                      📥 XML İndir
                    </button>
                    <button
                      type="button"
                      className="btn-top"
                      style={{ fontSize: 11, padding: "3px 8px" }}
                      onClick={() => handleSendToSgk(n)}
                    >
                      🚀 SGK'ya Gönder
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Yeni Bildirge Modalı */}
      {isModalOpen && (
        <div className="modal-overlay show" role="dialog" style={{ zIndex: 99999 }}>
          <div className="modal-content" style={{ width: 540 }}>
            <div className="modal-header">
              <span>
                {docType === "ISE_GIRIS"
                  ? "🟢 Yeni 4A İşe Giriş Bildirgesi Hazırla"
                  : "🔴 Yeni 4A İşten Ayrılış Bildirgesi Hazırla"}
              </span>
              <button type="button" className="btn-top" onClick={() => setIsModalOpen(false)}>
                ✖
              </button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div className="form-group">
                  <label>Personel Seç *</label>
                  <select
                    className="form-control"
                    value={selectedPersonelId}
                    onChange={(e) => setSelectedPersonelId(Number(e.target.value))}
                  >
                    {personelList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.personel_no} — {p.full_name} ({p.department})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>
                    {docType === "ISE_GIRIS" ? "İşe Başlama Tarihi *" : "İşten Ayrılış Tarihi *"}
                  </label>
                  <input
                    type="date"
                    required
                    className="form-control"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                  />
                  <small style={{ color: "var(--text-muted)", marginTop: 4, display: "block" }}>
                    {docType === "ISE_GIRIS"
                      ? "İşe başlamadan en geç 1 gün önce bildirilmelidir."
                      : "Ayrılış tarihinden itibaren 10 gün içinde bildirilmelidir."}
                  </small>
                </div>

                {docType === "ISTEN_AYRILIS" && (
                  <div className="form-group">
                    <label>SGK İşten Çıkış Nedeni Kodu *</label>
                    <select
                      className="form-control"
                      value={reasonCode}
                      onChange={(e) => setReasonCode(e.target.value)}
                    >
                      <option value="03">03 — Belirsiz süreli iş sözleşmesinin işçi tarafından feshi (İstifa)</option>
                      <option value="04">04 — Belirsiz süreli iş sözleşmesinin işveren tarafından haklı sebep bildirilmeden feshi</option>
                      <option value="05">05 — Belirli süreli iş sözleşmesinin sona ermesi</option>
                      <option value="08">08 — Emeklilik (yaşlılık) veya toptan ödeme nedeniyle</option>
                      <option value="16">16 — Sözleşme sona ermeden sigortalının aynı işverene ait diğer işyerine nakli</option>
                      <option value="22">22 — Diğer nedenler</option>
                    </select>
                  </div>
                )}
              </div>
              <div className="modal-footer" style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button type="button" className="btn-cancel" onClick={() => setIsModalOpen(false)}>
                  Vazgeç
                </button>
                <button type="submit" className="btn-save">
                  Bildirgeyi Oluştur & XML Hazırla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Güvenlik & Doğruluk Uyarısı Modalı */}
      {submissionNotice && (
        <div className="modal-overlay show" role="dialog" style={{ zIndex: 99999 }}>
          <div className="modal-content" style={{ width: 560 }}>
            <div className="modal-header" style={{ background: "#fffbeb", borderBottom: "1px solid #fef3c7" }}>
              <span style={{ color: "#92400e", fontWeight: 700 }}>⚠️ {submissionNotice.title}</span>
              <button type="button" className="btn-top" onClick={() => setSubmissionNotice(null)}>
                ✖
              </button>
            </div>
            <div className="modal-body" style={{ padding: 18 }}>
              <p style={{ color: "#78350f", lineHeight: 1.5, margin: "0 0 12px 0" }}>
                {submissionNotice.message}
              </p>
              <div style={{ background: "#f8fafc", padding: 12, borderRadius: 6, border: "1px solid #e2e8f0" }}>
                <strong style={{ fontSize: 13, color: "#0f172a" }}>Önerilen Resmî İşlem Yolu:</strong>
                <p style={{ margin: "4px 0 0 0", fontSize: 12, color: "#475569" }}>
                  {submissionNotice.action}
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <a
                href="https://e.sgk.gov.tr"
                target="_blank"
                rel="noreferrer"
                className="btn-top blue"
                style={{ textDecoration: "none", marginRight: 8 }}
              >
                SGK Portalını Aç ↗
              </a>
              <button type="button" className="btn-cancel" onClick={() => setSubmissionNotice(null)}>
                Anladım, Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
