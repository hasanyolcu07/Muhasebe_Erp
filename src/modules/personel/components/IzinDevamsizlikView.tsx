import { useState } from "react";
import { personelStore } from "../services/personelStore";
import type { IzinRecord } from "../types/personelTypes";

export function IzinDevamsizlikView() {
  const [izinler, setIzinler] = useState<IzinRecord[]>(() => personelStore.getIzinList());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const personelList = personelStore.getPersonelList().filter((p) => p.is_active);

  const [selectedPersonelId, setSelectedPersonelId] = useState<number>(personelList[0]?.id || 1);
  const [leaveType, setLeaveType] = useState<IzinRecord["leave_type"]>("YILLIK_UCRETLI");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [daysCount, setDaysCount] = useState(1);
  const [description, setDescription] = useState("");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const p = personelList.find((x) => x.id === selectedPersonelId);
    if (!p) return;

    personelStore.saveIzin({
      personel_id: p.id,
      personel_name: p.full_name,
      leave_type: leaveType,
      start_date: startDate,
      end_date: endDate,
      days_count: daysCount,
      description,
      status: "ONAYLANDI",
      approved_by: "İnsan Kaynakları",
    });

    setIzinler(personelStore.getIzinList());
    setIsModalOpen(false);
    setDescription("");
  };

  const getLeaveTypeLabel = (t: IzinRecord["leave_type"]) => {
    switch (t) {
      case "YILLIK_UCRETLI":
        return "🏖️ Yıllık Ücretli İzin";
      case "MAZERET":
        return "📋 Mazeret İzni";
      case "RAPOR":
        return "🏥 Sağlık Raporu (İstirahat)";
      case "UCRETSIZ":
        return "⚠️ Ücretsiz İzin";
      default:
        return t;
    }
  };

  return (
    <div className="izin-devamsizlik-view">
      <div className="section-toolbar" style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <h4 style={{ margin: "0 0 4px 0" }}>İzin ve Devamsızlık Takibi</h4>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
            4857 Sayılı İş Kanunu ve SGK Eksik Gün Bildirimleri Entegrasyonu
          </span>
        </div>
        <button type="button" className="btn-top green" onClick={() => setIsModalOpen(true)}>
          ➕ Yeni İzin Kaydı Ekle
        </button>
      </div>

      <div className="table-responsive card" style={{ padding: 0 }}>
        <table className="data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Personel</th>
              <th>İzin Türü</th>
              <th>Başlangıç Tarihi</th>
              <th>Bitiş Tarihi</th>
              <th>Süre (Gün)</th>
              <th>Açıklama</th>
              <th>Durum</th>
              <th>Onaylayan</th>
            </tr>
          </thead>
          <tbody>
            {izinler.map((iz) => (
              <tr key={iz.id}>
                <td>#{iz.id}</td>
                <td>
                  <strong>{iz.personel_name}</strong>
                </td>
                <td>{getLeaveTypeLabel(iz.leave_type)}</td>
                <td>{iz.start_date}</td>
                <td>{iz.end_date}</td>
                <td style={{ fontWeight: 600 }}>{iz.days_count} gün</td>
                <td>{iz.description || "—"}</td>
                <td>
                  <span className="badge" style={{ background: "#dcfce7", color: "#166534" }}>
                    {iz.status}
                  </span>
                </td>
                <td>{iz.approved_by || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="modal-overlay show" role="dialog" style={{ zIndex: 99999 }}>
          <div className="modal-content" style={{ width: 500 }}>
            <div className="modal-header">
              <span>➕ Yeni İzin Girişi</span>
              <button type="button" className="btn-top" onClick={() => setIsModalOpen(false)}>
                ✖
              </button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div className="form-group">
                  <label>Personel *</label>
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
                  <label>İzin Türü *</label>
                  <select
                    className="form-control"
                    value={leaveType}
                    onChange={(e) => setLeaveType(e.target.value as any)}
                  >
                    <option value="YILLIK_UCRETLI">Yıllık Ücretli İzin</option>
                    <option value="MAZERET">Mazeret İzni</option>
                    <option value="RAPOR">Sağlık / Hastalık Raporu</option>
                    <option value="UCRETSIZ">Ücretsiz İzin</option>
                    <option value="EVLILIK">Evlilik İzni (3 Gün)</option>
                    <option value="OLUM">Vefat İzni (3 Gün)</option>
                  </select>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div className="form-group">
                    <label>Başlangıç Tarihi *</label>
                    <input
                      type="date"
                      required
                      className="form-control"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Bitiş Tarihi *</label>
                    <input
                      type="date"
                      required
                      className="form-control"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Gün Sayısı *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    className="form-control"
                    value={daysCount}
                    onChange={(e) => setDaysCount(Number(e.target.value))}
                  />
                </div>

                <div className="form-group">
                  <label>Açıklama / Belge Referansı</label>
                  <textarea
                    rows={2}
                    className="form-control"
                    placeholder="İzin nedeni, doktor raporu protokol no vb."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer" style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button type="button" className="btn-cancel" onClick={() => setIsModalOpen(false)}>
                  Vazgeç
                </button>
                <button type="submit" className="btn-save">
                  İzni Kaydet & Onayla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
