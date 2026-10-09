import { useCallback, useEffect, useState } from "react";
import {
  sistemAyarlariApi,
  type NotificationDefinitions,
  type NotificationRule,
} from "../../api/sistemAyarlariApi";
import { AktifPasifToggle } from "../AktifPasifToggle";

interface ExtendedNotificationRule extends NotificationRule {
  category?: "finans" | "stok" | "uretim" | "resmi" | "sistem";
  channel_app?: boolean;
  channel_email?: boolean;
  channel_sms?: boolean;
  severity?: "INFO" | "WARNING" | "CRITICAL";
}

const DEFAULT_COMPREHENSIVE_RULES: ExtendedNotificationRule[] = [
  // Finans
  {
    key: "cek_vade",
    label: "Vadesi Yaklaşan Çek ve Senetler",
    category: "finans",
    enabled: true,
    days: 5,
    threshold: null,
    channel_app: true,
    channel_email: true,
    channel_sms: false,
    severity: "WARNING",
  },
  {
    key: "fatura_vade",
    label: "Ödeme Vadesi Gelen Satış/Alış Faturaları",
    category: "finans",
    enabled: true,
    days: 3,
    threshold: null,
    channel_app: true,
    channel_email: true,
    channel_sms: false,
    severity: "WARNING",
  },
  {
    key: "kredi_pos_vade",
    label: "Banka Kredisi & POS Geri Ödeme Vadesi",
    category: "finans",
    enabled: true,
    days: 2,
    threshold: null,
    channel_app: true,
    channel_email: false,
    channel_sms: true,
    severity: "WARNING",
  },
  {
    key: "bakiye_risk",
    label: "Cari Hesap Risk Limiti & Açık Hesap Aşımı",
    category: "finans",
    enabled: true,
    days: null,
    threshold: 150000,
    channel_app: true,
    channel_email: true,
    channel_sms: false,
    severity: "CRITICAL",
  },

  // Stok & Depo
  {
    key: "stok_min",
    label: "Kritik / Minimum Stok Seviyesi Altına Düşenler",
    category: "stok",
    enabled: true,
    days: null,
    threshold: 50,
    channel_app: true,
    channel_email: true,
    channel_sms: false,
    severity: "CRITICAL",
  },
  {
    key: "stok_max",
    label: "Maksimum Stok Seviyesi ve Depo Kapasite Aşımı",
    category: "stok",
    enabled: false,
    days: null,
    threshold: 1000,
    channel_app: true,
    channel_email: false,
    channel_sms: false,
    severity: "INFO",
  },
  {
    key: "skt_yaklasan",
    label: "Raf Ömrü & SKT Yaklaşan Malzemeler",
    category: "stok",
    enabled: true,
    days: 15,
    threshold: null,
    channel_app: true,
    channel_email: true,
    channel_sms: false,
    severity: "WARNING",
  },

  // Üretim & MRP
  {
    key: "uretim_gecikme",
    label: "Termini Yaklaşan ve Geciken Üretim Emirleri",
    category: "uretim",
    enabled: true,
    days: 2,
    threshold: null,
    channel_app: true,
    channel_email: true,
    channel_sms: false,
    severity: "CRITICAL",
  },
  {
    key: "makina_bakim",
    label: "Makina Parkuru Periyodik Bakım ve Kalibrasyon",
    category: "uretim",
    enabled: true,
    days: 7,
    threshold: null,
    channel_app: true,
    channel_email: false,
    channel_sms: false,
    severity: "WARNING",
  },
  {
    key: "mrp_eksik",
    label: "MRP Hammadde & Yarı Mamul Tedarik Eksiği",
    category: "uretim",
    enabled: true,
    days: null,
    threshold: 10,
    channel_app: true,
    channel_email: true,
    channel_sms: false,
    severity: "WARNING",
  },

  // Resmi & E-Belge
  {
    key: "egm",
    label: "GİB Beyanname & Resmi Vergi Süresi Hatırlatıcısı",
    category: "resmi",
    enabled: true,
    days: 7,
    threshold: null,
    channel_app: true,
    channel_email: true,
    channel_sms: true,
    severity: "CRITICAL",
  },
  {
    key: "e_fatura_onay",
    label: "GİB Onayı Bekleyen Gelen / Giden E-Faturalar",
    category: "resmi",
    enabled: true,
    days: 2,
    threshold: null,
    channel_app: true,
    channel_email: false,
    channel_sms: false,
    severity: "WARNING",
  },
  {
    key: "sertifika_sure",
    label: "E-İmza & Mali Mühür Sertifika Geçerlilik Süresi",
    category: "resmi",
    enabled: true,
    days: 30,
    threshold: null,
    channel_app: true,
    channel_email: true,
    channel_sms: true,
    severity: "CRITICAL",
  },

  // Sistem & Lisans
  {
    key: "sozlesme",
    label: "Kurumsal ERP Lisans ve Destek Sözleşmesi Bitişi",
    category: "sistem",
    enabled: true,
    days: 30,
    threshold: null,
    channel_app: true,
    channel_email: true,
    channel_sms: false,
    severity: "CRITICAL",
  },
  {
    key: "yedekleme",
    label: "Otomatik Veritabanı Yedekleme ve Durum Özeti",
    category: "sistem",
    enabled: true,
    days: 1,
    threshold: null,
    channel_app: true,
    channel_email: false,
    channel_sms: false,
    severity: "INFO",
  },
];

