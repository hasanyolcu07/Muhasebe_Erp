import { useCallback, useEffect, useState } from "react";
import { AyarCollapse, AyarField } from "../AyarFormBits";
import {
  sistemAyarlariApi,
  type FirmaBranding,
  type FirmaProfile,
  type WorkingPeriod,
} from "../../api/sistemAyarlariApi";
import { applyBrandingColors } from "../../utils/applyUiTheme";

type TabId = "genel" | "varsayilanlar" | "edonusum" | "naceler";

const TABS: { id: TabId; label: string }[] = [
  { id: "genel", label: "Genel Bilgiler" },
  { id: "varsayilanlar", label: "Varsayılanlar" },
  { id: "edonusum", label: "E-Dönüşüm Bilgileri" },
  { id: "naceler", label: "Naceler" },
];

function readBranding(profile: FirmaProfile): FirmaBranding {
  const extra = (profile.profile_extra || {}) as Record<string, unknown>;
  const branding = (extra.branding || {}) as FirmaBranding;
  return {
    logo_data_url: branding.logo_data_url ?? null,
    theme_color: branding.theme_color ?? "#2563eb",
    card_border_light: branding.card_border_light ?? "#e2e8f0",
    card_border_dark: branding.card_border_dark ?? "#334155",
    working_periods: branding.working_periods ?? [
      {
        id: "p-2026",
        label: "2026",
        year_start: 2026,
        year_end: 2026,
        status: "open",
      },
    ],
  };
}

