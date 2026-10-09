import { useCallback, useEffect, useMemo, useState } from "react";
import type { AyarlarPanel } from "../../config/ayarlarHubConfig";
import {
  defaultDocTypeForCategory,
  documentSeriesApi,
  SERI_DOC_TYPE_OPTIONS,
  SERI_PANEL_CATEGORY,
  type DocumentSeriesItem,
  type DocumentSeriesPayload,
  type NumberCheckResult,
} from "@/services/documentSeriesApi";
import { StatusBadge } from "@/components/ui";
import { AktifPasifToggle } from "../AktifPasifToggle";

type Mode = "idle" | "create" | "edit";

const GIB_CATEGORIES = new Set(["FATURA", "IRSALIYE", "YEVMIYE"]);

function emptyForm(category: string, formatKind: "GIB" | "SISTEM" = "SISTEM"): DocumentSeriesPayload {
  const isGib = formatKind === "GIB";
  return {
    code: "",
    name: "",
    document_type: defaultDocTypeForCategory(category, formatKind),
    series_prefix: isGib ? "ABC" : category.slice(0, 3).toUpperCase(),
    format_template: isGib ? "{SERI}{YIL}{NO:9}" : "{SERI}-{YIL}-{NO:5}",
    valid_from: `${new Date().getFullYear()}-01-01`,
    valid_to: `${new Date().getFullYear()}-12-31`,
    is_active: true,
    category,
    format_kind: formatKind,
    is_gib_series: isGib,
    enforce_date_order: isGib,
    starting_number: 1,
  };
}

type Props = { panel: AyarlarPanel };

