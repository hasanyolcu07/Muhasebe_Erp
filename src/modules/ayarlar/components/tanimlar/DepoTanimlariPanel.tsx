import { useState } from "react";
import { mockStore, type MockWarehouse } from "@/services/mockDataStore";

const WAREHOUSE_TYPES = [
  { value: "150_HAMMADDE", label: "150 — İlk Madde ve Malzeme Deposu (Hammadde)", coa: "150.01", coaName: "İlk Madde ve Malzeme" },
  { value: "151_YARIMAMUL", label: "151 — Yarı Mamul Ambarı (Üretim İçi)", coa: "151.01", coaName: "Yarı Mamuller" },
  { value: "152_MAMUL", label: "152 — Mamul ve Sevkiyat Deposu", coa: "152.01", coaName: "Mamuller" },
  { value: "153_TICARI", label: "153 — Ticari Mallar ve Yedek Parça", coa: "153.01", coaName: "Ticari Mallar" },
  { value: "KONSINYE", label: "Konsinye / Dış Lokasyon Deposu", coa: "153.90", coaName: "Konsinye Mallar" },
  { value: "HURDA", label: "Hurda, Talaş & İkinci Kalite Deposu", coa: "157.01", coaName: "Diğer Stoklar (Hurda)" },
] as const;

