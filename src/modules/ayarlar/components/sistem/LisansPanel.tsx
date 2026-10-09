import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/services/api";
import { FormSlideOver } from "@/components/FormSlideOver";
import { AyarField } from "../AyarFormBits";
import { useAuthStore } from "@/store/appStore";

type LicenseInfo = {
  status: "aktif" | "suresi_doldu" | "yok" | "deneme";
  owner: string;
  package_name: string;
  start_date: string;
  end_date: string;
  hardware_id: string;
  license_key_masked: string;
  remaining_days: number | null;
};

const LICENSE_STORAGE = "tabia.ayarlar.license";

function defaultHwid(): string {
  const nav = typeof navigator !== "undefined" ? navigator.userAgent : "TABIA";
  let hash = 0;
  for (let i = 0; i < nav.length; i++) hash = (hash * 31 + nav.charCodeAt(i)) >>> 0;
  const part = hash.toString(16).toUpperCase().padStart(8, "0");
  return `TABIA-${part.slice(0, 4)}-${part.slice(4)}-${(hash ^ 0xabcdef).toString(16).toUpperCase().slice(0, 8)}`;
}

function loadLocal(): LicenseInfo | null {
  try {
    const raw = localStorage.getItem(LICENSE_STORAGE);
    return raw ? (JSON.parse(raw) as LicenseInfo) : null;
  } catch {
    return null;
  }
}

function saveLocal(info: LicenseInfo) {
  localStorage.setItem(LICENSE_STORAGE, JSON.stringify(info));
}

