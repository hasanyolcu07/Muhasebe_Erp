import { useEffect, useRef, useState } from "react";
import { api } from "@/services/api";
import { AmountInput } from "@/components/AmountInput";
import { personelStore } from "../services/personelStore";
import { maskTcKimlikNo, maskIban, maskWage, type PersonelRecord } from "../types/personelTypes";
import { usePermissions } from "@/hooks/usePermissions";
import { validateTCKN } from "@/lib/validation/taxIdValidation";

export function PersonelKartlarView() {
  const { roleCode } = usePermissions();
  const [list, setList] = useState<PersonelRecord[]>(() => personelStore.getPersonelList());
  const [query, setQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("HEPSI");
  const [activeOnly, setActiveOnly] = useState(true);
  const [showSensitive, setShowSensitive] = useState(false);
  const [editingPersonel, setEditingPersonel] = useState<PersonelRecord | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [auditModalPersonel, setAuditModalPersonel] = useState<PersonelRecord | null>(null);
  const [departmanlar, setDepartmanlar] = useState<Array<{ id: number; name: string }>>([]);
  const [meslekler, setMeslekler] = useState<Array<{ id: number; kod: string; ad: string }>>([]);
  const [formDirty, setFormDirty] = useState(false);
  const [formNote, setFormNote] = useState("");
  const dirtyRef = useRef(false);

  useEffect(() => {
    if (!isNewModalOpen) return;
    void api<{ items: Array<{ id: number; name: string }> }>("/tanim/departman")
      .then((res) => setDepartmanlar(res.items))
      .catch(() => setDepartmanlar([]));
    void api<{ items: Array<{ id: number; kod: string; ad: string }> }>("/tanim/meslek")
      .then((res) => setMeslekler(res.items))
      .catch(() => setMeslekler([]));
  }, [isNewModalOpen]);

  // Hassas verileri görme yetkisi: ADMIN veya MUHASEBE_MUDURU
  const hasSensitiveAccess =
    roleCode === "ADMIN" || roleCode === "MUHASEBE_MUDURU" || roleCode === "SUPER_ADMIN";

  const filtered = list.filter((p) => {
    if (activeOnly && !p.is_active) return false;
    if (departmentFilter !== "HEPSI" && !p.department.includes(departmentFilter)) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      p.full_name.toLowerCase().includes(q) ||
      p.personel_no.toLowerCase().includes(q) ||
      p.job_title.toLowerCase().includes(q) ||
      p.department.toLowerCase().includes(q) ||
      p.tc_kimlik_no.includes(q)
    );
  });

  const departments = Array.from(new Set(list.map((p) => p.department)));

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const tc = String(formData.get("tc_kimlik_no") || "").trim();
    if (!validateTCKN(tc)) {
      alert("HATA: 11 haneli geçerli bir TC Kimlik Numarası girilmelidir.");
      return;
    }

    const wage = Number(formData.get("wage_amount")) || 0;
    if (wage < 26005.5) {
      if (!confirm("Girilen ücret 2026 yılı yasal brüt asgari ücretin (26.005,50 TL) altındadır. Devam etmek istiyor musunuz?")) {
        return;
      }
    }

    const payload: any = {
      id: editingPersonel?.id,
      first_name: String(formData.get("first_name")),
      last_name: String(formData.get("last_name")),
      tc_kimlik_no: tc,
      phone: String(formData.get("phone")),
      email: String(formData.get("email")),
      address: String(formData.get("address")),
      department: String(formData.get("department")),
      meslek_kodu: String(formData.get("meslek_kodu") || ""),
      job_title: String(formData.get("job_title")),
      branch_name: String(formData.get("branch_name")),
      sgk_workplace_no: String(formData.get("sgk_workplace_no")),
      contract_type: String(formData.get("contract_type")),
      wage_type: String(formData.get("wage_type")),
      wage_calc_type: String(formData.get("wage_calc_type")),
      wage_amount: wage,
      iban: String(formData.get("iban")),
      bank_name: String(formData.get("bank_name")),
      sgk_law_code: String(formData.get("sgk_law_code")),
      exit_reason_code: String(formData.get("exit_reason_code") || "") || null,
      start_date: String(formData.get("start_date")),
      end_date: formData.get("end_date") ? String(formData.get("end_date")) : null,
      is_active: !formData.get("end_date"),
    };

    personelStore.savePersonel(payload, roleCode || "Kullanıcı");
    setList(personelStore.getPersonelList());
    dirtyRef.current = false;
    setFormDirty(false);
    setIsNewModalOpen(false);
    setEditingPersonel(null);
  };

  function requestClose() {
    if (dirtyRef.current && !window.confirm("Kayıt yapılmadan çıkılırsa girilen bilgiler kaybolur. Çıkmak istiyor musunuz?")) return;
    dirtyRef.current = false;
    setFormDirty(false);
    setFormNote("");
    setIsNewModalOpen(false);
    setEditingPersonel(null);
  }

  function markDirty() {
    dirtyRef.current = true;
    setFormDirty(true);
  }

  function prepareBildirge(type: "ISE_GIRIS" | "ISTEN_AYRILIS") {
    if (!editingPersonel) {
      setFormNote("Bildirge için önce kartı kaydedin.");
      return;
    }
    if (dirtyRef.current) {
      setFormNote("Kartta kaydedilmemiş değişiklik var. Önce Kaydet'e basın; bildirge kayıtlı bilgiyle hazırlanır.");
      return;
    }
    const person = personelStore.getPersonelById(editingPersonel.id);
    const tarih = type === "ISE_GIRIS" ? person?.start_date : person?.end_date;
    if (!person || !tarih) {
      setFormNote(type === "ISE_GIRIS" ? "İşe giriş tarihi kayıtlı değil." : "İşten ayrılış tarihi kayıtlı değil.");
      return;
    }
    try {
      personelStore.createSgkNotification(type, person.id, tarih, person.exit_reason_code || "03");
      setFormNote("Bildirge hazırlandı ve İşe Giriş/Çıkış ile SGK Bildirimi listelerine eklendi. Canlı SGK onayı yazılmadı.");
    } catch (error) {
      setFormNote(error instanceof Error ? error.message : "Bildirge hazırlanamadı.");
    }
  }

  useEffect(() => {
    if (!isNewModalOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") requestClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isNewModalOpen]);

  return (
    <div className="personel-kartlar-view">
      <div className="section-toolbar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <input
            type="text"
            className="form-control"
            placeholder="Personel adı, no, görev veya TCKN ara..."
            style={{ width: 280 }}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <select
            className="form-control"
            style={{ width: 180 }}
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
          >
            <option value="HEPSI">Tüm Departmanlar</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer", color: "var(--text)" }}>
            <input
              type="checkbox"
              checked={activeOnly}
              onChange={(e) => setActiveOnly(e.target.checked)}
            />
            Sadece Aktif Personeller
          </label>

          {hasSensitiveAccess && (
            <button
              type="button"
              className={`btn-top ${showSensitive ? "amber" : ""}`}
              onClick={() => setShowSensitive(!showSensitive)}
              title="KVKK / Rol bazlı maskeleme denetimi"
            >
              {showSensitive ? "🔒 Hassas Verileri Maskele" : "👁️ TCKN / Ücretleri Göster"}
            </button>
          )}
        </div>

        <div>
          <button
            type="button"
            className="btn-top green"
            onClick={() => {
              setEditingPersonel(null);
              dirtyRef.current = false;
              setFormDirty(false);
              setFormNote("");
              setIsNewModalOpen(true);
            }}
          >
            ➕ Yeni Personel Kartı
          </button>
        </div>
      </div>

      <div className="table-responsive card" style={{ padding: 0 }}>
        <table className="data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>Personel No</th>
              <th>Adı Soyadı</th>
              <th>TC Kimlik No</th>
              <th>Departman / Görev</th>
              <th>İşe Giriş</th>
              <th>Ücret</th>
              <th>Banka / IBAN</th>
              <th>SGK Teşvik</th>
              <th>Durum</th>
              <th style={{ textAlign: "right" }}>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ textAlign: "center", padding: 24, color: "var(--text-muted)" }}>
                  Kriterlere uygun personel bulunamadı.
                </td>
              </tr>
            ) : (
              filtered.map((p) => {
                const canView = hasSensitiveAccess && showSensitive;
                return (
                  <tr key={p.id}>
                    <td>
                      <strong>{p.personel_no}</strong>
                    </td>
                    <td>
                      <div>{p.full_name}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{p.phone}</div>
                    </td>
                    <td style={{ fontFamily: "monospace" }}>
                      {maskTcKimlikNo(p.tc_kimlik_no, canView)}
                    </td>
                    <td>
                      <div>{p.department}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{p.job_title}</div>
                    </td>
                    <td>{p.start_date}</td>
                    <td style={{ fontWeight: 600 }}>
                      {maskWage(p.wage_amount, canView)}
                      <span style={{ fontSize: 10, color: "var(--text-muted)", marginLeft: 4 }}>
                        ({p.wage_calc_type === "BRUTTEN_NETE" ? "Brüt" : "Net"})
                      </span>
                    </td>
                    <td style={{ fontSize: 12, fontFamily: "monospace" }}>
                      <div>{p.bank_name}</div>
                      <div>{maskIban(p.iban, canView)}</div>
                    </td>
                    <td>
                      <span className="badge" style={{ background: "#e0f2fe", color: "#0369a1", fontSize: 11 }}>
                        {p.sgk_law_code} (%5)
                      </span>
                    </td>
                    <td>
                      {p.is_active ? (
                        <span className="badge" style={{ background: "#dcfce7", color: "#166534" }}>
                          Aktif
                        </span>
                      ) : (
                        <span className="badge" style={{ background: "#fee2e2", color: "#991b1b" }}>
                          Ayrıldı ({p.end_date})
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: 6 }}>
                        <button
                          type="button"
                          className="btn-top"
                          style={{ fontSize: 11, padding: "2px 6px" }}
                          onClick={() => {
                            setEditingPersonel(p);
                            dirtyRef.current = false;
                            setFormDirty(false);
                            setFormNote("");
                            setIsNewModalOpen(true);
                          }}
                        >
                          ✏️ Düzenle
                        </button>
                        <button
                          type="button"
                          className="btn-top blue"
                          style={{ fontSize: 11, padding: "2px 6px" }}
                          onClick={() => setAuditModalPersonel(p)}
                          title="Tarihçe ve Denetim İzi"
                        >
                          📜 Tarihçe
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Yeni / Düzenleme Modalı */}
      {isNewModalOpen && (
        <>
          <div className="slide-over-backdrop" onClick={requestClose} />
          <div className="slide-over-panel" style={{ width: "min(760px, 100vw)" }} role="dialog" aria-modal="true" aria-label="Personel kartı">
            <div className="slide-over-header">
              <h2>{editingPersonel ? "Personel kartını düzenle" : "Yeni personel kartı"}</h2>
              <button type="button" className="btn-cancel" onClick={requestClose}>Kapat</button>
            </div>
            <form className="slide-over-body" onSubmit={handleSave} onChange={markDirty}>
              {formDirty ? <p style={{ marginTop: 0, color: "#92400e" }}>Kaydedilmemiş bilgi var.</p> : null}
              {formNote ? <p style={{ color: "#1e3a8a" }}>{formNote}</p> : null}
              <div className="personel-drawer-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="form-group">
                  <label>Adı *</label>
                  <input
                    type="text"
                    name="first_name"
                    required
                    className="form-control"
                    defaultValue={editingPersonel?.first_name || ""}
                  />
                </div>
                <div className="form-group">
                  <label>Soyadı *</label>
                  <input
                    type="text"
                    name="last_name"
                    required
                    className="form-control"
                    defaultValue={editingPersonel?.last_name || ""}
                  />
                </div>

                <div className="form-group">
                  <label>TC Kimlik Numarası (11 Hane) *</label>
                  <input
                    type="text"
                    name="tc_kimlik_no"
                    required
                    maxLength={11}
                    className="form-control"
                    defaultValue={editingPersonel?.tc_kimlik_no || ""}
                  />
                </div>
                <div className="form-group">
                  <label>Telefon</label>
                  <input
                    type="text"
                    name="phone"
                    className="form-control"
                    defaultValue={editingPersonel?.phone || ""}
                  />
                </div>

                <div className="form-group">
                  <label>E-Posta</label>
                  <input
                    type="email"
                    name="email"
                    className="form-control"
                    defaultValue={editingPersonel?.email || ""}
                  />
                </div>
                <div className="form-group">
                  <label>Departman *</label>
                  <select name="department" required className="form-control" defaultValue={editingPersonel?.department || departmanlar[0]?.name || ""}>
                    {departmanlar.length === 0 ? <option value="">Önce Ayarlar / Personel tanımları</option> : null}
                    {departmanlar.map((row) => (
                      <option key={row.id} value={row.name}>
                        {row.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Görev / Meslek (SGK) *</label>
                  <select
                    name="meslek_kodu"
                    required
                    className="form-control"
                    defaultValue={editingPersonel?.meslek_kodu || ""}
                    onChange={(e) => {
                      const meslek = meslekler.find((row) => row.kod === e.target.value);
                      const title = e.currentTarget.form?.elements.namedItem("job_title");
                      if (title instanceof HTMLInputElement && meslek) title.value = meslek.ad;
                    }}
                  >
                    <option value="">Meslek seçin</option>
                    {meslekler.map((row) => (
                      <option key={row.id} value={row.kod}>
                        {row.kod} — {row.ad}
                      </option>
                    ))}
                  </select>
                  <input type="hidden" name="job_title" defaultValue={editingPersonel?.job_title || ""} />
                </div>
                <div className="form-group">
                  <label>İşyeri / Şube</label>
                  <input
                    type="text"
                    name="branch_name"
                    className="form-control"
                    defaultValue={editingPersonel?.branch_name || "Merkez Fabrika (Bursa)"}
                  />
                </div>

                <div className="form-group">
                  <label>SGK İşyeri Sicil No</label>
                  <input
                    type="text"
                    name="sgk_workplace_no"
                    className="form-control"
                    defaultValue={editingPersonel?.sgk_workplace_no || "4.1234.01.01.1234567.016.01-00"}
                  />
                </div>
                <div className="form-group">
                  <label>Sözleşme Türü</label>
                  <select name="contract_type" className="form-control" defaultValue={editingPersonel?.contract_type || "BELIRSIZ_SURELI"}>
                    <option value="BELIRSIZ_SURELI">Belirsiz Süreli (Daimi)</option>
                    <option value="BELIRLI_SURELI">Belirli Süreli</option>
                    <option value="KISMI_SURELI">Kısmi Süreli (Part-Time)</option>
                    <option value="STAJYER">Stajyer</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Ücret Hesabı</label>
                  <select name="wage_calc_type" className="form-control" defaultValue={editingPersonel?.wage_calc_type || "BRUTTEN_NETE"}>
                    <option value="BRUTTEN_NETE">Brütten Nete</option>
                    <option value="NETTEN_BRUTE">Netten Brüte</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Ücret Tutarı (TL) *</label>
                  <AmountInput
                    name="wage_amount"
                    required
                    className="form-control"
                    defaultValue={editingPersonel?.wage_amount || 30000}
                  />
                </div>

                <div className="form-group">
                  <label>Banka Adı</label>
                  <input
                    type="text"
                    name="bank_name"
                    className="form-control"
                    defaultValue={editingPersonel?.bank_name || "Ziraat Bankası"}
                  />
                </div>
                <div className="form-group">
                  <label>IBAN (TR...)</label>
                  <input
                    type="text"
                    name="iban"
                    className="form-control"
                    defaultValue={editingPersonel?.iban || "TR"}
                  />
                </div>

                <div className="form-group">
                  <label>İşe Giriş Tarihi *</label>
                  <input
                    type="date"
                    name="start_date"
                    required
                    className="form-control"
                    defaultValue={editingPersonel?.start_date || new Date().toISOString().slice(0, 10)}
                  />
                  <button type="button" className="btn-top" style={{ marginTop: 6 }} onClick={() => prepareBildirge("ISE_GIRIS")}>
                    Giriş bildirgesi hazırla
                  </button>
                </div>
                <div className="form-group">
                  <label>İşten Ayrılış Tarihi (Varsa)</label>
                  <input
                    type="date"
                    name="end_date"
                    className="form-control"
                    defaultValue={editingPersonel?.end_date || ""}
                  />
                  <label style={{ marginTop: 6 }}>SGK çıkış kodu</label>
                  <select name="exit_reason_code" className="form-control" defaultValue={editingPersonel?.exit_reason_code || "03"}>
                    <option value="03">03 — İstifa</option>
                    <option value="04">04 — İşveren feshi</option>
                    <option value="05">05 — Belirli süreli sözleşme sonu</option>
                    <option value="08">08 — Emeklilik</option>
                    <option value="16">16 — Nakil</option>
                    <option value="22">22 — Diğer</option>
                  </select>
                  <button type="button" className="btn-top" style={{ marginTop: 6 }} onClick={() => prepareBildirge("ISTEN_AYRILIS")}>
                    Çıkış bildirgesi hazırla
                  </button>
                </div>

                <div className="form-group span-2" style={{ gridColumn: "span 2" }}>
                  <label>SGK Teşvik / Kanun Kodu</label>
                  <select name="sgk_law_code" className="form-control" defaultValue={editingPersonel?.sgk_law_code || "05510"}>
                    <option value="05510">05510 — %5 Hazine Teşviki (Standart)</option>
                    <option value="06111">06111 — Genç ve Kadın İstihdamı Teşviki</option>
                    <option value="00000">00000 — Teşviksiz (Normal Prim)</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer" style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
                <button type="button" className="btn-cancel" onClick={requestClose}>
                  Vazgeç
                </button>
                <button type="submit" className="btn-save">
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* Tarihçe Modalı */}
      {auditModalPersonel && (
        <div className="modal-overlay show" role="dialog" style={{ zIndex: 99999 }}>
          <div className="modal-content" style={{ width: 600 }}>
            <div className="modal-header">
              <span>📜 Değişiklik Tarihçesi: {auditModalPersonel.full_name}</span>
              <button type="button" className="btn-top" onClick={() => setAuditModalPersonel(null)}>
                ✖
              </button>
            </div>
            <div className="modal-body">
              {auditModalPersonel.audit_history.length === 0 ? (
                <p style={{ color: "var(--text-muted)", padding: 12 }}>
                  Bu personel kartında henüz kayıtlı bir değişiklik geçmişi bulunmamaktadır.
                </p>
              ) : (
                <table className="data-table" style={{ width: "100%" }}>
                  <thead>
                    <tr>
                      <th>Tarih</th>
                      <th>Kullanıcı</th>
                      <th>Alan</th>
                      <th>Eski Değer</th>
                      <th>Yeni Değer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditModalPersonel.audit_history.map((a) => (
                      <tr key={a.id}>
                        <td>{new Date(a.date).toLocaleDateString("tr-TR")}</td>
                        <td>{a.changed_by}</td>
                        <td>{a.field}</td>
                        <td style={{ color: "#ef4444" }}>{a.old_value}</td>
                        <td style={{ color: "#10b981", fontWeight: 600 }}>{a.new_value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-cancel" onClick={() => setAuditModalPersonel(null)}>
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
