import { useCallback, useEffect, useRef, useState } from "react";
import {
  sistemAyarlariApi,
  type BackupRunLog,
  type BackupSettings,
  type BackupScheduleSlot,
} from "../../api/sistemAyarlariApi";
import { AktifPasifToggle } from "../AktifPasifToggle";
import { AyarField } from "../AyarFormBits";

const DEFAULT_SLOTS: BackupScheduleSlot[] = [
  { hour: 2, minute: 0, is_active: true },
  { hour: 12, minute: 0, is_active: false },
  { hour: 22, minute: 0, is_active: false },
];

const SLOT_LABELS = ["Öğleden Önce", "Öğleden Sonra", "Akşam"];
const AUTO_DELETE_DRAFT_KEY = "tabia_auto_delete_days_draft";

function ensureThreeSlots(slots?: BackupScheduleSlot[]): BackupScheduleSlot[] {
  const base = slots?.length ? [...slots] : [...DEFAULT_SLOTS];
  while (base.length < 3) {
    base.push({ ...DEFAULT_SLOTS[base.length], is_active: false });
  }
  return base.slice(0, 3);
}

function formatSlotTime(slot: BackupScheduleSlot): string {
  return `${String(slot.hour).padStart(2, "0")}:${String(slot.minute).padStart(2, "0")}`;
}

function readDraftDays(fallback = 90): number {
  try {
    const raw = localStorage.getItem(AUTO_DELETE_DRAFT_KEY);
    const n = raw ? Number(raw) : NaN;
    if (Number.isFinite(n) && n >= 1) return Math.min(3650, n);
  } catch {
    /* ignore */
  }
  return fallback;
}

