import { useCallback, useEffect, useState } from "react";
import {
  kodTanimlariApi,
  type CodeFieldSlot,
  type CodeMasterEntry,
  type EntityCodeAssignment,
} from "@/modules/kod-tanimlari/api/kodTanimlariApi";
import type { CodeEntityType } from "@/modules/ayarlar/constants/kodEntityTypes";

type Props = {
  entityType: CodeEntityType;
  entityId: number | null;
  onSaved?: () => void;
};

export function DynamicCodeFields({ entityType, entityId, onSaved }: Props) {
  const [slots, setSlots] = useState<CodeFieldSlot[]>([]);
  const [entriesBySlot, setEntriesBySlot] = useState<Record<number, CodeMasterEntry[]>>({});
  const [values, setValues] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newCodeLabels, setNewCodeLabels] = useState<Record<number, string>>({});

  const loadSlots = useCallback(async () => {
    const res = await kodTanimlariApi.listSlots(entityType);
    setSlots(res.items);
    const map: Record<number, CodeMasterEntry[]> = {};
    for (const slot of res.items) {
      const ent = await kodTanimlariApi.listEntries(slot.id);
      map[slot.id] = ent.items;
    }
    setEntriesBySlot(map);
  }, [entityType]);

  useEffect(() => {
    loadSlots().catch((e) => setError(e instanceof Error ? e.message : "Yükleme hatası"));
  }, [loadSlots]);

  useEffect(() => {
    if (!entityId) {
      setValues({});
      return;
    }
    setLoading(true);
    kodTanimlariApi
      .getEntityCodes(entityType, entityId)
      .then((res) => {
        const v: Record<number, string> = {};
        for (const item of res.items) {
          v[item.slot_id] = item.code_value ?? "";
        }
        setValues(v);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Kod yükleme hatası"))
      .finally(() => setLoading(false));
  }, [entityType, entityId]);

  async function saveAssignment(slotId: number, code: string) {
    if (!entityId) return;
    setError(null);
    try {
      const entry = entriesBySlot[slotId]?.find((e) => e.code === code);
      await kodTanimlariApi.saveEntityCodes(entityType, entityId, [
        { slot_id: slotId, entry_id: entry?.id ?? null, code_value: code || null },
      ]);
      onSaved?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kayıt hatası");
    }
  }

  async function quickCreate(slotId: number) {
    const code = (newCodeLabels[slotId] || "").trim();
    if (!code) return;
    setError(null);
    try {
      await kodTanimlariApi.createEntry({ slot_id: slotId, code, name: code });
      await loadSlots();
      setValues((prev) => ({ ...prev, [slotId]: code }));
      if (entityId) await saveAssignment(slotId, code);
      setNewCodeLabels((prev) => ({ ...prev, [slotId]: "" }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Oluşturma hatası";
      setError(msg.includes("409") ? "Bu tanım daha önce oluşturulmuştur." : msg);
    }
  }

  if (slots.length === 0) {
    return <p className="text-muted">Tanımlı grup/özel kod alanı yok. Ayarlardan ekleyin.</p>;
  }

  return (
    <div className="dynamic-code-fields">
      {error ? <div className="form-error" style={{ marginBottom: 8 }}>{error}</div> : null}
      {loading ? <p className="text-muted">Yükleniyor…</p> : null}
      {slots.map((slot) => (
        <div className="form-row" key={slot.id}>
          <label>{slot.label}</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <select
              className="form-control"
              style={{ minWidth: 160 }}
              value={values[slot.id] ?? ""}
              disabled={!entityId}
              onChange={(e) => {
                const v = e.target.value;
                setValues((prev) => ({ ...prev, [slot.id]: v }));
                saveAssignment(slot.id, v);
              }}
            >
              <option value="">— Seçin —</option>
              {(entriesBySlot[slot.id] ?? []).map((ent) => (
                <option key={ent.id} value={ent.code}>
                  {ent.code} — {ent.name}
                </option>
              ))}
            </select>
            <input
              className="form-control"
              placeholder="Yeni kod"
              style={{ maxWidth: 120 }}
              value={newCodeLabels[slot.id] ?? ""}
              onChange={(e) =>
                setNewCodeLabels((prev) => ({ ...prev, [slot.id]: e.target.value }))
              }
            />
            <button type="button" className="btn-secondary" onClick={() => quickCreate(slot.id)}>
              + Ekle
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