function GenelBilgiler({
  profile,
  onPatch,
  onDogrula,
  verified,
  branding,
  onBranding,
}: {
  profile: FirmaProfile;
  onPatch: (patch: Partial<FirmaProfile>) => void;
  onDogrula: () => void;
  verified: boolean;
  branding: FirmaBranding;
  onBranding: (next: FirmaBranding) => void;
}) {
  const [draftStart, setDraftStart] = useState(new Date().getFullYear());
  const [draftEnd, setDraftEnd] = useState(new Date().getFullYear());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [periodGuard, setPeriodGuard] = useState(false);

  function onLogoFile(file: File | null) {
    if (!file) return;
    if (!/^image\/(png|jpeg|jpg)$/i.test(file.type)) {
      alert("Sadece PNG veya JPG yükleyin");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      onBranding({ ...branding, logo_data_url: String(reader.result || "") });
    };
    reader.readAsDataURL(file);
  }

  function addPeriod() {
    const start = Number(draftStart) || new Date().getFullYear();
    const end = Number(draftEnd) || start;
    const yStart = Math.min(start, end);
    const yEnd = Math.max(start, end);
    const label = yStart === yEnd ? String(yStart) : `${yStart}-${yEnd}`;
    const next: WorkingPeriod = {
      id: `p-${yStart}-${Date.now()}`,
      label,
      year_start: yStart,
      year_end: yEnd,
      status: "open",
    };
    onBranding({
      ...branding,
      working_periods: [...(branding.working_periods || []), next],
    });
    setDraftStart(yEnd + 1);
    setDraftEnd(yEnd + 1);
  }

  function patchPeriod(id: string, patch: Partial<WorkingPeriod>) {
    onBranding({
      ...branding,
      working_periods: (branding.working_periods || []).map((p) =>
        p.id === id ? { ...p, ...patch } : p,
      ),
    });
  }

  function removePeriod(id: string) {
    onBranding({
      ...branding,
      working_periods: (branding.working_periods || []).filter((p) => p.id !== id),
    });
    if (editingId === id) setEditingId(null);
  }

  return (
    <>
      <div className="gg-grid-2col">
        <div>
          <AyarField label="Firma Tipi">
            <select
              className="form-control"
              value={profile.company_type === "SAHIS" ? "sahis" : "tuzel"}
              onChange={(e) =>
                onPatch({
                  company_type: e.target.value === "sahis" ? "SAHIS" : "TUZEL",
                })
              }
            >
              <option value="tuzel">Tüzel Kişi</option>
              <option value="sahis">Şahıs</option>
            </select>
          </AyarField>
          <AyarField label="Vergi No">
            <input
              className="form-control"
              value={profile.tax_number ?? ""}
              readOnly={verified}
              placeholder="Vergi No"
              onChange={(e) => onPatch({ tax_number: e.target.value })}
            />
            <button type="button" className="btn-secondary" onClick={onDogrula}>
              Bul
            </button>
          </AyarField>
          <AyarField label="Kısa Ad">
            <input
              className="form-control"
              value={profile.short_name ?? ""}
              onChange={(e) => onPatch({ short_name: e.target.value })}
            />
          </AyarField>
          <AyarField label="Firma Adı">
            <input
              className="form-control"
              value={profile.name ?? ""}
              onChange={(e) => onPatch({ name: e.target.value })}
            />
          </AyarField>
          <AyarField label="Vergi Dairesi">
            <input
              className="form-control"
              value={profile.tax_office ?? ""}
              onChange={(e) => onPatch({ tax_office: e.target.value })}
            />
          </AyarField>
          <AyarField
            label="Kimlik No"
            hint="Kimlik No alanı şahıs firmalarında UBL Servisi için gereklidir."
          >
            <input
              className="form-control"
              value={profile.tc_identity_no ?? ""}
              readOnly={verified}
              onChange={(e) => onPatch({ tc_identity_no: e.target.value })}
            />
          </AyarField>
          <AyarField label="Firma Para Birimi">
            <select
              className="form-control"
              value={profile.currency_code ?? "TRY"}
              onChange={(e) => onPatch({ currency_code: e.target.value })}
            >
              <option value="TRY">TRY - Türk Lirası</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </AyarField>
          <AyarField label="Firma Açılış Tarihi">
            <input
              className="form-control"
              type="date"
              value={profile.opening_date ?? ""}
              onChange={(e) => onPatch({ opening_date: e.target.value })}
            />
          </AyarField>
          <AyarField label="Firma Kapanış Tarihi">
            <input
              className="form-control"
              type="date"
              value={profile.closing_date ?? ""}
              onChange={(e) => onPatch({ closing_date: e.target.value })}
            />
          </AyarField>
        </div>
        <div>
          <AyarField label="Telefon">
            <input
              className="form-control"
              value={profile.phone ?? ""}
              onChange={(e) => onPatch({ phone: e.target.value })}
            />
          </AyarField>
          <AyarField label="E-Posta">
            <input
              className="form-control"
              type="email"
              value={profile.email ?? ""}
              onChange={(e) => onPatch({ email: e.target.value })}
            />
          </AyarField>
          <AyarField label="Web Sitesi">
            <input
              className="form-control"
              value={profile.website ?? ""}
              onChange={(e) => onPatch({ website: e.target.value })}
            />
          </AyarField>
          <AyarField label="Ülke">
            <select
              className="form-control"
              value={profile.country_code ?? "TR"}
              onChange={(e) => onPatch({ country_code: e.target.value })}
            >
              <option value="TR">TÜRKİYE</option>
            </select>
          </AyarField>
          <AyarField label="Şehir">
            <input
              className="form-control"
              value={profile.city ?? ""}
              onChange={(e) => onPatch({ city: e.target.value })}
            />
          </AyarField>
          <AyarField label="Posta Kodu">
            <input
              className="form-control"
              value={profile.postal_code ?? ""}
              onChange={(e) => onPatch({ postal_code: e.target.value })}
            />
          </AyarField>
          <AyarField label="Adres">
            <input
              className="form-control"
              value={profile.address_line ?? ""}
              onChange={(e) => onPatch({ address_line: e.target.value })}
            />
          </AyarField>
          {verified ? (
            <p style={{ fontSize: 12, color: "#059669" }}>✔ Resmi/entegratör doğrulaması yapıldı</p>
          ) : null}
        </div>
      </div>

      <hr style={{ margin: "20px 0", border: 0, borderTop: "1px solid var(--border)" }} />

      <h4 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 800 }}>Görünüm & Çalışma Dönemi</h4>
      <div className="gg-grid-2col">
        <div>
          <AyarField label="Şirket Logosu (PNG/JPG)">
            <input
              className="form-control"
              type="file"
              accept="image/png,image/jpeg"
              onChange={(e) => onLogoFile(e.target.files?.[0] ?? null)}
            />
          </AyarField>
          {branding.logo_data_url ? (
            <div style={{ marginBottom: 12 }}>
              <img
                src={branding.logo_data_url}
                alt="Logo"
                style={{ maxHeight: 64, maxWidth: 180, objectFit: "contain", border: "1px solid var(--border)", borderRadius: 8, padding: 4 }}
              />
              <button
                type="button"
                className="btn-top"
                style={{ marginLeft: 8, fontSize: 12 }}
                onClick={() => onBranding({ ...branding, logo_data_url: null })}
              >
                Kaldır
              </button>
            </div>
          ) : null}
          <AyarField label="Uygulama Ekran Tema Rengi">
            <input
              className="form-control"
              type="color"
              value={branding.theme_color || "#2563eb"}
              onChange={(e) => {
                const next = { ...branding, theme_color: e.target.value };
                onBranding(next);
                applyBrandingColors(next);
              }}
            />
          </AyarField>
        </div>
        <div>
          <AyarField label="Kart Çerçeve Rengi (Açık Tema)">
            <input
              className="form-control"
              type="color"
              value={branding.card_border_light || "#e2e8f0"}
              onChange={(e) => {
                const next = { ...branding, card_border_light: e.target.value };
                onBranding(next);
                applyBrandingColors(next);
              }}
            />
          </AyarField>
          <AyarField label="Kart Çerçeve Rengi (Koyu Tema)">
            <input
              className="form-control"
              type="color"
              value={branding.card_border_dark || "#334155"}
              onChange={(e) => {
                const next = { ...branding, card_border_dark: e.target.value };
                onBranding(next);
                applyBrandingColors(next);
              }}
            />
          </AyarField>
        </div>
      </div>

      <div className="ayar-frame" style={{ marginTop: 16 }}>
        <div className="ayar-frame-head">
          <h4>Çalışma Dönemi &amp; Yıl Tanımları</h4>
          <button
            type="button"
            className="btn-secondary"
            style={{ fontSize: 12 }}
            onClick={() => setPeriodGuard((v) => !v)}
          >
            {periodGuard ? "✔ " : ""}Dönemsel Veri Giriş Koruması
          </button>
        </div>
        {periodGuard ? (
          <p style={{ margin: "0 0 10px", fontSize: 12, color: "#b45309" }}>
            Kapalı dönemlere veri girişi engellenir.
          </p>
        ) : null}
        <div className="ayar-period-row">
          <div className="ayar-period-field">
            <label>Dönem Başlangıç Yılı</label>
            <input
              type="number"
              className="form-control"
              value={draftStart}
              onChange={(e) => setDraftStart(Number(e.target.value))}
            />
          </div>
          <div className="ayar-period-field">
            <label>Dönem Bitiş Yılı</label>
            <input
              type="number"
              className="form-control"
              value={draftEnd}
              onChange={(e) => setDraftEnd(Number(e.target.value))}
            />
          </div>
          <button type="button" className="btn-add-green" onClick={addPeriod}>
            + Yeni Dönem Yılı Ekle
          </button>
        </div>
        <div className="ayar-year-chips">
          {(branding.working_periods || []).length === 0 ? (
            <span style={{ fontSize: 13, color: "#94a3b8" }}>Tanımlı dönem yılı yok</span>
          ) : (
            (branding.working_periods || []).map((p) => (
              <div
                key={p.id}
                className={`ayar-year-chip${editingId === p.id ? " editing" : ""}`}
              >
                {editingId === p.id ? (
                  <>
                    <input
                      className="form-control"
                      style={{ width: 70, padding: "2px 6px", fontSize: 12 }}
                      type="number"
                      value={p.year_start}
                      onChange={(e) =>
                        patchPeriod(p.id, {
                          year_start: Number(e.target.value),
                          label:
                            Number(e.target.value) === p.year_end
                              ? String(e.target.value)
                              : `${e.target.value}-${p.year_end}`,
                        })
                      }
                    />
                    <span>–</span>
                    <input
                      className="form-control"
                      style={{ width: 70, padding: "2px 6px", fontSize: 12 }}
                      type="number"
                      value={p.year_end}
                      onChange={(e) =>
                        patchPeriod(p.id, {
                          year_end: Number(e.target.value),
                          label:
                            p.year_start === Number(e.target.value)
                              ? String(e.target.value)
                              : `${p.year_start}-${e.target.value}`,
                        })
                      }
                    />
                    <select
                      className="form-control"
                      style={{ width: 90, padding: "2px 4px", fontSize: 11 }}
                      value={p.status}
                      onChange={(e) =>
                        patchPeriod(p.id, { status: e.target.value as WorkingPeriod["status"] })
                      }
                    >
                      <option value="open">Açık</option>
                      <option value="closed">Kapalı</option>
                    </select>
                  </>
                ) : (
                  <>
                    <span>{p.label || `${p.year_start}`}</span>
                    <span className={`ayar-badge ${p.status === "open" ? "open" : "closed"}`}>
                      {p.status === "open" ? "AÇIK" : "KAPALI"}
                    </span>
                  </>
                )}
                <span className="ayar-chip-actions">
                  <button
                    type="button"
                    title="Düzenle"
                    onClick={() => setEditingId(editingId === p.id ? null : p.id)}
                  >
                    ✎
                  </button>
                  <button type="button" title="Sil" onClick={() => removePeriod(p.id)}>
                    🗑
                  </button>
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}

function Varsayilanlar() {
  const [earOpen, setEarOpen] = useState(false);
  return (
    <>
      <div className="gg-grid-2col">
        <div>
          <AyarField label="KDV Oranı">
            <select className="form-control" defaultValue="20">
              <option value="20">20</option>
              <option value="10">10</option>
              <option value="1">1</option>
              <option value="0">0</option>
            </select>
          </AyarField>
          <AyarField label="Satış KDV Durumu">
            <select className="form-control" defaultValue="haric">
              <option value="haric">Hariç</option>
              <option value="dahil">Dahil</option>
            </select>
          </AyarField>
          <AyarField label="Alış KDV Durumu">
            <select className="form-control" defaultValue="haric">
              <option value="haric">Hariç</option>
              <option value="dahil">Dahil</option>
            </select>
          </AyarField>
          <AyarField label="G.V. Stopaj Oranı">
            <input className="form-control" defaultValue="0,00" />
          </AyarField>
          <AyarField label="Borsa Tes. Üc. Oranı">
            <input className="form-control" defaultValue="0,00" />
          </AyarField>
          <AyarField label="Mera Fonu Oranı">
            <input className="form-control" defaultValue="0,00" />
          </AyarField>
          <AyarField label="Sgk Prim Kesintisi Oranı">
            <input className="form-control" defaultValue="0,00" />
          </AyarField>
          <AyarField label="Konaklama Vergisi Birim Fiyata Dahil mi?">
            <input type="checkbox" className="toggle-switch" aria-label="Konaklama vergisi" />
          </AyarField>
        </div>
        <div>
          <AyarField label="Mal/Hizmet Tipi">
            <select className="form-control" defaultValue="hepsi">
              <option value="hepsi">Hepsi</option>
              <option value="mal">Mal</option>
              <option value="hizmet">Hizmet</option>
            </select>
          </AyarField>
          <AyarField label="Varsayılan Kur Tipi">
            <select className="form-control" defaultValue="tcmb">
              <option value="tcmb">TCMB SATIŞ</option>
              <option value="tcmb_alis">TCMB ALIŞ</option>
            </select>
          </AyarField>
          <AyarField label="Varsayılan Para Birimi">
            <select className="form-control" defaultValue="TRY">
              <option value="TRY">TRY - Türk Lirası</option>
            </select>
          </AyarField>
          <AyarField label="Varsayılan Depo">
            <select className="form-control" defaultValue="">
              <option value="">Seçim Yapın</option>
            </select>
          </AyarField>
          <AyarField label="Müstahsil Tipi">
            <select className="form-control" defaultValue="taslak">
              <option value="taslak">Taslak</option>
            </select>
          </AyarField>
          <AyarField label="E-Arşiv Posta Kullanımı Var">
            <input type="checkbox" aria-label="E-Arşiv posta" />
          </AyarField>
          <AyarField label="GİB E-Belge Mükellefleri Gelmesin">
            <input type="checkbox" aria-label="GİB mükellef" />
          </AyarField>
          <AyarField label="WhatsApp Üzerinden Belge Paylaşımı Yapılabilsin">
            <input type="checkbox" aria-label="WhatsApp paylaşım" />
          </AyarField>
        </div>
      </div>
      <AyarCollapse title="E-Arşiv İnternet Bilgileri" open={earOpen} onToggle={() => setEarOpen((v) => !v)}>
        <button type="button" className="btn-save">İnternet Satış Bilgisi Ekle</button>
      </AyarCollapse>
    </>
  );
}

function EDonusum() {
  const [edOpen, setEdOpen] = useState(true);
  const [pkOpen, setPkOpen] = useState(true);
  const [donemOpen, setDonemOpen] = useState(true);

  return (
    <>
      <AyarCollapse title="E-Dönüşüm" open={edOpen} onToggle={() => setEdOpen((v) => !v)}>
        <div className="gg-grid-2col">
          <div>
            <AyarField label="E-Fatura Geçiş Tarihi">
              <span><span className="ayar-ok">✔</span></span>
              <input className="form-control" type="date" />
            </AyarField>
            <AyarField label="E-Arşiv Geçiş Tarihi">
              <span><span className="ayar-ok">✔</span></span>
              <input className="form-control" type="date" />
            </AyarField>
            <AyarField label="TabiaERP Muhasebe Geçiş Tarihi">
              <span><span className="ayar-ok">✔</span></span>
              <input className="form-control" type="date" />
            </AyarField>
          </div>
          <div>
            <AyarField label="Vergi İadesi Alınacak Kurum">
              <select className="form-control" defaultValue="">
                <option value="">Seçim Yapın</option>
              </select>
            </AyarField>
            <AyarField label="Vergi İadesi Alınacak Kurum Posta Kutusu">
              <select className="form-control" defaultValue="">
                <option value="">Seçim Yapın</option>
              </select>
            </AyarField>
          </div>
        </div>
      </AyarCollapse>

      <AyarCollapse title="Posta Kutuları" open={pkOpen} onToggle={() => setPkOpen((v) => !v)}>
        <div className="mailbox-row">
          <span>📄 E-Fatura / GB Etiketi</span>
          <span>✉️ urn:mail:…@…</span>
          <span>📅 —</span>
        </div>
        <div className="mailbox-row">
          <span>📄 E-Fatura / PK Etiketi</span>
          <span>✉️ urn:mail:…@…</span>
          <span>📅 —</span>
        </div>
      </AyarCollapse>

      <AyarCollapse
        title="TabiaERP Muhasebe Dönem Bilgileri"
        open={donemOpen}
        onToggle={() => setDonemOpen((v) => !v)}
      >
        <AyarField label="TabiaERP Muhasebe Geçiş Tarihi">
          <span><span className="ayar-ok">✔</span></span>
          <input className="form-control" type="date" />
        </AyarField>
        <button type="button" className="btn-save" style={{ marginTop: 8 }}>
          Modül Ekle
        </button>
      </AyarCollapse>
    </>
  );
}

function Naceler() {
  return (
    <>
      <div className="gg-grid-2col" style={{ marginBottom: 16 }}>
        <AyarField label="Mükellef Bilgileri Senk Zamanı">
          <input className="form-control" readOnly placeholder="—" />
        </AyarField>
        <AyarField label="Şube Bilgileri Senk Zamanı">
          <input className="form-control" readOnly placeholder="—" />
        </AyarField>
        <AyarField label="Nace Bilgileri Senk Zamanı">
          <input className="form-control" readOnly placeholder="—" />
        </AyarField>
        <AyarField label="Faal Terk Durumu">
          <input className="form-control" readOnly placeholder="—" />
        </AyarField>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table className="data-table" style={{ width: "100%", fontSize: 12 }}>
          <thead>
            <tr>
              <th>Oluşturma Zamanı</th>
              <th>Şube No</th>
              <th>Vergi Dairesi Kodu</th>
              <th>Nace Kod</th>
              <th>Nace Ad</th>
              <th>Nace Durumu</th>
              <th>Başlangıç Tarihi</th>
              <th>Bitiş Tarihi</th>
              <th>NaceOpTimeStartDate</th>
              <th>NaceOpTimeEndDate</th>
              <th>Kullanılabilir KDV Oranları</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={11} style={{ textAlign: "center", color: "#94a3b8", padding: 24 }}>
                Gösterilecek satır yok
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}

/** Firma Bilgileri — Genel / Varsayılanlar / E-Dönüşüm / Naceler */
export function FirmaBilgileriPanel() {
  const [tab, setTab] = useState<TabId>("genel");
  const [profile, setProfile] = useState<FirmaProfile | null>(null);
  const [branding, setBranding] = useState<FirmaBranding>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const p = await sistemAyarlariApi.getFirma();
      setProfile(p);
      const b = readBranding(p);
      setBranding(b);
      applyBrandingColors(b);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Firma bilgileri yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (!profile?.name) return;
    setSaving(true);
    setError(null);
    try {
      const nextExtra = {
        ...(profile.profile_extra || {}),
        branding,
      };
      const saved = await sistemAyarlariApi.updateFirma({
        ...profile,
        profile_extra: nextExtra,
      });
      setProfile(saved);
      const b = readBranding(saved);
      setBranding(b);
      applyBrandingColors(b);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kayıt başarısız");
    } finally {
      setSaving(false);
    }
  }

  async function dogrula() {
    const num = profile?.tax_number || profile?.tc_identity_no;
    if (!num) return;
    try {
      await sistemAyarlariApi.dogrulaFirma(num);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Doğrulama başarısız");
    }
  }

  if (loading) return <div className="ayar-form-card">Yükleniyor…</div>;
  if (!profile) return <div className="ayar-form-card">{error ?? "Firma bulunamadı"}</div>;

  const verified = Boolean(profile.tax_verified || profile.integrator_verified);

  return (
    <div>
      {error ? <div className="reports-error">{error}</div> : null}
      <div className="gg-tabs-bar" style={{ borderRadius: "8px 8px 0 0", borderBottom: "2px solid var(--border)" }}>
        {TABS.map((t) => (
          <div
            key={t.id}
            className={`gg-tab${tab === t.id ? " active" : ""}`}
            role="button"
            tabIndex={0}
            onClick={() => setTab(t.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") setTab(t.id);
            }}
          >
            {t.label}
          </div>
        ))}
      </div>
      <div className="ayar-form-card" style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
        {tab === "genel" ? (
          <GenelBilgiler
            profile={profile}
            verified={verified}
            branding={branding}
            onBranding={setBranding}
            onPatch={(patch) => setProfile((prev) => (prev ? { ...prev, ...patch } : prev))}
            onDogrula={() => void dogrula()}
          />
        ) : null}
        {tab === "varsayilanlar" ? <Varsayilanlar /> : null}
        {tab === "edonusum" ? <EDonusum /> : null}
        {tab === "naceler" ? <Naceler /> : null}
        <div style={{ marginTop: 20, textAlign: "right" }}>
          <button type="button" className="btn-save" disabled={saving} onClick={() => void save()}>
            {saving ? "Kaydediliyor…" : "Kaydet"}
          </button>
        </div>
      </div>
    </div>
  );
}
