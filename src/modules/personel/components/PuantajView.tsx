import { useState, useEffect } from "react";
import { personelStore } from "../services/personelStore";
import type { PuantajRecord } from "../types/personelTypes";

export function PuantajView() {
  const [period, setPeriod] = useState("2026-03");
  const [puantajlar, setPuantajlar] = useState<PuantajRecord[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<PuantajRecord>>({});

  useEffect(() => {
    // Seçilen döneme ait puantajları yükle; yoksa aktif personeller için taslak üret
    const existing = personelStore.getPuantajList(period);
    if (existing.length > 0) {
      setPuantajlar(existing);
    } else {
      const activePersonel = personelStore.getPersonelList().filter((p) => p.is_active);
      const generated = activePersonel.map((p, idx) => ({
        id: Date.now() + idx,
        period,
        personel_id: p.id,
        personel_name: p.full_name,
        department: p.department,
        total_days: 30,
        worked_days: 26,
        weekly_rest_days: 4,
        holiday_days: 0,
        paid_leave_days: 0,
        unpaid_leave_days: 0,
        sick_leave_days: 0,
        absent_days: 0,
        missing_day_code: null,
        overtime_hours_150: 0,
        overtime_hours_200: 0,
        night_hours: 0,
        source: "MANUEL" as const,
        created_by: "Sistem",
        updated_by: "Sistem",
        is_approved: false,
      }));
      setPuantajlar(generated);
    }
  }, [period]);

  const handleSaveRow = (p: PuantajRecord) => {
    const updated = { ...p, ...editForm };
    const totalDays =
      (updated.worked_days ?? 0) +
      (updated.weekly_rest_days ?? 0) +
      (updated.holiday_days ?? 0) +
      (updated.paid_leave_days ?? 0);

    if (totalDays > 31) {
      alert(`HATA: Toplam çalışma günü (${totalDays}) aylık takvim sınırını aşamaz.`);
      return;
    }

    personelStore.savePuantaj(updated);
    setPuantajlar(personelStore.getPuantajList(period));
    setEditingId(null);
  };

  const handleAutoFillAll = () => {
    if (!confirm(`${period} dönemi için tüm personeller 26 gün çalışma + 4 gün hafta tatili (30 gün) olarak tamamlansın mı?`)) {
      return;
    }
    const activePersonel = personelStore.getPersonelList().filter((p) => p.is_active);
    for (const p of activePersonel) {
      personelStore.savePuantaj({
        period,
        personel_id: p.id,
        worked_days: 26,
        weekly_rest_days: 4,
        holiday_days: 0,
        paid_leave_days: 0,
        unpaid_leave_days: 0,
        sick_leave_days: 0,
        absent_days: 0,
        overtime_hours_150: 0,
        overtime_hours_200: 0,
        is_approved: false,
      });
    }
    setPuantajlar(personelStore.getPuantajList(period));
  };

  const handleApproveAll = () => {
    for (const p of puantajlar) {
      personelStore.savePuantaj({
        ...p,
        is_approved: true,
      });
    }
    setPuantajlar(personelStore.getPuantajList(period));
    alert(`${period} dönemi puantajları başarıyla onaylandı.`);
  };

  const isAllApproved = puantajlar.length > 0 && puantajlar.every((p) => p.is_approved);

  return (
    <div className="puantaj-view">
      <div className="section-toolbar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <label style={{ fontWeight: 600 }}>Dönem Seçimi:</label>
          <select
            className="form-control"
            style={{ width: 140 }}
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="2026-03">2026 / Mart</option>
            <option value="2026-02">2026 / Şubat</option>
            <option value="2026-01">2026 / Ocak</option>
            <option value="2025-12">2025 / Aralık</option>
          </select>

          {isAllApproved ? (
            <span className="badge" style={{ background: "#dcfce7", color: "#166534" }}>
              ✅ Bu Dönem Puantajı Onaylı
            </span>
          ) : (
            <span className="badge" style={{ background: "#fef3c7", color: "#92400e" }}>
              ⏳ Taslak Puantaj
            </span>
          )}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="btn-top" onClick={handleAutoFillAll}>
            ⚡ Standart 30 Güne Tamamla
          </button>
          <button
            type="button"
            className="btn-top blue"
            onClick={() => alert("Excel puantaj içe aktarım şablonu indirildi.")}
          >
            📥 Excel Şablonu
          </button>
          {!isAllApproved && (
            <button type="button" className="btn-top green" onClick={handleApproveAll}>
              ✔️ Puantajı Onayla
            </button>
          )}
        </div>
      </div>

      <div className="table-responsive card" style={{ padding: 0 }}>
        <table className="data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>Personel</th>
              <th>Departman</th>
              <th>Fiili Çalışma</th>
              <th>Hafta Tatili</th>
              <th>Genel Tatil</th>
              <th>Fazla Mesai (%50)</th>
              <th>Tatil Mesaisi (%100)</th>
              <th>İzin / Rapor</th>
              <th>Devamsızlık</th>
              <th>Toplam Gün</th>
              <th style={{ textAlign: "right" }}>İşlem</th>
            </tr>
          </thead>
          <tbody>
            {puantajlar.map((p) => {
              const isEditing = editingId === p.id;
              const totalDays =
                (isEditing ? editForm.worked_days ?? p.worked_days : p.worked_days) +
                (isEditing ? editForm.weekly_rest_days ?? p.weekly_rest_days : p.weekly_rest_days) +
                (isEditing ? editForm.holiday_days ?? p.holiday_days : p.holiday_days) +
                (isEditing ? editForm.paid_leave_days ?? p.paid_leave_days : p.paid_leave_days);

              return (
                <tr key={p.id}>
                  <td>
                    <strong>{p.personel_name}</strong>
                  </td>
                  <td>{p.department}</td>
                  <td>
                    {isEditing ? (
                      <input
                        type="number"
                        className="form-control"
                        style={{ width: 65 }}
                        value={editForm.worked_days ?? p.worked_days}
                        onChange={(e) => setEditForm({ ...editForm, worked_days: Number(e.target.value) })}
                      />
                    ) : (
                      `${p.worked_days} gün`
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input
                        type="number"
                        className="form-control"
                        style={{ width: 65 }}
                        value={editForm.weekly_rest_days ?? p.weekly_rest_days}
                        onChange={(e) => setEditForm({ ...editForm, weekly_rest_days: Number(e.target.value) })}
                      />
                    ) : (
                      `${p.weekly_rest_days} gün`
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input
                        type="number"
                        className="form-control"
                        style={{ width: 65 }}
                        value={editForm.holiday_days ?? p.holiday_days}
                        onChange={(e) => setEditForm({ ...editForm, holiday_days: Number(e.target.value) })}
                      />
                    ) : (
                      `${p.holiday_days} gün`
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input
                        type="number"
                        className="form-control"
                        style={{ width: 65 }}
                        value={editForm.overtime_hours_150 ?? p.overtime_hours_150}
                        onChange={(e) => setEditForm({ ...editForm, overtime_hours_150: Number(e.target.value) })}
                      />
                    ) : (
                      `${p.overtime_hours_150} saat`
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input
                        type="number"
                        className="form-control"
                        style={{ width: 65 }}
                        value={editForm.overtime_hours_200 ?? p.overtime_hours_200}
                        onChange={(e) => setEditForm({ ...editForm, overtime_hours_200: Number(e.target.value) })}
                      />
                    ) : (
                      `${p.overtime_hours_200} saat`
                    )}
                  </td>
                  <td>
                    {p.sick_leave_days > 0 ? `Raporlu: ${p.sick_leave_days}g` : "—"}
                  </td>
                  <td>
                    {p.absent_days > 0 ? (
                      <span style={{ color: "#ef4444", fontWeight: 600 }}>{p.absent_days} gün</span>
                    ) : (
                      "0"
                    )}
                  </td>
                  <td style={{ fontWeight: 700, color: totalDays === 30 ? "#10b981" : "#f59e0b" }}>
                    {totalDays} gün
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {isEditing ? (
                      <div style={{ display: "inline-flex", gap: 4 }}>
                        <button
                          type="button"
                          className="btn-top green"
                          style={{ fontSize: 11, padding: "2px 6px" }}
                          onClick={() => handleSaveRow(p)}
                        >
                          Kaydet
                        </button>
                        <button
                          type="button"
                          className="btn-cancel"
                          style={{ fontSize: 11, padding: "2px 6px" }}
                          onClick={() => setEditingId(null)}
                        >
                          İptal
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="btn-top"
                        style={{ fontSize: 11, padding: "2px 6px" }}
                        onClick={() => {
                          setEditingId(p.id);
                          setEditForm({
                            worked_days: p.worked_days,
                            weekly_rest_days: p.weekly_rest_days,
                            holiday_days: p.holiday_days,
                            overtime_hours_150: p.overtime_hours_150,
                            overtime_hours_200: p.overtime_hours_200,
                          });
                        }}
                      >
                        ✏️ Düzenle
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
