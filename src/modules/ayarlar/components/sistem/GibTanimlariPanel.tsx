import { useCallback, useEffect, useState } from "react";
import { ebelgeApi, type EBelgeEnvironmentResponse } from "@/modules/e-belge/api/ebelgeApi";
import type { AyarlarPanel } from "../../config/ayarlarHubConfig";
import { AyarField } from "../AyarFormBits";

type Props = {
  panel: AyarlarPanel;
};

export function GibTanimlariPanel({ panel }: Props) {
  const [env, setEnv] = useState<EBelgeEnvironmentResponse | null>(null);
  const [sync, setSync] = useState({
    auto_send_enabled: true,
    auto_send_interval_minutes: 5,
    auto_receive_enabled: true,
    auto_receive_interval_minutes: 10,
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [envRes, syncRes] = await Promise.all([
        ebelgeApi.getEnvironment(),
        ebelgeApi.getSyncSettings(),
      ]);
      setEnv(envRes);
      setSync(syncRes);
      setMessage(null);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Ayarlar alınamadı");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveSync() {
    setBusy(true);
    try {
      const res = await ebelgeApi.updateSyncSettings(sync);
      setSync(res);
      setMessage("GİB otomatik gönder/al süreleri kaydedildi");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Kayıt başarısız");
    } finally {
      setBusy(false);
    }
  }

  async function toggleEnv() {
    if (!env?.can_switch) return;
    const next = env.env_mode === "test" ? "live" : "test";
    if (!window.confirm(next === "live" ? "Canlı ortama geçilsin mi?" : "Test ortamına dönülsün mü?")) return;
    setBusy(true);
    try {
      const res = await ebelgeApi.setEnvironment(next);
      setEnv(res);
      setMessage(`Ortam: ${res.env_label}`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Ortam değiştirilemedi");
    } finally {
      setBusy(false);
    }
  }

  async function manualReceive() {
    setBusy(true);
    try {
      const res = await ebelgeApi.receive();
      setMessage(res.message);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Alma başarısız");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ayar-form-card">
      <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 800 }}>
        {panel.icon} {panel.title}
      </h3>
      <p style={{ margin: "0 0 16px", fontSize: 13, color: "#64748b" }}>{panel.description}</p>

      {message && <div className="alert alert-info" style={{ marginBottom: 12 }}>{message}</div>}

      <div className="gg-grid-2col">
        <div>
          <AyarField label="GİB Ortamı">
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span className="badge badge-orange">{env?.env_label ?? "—"}</span>
              {env?.can_switch && (
                <button type="button" className="btn-top" disabled={busy} onClick={() => void toggleEnv()}>
                  Ortam Değiştir
                </button>
              )}
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>{env?.gib_base_url}</div>
          </AyarField>
        </div>
        <div>
          <AyarField label="Manuel Gelen Kutusu">
            <button type="button" className="btn-top blue" disabled={busy} onClick={() => void manualReceive()}>
              Gelen Belgeleri Al
            </button>
          </AyarField>
        </div>
      </div>

      <h4 style={{ marginTop: 20, marginBottom: 12 }}>Otomatik Gönder / Al Süreleri</h4>
      <div className="gg-grid-2col">
        <AyarField label="Otomatik Gönderim">
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={sync.auto_send_enabled}
              onChange={(e) => setSync((s) => ({ ...s, auto_send_enabled: e.target.checked }))}
            />
            Aktif
          </label>
        </AyarField>
        <AyarField label="Gönderim Aralığı (dk)">
          <input
            type="number"
            className="form-control"
            min={1}
            max={1440}
            value={sync.auto_send_interval_minutes ?? 30}
            onChange={(e) =>
              setSync((s) => ({ ...s, auto_send_interval_minutes: Number(e.target.value) }))
            }
          />
        </AyarField>
        <AyarField label="Otomatik Alma">
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={sync.auto_receive_enabled}
              onChange={(e) => setSync((s) => ({ ...s, auto_receive_enabled: e.target.checked }))}
            />
            Aktif
          </label>
        </AyarField>
        <AyarField label="Alma Aralığı (dk)">
          <input
            type="number"
            className="form-control"
            min={1}
            max={1440}
            value={sync.auto_receive_interval_minutes ?? 30}
            onChange={(e) =>
              setSync((s) => ({ ...s, auto_receive_interval_minutes: Number(e.target.value) }))
            }
          />
        </AyarField>
      </div>

      <div style={{ marginTop: 16, textAlign: "right" }}>
        <button type="button" className="btn-save" disabled={busy} onClick={() => void saveSync()}>
          Kaydet
        </button>
      </div>
    </div>
  );
}
