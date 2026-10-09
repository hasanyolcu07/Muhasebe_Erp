import { useCallback, useEffect, useState } from "react";
import { StatusBadge } from "@/components/ui";
import { api } from "@/services/api";
import { AktifPasifToggle } from "../AktifPasifToggle";
import { AyarField } from "../AyarFormBits";

type CariTip = {
  id: number;
  code: string;
  name: string;
  is_active: boolean;
  sort_order?: number;
};

type Mode = "idle" | "create" | "edit";

const empty = { code: "", name: "", is_active: true };

export function CariTipTanimlariPanel() {
  const [items, setItems] = useState<CariTip[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("idle");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState(empty);
  const formEnabled = mode !== "idle";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api<CariTip[] | { items: CariTip[] }>("/sistem/cari-tipler");
      const list = Array.isArray(res) ? res : res.items ?? [];
      setItems(list);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Liste alınamadı");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function startCreate() {
    setMode("create");
    setSelectedId(null);
    setForm(empty);
  }

  function startEdit(row: CariTip) {
    setMode("edit");
    setSelectedId(row.id);
    setForm({ code: row.code, name: row.name, is_active: row.is_active });
  }

  function cancel() {
    setMode("idle");
    setSelectedId(null);
    setForm(empty);
  }

  async function onSave() {
    const code = form.code.trim().toUpperCase();
    const name = form.name.trim();
    if (!code || !name) {
      setError("Kod ve ad zorunludur");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (mode === "edit" && selectedId) {
        await api(`/sistem/cari-tipler/${selectedId}`, {
          method: "PUT",
          body: { name, is_active: form.is_active },
        });
      } else {
        await api("/sistem/cari-tipler", {
          method: "POST",
          body: { code, name, is_active: form.is_active },
        });
      }
      cancel();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kayıt hatası");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(row: CariTip) {
    if (!window.confirm(`"${row.name}" cari tipini silmek istiyor musunuz?`)) return;
    await api(`/sistem/cari-tipler/${row.id}`, { method: "DELETE" });
    if (selectedId === row.id) cancel();
    await load();
  }

  return (
    <div className="ayar-form-card">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Cari Tip Tanımları</h3>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "#64748b" }}>
            Müşteri, tedarikçi ve diğer cari tip kodları.
          </p>
        </div>
        <button type="button" className="btn-save" onClick={startCreate}>
          + Ekle
        </button>
      </div>

      {error ? <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div> : null}

      <div className="tanim-split">
        <form
          className={`tanim-split-form${formEnabled ? "" : " is-idle"}`}
          onSubmit={(e) => {
            e.preventDefault();
            void onSave();
          }}
        >
          <AyarField label="Kod">
            <input
              className="form-control"
              disabled={!formEnabled || mode === "edit"}
              maxLength={40}
              value={form.code || ""}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
            />
          </AyarField>
          <AyarField label="Ad">
            <input
              className="form-control"
              disabled={!formEnabled}
              value={form.name || ""}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </AyarField>
          <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, marginBottom: 12 }}>
            <span style={{ fontWeight: 600, color: "#64748b" }}>Durum</span>
            <AktifPasifToggle
              value={form.is_active}
              disabled={!formEnabled}
              onChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button type="button" className="btn-cancel" disabled={!formEnabled || saving} onClick={cancel}>
              Vazgeç
            </button>
            <button type="submit" className="btn-save" disabled={!formEnabled || saving}>
              {saving ? "Kaydediliyor…" : "Kaydet"}
            </button>
          </div>
        </form>

        <div className="tanim-list-frame">
          <div className="tanim-list-frame-head">
            <h4>Cari Tip Listesi</h4>
          </div>
          <div className="tanim-list-frame-body">
            {loading ? (
              <p className="tanim-list-empty">Yükleniyor…</p>
            ) : (
              <table className="data-table" style={{ width: "100%", fontSize: 13 }}>
                <thead>
                  <tr>
                    <th>Kod</th>
                    <th>Ad</th>
                    <th>Durum</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="tanim-list-empty">
                        Kayıt yok
                      </td>
                    </tr>
                  ) : (
                    items.map((row) => (
                      <tr key={row.id} className={selectedId === row.id ? "tanim-row-selected" : undefined}>
                        <td>
                          <code>{row.code}</code>
                        </td>
                        <td>{row.name}</td>
                        <td>
                          <StatusBadge status={row.is_active ? "aktif" : "pasif"} />
                        </td>
                        <td>
                          <button type="button" className="btn-secondary" style={{ fontSize: 11, marginRight: 4 }} onClick={() => startEdit(row)}>
                            Değiştir
                          </button>
                          <button type="button" className="btn-cancel" style={{ fontSize: 11 }} onClick={() => void onDelete(row)}>
                            Sil
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