export function DepoTanimlariPanel() {
  const [warehouses, setWarehouses] = useState<MockWarehouse[]>(() => mockStore.getWarehouses());
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  // Form State
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [branchName, setBranchName] = useState("Merkez Şube");
  const [type, setType] = useState<MockWarehouse["warehouse_type"]>("150_HAMMADDE");
  const [coaCode, setCoaCode] = useState("150.01");
  const [coaName, setCoaName] = useState("İlk Madde ve Malzeme");
  const [managerName, setManagerName] = useState("");
  const [location, setLocation] = useState("");
  const [areaSqm, setAreaSqm] = useState<number>(500);
  const [allowNegative, setAllowNegative] = useState(false);
  const [isActive, setIsActive] = useState(true);

  function showMessage(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  function handleSelect(item: MockWarehouse) {
    setSelectedId(item.id);
    setCode(item.code);
    setName(item.name);
    setBranchName(item.branch_name || "Merkez Şube");
    setType(item.warehouse_type);
    setCoaCode(item.coa_code);
    setCoaName(item.coa_name || "");
    setManagerName(item.manager_name || "");
    setLocation(item.location || "");
    setAreaSqm(item.area_sqm || 500);
    setAllowNegative(item.allow_negative_stock);
    setIsActive(item.is_active);
  }

  function handleReset() {
    setSelectedId(null);
    setCode("");
    setName("");
    setBranchName("Merkez Şube");
    setType("150_HAMMADDE");
    setCoaCode("150.01");
    setCoaName("İlk Madde ve Malzeme");
    setManagerName("");
    setLocation("");
    setAreaSqm(500);
    setAllowNegative(false);
    setIsActive(true);
  }

  function handleTypeChange(val: MockWarehouse["warehouse_type"]) {
    setType(val);
    const found = WAREHOUSE_TYPES.find((w) => w.value === val);
    if (found) {
      setCoaCode(found.coa);
      setCoaName(found.coaName);
    }
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || !name.trim()) {
      alert("Lütfen Depo Kodu ve Depo Adı alanlarını doldurunuz.");
      return;
    }

    const payload: Partial<MockWarehouse> & { name: string; code: string } = {
      id: selectedId || undefined,
      code: code.trim().toUpperCase(),
      name: name.trim(),
      branch_id: 1,
      branch_name: branchName,
      warehouse_type: type,
      coa_code: coaCode,
      coa_name: coaName,
      manager_name: managerName.trim(),
      location: location.trim(),
      area_sqm: Number(areaSqm) || 0,
      allow_negative_stock: allowNegative,
      is_active: isActive,
    };

    const saved = mockStore.saveWarehouse(payload);
    const updated = mockStore.getWarehouses();
    setWarehouses(updated);
    setSelectedId(saved.id);
    showMessage(`✔ Depo tanımı başarıyla ${selectedId ? "güncellendi" : "kaydedildi"}.`);
  }

  function handleDelete(id: number) {
    if (!window.confirm("Bu depo tanımını silmek istediğinize emin misiniz?")) return;
    mockStore.deleteWarehouse(id);
    setWarehouses(mockStore.getWarehouses());
    if (selectedId === id) handleReset();
    showMessage("✔ Depo tanımı silindi.");
  }

  const filtered = warehouses.filter((w) => {
    if (!q) return true;
    const term = q.toLowerCase();
    return (
      w.code.toLowerCase().includes(term) ||
      w.name.toLowerCase().includes(term) ||
      w.coa_code.toLowerCase().includes(term) ||
      (w.manager_name && w.manager_name.toLowerCase().includes(term))
    );
  });

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.25fr 1fr", gap: 16 }}>
      {/* SOL: DEPO LİSTESİ */}
      <div className="card" style={{ padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#1e293b" }}>
              🏬 Depo &amp; Ambar Tanımları
            </h3>
            <p style={{ margin: "3px 0 0", fontSize: 12, color: "#64748b" }}>
              Stok &amp; Envanter, İrsaliye, Üretim ve Muhasebe 150/151/152/153 hesapları ile tam entegre depo sistemi.
            </p>
          </div>
          <button type="button" className="btn-primary" style={{ padding: "6px 12px", fontSize: 12 }} onClick={handleReset}>
            + Yeni Depo Ekle
          </button>
        </div>

        {toast && (
          <div style={{ padding: "8px 12px", borderRadius: 6, background: "#dcfce7", color: "#166534", fontSize: 12, fontWeight: 700, marginBottom: 12 }}>
            {toast}
          </div>
        )}

        <div style={{ marginBottom: 12 }}>
          <input
            className="form-control"
            placeholder="Depo kodu, adı, muhasebe hesabı veya yetkili ara…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="data-table" style={{ width: "100%", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                <th style={{ width: 85 }}>Depo Kodu</th>
                <th>Depo Adı / Şube</th>
                <th style={{ width: 130 }}>Depo Türü</th>
                <th style={{ width: 110 }}>Muhasebe Kodu</th>
                <th style={{ width: 110 }}>Sorumlu</th>
                <th style={{ width: 65, textAlign: "center" }}>Durum</th>
                <th style={{ width: 70, textAlign: "center" }}>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((w) => {
                const isSelected = selectedId === w.id;
                return (
                  <tr
                    key={w.id}
                    style={{ background: isSelected ? "#eff6ff" : undefined, cursor: "pointer" }}
                    onClick={() => handleSelect(w)}
                  >
                    <td><strong>{w.code}</strong></td>
                    <td>
                      <div style={{ fontWeight: 700, color: "#0f172a" }}>{w.name}</div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>{w.branch_name} {w.location ? `· ${w.location}` : ""}</div>
                    </td>
                    <td>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 6px",
                          borderRadius: 4,
                          fontSize: 10.5,
                          fontWeight: 700,
                          background: w.warehouse_type.startsWith("150")
                            ? "#dbeafe"
                            : w.warehouse_type.startsWith("151")
                            ? "#fef9c3"
                            : w.warehouse_type.startsWith("152")
                            ? "#dcfce7"
                            : "#f1f5f9",
                          color: w.warehouse_type.startsWith("150")
                            ? "#1e40af"
                            : w.warehouse_type.startsWith("151")
                            ? "#854d0e"
                            : w.warehouse_type.startsWith("152")
                            ? "#166534"
                            : "#334155",
                        }}
                      >
                        {w.warehouse_type.replace("_", " ")}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: "#2563eb" }}>{w.coa_code}</span>
                    </td>
                    <td>{w.manager_name || "—"}</td>
                    <td style={{ textAlign: "center" }}>
                      <span
                        style={{
                          padding: "2px 6px",
                          borderRadius: 4,
                          fontSize: 10,
                          fontWeight: 700,
                          background: w.is_active ? "#dcfce7" : "#fee2e2",
                          color: w.is_active ? "#166534" : "#991b1b",
                        }}
                      >
                        {w.is_active ? "Aktif" : "Pasif"}
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
                          handleDelete(w.id);
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

      {/* SAĞ: DETAY TANIM KARTI */}
      <div className="card" style={{ padding: 16 }}>
        <h4 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 800, color: "#1e293b", borderBottom: "1px solid #e2e8f0", paddingBottom: 8 }}>
          {selectedId ? `Depo Tanımını Düzenle (#${selectedId})` : "Yeni Depo Tanım Kartı"}
        </h4>

        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
            <label style={{ fontSize: 12, fontWeight: 600 }}>
              Depo Kodu *
              <input
                className="form-control"
                required
                placeholder="Örn: DEP-150"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600 }}>
              Depo / Ambar Adı *
              <input
                className="form-control"
                required
                placeholder="Örn: Merkez Hammadde Deposu"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label style={{ fontSize: 12, fontWeight: 600 }}>
              Bağlı Şube
              <select className="form-control" value={branchName} onChange={(e) => setBranchName(e.target.value)}>
                <option value="Merkez Şube">Merkez Şube</option>
                <option value="Fabrika Şubesi">Fabrika Şubesi</option>
                <option value="Lojistik Depo Şubesi">Lojistik Depo Şubesi</option>
              </select>
            </label>
            <label style={{ fontSize: 12, fontWeight: 600 }}>
              Depo Türü (ERP Sınıfı)
              <select className="form-control" value={type} onChange={(e) => handleTypeChange(e.target.value as any)}>
                {WAREHOUSE_TYPES.map((wt) => (
                  <option key={wt.value} value={wt.value}>
                    {wt.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
            <label style={{ fontSize: 12, fontWeight: 600 }}>
              Muhasebe Hesap Kodu (TDHP)
              <input
                className="form-control"
                placeholder="Örn: 150.01"
                value={coaCode}
                onChange={(e) => setCoaCode(e.target.value)}
              />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600 }}>
              Hesap Planı Açıklaması
              <input
                className="form-control"
                placeholder="Örn: İlk Madde ve Malzeme Hesabı"
                value={coaName}
                onChange={(e) => setCoaName(e.target.value)}
              />
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 10 }}>
            <label style={{ fontSize: 12, fontWeight: 600 }}>
              Depo Sorumlusu / Yetkili
              <input
                className="form-control"
                placeholder="Örn: Ali Öztürk (Ambar Şefi)"
                value={managerName}
                onChange={(e) => setManagerName(e.target.value)}
              />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600 }}>
              Depolama Alanı (m²)
              <input
                type="number"
                className="form-control"
                value={areaSqm}
                onChange={(e) => setAreaSqm(Number(e.target.value))}
              />
            </label>
          </div>

          <label style={{ fontSize: 12, fontWeight: 600 }}>
            Fiziki Lokasyon &amp; Adres Bilgisi
            <textarea
              className="form-control"
              rows={2}
              placeholder="Örn: Organize Sanayi Bölgesi 4. Cadde No:12 Fabrika Sahası Ambar Binası"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </label>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={allowNegative}
                onChange={(e) => setAllowNegative(e.target.checked)}
              />
              Eksi Bakiye Çalışmasına İzin Ver (Stok eksiye düşebilir)
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              Bu Depo Aktif (Giriş/Çıkış ve irsaliye işlemlerine açık)
            </label>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 10 }}>
            {selectedId && (
              <button type="button" className="btn-secondary" onClick={handleReset}>
                Vazgeç
              </button>
            )}
            <button type="submit" className="btn-primary">
              💾 {selectedId ? "Depo Bilgilerini Güncelle" : "Depoyu Kaydet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
