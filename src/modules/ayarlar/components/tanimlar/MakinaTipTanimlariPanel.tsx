import { useState } from "react";
import { mockStore, type MockMachineType } from "@/services/mockDataStore";

export function MakinaTipTanimlariPanel() {
  const [types, setTypes] = useState<MockMachineType[]>(() => mockStore.getMachineTypes());
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Form State
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [hourlyAmortization, setHourlyAmortization] = useState<number>(50);
  const [energyMultiplier, setEnergyMultiplier] = useState<number>(1.0);
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);

  function showMessage(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  function handleSelect(item: MockMachineType) {
    setSelectedId(item.id);
    setCode(item.code);
    setName(item.name);
    setHourlyAmortization(item.hourly_amortization_tl ?? 50);
    setEnergyMultiplier(item.energy_multiplier ?? 1.0);
    setDescription(item.description ?? "");
    setIsActive(item.is_active);
  }

  function handleReset() {
    setSelectedId(null);
    setCode("");
    setName("");
    setHourlyAmortization(50);
    setEnergyMultiplier(1.0);
    setDescription("");
    setIsActive(true);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || !name.trim()) {
      alert("Lütfen Tip Kodu ve Tip Adı alanlarını doldurunuz.");
      return;
    }

    const payload: Partial<MockMachineType> & { name: string; code: string } = {
      id: selectedId || undefined,
      code: code.trim().toUpperCase(),
      name: name.trim(),
      hourly_amortization_tl: Number(hourlyAmortization) || 0,
      energy_multiplier: Number(energyMultiplier) || 1.0,
      description: description.trim(),
      is_active: isActive,
    };

    const saved = mockStore.saveMachineType(payload);
    const updated = mockStore.getMachineTypes();
    setTypes(updated);
    setSelectedId(saved.id);
    showMessage(`✔ Makine tipi başarıyla ${selectedId ? "güncellendi" : "kaydedildi"}.`);
  }

  function handleDelete(id: number) {
    if (!window.confirm("Bu makine tipi tanımını silmek istediğinize emin misiniz?")) return;
    mockStore.deleteMachineType(id);
    setTypes(mockStore.getMachineTypes());
    if (selectedId === id) handleReset();
    showMessage("✔ Makine tipi tanımı silindi.");
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 16 }}>
      {/* SOL: LİSTE */}
      <div className="card" style={{ padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#1e293b" }}>
              ⚙️ Makina Tip Tanımları
            </h3>
            <p style={{ margin: "3px 0 0", fontSize: 12, color: "#64748b" }}>
              Üretim ve Makine Parkuru kartlarındaki "Makine Tipi" seçim listesi bu tanımlardan beslenir.
            </p>
          </div>
          <button type="button" className="btn-primary" style={{ padding: "6px 12px", fontSize: 12 }} onClick={handleReset}>
            + Yeni Tip Ekle
          </button>
        </div>

        {toast && (
          <div style={{ padding: "8px 12px", borderRadius: 6, background: "#dcfce7", color: "#166534", fontSize: 12, fontWeight: 700, marginBottom: 12 }}>
            {toast}
          </div>
        )}

        <div style={{ overflowX: "auto" }}>
          <table className="data-table" style={{ width: "100%", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                <th style={{ width: 80 }}>Tip Kodu</th>
                <th>Makine Tipi Adı</th>
                <th style={{ width: 100, textAlign: "right" }}>Saatlik Amortisman</th>
                <th style={{ width: 70, textAlign: "center" }}>Enerji Çarpanı</th>
                <th style={{ width: 70, textAlign: "center" }}>Durum</th>
                <th style={{ width: 80, textAlign: "center" }}>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {types.map((t) => {
                const isSelected = selectedId === t.id;
                return (
                  <tr
                    key={t.id}
                    style={{ background: isSelected ? "#eff6ff" : undefined, cursor: "pointer" }}
                    onClick={() => handleSelect(t)}
                  >
                    <td><strong>{t.code}</strong></td>
                    <td>
                      <div>{t.name}</div>
                      {t.description && <div style={{ fontSize: 11, color: "#64748b" }}>{t.description}</div>}
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 600 }}>
                      ₺{(t.hourly_amortization_tl ?? 50).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}/saat
                    </td>
                    <td style={{ textAlign: "center" }}>x{t.energy_multiplier ?? 1.0}</td>
                    <td style={{ textAlign: "center" }}>
                      <span
                        style={{
                          padding: "2px 6px",
                          borderRadius: 4,
                          fontSize: 10,
                          fontWeight: 700,
                          background: t.is_active ? "#dcfce7" : "#fee2e2",
                          color: t.is_active ? "#166534" : "#991b1b",
                        }}
                      >
                        {t.is_active ? "Aktif" : "Pasif"}
                      </span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        type="button"
                        className="btn-cancel"
                        style={{ padding: "2px 6px", fontSize: 11 }}
                        title="Sil"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(t.id);
                        }}
                      >
                        Sil
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SAĞ: DETAY TANIM FORMU */}
      <div className="card" style={{ padding: 16 }}>
        <h4 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 800, color: "#1e293b", borderBottom: "1px solid #e2e8f0", paddingBottom: 8 }}>
          {selectedId ? `Makine Tipini Düzenle (#${selectedId})` : "Yeni Makine Tipi Tanımla"}
        </h4>

        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
            <label style={{ fontSize: 12, fontWeight: 600 }}>
              Tip Kodu *
              <input
                className="form-control"
                required
                placeholder="Örn: CNC, PRES"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600 }}>
              Tip Adı *
              <input
                className="form-control"
                required
                placeholder="Örn: CNC 5 Eksen Dik İşleme"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label style={{ fontSize: 12, fontWeight: 600 }}>
              Saatlik Amortisman (₺/Saat)
              <input
                type="number"
                step="0.5"
                className="form-control"
                value={hourlyAmortization}
                onChange={(e) => setHourlyAmortization(Number(e.target.value))}
              />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600 }}>
              Enerji Tüketim Çarpanı
              <input
                type="number"
                step="0.1"
                className="form-control"
                value={energyMultiplier}
                onChange={(e) => setEnergyMultiplier(Number(e.target.value))}
              />
            </label>
          </div>

          <label style={{ fontSize: 12, fontWeight: 600 }}>
            Açıklama &amp; Kullanım Alanı
            <textarea
              className="form-control"
              rows={3}
              placeholder="Bu makine tipi kapsamındaki iş istasyonları, VUK amortisman kriterleri ve proses notları..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            Bu Makine Tipi Aktif (Seçim menülerinde listelensin)
          </label>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 10 }}>
            {selectedId && (
              <button type="button" className="btn-secondary" onClick={handleReset}>
                Vazgeç
              </button>
            )}
            <button type="submit" className="btn-primary">
              💾 {selectedId ? "Değişiklikleri Güncelle" : "Tipi Kaydet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
