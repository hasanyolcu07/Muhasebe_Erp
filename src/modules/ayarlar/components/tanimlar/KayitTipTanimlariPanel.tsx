import { useCallback, useEffect, useState } from "react";
import { StatusBadge } from "@/components/ui";
import { api } from "@/services/api";
import { useAppStore } from "@/store/appStore";
import { AktifPasifToggle } from "../AktifPasifToggle";
import { AyarField } from "../AyarFormBits";

type KayitTip = {
  id: number;
  code: string;
  name: string;
  muhasebelessin_mi?: boolean;
  raporda_gorunsun_mu?: boolean;
  is_active?: boolean;
};

type Mode = "idle" | "create" | "edit";

const empty = {
  code: "",
  name: "",
  muhasebelessin_mi: true,
  raporda_gorunsun_mu: true,
  is_active: true,
};

export function KayitTipTanimlariPanel() {
  const setTenantLists = useAppStore((s) => s.setTenantLists);
  const branches = useAppStore((s) => s.branches);
  const [items, setItems] = useState<KayitTip[]>([]);
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
      const res = await api<{ items: KayitTip[] }>("/tenant/record-types");
      const list = res.items ?? [];
      setItems(list);
      setTenantLists(
        branches,
        list.map((r) => ({
          id: r.id,
          code: r.code,
          name: r.name,
          muhasebelessin_mi: r.muhasebelessin_mi ?? true,
          raporda_gorunsun_mu: r.raporda_gorunsun_mu ?? true,
        }))
      );
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Liste alınamadı");
    } finally {
      setLoading(false);
    }
  }, [branches, setTenantLists]);

  useEffect(() => {
    void load();
  }, [load]);

  function startCreate() {
    setMode("create");
    setSelectedId(null);
    setForm(empty);
  }

  function startEdit(row: KayitTip) {
    setMode("edit");
    setSelectedId(row.id);
    setForm({
      code: row.code,
      name: row.name,
      muhasebelessin_mi: row.muhasebelessin_mi ?? true,
      raporda_gorunsun_mu: row.raporda_gorunsun_mu ?? true,
      is_active: row.is_active !== false,
    });
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
        await api(`/tenant/record-types/${selectedId}`, {
          method: "PUT",
          body: {
            name,
            muhasebelessin_mi: form.muhasebelessin_mi,
            raporda_gorunsun_mu: form.raporda_gorunsun_mu,
            is_active: form.is_active,
          },
        });
      } else {
        await api("/tenant/record-types", {
          method: "POST",
          body: {
            code,
            name,
            muhasebelessin_mi: form.muhasebelessin_mi,
            raporda_gorunsun_mu: form.raporda_gorunsun_mu,
            is_active: form.is_active,
          },
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

  return (
    <div className="ayar-form-card">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Kayıt Tip Tanımları (GR-R)</h3>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "#64748b" }}>
            Resmi / Gayri Resmi kayıt türleri otomatik oluşturulur; ek tipler tanımlayabilirsiniz.
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
              maxLength={32}
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
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, marginBottom: 8 }}>
            <input
              type="checkbox"
              disabled={!formEnabled}
              checked={form.muhasebelessin_mi}
              onChange={(e) => setForm((f) => ({ ...f, muhasebelessin_mi: e.target.checked }))}
            />
            Muhasebeleşsin mi
          </label>
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, marginBottom: 8 }}>
            <input
              type="checkbox"
              disabled={!formEnabled}
              checked={form.raporda_gorunsun_mu}
              onChange={(e) => setForm((f) => ({ ...f, raporda_gorunsun_mu: e.target.checked }))}
            />
            Raporda görünsün
          </label>
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
            <h4>Kayıt Tip Listesi</h4>
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
                    <th>Muhasebe</th>
                    <th>Durum</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => (
                    <tr
                      key={row.id}
                      className={selectedId === row.id ? "tanim-row-selected" : undefined}
                      onClick={() => startEdit(row)}
                      style={{ cursor: "pointer" }}
                    >
                      <td>
                        <code>{row.code}</code>
                      </td>
                      <td>{row.name}</td>
                      <td>{row.muhasebelessin_mi === false ? "Hayır" : "Evet"}</td>
                      <td>
                        <StatusBadge status={row.is_active === false ? "pasif" : "aktif"} />
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <button type="button" className="btn-secondary" style={{ fontSize: 11 }} onClick={() => startEdit(row)}>
                          Değiştir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