const CATEGORIES = [
  { id: "all", label: "Tüm Bildirimler", icon: "🔔" },
  { id: "finans", label: "Finans & Muhasebe", icon: "💰" },
  { id: "stok", label: "Stok & Depo", icon: "📦" },
  { id: "uretim", label: "Üretim & MRP", icon: "⚙️" },
  { id: "resmi", label: "GİB & E-Belge", icon: "🏛️" },
  { id: "sistem", label: "Sistem & Lisans", icon: "🛡️" },
];

export function BildirimTanimlariPanel() {
  const [rules, setRules] = useState<ExtendedNotificationRule[]>(DEFAULT_COMPREHENSIVE_RULES);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await sistemAyarlariApi.getBildirimler();
      if (res && Array.isArray(res.rules) && res.rules.length > 0) {
        // Gelen kuralları varsayılan zengin şablonla harmanla
        const merged = DEFAULT_COMPREHENSIVE_RULES.map((def) => {
          const remote = res.rules.find((r) => r.key === def.key);
          if (remote) {
            return {
              ...def,
              enabled: remote.enabled,
              days: remote.days !== undefined ? remote.days : def.days,
              threshold: remote.threshold !== undefined ? remote.threshold : def.threshold,
            };
          }
          return def;
        });
        setRules(merged);
      } else {
        setRules(DEFAULT_COMPREHENSIVE_RULES);
      }
    } catch {
      // Çevrimdışı / hata durumunda asla patlamadan varsayılanları koru
      setRules(DEFAULT_COMPREHENSIVE_RULES);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function patchRule(key: string, patch: Partial<ExtendedNotificationRule>) {
    setRules((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  async function onSave() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await sistemAyarlariApi.saveBildirimler({
        rules: rules.map((r) => ({
          key: r.key,
          label: r.label,
          enabled: r.enabled,
          days: r.days,
          threshold: r.threshold,
        })),
      });
      setMessage("✔ Bildirim tanımları başarıyla kaydedildi.");
      setTimeout(() => setMessage(null), 3500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kayıt başarısız");
    } finally {
      setSaving(false);
    }
  }

  function handleResetDefaults() {
    if (window.confirm("Tüm bildirim tanımları önerilen fabrika ayarlarına sıfırlansın mı?")) {
      setRules(DEFAULT_COMPREHENSIVE_RULES);
      setMessage("Bildirim kuralları fabrika ayarlarına döndürüldü.");
      setTimeout(() => setMessage(null), 3000);
    }
  }

  const filteredRules =
    activeCategory === "all"
      ? rules
      : rules.filter((r) => (r.category || "sistem") === activeCategory);

  return (
    <div className="ayar-form-card" style={{ maxWidth: 1080 }}>
      <div className="ayar-frame-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#1e1b4b" }}>
            🔔 Sistem Bildirim & Uyarı Tanımları
          </h3>
          <p style={{ margin: "3px 0 0", fontSize: 13, color: "var(--text-muted)" }}>
            Çek, senet, fatura vadeleri, kritik stok, üretim gecikmeleri ve GİB resmi beyanname hatırlatıcıları
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleResetDefaults}
            title="Önerilen ayarlara dön"
            style={{ fontSize: 12.5 }}
          >
            Varsayılanlara Sıfırla
          </button>
          <button
            type="button"
            className="btn-save"
            disabled={saving || loading}
            onClick={() => void onSave()}
            style={{ fontSize: 13, padding: "8px 18px" }}
          >
            {saving ? "Kaydediliyor…" : "Değişiklikleri Kaydet"}
          </button>
        </div>
      </div>

      {error ? <div className="reports-error" style={{ marginBottom: 12 }}>{error}</div> : null}
      {message ? (
        <div
          style={{
            marginBottom: 14,
            padding: "10px 14px",
            background: "#d1fae5",
            color: "#065f46",
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {message}
        </div>
      ) : null}

      {/* Kategori Filtre Butonları */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16, borderBottom: "1px solid #e2e8f0", paddingBottom: 10 }}>
        {CATEGORIES.map((c) => {
          const count = c.id === "all" ? rules.length : rules.filter((r) => r.category === c.id).length;
          const isActive = activeCategory === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiveCategory(c.id)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 6,
                fontSize: 12.5,
                fontWeight: isActive ? 700 : 500,
                border: "1px solid",
                borderColor: isActive ? "#3b82f6" : "#cbd5e1",
                background: isActive ? "#eff6ff" : "#ffffff",
                color: isActive ? "#1d4ed8" : "#475569",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <span>{c.icon}</span>
              <span>{c.label}</span>
              <span
                style={{
                  fontSize: 11,
                  padding: "0 5px",
                  borderRadius: 10,
                  background: isActive ? "#3b82f6" : "#e2e8f0",
                  color: isActive ? "#ffffff" : "#64748b",
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Kural Kartları Izgarası */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          gap: 14,
        }}
      >
        {filteredRules.map((rule) => {
          const isCritical = rule.severity === "CRITICAL";
          return (
            <div
              key={rule.key}
              style={{
                background: "#ffffff",
                border: "1px solid",
                borderColor: rule.enabled ? (isCritical ? "#fca5a5" : "#cbd5e1") : "#e2e8f0",
                borderLeft: rule.enabled
                  ? isCritical
                    ? "4px solid #ef4444"
                    : "4px solid #3b82f6"
                  : "4px solid #94a3b8",
                borderRadius: 8,
                padding: "12px 14px",
                opacity: rule.enabled ? 1 : 0.65,
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                  <h4 style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: "#0f172a", lineHeight: 1.3 }}>
                    {rule.label}
                  </h4>
                  <AktifPasifToggle
                    value={rule.enabled}
                    onChange={(v) => patchRule(rule.key, { enabled: v })}
                  />
                </div>
                <div style={{ fontSize: 11.5, color: "#64748b" }}>
                  {rule.days !== null
                    ? `Olay gerçekleşmeden ${rule.days} gün önce bildirim tetiklenir.`
                    : rule.threshold !== null
                    ? `Değer ${rule.threshold} eşiğini aştığında/altına düştüğünde uyarır.`
                    : "Olay gerçekleştiğinde anlık bildirim tetiklenir."}
                </div>
              </div>

              {/* Gün ve Eşik Girdileri */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "8px 10px",
                  background: "#f8fafc",
                  borderRadius: 6,
                  border: "1px solid #f1f5f9",
                }}
              >
                {rule.days !== null ? (
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#334155", fontWeight: 600 }}>
                    <span>Önceden (Gün):</span>
                    <input
                      type="number"
                      className="form-control"
                      style={{ width: 70, height: 28, padding: "2px 6px", fontSize: 12, textAlign: "center" }}
                      min={0}
                      disabled={!rule.enabled}
                      value={rule.days ?? ""}
                      onChange={(e) =>
                        patchRule(rule.key, {
                          days: e.target.value === "" ? null : Number(e.target.value),
                        })
                      }
                    />
                  </label>
                ) : null}

                {rule.threshold !== null ? (
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#334155", fontWeight: 600 }}>
                    <span>Eşik Miktarı:</span>
                    <input
                      type="number"
                      className="form-control"
                      style={{ width: 85, height: 28, padding: "2px 6px", fontSize: 12, textAlign: "center" }}
                      min={0}
                      disabled={!rule.enabled}
                      value={rule.threshold ?? ""}
                      onChange={(e) =>
                        patchRule(rule.key, {
                          threshold: e.target.value === "" ? null : Number(e.target.value),
                        })
                      }
                    />
                  </label>
                ) : null}
              </div>

              {/* Bildirim Kanalları */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 4, borderTop: "1px dashed #e2e8f0", fontSize: 11, color: "#64748b" }}>
                <span>Gönderim Kanalları:</span>
                <div style={{ display: "flex", gap: 8 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 3, cursor: "pointer" }} title="Uygulama İçi Bildirim">
                    <input
                      type="checkbox"
                      checked={rule.channel_app ?? true}
                      disabled={!rule.enabled}
                      onChange={(e) => patchRule(rule.key, { channel_app: e.target.checked })}
                    />
                    <span>🔔 Panel</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 3, cursor: "pointer" }} title="E-Posta Bildirimi">
                    <input
                      type="checkbox"
                      checked={rule.channel_email ?? false}
                      disabled={!rule.enabled}
                      onChange={(e) => patchRule(rule.key, { channel_email: e.target.checked })}
                    />
                    <span>✉️ E-posta</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 3, cursor: "pointer" }} title="SMS Uyarısı">
                    <input
                      type="checkbox"
                      checked={rule.channel_sms ?? false}
                      disabled={!rule.enabled}
                      onChange={(e) => patchRule(rule.key, { channel_sms: e.target.checked })}
                    />
                    <span>📱 SMS</span>
                  </label>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