export function BackupPanel() {
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [settings, setSettings] = useState<BackupSettings | null>(null);
  const [logs, setLogs] = useState<BackupRunLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restoreId, setRestoreId] = useState("");
  const [restorePath, setRestorePath] = useState("");
  const [confirmPhrase, setConfirmPhrase] = useState("");
  const [autoDeleteEnabled, setAutoDeleteEnabled] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, l] = await Promise.all([
        sistemAyarlariApi.getBackupSettings(),
        sistemAyarlariApi.listBackupLogs(),
      ]);
      const enabled = s.auto_delete_days > 0;
      setAutoDeleteEnabled(enabled);
      setSettings({
        ...s,
        schedule_slots: ensureThreeSlots(s.schedule_slots),
        auto_delete_days: enabled ? s.auto_delete_days : readDraftDays(90),
      });
      setLogs(l.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yedekleme ayarları yüklenemedi");
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
    try {
      const slots = ensureThreeSlots(settings.schedule_slots);
      const days = Math.max(1, settings.auto_delete_days || 90);
      try {
        localStorage.setItem(AUTO_DELETE_DRAFT_KEY, String(days));
      } catch {
        /* ignore */
      }
      const saved = await sistemAyarlariApi.saveBackupSettings({
        ...settings,
        schedule_slots: slots,
        auto_delete_days: autoDeleteEnabled ? days : 0,
        is_active: settings.is_active || slots.some((s) => s.is_active),
      });
      setAutoDeleteEnabled(saved.auto_delete_days > 0);
      setSettings({
        ...saved,
        schedule_slots: ensureThreeSlots(saved.schedule_slots),
        auto_delete_days:
          saved.auto_delete_days > 0 ? saved.auto_delete_days : days,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kayıt başarısız");
    } finally {
      setSaving(false);
    }
  }

  async function onRunBackup() {
    setRunning(true);
    setError(null);
    try {
      const res = await sistemAyarlariApi.runBackup();
      setLogs((prev) => [res, ...prev]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yedekleme başarısız");
    } finally {
      setRunning(false);
    }
  }

  async function onRestore(id?: number) {
    const backupId = id ?? Number(restoreId);
    if (!backupId) {
      setError("Geri yüklenecek yedek seçin veya geçmişten Geri Yükle kullanın.");
      return;
    }
    if (confirmPhrase !== "GERI_YUKLE") {
      setError('Onay için "GERI_YUKLE" yazın.');
      return;
    }
    setRunning(true);
    setError(null);
    try {
      const res = await sistemAyarlariApi.restoreBackup(backupId, confirmPhrase);
      setLogs((prev) => [res, ...prev]);
      setConfirmPhrase("");
      setRestoreId(String(backupId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Geri yükleme başarısız");
    } finally {
      setRunning(false);
    }
  }

  function pickFromHistory(log: BackupRunLog) {
    setRestoreId(String(log.id));
    setRestorePath(log.file_path || "");
    setConfirmPhrase("");
  }

  function updateSlot(idx: number, patch: Partial<BackupScheduleSlot>) {
    if (!settings) return;
    const slots = ensureThreeSlots(settings.schedule_slots);
    slots[idx] = { ...slots[idx], ...patch };
    const anyActive = slots.some((s) => s.is_active);
    setSettings({ ...settings, schedule_slots: slots, is_active: anyActive });
  }

  async function pickFolder() {
    const picker = (window as Window & { showDirectoryPicker?: () => Promise<{ name: string }> })
      .showDirectoryPicker;
    if (picker) {
      try {
        const handle = await picker();
        if (settings) setSettings({ ...settings, backup_folder: handle.name });
        return;
      } catch {
        /* kullanıcı iptal */
      }
    }
    folderInputRef.current?.focus();
  }

  if (loading) return <div className="ayar-form-card">Yükleniyor…</div>;
  if (!settings) return <div className="ayar-form-card">{error ?? "Ayar bulunamadı"}</div>;

  const slots = ensureThreeSlots(settings.schedule_slots);
  const successBackups = logs.filter((l) => l.status === "SUCCESS" && l.run_type !== "RESTORE");
  const activeSlotSummary = slots
    .map((s, i) => (s.is_active ? `${SLOT_LABELS[i]} ${formatSlotTime(s)}` : null))
    .filter(Boolean)
    .join(" · ");

  return (
    <div>
      {error ? <div className="reports-error">{error}</div> : null}

      <div className="ayar-panel-dark">
        <div className="ayar-panel-dark-header">
          <h3>Otomatik Veritabanı Yedekleme &amp; Tam Dump</h3>
          <button
            type="button"
            className="btn-add-green"
            disabled={running}
            onClick={() => void onRunBackup()}
          >
            {running ? "Yedekleniyor…" : "Şimdi Tam Yedek Al"}
          </button>
        </div>

        <div className="ayar-panel-dark-body">
          <AyarField label="Yedekleme Klasörü">
            <div className="ayar-folder-row">
              <input
                ref={folderInputRef}
                className="form-control"
                value={settings.backup_folder ?? ""}
                placeholder="D:\\Yedekler\\Tabia"
                onChange={(e) => setSettings({ ...settings, backup_folder: e.target.value })}
              />
              <button type="button" className="btn-secondary" onClick={() => void pickFolder()}>
                Klasör Seç
              </button>
            </div>
          </AyarField>

          <div className="ayar-backup-format-max-row">
            <AyarField label="Format">
              <select
                className="form-control"
                value={settings.backup_format ?? "plain"}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    backup_format: e.target.value as BackupSettings["backup_format"],
                  })
                }
              >
                <option value="plain">Full SQL Dump (.sql)</option>
                <option value="custom">Custom (.dump)</option>
                <option value="directory">Directory</option>
              </select>
            </AyarField>
            <AyarField label="Saklanacak Maksimum Yedek Sayısı (Adet)">
              <input
                type="number"
                className="form-control"
                min={1}
                max={500}
                value={settings.max_backups ?? 30}
                onChange={(e) =>
                  setSettings({ ...settings, max_backups: Number(e.target.value) })
                }
              />
            </AyarField>
          </div>

          <AyarField label="Geçmiş Yedekleri Otomatik Sil (gün)">
            <div className="ayar-auto-delete-row">
              <input
                type="number"
                className="form-control"
                min={1}
                value={settings.auto_delete_days ?? 90}
                disabled={!autoDeleteEnabled}
                onChange={(e) =>
                  setSettings({ ...settings, auto_delete_days: Number(e.target.value) })
                }
              />
              <AktifPasifToggle
                value={autoDeleteEnabled}
                onChange={setAutoDeleteEnabled}
                activeLabel="Oto-Sil AKTİF"
                passiveLabel="Oto-Sil PASİF"
              />
            </div>
          </AyarField>

          <div className="ayar-backup-slots">
            <h4 className="section-label">Gün İçi 3 Ayrı Zamanda Otomatik Tam Yedekleme Tanımı</h4>
            <div className="ayar-backup-slot-grid">
              {slots.map((slot, idx) => (
                <div key={idx} className="ayar-backup-slot-card">
                  <div className="slot-title">{SLOT_LABELS[idx] ?? `Saat ${idx + 1}`}</div>
                  <div className="slot-time-row">
                    <label>
                      Saat
                      <input
                        type="number"
                        className="form-control"
                        min={0}
                        max={23}
                        value={slot.hour ?? 0}
                        onChange={(e) =>
                          updateSlot(idx, { hour: Math.min(23, Math.max(0, Number(e.target.value) || 0)) })
                        }
                      />
                    </label>
                    <label>
                      Dakika
                      <input
                        type="number"
                        className="form-control"
                        min={0}
                        max={59}
                        value={slot.minute ?? 0}
                        onChange={(e) =>
                          updateSlot(idx, {
                            minute: Math.min(59, Math.max(0, Number(e.target.value) || 0)),
                          })
                        }
                      />
                    </label>
                  </div>
                  <AktifPasifToggle
                    value={slot.is_active}
                    onChange={(v) => updateSlot(idx, { is_active: v })}
                  />
                </div>
              ))}
            </div>
            <p className="ayar-backup-summary">
              {activeSlotSummary
                ? `Aktif yedek saatleri: ${activeSlotSummary}`
                : "Aktif yedek saati yok — zamanlama kapalı."}
              {" · "}
              Klasör: <strong>{settings.backup_folder || "—"}</strong>
            </p>
          </div>
        </div>

        <div className="ayar-panel-dark-footer">
          <button type="button" className="btn-save" disabled={saving} onClick={() => void onSave()}>
            {saving ? "Kaydediliyor…" : "Sistem Ayarlarını Kaydet"}
          </button>
        </div>
      </div>

      <div className="ayar-frame">
        <div className="ayar-frame-head">
          <h3>Yedekten Geri Yükleme</h3>
        </div>
        <p style={{ margin: "0 0 12px", fontSize: 12, color: "var(--text-muted, #64748b)" }}>
          Yedek klasöründeki kayıtlı yedeklerden seçin. Onay için <code>GERI_YUKLE</code> yazın —
          işlem mevcut veriyi değiştirir.
        </p>
        <div className="gg-grid-2col">
          <AyarField label="Yedek seç (klasör / geçmiş)">
            <select
              className="form-control"
              value={restoreId}
              onChange={(e) => {
                const id = e.target.value;
                setRestoreId(id);
                const log = successBackups.find((l) => String(l.id) === id);
                setRestorePath(log?.file_path || "");
              }}
            >
              <option value="">Seçim Yapın</option>
              {successBackups.map((log) => (
                <option key={log.id} value={String(log.id)}>
                  #{log.id} — {log.file_path || log.created_at || "yedek"}
                </option>
              ))}
            </select>
          </AyarField>
          <AyarField label="Dosya / Klasör yolu">
            <input
              className="form-control"
              value={restorePath}
              placeholder={settings.backup_folder || "Yedek yolu"}
              onChange={(e) => setRestorePath(e.target.value)}
            />
          </AyarField>
          <AyarField label="Onay İfadesi">
            <input
              className="form-control"
              value={confirmPhrase}
              onChange={(e) => setConfirmPhrase(e.target.value)}
              placeholder="GERI_YUKLE"
            />
          </AyarField>
        </div>
        <button
          type="button"
          className="btn-secondary"
          disabled={running || !restoreId || confirmPhrase !== "GERI_YUKLE"}
          onClick={() => void onRestore()}
          style={{ marginTop: 8 }}
        >
          Geri Yükle
        </button>
      </div>

      <div className="ayar-frame">
        <div className="ayar-frame-head">
          <h3>Yedek Geçmişi</h3>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Tür</th>
              <th>Durum</th>
              <th>Dosya</th>
              <th>Boyut</th>
              <th>Tarih</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", color: "var(--text-muted, #64748b)" }}>
                  Kayıt yok
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id}>
                  <td>{log.id}</td>
                  <td>{log.run_type}</td>
                  <td>{log.status}</td>
                  <td style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis" }}>
                    {log.file_path ?? "—"}
                  </td>
                  <td>{log.file_size?.toLocaleString("tr-TR") ?? "—"}</td>
                  <td>{log.created_at ?? "—"}</td>
                  <td>
                    {log.status === "SUCCESS" && log.run_type !== "RESTORE" ? (
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ fontSize: 11 }}
                        disabled={running}
                        onClick={() => {
                          pickFromHistory(log);
                          const ok = window.confirm(
                            `#${log.id} yedeğini geri yüklemek istediğinize emin misiniz?\nOnay: GERI_YUKLE`,
                          );
                          if (!ok) return;
                          setConfirmPhrase("GERI_YUKLE");
                          void onRestore(log.id);
                        }}
                      >
                        Geri Yükle
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
