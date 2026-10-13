import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/store/appStore";
import { uretimApi, type Machine } from "../api/uretimApi";
import { mockStore, type MockMachine } from "@/services/mockDataStore";

const MACHINE_TYPES = [
  { id: "CNC", label: "CNC İşleme Merkezi" },
  { id: "LAZER", label: "Fiber Lazer Kesim" },
  { id: "PRESLER", label: "CNC Abkant Pres" },
  { id: "TORNA", label: "CNC Torna Tezgahı" },
  { id: "FREZE", label: "Üniversal Freze" },
  { id: "KAYNAK", label: "Robotik Kaynak İstasyonu" },
  { id: "ENJEKSIYON", label: "Plastik / Metal Enjeksiyon" },
  { id: "MONTAJ", label: "Mekanik Montaj İstasyonu" },
  { id: "TEST", label: "Kalite & Yük Test Standı" },
  { id: "BOYAHANE", label: "Elektrostatik Toz Boya Hattı" },
  { id: "KOMPRESOR", label: "Vidalı Hava Kompresörü" },
];

export function MachinesPanel() {
  const branchId = useAppStore((s) => s.branchId) ?? 1;
  const [items, setItems] = useState<MockMachine[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MockMachine | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const machineTypes = useMemo(() => {
    const fromSettings = mockStore.getMachineTypes();
    if (fromSettings && fromSettings.length > 0) {
      return fromSettings.map((m) => ({ id: m.code, label: `${m.name} (${m.code})` }));
    }
    return MACHINE_TYPES;
  }, [modalOpen]);

  const fixedAssets = useMemo(() => {
    return mockStore.getFixedAssets();
  }, [modalOpen]);

  // Form state
  const [form, setForm] = useState<Partial<MockMachine>>({
    code: "",
    name: "",
    machine_type: "CNC",
    brand: "",
    model: "",
    serial_no: "",
    manufacture_year: new Date().getFullYear(),
    fixed_asset_code: "253.01.001",
    work_center: "Talaşlı İmalat Holü",
    power_kw: 18.5,
    standby_power_kw: 1.5,
    daily_hours: 16,
    shifts_per_day: 2,
    monthly_work_days: 22,
    hourly_labor_tl: 140,
    hourly_depreciation_tl: 70,
    hourly_maintenance_tl: 40,
    hourly_rate_tl: 250,
    efficiency_pct: 90,
    scrap_pct: 1.0,
    status: "ACTIVE",
    notes: "",
  });

  function showToast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await uretimApi.listMachines({ branch_id: branchId });
      setItems(((res.items as unknown) as MockMachine[]) ?? mockStore.getMachines());
    } catch {
      setItems(mockStore.getMachines());
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditingItem(null);
    setForm({
      code: `MKN-${String(items.length + 1).padStart(2, "0")}`,
      name: "",
      machine_type: "CNC",
      brand: "",
      model: "",
      serial_no: "",
      manufacture_year: new Date().getFullYear(),
      fixed_asset_code: "253.01.001",
      work_center: "Fabrika Sahası",
      power_kw: 15,
      standby_power_kw: 1.2,
      daily_hours: 16,
      shifts_per_day: 2,
      monthly_work_days: 22,
      hourly_labor_tl: 120,
      hourly_depreciation_tl: 50,
      hourly_maintenance_tl: 30,
      hourly_rate_tl: 200,
      efficiency_pct: 90,
      scrap_pct: 1.0,
      status: "ACTIVE",
      notes: "",
    });
    setModalOpen(true);
  }

  function openEdit(item: MockMachine) {
    setEditingItem(item);
    setForm({ ...item });
    setModalOpen(true);
  }

  async function handleDelete(id: number) {
    try {
      mockStore.deleteMachine(id);
      await load();
      showToast("✔ Makine kaydı silindi.");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Silme başarısız");
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.code?.trim() || !form.name?.trim()) {
      showToast("Makine Kodu ve Adı zorunludur.");
      return;
    }

    const labor = Number(form.hourly_labor_tl) || 0;
    const dep = Number(form.hourly_depreciation_tl) || 0;
    const maint = Number(form.hourly_maintenance_tl) || 0;
    const totalHourly = labor + dep + maint > 0 ? labor + dep + maint : (Number(form.hourly_rate_tl) || 200);

    const payload: Partial<MockMachine> & { code: string; name: string } = {
      ...form,
      id: editingItem?.id,
      branch_id: branchId,
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      power_kw: Number(form.power_kw) || 15,
      standby_power_kw: Number(form.standby_power_kw) || 0,
      daily_hours: Number(form.daily_hours) || 8,
      shifts_per_day: Number(form.shifts_per_day) || 1,
      monthly_work_days: Number(form.monthly_work_days) || 22,
      capacity_hours_per_day: Number(form.daily_hours) || 8,
      hourly_labor_tl: labor,
      hourly_depreciation_tl: dep,
      hourly_maintenance_tl: maint,
      hourly_rate_tl: totalHourly,
      efficiency_pct: Number(form.efficiency_pct) || 90,
      scrap_pct: Number(form.scrap_pct) || 0,
    };

    try {
      mockStore.saveMachine(payload);
      await uretimApi.createMachine(payload as any).catch(() => {});
      setModalOpen(false);
      await load();
      showToast(editingItem ? "✔ Makine detay tanımı güncellendi." : "✔ Yeni makine tanım kartı oluşturuldu.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Kayıt başarısız");
    }
  }

  // Hesaplanan toplamlar
  const totalPower = items.reduce((s, m) => s + (m.power_kw || 0), 0);
  const avgEfficiency = items.length ? Math.round(items.reduce((s, m) => s + (m.efficiency_pct || 90), 0) / items.length) : 0;
  const activeCount = items.filter((m) => m.status === "ACTIVE" || !m.status).length;

  return (
    <div className="card" style={{ padding: 16 }}>
      {/* Üst Başlık & İstatistik Kartları */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#1e293b" }}>
            ⚙️ Makine Parkuru &amp; İş İstasyonları Tanım Kartları
          </h3>
          <p style={{ margin: "3px 0 0", fontSize: 13, color: "#64748b" }}>
            Makinelerin güç, vardiya, VUK 7/A saatlik maliyetleri ve OEE verimlilik parametreleri (Maliyet Bütçesi ile tam entegre)
          </p>
        </div>
        <button type="button" className="btn-primary" style={{ padding: "8px 16px", fontWeight: 700 }} onClick={openCreate}>
          + Yeni Makina Tanımı
        </button>
      </div>

      {toastMsg && (
        <div style={{ margin: "0 0 14px", padding: "10px 14px", borderRadius: 8, background: "#d1fae5", color: "#065f46", fontSize: 13, fontWeight: 600 }}>
          {toastMsg}
        </div>
      )}

      {/* KPI Kartları */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 16 }}>
        <div style={{ background: "#f8fafc", padding: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>Toplam Makine Sayısı</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a" }}>{items.length} Makine ({activeCount} Aktif)</div>
        </div>
        <div style={{ background: "#f8fafc", padding: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>Kurulu Toplam Güç (kW)</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#d97706" }}>{totalPower.toFixed(1)} kW</div>
        </div>
        <div style={{ background: "#f8fafc", padding: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>Ortalama OEE Verimlilik</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#16a34a" }}>%{avgEfficiency}</div>
        </div>
      </div>

      {/* Makine Listesi Tablosu */}
      <div className="reports-table-wrap">
        <table className="data-table" style={{ width: "100%", fontSize: 12 }}>
          <thead>
            <tr>
              <th>Kod</th>
              <th>Makina / İstasyon Adı</th>
              <th>Tip / İş Merkezi</th>
              <th>Marka / Model</th>
              <th style={{ textAlign: "right" }}>Güç (kW)</th>
              <th style={{ textAlign: "center" }}>Saat/Gün</th>
              <th style={{ textAlign: "center" }}>Çalışma Günü</th>
              <th style={{ textAlign: "right" }}>720 İşçilik</th>
              <th style={{ textAlign: "right" }}>730 GÜG Payı</th>
              <th style={{ textAlign: "right" }}>Toplam Saatlik</th>
              <th style={{ textAlign: "center" }}>OEE %</th>
              <th style={{ textAlign: "center" }}>Durum</th>
              <th style={{ textAlign: "center" }}>İşlem</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={13} style={{ textAlign: "center", padding: 24, color: "#94a3b8" }}>
                  Tanımlı makina bulunamadı. "+ Yeni Makina Tanımı" butonu ile ilk makinenizi ekleyin.
                </td>
              </tr>
            ) : (
              items.map((m) => {
                const labor = m.hourly_labor_tl ?? 120;
                const overhead = (m.hourly_depreciation_tl ?? 50) + (m.hourly_maintenance_tl ?? 30);
                const totalRate = m.hourly_rate_tl ?? labor + overhead;
                return (
                  <tr key={m.id} style={{ cursor: "pointer" }} onClick={() => openEdit(m)}>
                    <td><strong style={{ color: "#2563eb" }}>{m.code}</strong></td>
                    <td><strong>{m.name}</strong></td>
                    <td>
                      <span className="badge" style={{ background: "#f1f5f9", color: "#334155" }}>
                        {m.machine_type || "CNC"}
                      </span>{" "}
                      <span style={{ color: "#64748b", fontSize: 11 }}>({m.work_center || "Fabrika"})</span>
                    </td>
                    <td>{m.brand ? `${m.brand} ${m.model || ""}` : "—"}</td>
                    <td style={{ textAlign: "right", fontWeight: 600 }}>{m.power_kw} kW</td>
                    <td style={{ textAlign: "center" }}>{m.daily_hours || 8} sa</td>
                    <td style={{ textAlign: "center" }}>{m.monthly_work_days || 22} gün</td>
                    <td style={{ textAlign: "right" }}>₺{labor}</td>
                    <td style={{ textAlign: "right" }}>₺{overhead}</td>
                    <td style={{ textAlign: "right", fontWeight: 700, color: "#dc2626" }}>₺{totalRate} /saat</td>
                    <td style={{ textAlign: "center", fontWeight: 700, color: (m.efficiency_pct || 90) >= 90 ? "#16a34a" : "#d97706" }}>
                      %{m.efficiency_pct || 90}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span
                        className="badge"
                        style={{
                          background: m.status === "ACTIVE" || !m.status ? "#d1fae5" : "#fee2e2",
                          color: m.status === "ACTIVE" || !m.status ? "#065f46" : "#b91c1c",
                        }}
                      >
                        {m.status === "ACTIVE" || !m.status ? "Aktif" : m.status === "MAINTENANCE" ? "Bakımda" : "Boşta"}
                      </span>
                    </td>
                    <td style={{ textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="btn-top blue"
                        style={{ padding: "2px 8px", marginRight: 4 }}
                        onClick={() => openEdit(m)}
                      >
                        Düzenle
                      </button>
                      <button
                        type="button"
                        className="btn-top"
                        style={{ padding: "2px 8px", color: "#dc2626" }}
                        onClick={() => void handleDelete(m.id)}
                      >
                        Sil
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Detaylı Makine Tanım Kartı Modalı */}
      {modalOpen && (
        <div className="modal-overlay show" role="dialog" aria-modal="true" style={{ display: "flex", zIndex: 1050 }}>
          <div className="modal-card" style={{ maxWidth: 840, width: "95%", maxHeight: "90vh", overflowY: "auto", background: "#ffffff", borderRadius: 12, padding: 20, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", paddingBottom: 10, marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>
                  {editingItem ? `⚙️ Makine Düzenle — ${editingItem.code}` : "⚙️ Yeni Makine Tanım Kartı"}
                </h3>
                <span style={{ fontSize: 12, color: "#64748b" }}>
                  Maliyet bütçesi elektrik, işçilik ve amortisman hesaplamaları bu değerlerle otomatik üretilir.
                </span>
              </div>
              <button type="button" className="btn-secondary" style={{ padding: "4px 8px" }} onClick={() => setModalOpen(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSave}>
              {/* 1. BÖLÜM: TEMEL KİMLİK & LOKASYON */}
              <div style={{ background: "#f8fafc", padding: 12, borderRadius: 8, marginBottom: 14 }}>
                <h4 style={{ margin: "0 0 10px", fontSize: 13, color: "#1e293b", fontWeight: 700 }}>
                  1. Temel Tanım &amp; Sabit Kıymet Bilgileri
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                  <label className="form-label" style={{ fontSize: 12 }}>
                    Makine Kodu *
                    <input
                      className="form-control"
                      required
                      value={form.code || ""}
                      onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                      placeholder="Örn: CNC-01"
                    />
                  </label>
                  <label className="form-label" style={{ fontSize: 12 }}>
                    Makine / İstasyon Adı *
                    <input
                      className="form-control"
                      required
                      value={form.name || ""}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="Örn: Haas VF-2SS 5 Eksen Dik İşleme"
                    />
                  </label>
                  <label className="form-label" style={{ fontSize: 12 }}>
                    Makine Tipi (Ayarlar › Tanımlar)
                    <select
                      className="form-control"
                      value={form.machine_type || "CNC"}
                      onChange={(e) => setForm((f) => ({ ...f, machine_type: e.target.value }))}
                    >
                      {machineTypes.map((t) => (
                        <option key={t.id} value={t.id}>{t.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="form-label" style={{ fontSize: 12 }}>
                    Marka
                    <input
                      className="form-control"
                      value={form.brand || ""}
                      onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
                      placeholder="Örn: Haas, Trumpf, Durma"
                    />
                  </label>
                  <label className="form-label" style={{ fontSize: 12 }}>
                    Model
                    <input
                      className="form-control"
                      value={form.model || ""}
                      onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
                      placeholder="Örn: VF-2SS Super Speed"
                    />
                  </label>
                  <label className="form-label" style={{ fontSize: 12 }}>
                    Seri Numarası
                    <input
                      className="form-control"
                      value={form.serial_no || ""}
                      onChange={(e) => setForm((f) => ({ ...f, serial_no: e.target.value }))}
                      placeholder="Örn: HAAS-2023-8891"
                    />
                  </label>
                  <label className="form-label" style={{ fontSize: 12 }}>
                    İş Merkezi / Atölye
                    <input
                      className="form-control"
                      value={form.work_center || ""}
                      onChange={(e) => setForm((f) => ({ ...f, work_center: e.target.value }))}
                      placeholder="Örn: Talaşlı İmalat Holü 1"
                    />
                  </label>
                  <label className="form-label" style={{ fontSize: 12 }}>
                    Demirbaş / Sabit Kıymet Kodu
                    <select
                      className="form-control"
                      value={form.fixed_asset_code || ""}
                      onChange={(e) => setForm((f) => ({ ...f, fixed_asset_code: e.target.value }))}
                    >
                      <option value="">-- Sabit Kıymet Tanımlarından Seçiniz --</option>
                      {fixedAssets.map((fa) => (
                        <option key={fa.id} value={fa.code}>
                          {fa.code} — {fa.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="form-label" style={{ fontSize: 12 }}>
                    İmalat Yılı
                    <input
                      type="number"
                      className="form-control"
                      value={form.manufacture_year || 2023}
                      onChange={(e) => setForm((f) => ({ ...f, manufacture_year: Number(e.target.value) }))}
                    />
                  </label>
                </div>
              </div>

              {/* 2. BÖLÜM: ENERJİ & KAPASİTE */}
              <div style={{ background: "#f8fafc", padding: 12, borderRadius: 8, marginBottom: 14 }}>
                <h4 style={{ margin: "0 0 10px", fontSize: 13, color: "#1e293b", fontWeight: 700 }}>
                  2. Elektrik Tüketimi, Kapasite &amp; Vardiya Parametreleri
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                  <label className="form-label" style={{ fontSize: 12 }}>
                    Aktif Motor Gücü (kW)
                    <input
                      type="number"
                      step="0.1"
                      className="form-control"
                      value={form.power_kw ?? 15}
                      onChange={(e) => setForm((f) => ({ ...f, power_kw: Number(e.target.value) }))}
                    />
                  </label>
                  <label className="form-label" style={{ fontSize: 12 }}>
                    Standby / Bekleme Gücü (kW)
                    <input
                      type="number"
                      step="0.1"
                      className="form-control"
                      value={form.standby_power_kw ?? 1.5}
                      onChange={(e) => setForm((f) => ({ ...f, standby_power_kw: Number(e.target.value) }))}
                    />
                  </label>
                  <label className="form-label" style={{ fontSize: 12 }}>
                    Günlük Çalışma Saati
                    <input
                      type="number"
                      className="form-control"
                      value={form.daily_hours ?? 16}
                      onChange={(e) => setForm((f) => ({ ...f, daily_hours: Number(e.target.value) }))}
                    />
                  </label>
                  <label className="form-label" style={{ fontSize: 12 }}>
                    Günlük Vardiya Sayısı
                    <input
                      type="number"
                      className="form-control"
                      value={form.shifts_per_day ?? 2}
                      onChange={(e) => setForm((f) => ({ ...f, shifts_per_day: Number(e.target.value) }))}
                    />
                  </label>
                  <label className="form-label" style={{ fontSize: 12 }}>
                    Aylık Çalışma Günü
                    <input
                      type="number"
                      className="form-control"
                      value={form.monthly_work_days ?? 22}
                      onChange={(e) => setForm((f) => ({ ...f, monthly_work_days: Number(e.target.value) }))}
                    />
                  </label>
                  <label className="form-label" style={{ fontSize: 12 }}>
                    Aylık Teorik Kapasite
                    <input
                      type="text"
                      disabled
                      className="form-control"
                      style={{ background: "#e2e8f0", fontWeight: 700 }}
                      value={`${(Number(form.daily_hours) || 16) * (Number(form.monthly_work_days) || 22)} Saat/Ay`}
                    />
                  </label>
                </div>
              </div>

              {/* 3. BÖLÜM: VUK 7/A SAATLİK MALİYETLERİ */}
              <div style={{ background: "#f8fafc", padding: 12, borderRadius: 8, marginBottom: 14 }}>
                <h4 style={{ margin: "0 0 10px", fontSize: 13, color: "#1e293b", fontWeight: 700 }}>
                  3. VUK 7/A Saatlik Maliyet Bileşenleri (₺/saat)
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                  <label className="form-label" style={{ fontSize: 12 }}>
                    720 Direkt İşçilik (₺/saat)
                    <input
                      type="number"
                      className="form-control"
                      value={form.hourly_labor_tl ?? 120}
                      onChange={(e) => setForm((f) => ({ ...f, hourly_labor_tl: Number(e.target.value) }))}
                    />
                  </label>
                  <label className="form-label" style={{ fontSize: 12 }}>
                    730 Amortisman Payı (₺/saat)
                    <input
                      type="number"
                      className="form-control"
                      value={form.hourly_depreciation_tl ?? 60}
                      onChange={(e) => setForm((f) => ({ ...f, hourly_depreciation_tl: Number(e.target.value) }))}
                    />
                  </label>
                  <label className="form-label" style={{ fontSize: 12 }}>
                    730 Bakım &amp; Sarf (₺/saat)
                    <input
                      type="number"
                      className="form-control"
                      value={form.hourly_maintenance_tl ?? 30}
                      onChange={(e) => setForm((f) => ({ ...f, hourly_maintenance_tl: Number(e.target.value) }))}
                    />
                  </label>
                  <label className="form-label" style={{ fontSize: 12 }}>
                    Toplam Saatlik Maliyet (₺/saat)
                    <input
                      type="text"
                      disabled
                      className="form-control"
                      style={{ background: "#fee2e2", fontWeight: 800, color: "#b91c1c" }}
                      value={`₺${(Number(form.hourly_labor_tl) || 0) + (Number(form.hourly_depreciation_tl) || 0) + (Number(form.hourly_maintenance_tl) || 0)}/saat`}
                    />
                  </label>
                </div>
              </div>

              {/* 4. BÖLÜM: VERİM & DURUM */}
              <div style={{ background: "#f8fafc", padding: 12, borderRadius: 8, marginBottom: 14 }}>
                <h4 style={{ margin: "0 0 10px", fontSize: 13, color: "#1e293b", fontWeight: 700 }}>
                  4. Verimlilik, Kalite &amp; Durum
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                  <label className="form-label" style={{ fontSize: 12 }}>
                    OEE Hedef Verimlilik (%)
                    <input
                      type="number"
                      className="form-control"
                      value={form.efficiency_pct ?? 90}
                      onChange={(e) => setForm((f) => ({ ...f, efficiency_pct: Number(e.target.value) }))}
                    />
                  </label>
                  <label className="form-label" style={{ fontSize: 12 }}>
                    Fire / Hurda Oranı (%)
                    <input
                      type="number"
                      step="0.1"
                      className="form-control"
                      value={form.scrap_pct ?? 1.0}
                      onChange={(e) => setForm((f) => ({ ...f, scrap_pct: Number(e.target.value) }))}
                    />
                  </label>
                  <label className="form-label" style={{ fontSize: 12 }}>
                    Makine Durumu
                    <select
                      className="form-control"
                      value={form.status || "ACTIVE"}
                      onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as any }))}
                    >
                      <option value="ACTIVE">Aktif (Çalışıyor)</option>
                      <option value="MAINTENANCE">Bakımda</option>
                      <option value="IDLE">Boşta (Beklemede)</option>
                      <option value="PASSIVE">Pasif</option>
                    </select>
                  </label>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
                <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>
                  Vazgeç
                </button>
                <button type="submit" className="btn-save">
                  💾 Makine Kartını Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
