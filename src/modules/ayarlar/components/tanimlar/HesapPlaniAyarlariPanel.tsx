import { useEffect, useState } from "react";
import { api } from "@/services/api";

export type CoaSettings = {
  code_separator: "." | "-";
  code_depth: number;
  color_sinif: string;
  color_alt_sinif: string;
  color_ana: string;
  color_grup: string;
  color_muavin: string;
};

export const DEFAULT_COA_SETTINGS: CoaSettings = {
  code_separator: ".",
  code_depth: 4,
  color_sinif: "#1e3a8a",
  color_alt_sinif: "#1d4ed8",
  color_ana: "#0369a1",
  color_grup: "#0f766e",
  color_muavin: "#334155",
};

export const COA_LS_KEY = "tabia.coa.settings.v1";

export function loadLocalCoaSettings(): CoaSettings {
  try {
    const raw = localStorage.getItem(COA_LS_KEY);
    if (!raw) return { ...DEFAULT_COA_SETTINGS };
    return { ...DEFAULT_COA_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_COA_SETTINGS };
  }
}

export function applyCoaColors(s: CoaSettings) {
  const root = document.documentElement;
  root.style.setProperty("--coa-sinif", s.color_sinif);
  root.style.setProperty("--coa-alt-sinif", s.color_alt_sinif);
  root.style.setProperty("--coa-ana", s.color_ana);
  root.style.setProperty("--coa-grup", s.color_grup);
  root.style.setProperty("--coa-muavin", s.color_muavin);
}

/** Tanımlar → Hesap Planı Ayarları (ayrışım / kırılım / seviye renkleri) */
export function HesapPlaniAyarlariPanel() {
  const [form, setForm] = useState<CoaSettings>(loadLocalCoaSettings);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    applyCoaColors(form);
  }, [form]);

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      localStorage.setItem(COA_LS_KEY, JSON.stringify(form));
      applyCoaColors(form);
      window.dispatchEvent(new CustomEvent("tabia:coa-settings-changed", { detail: form }));
      // Backend ayar (varsa)
      try {
        await api("/sistem/settings/bulk", {
          method: "POST",
          body: {
            "coa.code_separator": form.code_separator,
            "coa.code_depth": String(form.code_depth),
          },
        });
      } catch {
        /* local yeterli */
      }
      setMsg("Ayarlar kaydedildi. Yeni hesaplar bu ayrışım/kırılım ile oluşturulur.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="ayar-form-card" style={{ maxWidth: 720 }}>
      <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 800 }}>⚙️ Hesap Planı Ayarları</h3>
      <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
        Ayrışım ve kırılım burada seçilir. Hesap planı tanım formundan kaldırılmıştır. Seviye renkleri listede kullanılır.
      </p>

      <div className="gg-grid-2col" style={{ marginBottom: 14 }}>
        <div className="form-row compact">
          <label>Ayrışım</label>
          <select
            className="form-control"
            value={form.code_separator || "."}
            onChange={(e) =>
              setForm((f) => ({ ...f, code_separator: e.target.value as "." | "-" }))
            }
          >
            <option value=".">. (nokta) — standart</option>
            <option value="-">- (tire)</option>
          </select>
        </div>
        <div className="form-row compact">
          <label>Kırılım sayısı</label>
          <select
            className="form-control"
            value={form.code_depth ?? 4}
            onChange={(e) => setForm((f) => ({ ...f, code_depth: Number(e.target.value) }))}
          >
            <option value={2}>2</option>
            <option value={3}>3</option>
            <option value={4}>4 — standart</option>
            <option value={5}>5</option>
          </select>
        </div>
      </div>

      <h4 style={{ margin: "16px 0 10px", fontSize: 14 }}>Seviye renkleri</h4>
      {(
        [
          ["color_sinif", "Sınıf (1)"],
          ["color_alt_sinif", "Alt Sınıf (10)"],
          ["color_ana", "Ana (100)"],
          ["color_grup", "Grup"],
          ["color_muavin", "Muavin (Detay)"],
        ] as const
      ).map(([key, label]) => (
        <div key={key} className="form-row compact" style={{ marginBottom: 8 }}>
          <label>{label}</label>
          <input
            type="color"
            className="form-control"
            style={{ width: 64, height: 36, padding: 2 }}
            value={form[key] || "#475569"}
            onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
          />
        </div>
      ))}

      {msg && <div className="alert alert-success" style={{ marginTop: 12 }}>{msg}</div>}

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
        <button type="button" className="btn-save" disabled={saving} onClick={() => void save()}>
          {saving ? "Kaydediliyor…" : "Kaydet"}
        </button>
      </div>
    </div>
  );
}
