import { useCallback, useEffect, useMemo, useState } from "react";
import { ChartOfAccountsPicker } from "@/components/ChartOfAccountsPicker";
import { StatusBadge } from "@/components/ui";
import { formatCoaDisplay } from "@/services/coaApi";
import {
  kodTanimlariApi,
  type CodeFieldSlot,
  type CodeMasterEntry,
} from "@/modules/kod-tanimlari/api/kodTanimlariApi";
import {
  CODE_ENTITY_LABELS,
  CODE_ENTITY_OPTIONS,
  type KodEntityType,
} from "../constants/kodEntityTypes";

type SlotKind = "GROUP" | "SPECIAL";
type Mode = "idle" | "create-slot" | "edit-slot" | "create-entry" | "edit-entry";

export function CodeDefinitionsPage() {
  const [entityType, setEntityType] = useState<KodEntityType>("ACCOUNT");
  const [slots, setSlots] = useState<CodeFieldSlot[]>([]);
  const [entriesBySlot, setEntriesBySlot] = useState<Record<number, CodeMasterEntry[]>>({});
  const [mode, setMode] = useState<Mode>("idle");
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);
  const [selectedEntryId, setSelectedEntryId] = useState<number | null>(null);
  const [slotKind, setSlotKind] = useState<SlotKind>("GROUP");
  const [slotLabel, setSlotLabel] = useState("");
  const [entryCode, setEntryCode] = useState("");
  const [entryName, setEntryName] = useState("");
  const [entryCoaId, setEntryCoaId] = useState<number | null>(null);
  const [entryCoaLabel, setEntryCoaLabel] = useState("");
  const [bulkEntryCode, setBulkEntryCode] = useState("");
  const [bulkNewCoaId, setBulkNewCoaId] = useState<number | null>(null);
  const [bulkNewCoaLabel, setBulkNewCoaLabel] = useState("");
  const [bulkPreview, setBulkPreview] = useState<{ affected_count: number; run_id: number | null } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const formEnabled = mode !== "idle";

  const loadSlots = useCallback(async () => {
    setLoading(true);
    try {
      const res = await kodTanimlariApi.listSlots(entityType);
      const items = res.items ?? [];
      setSlots(items);
      const map: Record<number, CodeMasterEntry[]> = {};
      await Promise.all(
        items.map(async (s) => {
          const er = await kodTanimlariApi.listEntries(s.id);
          map[s.id] = er.items ?? [];
        })
      );
      setEntriesBySlot(map);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Liste alınamadı");
    } finally {
      setLoading(false);
    }
  }, [entityType]);

  useEffect(() => {
    void loadSlots();
    setMode("idle");
    setSelectedSlotId(null);
    setSelectedEntryId(null);
  }, [loadSlots]);

  const groupSlots = useMemo(() => slots.filter((s) => s.field_kind === "GROUP"), [slots]);
  const specialSlots = useMemo(() => slots.filter((s) => s.field_kind === "SPECIAL"), [slots]);

  function resetForm() {
    setSlotKind("GROUP");
    setSlotLabel("");
    setEntryCode("");
    setEntryName("");
    setEntryCoaId(null);
    setEntryCoaLabel("");
    setSelectedSlotId(null);
    setSelectedEntryId(null);
    setMode("idle");
  }

  function startCreateSlot(kind: SlotKind = "GROUP") {
    setMode("create-slot");
    setSelectedSlotId(null);
    setSelectedEntryId(null);
    setSlotKind(kind);
    setSlotLabel(kind === "GROUP" ? "Grup Kodu" : "Özel Kod");
    setEntryCode("");
    setEntryName("");
    setEntryCoaId(null);
    setEntryCoaLabel("");
  }

  function startEditSlot(slot: CodeFieldSlot) {
    setMode("edit-slot");
    setSelectedSlotId(slot.id);
    setSelectedEntryId(null);
    setSlotKind(slot.field_kind as SlotKind);
    setSlotLabel(slot.label);
    setEntryCode("");
    setEntryName("");
    setEntryCoaId(null);
    setEntryCoaLabel("");
  }

  function startCreateEntry(slot: CodeFieldSlot) {
    setMode("create-entry");
    setSelectedSlotId(slot.id);
    setSelectedEntryId(null);
    setSlotKind(slot.field_kind as SlotKind);
    setSlotLabel(slot.label);
    setEntryCode("");
    setEntryName("");
    setEntryCoaId(null);
    setEntryCoaLabel("");
  }

  function startEditEntry(slot: CodeFieldSlot, entry: CodeMasterEntry) {
    setMode("edit-entry");
    setSelectedSlotId(slot.id);
    setSelectedEntryId(entry.id);
    setSlotKind(slot.field_kind as SlotKind);
    setSlotLabel(slot.label);
    setEntryCode(entry.code);
    setEntryName(entry.name);
    setEntryCoaId(entry.coa_id);
    setEntryCoaLabel(entry.coa_code ? `${entry.coa_code} — ${entry.coa_title ?? ""}` : "");
  }

  async function onSave() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      if (mode === "create-slot") {
        if (!slotLabel.trim()) throw new Error("Alan etiketi zorunludur");
        const slot = await kodTanimlariApi.createSlot({
          entity_type: entityType,
          field_kind: slotKind,
          label: slotLabel.trim(),
        });
        // İlk kayıt: Kod + Ad doldurulduysa slot ile birlikte ilk entry
        if (entryCode.trim()) {
          await kodTanimlariApi.createEntry({
            slot_id: slot.id,
            code: entryCode.trim(),
            name: entryName.trim() || entryCode.trim(),
            coa_id: entryCoaId,
          });
          setMessage("Alan ve ilk kod tanımı eklendi.");
        } else {
          setMessage("Alan tanımı eklendi.");
        }
      } else if (mode === "edit-slot" && selectedSlotId) {
        await kodTanimlariApi.updateSlot(selectedSlotId, { label: slotLabel.trim() });
        setMessage("Alan tanımı güncellendi.");
      } else if (mode === "create-entry" && selectedSlotId) {
        if (!entryCode.trim()) throw new Error("Kod zorunludur");
        await kodTanimlariApi.createEntry({
          slot_id: selectedSlotId,
          code: entryCode.trim(),
          name: entryName.trim() || entryCode.trim(),
          coa_id: entryCoaId,
        });
        setMessage("Kod tanımı eklendi.");
      } else if (mode === "edit-entry" && selectedEntryId) {
        await kodTanimlariApi.updateEntry(selectedEntryId, {
          name: entryName.trim() || entryCode.trim(),
          coa_id: entryCoaId,
        });
        setMessage("Kod tanımı güncellendi.");
      }
      resetForm();
      await loadSlots();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Kayıt hatası";
      setError(msg.includes("409") ? "Bu tanım daha önce oluşturulmuştur." : msg);
    } finally {
      setSaving(false);
    }
  }

  async function onDeleteSlot(slot: CodeFieldSlot) {
    if (!window.confirm(`"${slot.label}" alanını silmek istiyor musunuz?`)) return;
    await kodTanimlariApi.removeSlot(slot.id);
    if (selectedSlotId === slot.id) resetForm();
    await loadSlots();
  }

  async function onDeleteEntry(entry: CodeMasterEntry) {
    if (!window.confirm(`"${entry.code}" kodunu silmek istiyor musunuz?`)) return;
    await kodTanimlariApi.removeEntry(entry.id);
    if (selectedEntryId === entry.id) resetForm();
    await loadSlots();
  }

  async function previewBulk() {
    if (!selectedSlotId || !bulkNewCoaId || !bulkEntryCode.trim()) return;
    setError(null);
    try {
      const res = await kodTanimlariApi.previewBulkCoa({
        entity_type: entityType,
        slot_id: selectedSlotId,
        entry_code: bulkEntryCode.trim(),
        new_coa_id: bulkNewCoaId,
      });
      setBulkPreview({ affected_count: res.affected_count, run_id: res.run_id });
      setMessage(`Önizleme: ${res.affected_count} kayıt etkilenecek.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Önizleme hatası");
    }
  }

  async function applyBulk() {
    if (!bulkPreview?.run_id) return;
    setError(null);
    try {
      const res = await kodTanimlariApi.applyBulkCoa(bulkPreview.run_id);
      setMessage(`Toplu aktarım tamamlandı: ${res.affected_count} kayıt güncellendi.`);
      setBulkPreview(null);
      await loadSlots();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Aktarım hatası");
    }
  }

  async function syncGib() {
    setError(null);
    try {
      const res = await kodTanimlariApi.gibSync();
      setMessage(
        `GIB senkron: istisna ${res.istisna_updated}, tevkifat ${res.tevkifat_updated} (v${res.version})`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Senkron hatası");
    }
  }

  function renderSlotList(title: string, kind: SlotKind, list: CodeFieldSlot[]) {
    return (
      <div className="tanim-list-frame">
        <div className="tanim-list-frame-head">
          <h4>{title}</h4>
          <button type="button" className="btn-secondary" style={{ fontSize: 11 }} onClick={() => startCreateSlot(kind)}>
            + Alan
          </button>
        </div>
        <div className="tanim-list-frame-body">
          {loading ? (
            <p className="tanim-list-empty">Yükleniyor…</p>
          ) : list.length === 0 ? (
            <p className="tanim-list-empty">Kayıt yok</p>
          ) : (
            <table className="data-table" style={{ width: "100%", fontSize: 13 }}>
              <thead>
                <tr>
                  <th>Kayıt Türü</th>
                  <th>Alan</th>
                  <th>Kod</th>
                  <th>Ad</th>
                  <th>COA</th>
                  <th>Durum</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.flatMap((slot) => {
                  const kayitTuru = CODE_ENTITY_LABELS[slot.entity_type as KodEntityType] ?? slot.entity_type;
                  const entries = entriesBySlot[slot.id] ?? [];
                  if (entries.length === 0) {
                    return [
                      <tr
                        key={`slot-${slot.id}`}
                        className={selectedSlotId === slot.id && !selectedEntryId ? "tanim-row-selected" : undefined}
                        onClick={() => startEditSlot(slot)}
                        style={{ cursor: "pointer" }}
                      >
                        <td>{kayitTuru}</td>
                        <td>{slot.label}</td>
                        <td colSpan={3} style={{ color: "#94a3b8" }}>
                          Kod yok — soldan ekleyin
                        </td>
                        <td>
                          <StatusBadge status={slot.is_active ? "aktif" : "pasif"} />
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <button type="button" className="btn-secondary" style={{ fontSize: 11, marginRight: 4 }} onClick={() => startEditSlot(slot)}>
                            Değiştir
                          </button>
                          <button type="button" className="btn-secondary" style={{ fontSize: 11, marginRight: 4 }} onClick={() => startCreateEntry(slot)}>
                            + Kod
                          </button>
                          <button type="button" className="btn-cancel" style={{ fontSize: 11 }} onClick={() => void onDeleteSlot(slot)}>
                            Sil
                          </button>
                        </td>
                      </tr>,
                    ];
                  }
                  return entries.map((entry, idx) => (
                    <tr
                      key={`e-${entry.id}`}
                      className={selectedEntryId === entry.id ? "tanim-row-selected" : undefined}
                      onClick={() => startEditEntry(slot, entry)}
                      style={{ cursor: "pointer" }}
                    >
                      <td>{idx === 0 ? kayitTuru : ""}</td>
                      <td>{idx === 0 ? slot.label : ""}</td>
                      <td>
                        <code>{entry.code}</code>
                      </td>
                      <td>{entry.name}</td>
                      <td>{entry.coa_code ?? "—"}</td>
                      <td>
                        <StatusBadge status={entry.is_active ? "aktif" : "pasif"} />
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        {idx === 0 ? (
                          <>
                            <button type="button" className="btn-secondary" style={{ fontSize: 11, marginRight: 4 }} onClick={() => startEditSlot(slot)}>
                              Alan
                            </button>
                            <button type="button" className="btn-secondary" style={{ fontSize: 11, marginRight: 4 }} onClick={() => startCreateEntry(slot)}>
                              + Kod
                            </button>
                          </>
                        ) : null}
                        <button type="button" className="btn-secondary" style={{ fontSize: 11, marginRight: 4 }} onClick={() => startEditEntry(slot, entry)}>
                          Değiştir
                        </button>
                        <button type="button" className="btn-cancel" style={{ fontSize: 11 }} onClick={() => void onDeleteEntry(entry)}>
                          Sil
                        </button>
                      </td>
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  const showCodeFields = mode === "create-slot" || mode === "create-entry" || mode === "edit-entry" || mode === "idle";

  return (
    <div className="ayar-form-card">
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14, gap: 12, flexWrap: "wrap" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Grup / Özel Kod Tanımları</h3>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "#64748b" }}>
            Sol formda alan veya kod tanımlayın; sağda Grup ve Özel Kod listeleri.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="btn-secondary" onClick={() => void syncGib()}>
            GİB Senkron
          </button>
          <button type="button" className="btn-save" onClick={() => startCreateSlot("GROUP")}>
            + Ekle
          </button>
        </div>
      </div>

      {message ? <div className="form-success" style={{ marginBottom: 10 }}>{message}</div> : null}
      {error ? <div className="form-error" style={{ marginBottom: 10 }}>{error}</div> : null}

      <div className="tanim-split">
        <form
          className={`tanim-split-form${formEnabled ? "" : " is-idle"}`}
          onSubmit={(e) => {
            e.preventDefault();
            void onSave();
          }}
        >
          <div className="tanim-form-row">
            <label>Kart / Kayıt Türü</label>
            <div className="field-wrap">
              <select
                className="form-control"
                disabled={!formEnabled || mode === "edit-slot" || mode === "edit-entry" || mode === "create-entry"}
                value={entityType}
                onChange={(e) => setEntityType(e.target.value as KodEntityType)}
              >
                {CODE_ENTITY_OPTIONS.map((o: { value: KodEntityType; label: string }) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="tanim-form-row">
            <label>Alan Türü</label>
            <div className="field-wrap">
              <select
                className="form-control"
                disabled={!formEnabled || mode === "edit-slot" || mode === "edit-entry" || mode === "create-entry"}
                value={slotKind}
                onChange={(e) => setSlotKind(e.target.value as SlotKind)}
              >
                <option value="GROUP">Grup</option>
                <option value="SPECIAL">Özel</option>
              </select>
            </div>
          </div>
          <div className="tanim-form-row">
            <label>Alan Etiketi</label>
            <div className="field-wrap">
              <input
                className="form-control"
                disabled={!formEnabled || mode === "create-entry" || mode === "edit-entry"}
                value={slotLabel}
                onChange={(e) => setSlotLabel(e.target.value)}
              />
            </div>
          </div>
          {showCodeFields && (
            <>
              <div className="tanim-form-row">
                <label>Kod</label>
                <div className="field-wrap">
                  <input
                    className="form-control"
                    disabled={!formEnabled || mode === "edit-entry"}
                    value={entryCode}
                    onChange={(e) => setEntryCode(e.target.value)}
                    maxLength={40}
                    placeholder={mode === "create-slot" ? "Opsiyonel — ilk kod" : ""}
                  />
                </div>
              </div>
              <div className="tanim-form-row">
                <label>Ad</label>
                <div className="field-wrap">
                  <input
                    className="form-control"
                    disabled={!formEnabled}
                    value={entryName}
                    onChange={(e) => setEntryName(e.target.value)}
                    placeholder={mode === "create-slot" ? "Opsiyonel — ilk ad" : ""}
                  />
                </div>
              </div>
              <div className="tanim-form-row">
                <label>Muhasebe Hesabı</label>
                <div className="field-wrap" style={{ minWidth: 0, width: "100%" }}>
                  <ChartOfAccountsPicker
                    value={entryCoaId}
                    displayLabel={entryCoaLabel}
                    disabled={!formEnabled}
                    onChange={(id, item) => {
                      setEntryCoaId(id);
                      setEntryCoaLabel(item ? formatCoaDisplay(item) : "");
                    }}
                  />
                </div>
              </div>
            </>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
            <button type="button" className="btn-cancel" disabled={!formEnabled || saving} onClick={resetForm}>
              Vazgeç
            </button>
            <button type="submit" className="btn-save" disabled={!formEnabled || saving}>
              {saving ? "Kaydediliyor…" : "Kaydet"}
            </button>
          </div>
        </form>

        <div className="tanim-split-lists">
          {renderSlotList("Grup Tanımları", "GROUP", groupSlots)}
          {renderSlotList("Özel Kod Tanımları", "SPECIAL", specialSlots)}
        </div>
      </div>

      <div className="tanim-list-frame" style={{ marginTop: 16 }}>
        <div className="tanim-list-frame-head">
          <h4>Toplu Muhasebe Kodu Aktarımı</h4>
        </div>
        <div style={{ padding: 14 }}>
          <div className="gg-grid-2col">
            <div className="tanim-form-row">
              <label>Kod Değeri</label>
              <div className="field-wrap">
                <input className="form-control" value={bulkEntryCode} onChange={(e) => setBulkEntryCode(e.target.value)} />
              </div>
            </div>
            <div className="tanim-form-row">
              <label>Yeni Muhasebe Hesabı</label>
              <div className="field-wrap">
                <ChartOfAccountsPicker
                  value={bulkNewCoaId}
                  displayLabel={bulkNewCoaLabel}
                  onChange={(id, item) => {
                    setBulkNewCoaId(id);
                    setBulkNewCoaLabel(item ? formatCoaDisplay(item) : "");
                  }}
                />
              </div>
            </div>
          </div>
          <p style={{ fontSize: 12, color: "#64748b", margin: "8px 0" }}>
            Önce sağ listeden bir alan seçin (Değiştir / + Kod), ardından önizleme yapın. Yalnızca Cari ve Stok.
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="btn-secondary" disabled={!selectedSlotId} onClick={() => void previewBulk()}>
              Önizleme
            </button>
            <button type="button" className="btn-save" disabled={!bulkPreview?.run_id} onClick={() => void applyBulk()}>
              Onayla ve Uygula ({bulkPreview?.affected_count ?? 0})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