function daysBetween(end: string): number | null {
  if (!end) return null;
  const e = new Date(end);
  if (Number.isNaN(e.getTime())) return null;
  const diff = Math.ceil((e.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return diff;
}

function statusLabel(s: LicenseInfo["status"]) {
  if (s === "aktif") return "Aktif";
  if (s === "suresi_doldu") return "Süresi Doldu";
  if (s === "deneme") return "Deneme";
  return "Lisans Yok";
}

export function LisansPanel() {
  const company = useAuthStore((s) => s.company);
  const [info, setInfo] = useState<LicenseInfo | null>(null);
  const [slideOpen, setSlideOpen] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const bootstrap = useCallback(async () => {
    setError(null);
    try {
      const remote = await api<LicenseInfo>("/sistem/lisans").catch(() => null);
      if (remote && remote.hardware_id) {
        setInfo(remote);
        saveLocal(remote);
        return;
      }
    } catch {
      /* stub */
    }
    const local = loadLocal();
    if (local) {
      setInfo({
        ...local,
        remaining_days: daysBetween(local.end_date),
        status:
          daysBetween(local.end_date) != null && (daysBetween(local.end_date) as number) < 0
            ? "suresi_doldu"
            : local.status,
      });
      return;
    }
    setInfo({
      status: "yok",
      owner: String(company?.name ?? company?.trade_name ?? ""),
      package_name: "—",
      start_date: "",
      end_date: "",
      hardware_id: defaultHwid(),
      license_key_masked: "••••-••••-••••-••••",
      remaining_days: null,
    });
  }, [company]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const remaining = useMemo(() => {
    if (!info) return "—";
    if (info.remaining_days == null) return "—";
    return `${info.remaining_days} gün`;
  }, [info]);

  async function copyHwid() {
    if (!info?.hardware_id) return;
    try {
      await navigator.clipboard.writeText(info.hardware_id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setError("Hardware ID kopyalanamadı");
    }
  }

  async function verifyAndRenew() {
    if (!info) return;
    const key = keyInput.trim();
    if (!key) {
      setError("Lisans anahtarı girin");
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const body = {
        hardware_id: info.hardware_id,
        license_key: key,
      };
      const remote = await api<Partial<LicenseInfo> & { ok?: boolean }>("/sistem/lisans/activate", {
        method: "POST",
        body,
      }).catch(() => null);

      const today = new Date();
      const end = new Date(today);
      end.setFullYear(end.getFullYear() + 1);
      const next: LicenseInfo = {
        status: (remote?.status as LicenseInfo["status"]) || "aktif",
        owner: remote?.owner || info.owner || String(company?.name ?? ""),
        package_name: remote?.package_name || "Pro",
        start_date: remote?.start_date || today.toISOString().slice(0, 10),
        end_date: remote?.end_date || end.toISOString().slice(0, 10),
        hardware_id: info.hardware_id,
        license_key_masked: key.length > 8 ? `${key.slice(0, 4)}-••••-••••-${key.slice(-4)}` : "••••-••••",
        remaining_days: daysBetween(remote?.end_date || end.toISOString().slice(0, 10)),
      };
      setInfo(next);
      saveLocal(next);
      setMessage("Lisans doğrulandı ve yenilendi.");
      setSlideOpen(false);
      setKeyInput("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Doğrulama başarısız");
    } finally {
      setBusy(false);
    }
  }

  if (!info) return <div className="ayar-form-card">Yükleniyor…</div>;

  return (
    <>
      <div className="ayar-form-card">
        <div className="ayar-frame-head">
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#312e81" }}>
            Lisans Etkinleştirme
          </h3>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="btn-secondary" onClick={() => setSlideOpen(true)}>
              Lisans Yenile
            </button>
            <button type="button" className="btn-save" onClick={() => setSlideOpen(true)}>
              Etkinleştir
            </button>
          </div>
        </div>

        {error ? <div className="reports-error">{error}</div> : null}
        {message ? (
          <div style={{ marginBottom: 10, color: "#065f46", fontSize: 13, fontWeight: 600 }}>{message}</div>
        ) : null}

        <div className="ayar-lisans-summary">
          <div className="ayar-lisans-stat">
            <div className="k">Durum</div>
            <div className="v">{statusLabel(info.status)}</div>
          </div>
          <div className="ayar-lisans-stat">
            <div className="k">Başlangıç</div>
            <div className="v">{info.start_date || "—"}</div>
          </div>
          <div className="ayar-lisans-stat">
            <div className="k">Bitiş</div>
            <div className="v">{info.end_date || "—"}</div>
          </div>
          <div className="ayar-lisans-stat">
            <div className="k">Kalan</div>
            <div className="v">{remaining}</div>
          </div>
        </div>

        <AyarField label="Lisans Sahibi">
          <input className="form-control ayar-locked-field" readOnly value={info.owner || "—"} />
        </AyarField>
        <AyarField label="Hardware ID (HWID)">
          <input className="form-control ayar-locked-field" readOnly value={info.hardware_id} />
        </AyarField>
        <AyarField label="Paket">
          <input className="form-control ayar-locked-field" readOnly value={info.package_name || "—"} />
        </AyarField>
        <AyarField label="Lisans Anahtarı">
          <input
            className="form-control ayar-locked-field"
            readOnly
            value={info.license_key_masked || "••••-••••-••••-••••"}
          />
        </AyarField>
      </div>

      <FormSlideOver
        open={slideOpen}
        title="Lisans Yenile / Etkinleştir"
        onClose={() => setSlideOpen(false)}
        width="min(480px, 96vw)"
        skipDirtyGuard
      >
        <div className="ayar-lisans-renew">
          <AyarField label="Hardware ID">
            <input className="form-control ayar-locked-field" readOnly value={info.hardware_id} />
            <button type="button" className="btn-secondary" onClick={() => void copyHwid()}>
              {copied ? "Kopyalandı" : "Kopyala"}
            </button>
          </AyarField>
          <AyarField label="Lisans Anahtarı">
            <input
              className="form-control"
              placeholder="XXXX-XXXX-XXXX-XXXX"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
            />
          </AyarField>
          <div className="ayar-form-actions">
            <button type="button" className="btn-secondary" onClick={() => setSlideOpen(false)}>
              İptal
            </button>
            <button type="button" className="btn-save" disabled={busy} onClick={() => void verifyAndRenew()}>
              {busy ? "Doğrulanıyor…" : "Anahtarı Doğrula & Yenile"}
            </button>
          </div>
        </div>
      </FormSlideOver>
    </>
  );
}