/** Sol kompakt form + sağ canlı liste — tüm seri/fiş no tanımları */
export function SeriNoTanimPanel({ panel }: Props) {
  const category = SERI_PANEL_CATEGORY[panel.id] ?? "DIGER";
  const docOptions = SERI_DOC_TYPE_OPTIONS[category] ?? [];
  const allowGib = GIB_CATEGORIES.has(category) || category === "FATURA" || category === "IRSALIYE";

  const [items, setItems] = useState<DocumentSeriesItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("idle");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState<DocumentSeriesPayload>(() =>
    emptyForm(category, allowGib ? "GIB" : "SISTEM"),
  );
  const [saving, setSaving] = useState(false);
  const [liveLast, setLiveLast] = useState<string>("—");
  const [liveNext, setLiveNext] = useState<string>("—");
  const [check, setCheck] = useState<NumberCheckResult | null>(null);
  const [checkOpen, setCheckOpen] = useState(false);

  const formEnabled = mode === "create" || mode === "edit";

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await documentSeriesApi.list(category);
      setItems(res.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Liste alınamadı");
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    void load();
    setMode("idle");
    setSelectedId(null);
    setForm(emptyForm(category, allowGib ? "GIB" : "SISTEM"));
    setLiveLast("—");
    setLiveNext("—");
  }, [category, load, allowGib]);

  const selected = useMemo(
    () => items.find((i) => i.id === selectedId) ?? null,
    [items, selectedId],
  );

  const refreshLiveNo = useCallback(async (id: number | null) => {
    if (!id) {
      setLiveLast("—");
      setLiveNext("—");
      return;
    }
    try {
      const info = await documentSeriesApi.lastNumber(id);
      setLiveLast(info.last_formatted || String(info.last_number) || "—");
      setLiveNext(info.next_preview || "—");
    } catch {
      const row = items.find((i) => i.id === id);
      setLiveLast(row?.last_formatted || "—");
      setLiveNext(row?.next_preview || "—");
    }
  }, [items]);

  useEffect(() => {
    if (selectedId) void refreshLiveNo(selectedId);
  }, [selectedId, refreshLiveNo]);

  function setField<K extends keyof DocumentSeriesPayload>(key: K, value: DocumentSeriesPayload[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "format_kind") {
        const kind = value as "GIB" | "SISTEM";
        next.is_gib_series = kind === "GIB";
        next.enforce_date_order = kind === "GIB";
        next.format_template = kind === "GIB" ? "{SERI}{YIL}{NO:9}" : "{SERI}-{YIL}-{NO:5}";
        if (kind === "GIB" && next.series_prefix.length > 3) {
          next.series_prefix = next.series_prefix.slice(0, 3);
        }
        next.document_type = defaultDocTypeForCategory(category, kind);
      }
      if (key === "document_type") {
        const v = String(value);
        if (v.includes("GIB") || v === "YEVMIYE_MADDE") {
          next.format_kind = "GIB";
          next.is_gib_series = true;
          next.enforce_date_order = true;
          next.format_template = "{SERI}{YIL}{NO:9}";
        }
      }
      return next;
    });
  }

  function startCreate() {
    setMode("create");
    setSelectedId(null);
    setLiveLast("—");
    setLiveNext("—");
    setForm(emptyForm(category, allowGib ? "GIB" : "SISTEM"));
  }

  function startEdit(row: DocumentSeriesItem) {
    setMode("edit");
    setSelectedId(row.id);
    setForm({
      code: row.code,
      name: row.name,
      document_type: row.document_type,
      series_prefix: row.series_prefix,
      format_template: row.format_template,
      valid_from: String(row.valid_from).slice(0, 10),
      valid_to: String(row.valid_to).slice(0, 10),
      branch_id: row.branch_id,
      record_type_id: row.record_type_id,
      is_active: row.is_active,
      category: row.category ?? category,
      format_kind: (row.format_kind as "GIB" | "SISTEM") || "SISTEM",
      is_gib_series: Boolean(row.is_gib_series),
      enforce_date_order: Boolean(row.enforce_date_order),
      starting_number: row.starting_number ?? 1,
    });
    setLiveLast(row.last_formatted || "—");
    setLiveNext(row.next_preview || "—");
  }

  function cancelForm() {
    setMode("idle");
    setSelectedId(null);
    setForm(emptyForm(category, allowGib ? "GIB" : "SISTEM"));
    setLiveLast("—");
    setLiveNext("—");
  }

  async function save() {
    if (!form.code.trim() || !form.name.trim() || !form.series_prefix.trim()) {
      setError("Kod, Ad ve Seri zorunludur");
      return;
    }
    if (form.format_kind === "GIB" && form.series_prefix.length !== 3) {
      setError("GIB serisinde seri 3 harf olmalıdır");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (mode === "edit" && selectedId) {
        const { code: _c, ...rest } = form;
        await documentSeriesApi.update(selectedId, rest);
      } else {
        await documentSeriesApi.create(form);
      }
      await load();
      cancelForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kayıt başarısız");
    } finally {
      setSaving(false);
    }
  }

  async function removeRow(row: DocumentSeriesItem) {
    if (!window.confirm(`"${row.name}" serisini silmek istiyor musunuz?`)) return;
    setError(null);
    try {
      await documentSeriesApi.remove(row.id);
      if (selectedId === row.id) cancelForm();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Silinemedi");
    }
  }

  async function openNumberCheck(row: DocumentSeriesItem) {
    setError(null);
    try {
      const res = await documentSeriesApi.numberCheck(row.id);
      setCheck(res);
      setCheckOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Numara kontrolü alınamadı");
    }
  }

  const docTypeLabel = (code: string) =>
    docOptions.find((o) => o.value === code)?.label || code;

  return (
    <div className="seri-tanim-root">
      <div className="seri-tanim-page-head">
        <div>
          <h3>{panel.title}</h3>
          <p>{panel.description}</p>
        </div>
      </div>

      {panel.formatHint ? (
        <div className="seri-tanim-hint">
          Format: <strong>{panel.formatHint}</strong>
          {form.is_gib_series || form.format_kind === "GIB" ? (
            <span className="seri-gib-lock"> · GIB: tarih sırası + onaylı kilit</span>
          ) : null}
        </div>
      ) : (
        <div className="seri-tanim-hint muted">
          Gap-fill aktif · Silinen no yeniden kullanılır
          {form.format_kind === "GIB" ? " · GIB tarih sırası zorunlu" : ""}
        </div>
      )}

      {error ? <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div> : null}

      <div className="seri-tanim-layout">
        {/* Sol form */}
        <div className={`seri-tanim-form${formEnabled ? " active" : ""}`}>
          <div className="seri-tanim-form-title">
            {mode === "edit" ? "Değiştir" : mode === "create" ? "Yeni Seri" : "Tanım Formu"}
            {!formEnabled ? <span> — Ekle ile aktifleşir</span> : null}
          </div>

          <div className="seri-field">
            <label>Kod</label>
            <input
              className="form-control seri-input"
              value={form.code || ""}
              disabled={!formEnabled || mode === "edit"}
              onChange={(e) => setField("code", e.target.value.toUpperCase())}
              maxLength={40}
              placeholder="ORN-FAT-01"
            />
          </div>
          <div className="seri-field">
            <label>Ad</label>
            <input
              className="form-control seri-input"
              value={form.name || ""}
              disabled={!formEnabled}
              onChange={(e) => setField("name", e.target.value)}
              placeholder="Seri adı"
            />
          </div>
          <div className="seri-field">
            <label>Belge Türü</label>
            {docOptions.length ? (
              <select
                className="form-control seri-input"
                value={form.document_type || ""}
                disabled={!formEnabled}
                onChange={(e) => setField("document_type", e.target.value)}
              >
                {docOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="form-control seri-input"
                value={form.document_type || ""}
                disabled={!formEnabled}
                onChange={(e) => setField("document_type", e.target.value.toUpperCase())}
              />
            )}
          </div>

          <div className="seri-field-row">
            <div className="seri-field">
              <label>Seri</label>
              <input
                className="form-control seri-input"
                value={form.series_prefix || ""}
                disabled={!formEnabled}
                maxLength={form.format_kind === "GIB" ? 3 : 10}
                onChange={(e) => setField("series_prefix", e.target.value.toUpperCase())}
              />
            </div>
            <div className="seri-field">
              <label>Format</label>
              <select
                className="form-control seri-input"
                value={form.format_kind || "GIB"}
                disabled={!formEnabled || (!allowGib && category === "YEVMIYE")}
                onChange={(e) => setField("format_kind", e.target.value as "GIB" | "SISTEM")}
              >
                {(allowGib || category === "YEVMIYE") && <option value="GIB">GIB</option>}
                {category !== "YEVMIYE" && <option value="SISTEM">Sistem</option>}
              </select>
            </div>
          </div>

          <div className="seri-field">
            <label>Şablon</label>
            <input
              className="form-control seri-input"
              value={form.format_template || ""}
              disabled={!formEnabled}
              onChange={(e) => setField("format_template", e.target.value)}
            />
          </div>

          <div className="seri-field-row">
            <div className="seri-field">
              <label>Geçerlilik Baş.</label>
              <input
                type="date"
                className="form-control seri-input"
                value={form.valid_from || ""}
                disabled={!formEnabled}
                onChange={(e) => setField("valid_from", e.target.value)}
              />
            </div>
            <div className="seri-field">
              <label>Geçerlilik Bit.</label>
              <input
                type="date"
                className="form-control seri-input"
                value={form.valid_to || ""}
                disabled={!formEnabled}
                onChange={(e) => setField("valid_to", e.target.value)}
              />
            </div>
          </div>

          <div className="seri-field-row">
            <div className="seri-field">
              <label>Başlangıç No</label>
              <input
                type="number"
                className="form-control seri-input"
                min={1}
                value={form.starting_number ?? 1}
                disabled={!formEnabled}
                onChange={(e) => setField("starting_number", Number(e.target.value) || 1)}
              />
            </div>
            <div className="seri-field" style={{ justifyContent: "flex-end" }}>
              <AktifPasifToggle
                value={Boolean(form.is_active)}
                disabled={!formEnabled}
                onChange={(v) => setField("is_active", v)}
              />
              {(form.format_kind === "GIB" || form.is_gib_series) && (
                <label className="seri-check">
                  <input
                    type="checkbox"
                    checked={Boolean(form.enforce_date_order)}
                    disabled={!formEnabled}
                    onChange={(e) => setField("enforce_date_order", e.target.checked)}
                  />
                  Tarih sırası
                </label>
              )}
            </div>
          </div>

          <div className="seri-son-no">
            <div className="seri-son-label">Son Numara (canlı)</div>
            <div className="seri-son-value">{liveLast}</div>
            <div className="seri-son-next">
              Sonraki: <strong>{liveNext}</strong>
            </div>
            {selectedId ? (
              <button
                type="button"
                className="btn-secondary"
                style={{ marginTop: 8, fontSize: 11, padding: "4px 10px" }}
                onClick={() => void refreshLiveNo(selectedId)}
              >
                Yenile
              </button>
            ) : null}
          </div>

          <div className="seri-form-actions">
            <button type="button" className="btn-cancel" onClick={cancelForm} disabled={!formEnabled || saving}>
              Vazgeç
            </button>
            <button type="button" className="btn-save" onClick={() => void save()} disabled={!formEnabled || saving}>
              {saving ? "Kaydediliyor…" : "Kaydet"}
            </button>
          </div>
        </div>

        {/* Sağ liste */}
        <div className="seri-tanim-list-card">
          <div className="seri-tanim-list-head">
            <strong>Tanımlı Seriler</strong>
            <div className="seri-list-actions">
              <button type="button" className="btn-save" onClick={startCreate} disabled={mode === "create"}>
                + Ekle
              </button>
              <button
                type="button"
                className="btn-secondary"
                disabled={!selected}
                onClick={() => selected && startEdit(selected)}
              >
                Değiştir
              </button>
              <button
                type="button"
                className="btn-cancel"
                disabled={!selected}
                onClick={() => selected && void removeRow(selected)}
              >
                Sil
              </button>
            </div>
          </div>

          {loading ? (
            <p className="seri-muted">Yükleniyor…</p>
          ) : items.length === 0 ? (
            <div className="seri-empty">
              Tanımlı seri yok. <strong>Ekle</strong> ile sol formu aktifleştirin.
            </div>
          ) : (
            <div className="seri-table-wrap">
              <table className="data-table" style={{ width: "100%", fontSize: 12 }}>
                <thead>
                  <tr>
                    <th>Kod</th>
                    <th>Ad</th>
                    <th>Belge</th>
                    <th>Format</th>
                    <th>Seri</th>
                    <th>Son No</th>
                    <th>Durum</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => (
                    <tr
                      key={row.id}
                      className={selectedId === row.id ? "seri-row-selected" : undefined}
                      onClick={() => startEdit(row)}
                    >
                      <td>
                        <code>{row.code}</code>
                      </td>
                      <td>{row.name}</td>
                      <td title={row.document_type}>{docTypeLabel(row.document_type)}</td>
                      <td>
                        <StatusBadge
                          status={row.format_kind === "GIB" || row.is_gib_series ? "gib_hazir" : "aktif"}
                          label={row.format_kind || (row.is_gib_series ? "GIB" : "SISTEM")}
                        />
                      </td>
                      <td>{row.series_prefix}</td>
                      <td className="seri-mono">{row.last_formatted || "—"}</td>
                      <td>
                        <StatusBadge status={row.is_active ? "aktif" : "pasif"} />
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ fontSize: 11, padding: "3px 8px" }}
                          onClick={() => void openNumberCheck(row)}
                        >
                          Numara Kontrol
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {checkOpen && check ? (
        <div className="ui-side-panel-backdrop" onClick={() => setCheckOpen(false)} aria-hidden>
          <aside
            className="ui-side-panel"
            style={{ width: "min(560px, 96vw)" }}
            role="dialog"
            aria-modal
            onClick={(e) => e.stopPropagation()}
          >
            <header className="ui-side-panel-header">
              <h2>Numara Kontrol — {check.code}</h2>
              <button type="button" className="btn-cancel" onClick={() => setCheckOpen(false)}>
                ✖ Kapat
              </button>
            </header>
            <div className="ui-side-panel-body">
              <p style={{ fontSize: 13, color: "#64748b", marginTop: 0 }}>
                Yıl: <strong>{check.year}</strong> · Son: <strong>{check.last_number}</strong> · Sonraki:{" "}
                <strong>{check.next_preview}</strong>
              </p>
              <p style={{ fontSize: 12, color: "#64748b" }}>
                Gap-fill: silinen numaralar bir sonraki kayıtta yeniden kullanılır. GIB onaylı (kilitli)
                numaralar değiştirilemez.
              </p>
              <h4 style={{ margin: "12px 0 6px" }}>Kullanılan</h4>
              {check.used.length === 0 ? (
                <p style={{ color: "#94a3b8", fontSize: 13 }}>Kullanılan numara yok.</p>
              ) : (
                <table className="data-table" style={{ width: "100%", fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th>No</th>
                      <th>Belge No</th>
                      <th>Tarih</th>
                      <th>Durum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {check.used.map((u) => (
                      <tr key={`${u.sequence_no}-${u.formatted_no}`}>
                        <td>{u.sequence_no}</td>
                        <td>
                          <code>{u.formatted_no}</code>
                        </td>
                        <td>{String(u.document_date).slice(0, 10)}</td>
                        <td>
                          <StatusBadge
                            status={u.status === "GIB_LOCKED" ? "onaylandi" : "aktif"}
                            label={u.status === "GIB_LOCKED" ? "GIB Kilitli" : "Aktif"}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <h4 style={{ margin: "16px 0 6px" }}>Atlanan / Serbest (Gap)</h4>
              {check.gaps.length === 0 ? (
                <p style={{ color: "#94a3b8", fontSize: 13 }}>Atlanan numara yok.</p>
              ) : (
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
                  {check.gaps.map((g) => (
                    <li key={g.sequence_no}>
                      <code>{g.formatted_no}</code> — {g.reason}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
