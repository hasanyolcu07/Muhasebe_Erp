import { useCallback, useEffect, useState } from "react";
import {
  sistemAyarlariApi,
  type SystemUiSettings,
  type UiLanguage,
  type UiTheme,
} from "../../api/sistemAyarlariApi";
import { applyUiTheme } from "../../utils/applyUiTheme";
import { AktifPasifToggle } from "../AktifPasifToggle";

const LANGUAGES: { value: UiLanguage; code: string; name: string; desc: string }[] = [
  { value: "tr", code: "TR", name: "Türkçe", desc: "Varsayılan arayüz dili — tüm menü ve etiketler" },
  { value: "en", code: "GB", name: "English", desc: "International UI labels and system messages" },
  { value: "de", code: "DE", name: "Deutsch", desc: "Deutsche Benutzeroberfläche und Meldungen" },
];

const THEMES: { value: UiTheme; label: string; icon: string; desc: string; swatch: string }[] = [
  {
    value: "light",
    label: "Açık",
    icon: "☀️",
    desc: "Klasik açık tema — ofis ortamı",
    swatch: "linear-gradient(90deg,#f8fafc,#e2e8f0)",
  },
  {
    value: "dark",
    label: "Koyu",
    icon: "🌙",
    desc: "Göz yormayan koyu mod",
    swatch: "linear-gradient(90deg,#0f172a,#334155)",
  },
  {
    value: "navy",
    label: "Lacivert Kurumsal",
    icon: "🏢",
    desc: "Kurumsal lacivert tonları",
    swatch: "linear-gradient(90deg,#1e3a5f,#3b82f6)",
  },
  {
    value: "night-blue",
    label: "Gece Mavisi",
    icon: "🌌",
    desc: "Derin mavi gece teması",
    swatch: "linear-gradient(90deg,#0c4a6e,#38bdf8)",
  },
  {
    value: "corporate",
    label: "Kurumsal Mavi",
    icon: "💼",
    desc: "Profesyonel mavi vurgu",
    swatch: "linear-gradient(90deg,#1e40af,#93c5fd)",
  },
];

export function DilTemaGuvenlikPanel() {
  const [settings, setSettings] = useState<SystemUiSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const s = await sistemAyarlariApi.getUiSettings();
      setSettings(s);
      applyUiTheme(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ayarlar yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSave() {
    if (!settings) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const saved = await sistemAyarlariApi.saveUiSettings(settings);
      setSettings(saved);
      applyUiTheme(saved);
      setMessage("Dil, tema ve güvenlik ayarları kaydedildi.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kayıt başarısız");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="ayar-form-card">Yükleniyor…</div>;
  if (!settings) return <div className="ayar-form-card">{error ?? "Ayar bulunamadı"}</div>;

  return (
    <div className="ayar-panel-dark">
      <div className="ayar-panel-dark-header">
        <h3>Dil, Arayüz Teması ve Güvenlik</h3>
      </div>

      <div className="ayar-panel-dark-body">
        {error ? <div className="reports-error">{error}</div> : null}
        {message ? (
          <div className="ayar-panel-success-msg">{message}</div>
        ) : null}

        <h4 className="section-label">Dil</h4>
        <div className="ayar-lang-row">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.value}
              type="button"
              className={`ayar-lang-card${settings.language === lang.value ? " selected" : ""}`}
              onClick={() => setSettings({ ...settings, language: lang.value })}
            >
              <div className="code">{lang.code}</div>
              <div className="name">{lang.name}</div>
              <div className="desc">{lang.desc}</div>
            </button>
          ))}
        </div>

        <h4 className="section-label">Tema</h4>
        <div className="ayar-theme-grid">
          {THEMES.map((t) => (
            <button
              key={t.value}
              type="button"
              className={`ayar-theme-card${settings.theme === t.value ? " selected" : ""}`}
              onClick={() => {
                const next = { ...settings, theme: t.value };
                setSettings(next);
                applyUiTheme(next);
              }}
            >
              <div className="swatch" style={{ background: t.swatch }} />
              <div className="icon">{t.icon}</div>
              <div className="label">{t.label}</div>
              <div className="desc">{t.desc}</div>
            </button>
          ))}
        </div>

        <h4 className="section-label">Güvenlik</h4>
        <div className="ayar-security-rows ayar-security-rows-compact">
          <div className="ayar-security-row">
            <div>
              <strong>Oturum Zaman Aşımı</strong>
              <div>
                <span>Hareketsizlik (dk)</span>
              </div>
            </div>
            <input
              type="number"
              className="form-control ayar-security-input"
              min={5}
              max={1440}
              value={settings.session_timeout_minutes ?? 60}
              onChange={(e) =>
                setSettings({ ...settings, session_timeout_minutes: Number(e.target.value) })
              }
            />
          </div>
          <div className="ayar-security-row">
            <div>
              <strong>Audit Logging</strong>
              <div>
                <span>Denetim kayıtları</span>
              </div>
            </div>
            <AktifPasifToggle
              value={settings.audit_logging}
              onChange={(v) => setSettings({ ...settings, audit_logging: v })}
            />
          </div>
          <div className="ayar-security-row">
            <div>
              <strong>2FA</strong>
              <div>
                <span>Girişte zorunlu</span>
              </div>
            </div>
            <AktifPasifToggle
              value={settings.two_factor_enabled}
              onChange={(v) => setSettings({ ...settings, two_factor_enabled: v })}
              activeLabel="Aktif"
              passiveLabel="Kapalı"
            />
          </div>
        </div>
      </div>

      <div className="ayar-panel-dark-footer">
        <button type="button" className="btn-save" disabled={saving} onClick={() => void onSave()}>
          {saving ? "Kaydediliyor…" : "Sistem Ayarlarını Kaydet"}
        </button>
      </div>
    </div>
  );
}
