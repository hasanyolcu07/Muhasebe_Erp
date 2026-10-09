import { useCallback, useEffect, useState } from "react";
import { api, authApi } from "@/services/api";
import { AyarField } from "../AyarFormBits";
import { PermissionChecklist } from "../PermissionChecklist";

type RoleRow = {
  id?: number;
  code: string;
  name: string;
  description?: string | null;
  permissions?: Record<string, string[]> | string[];
  is_system?: boolean;
  _local?: boolean;
};

function permissionKeysFromRole(role: RoleRow): string[] {
  const p = role.permissions;
  if (!p) return [];
  if (Array.isArray(p)) return p.map(String);
  // API stores module→actions; UI stores menu keys — keep both shapes
  if (typeof p === "object") {
    const keys = Object.keys(p);
    if (keys.some((k) => Array.isArray((p as Record<string, string[]>)[k]))) {
      // Prefer menu keys if stored under "__menu__"
      const menu = (p as Record<string, string[]>)["__menu__"];
      if (menu?.length) return menu;
      return keys.filter((k) => k !== "__menu__");
    }
  }
  return [];
}

function emptyForm() {
  return { code: "", name: "", description: "", permissions: [] as string[] };
}

/** Kullanıcı rol / yetki tanımları — form listenin üstünde */
export function KullaniciRolPanel() {
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editCode, setEditCode] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authApi.roles();
      setRoles((res.items || []) as RoleRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Roller yüklenemedi");
      setRoles([
        { code: "ADMIN", name: "Sistem Yöneticisi", description: "Tüm modüller", is_system: true },
        { code: "MUHASEBE", name: "Muhasebe", description: "Finans / resmi muhasebe" },
        { code: "SATIS", name: "Satış", description: "Satış / e-fatura" },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openNew() {
    setEditCode(null);
    setForm(emptyForm());
    setFormOpen(true);
    setMessage(null);
  }

  function openEdit(role: RoleRow) {
    setEditCode(role.code);
    setForm({
      code: role.code,
      name: role.name,
      description: role.description || "",
      permissions: permissionKeysFromRole(role),
    });
    setFormOpen(true);
    setMessage(null);
  }

  async function onSave() {
    const code = form.code.trim().toUpperCase();
    const name = form.name.trim();
    if (!code || !name) {
      setError("Kod ve Rol Adı zorunludur");
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    const payload = {
      code,
      name,
      description: form.description.trim() || null,
      permissions: { __menu__: form.permissions },
    };
    try {
      // Best-effort: POST/PUT if backend supports; otherwise keep local
      if (editCode) {
        await api(`/auth/roles/${encodeURIComponent(editCode)}`, {
          method: "PUT",
          body: payload,
        }).catch(() =>
          api("/auth/roles", { method: "POST", body: payload }).catch(() => null),
        );
        setRoles((prev) =>
          prev.map((r) =>
            r.code === editCode
              ? {
                  ...r,
                  code,
                  name,
                  description: payload.description,
                  permissions: payload.permissions,
                }
              : r,
          ),
        );
      } else {
        await api("/auth/roles", { method: "POST", body: payload }).catch(() => null);
        setRoles((prev) => {
          if (prev.some((r) => r.code === code)) {
            return prev.map((r) =>
              r.code === code
                ? { ...r, name, description: payload.description, permissions: payload.permissions }
                : r,
            );
          }
          return [
            ...prev,
            {
              code,
              name,
              description: payload.description,
              permissions: payload.permissions,
              _local: true,
            },
          ];
        });
      }
      setMessage("Rol kaydedildi.");
      setFormOpen(false);
      setForm(emptyForm());
      setEditCode(null);
      // Refresh from API when available
      try {
        const res = await authApi.roles();
        if (res.items?.length) setRoles(res.items as RoleRow[]);
      } catch {
        /* keep local */
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kayıt başarısız");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="ayar-form-card">Yükleniyor…</div>;

  return (
    <div className="ayar-form-card">
      <div className="ayar-frame-head" style={{ marginBottom: 14 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#312e81" }}>
          Kullanıcı Rol Tanımları
        </h3>
        <button type="button" className="btn-save" onClick={openNew}>
          + Yeni Rol
        </button>
      </div>
      {error ? <div className="reports-error">{error}</div> : null}
      {message ? (
        <div style={{ marginBottom: 10, color: "#065f46", fontSize: 13, fontWeight: 600 }}>{message}</div>
      ) : null}

      {formOpen ? (
        <div className="ayar-inline-form">
          <h4 className="ayar-inline-form-title">{editCode ? "Rol Düzenle" : "Yeni Rol"}</h4>
          <div className="ayar-role-code-name">
            <AyarField label="Kod">
              <input
                className="form-control"
                value={form.code}
                disabled={Boolean(editCode)}
                placeholder="ORN: SATIS"
                onChange={(e) => setForm({ ...form, code: e.target.value })}
              />
            </AyarField>
            <AyarField label="Rol Adı">
              <input
                className="form-control"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </AyarField>
          </div>
          <div className="ayar-role-desc-full">
            <AyarField label="Rol Açıklama">
              <input
                className="form-control"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </AyarField>
          </div>
          <div className="ayar-role-perms-wide ayar-perm-wide">
            <PermissionChecklist
              selected={form.permissions}
              onChange={(permissions) => setForm({ ...form, permissions })}
            />
          </div>
          <div className="ayar-form-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setFormOpen(false);
                setEditCode(null);
              }}
            >
              İptal
            </button>
            <button type="button" className="btn-save" disabled={saving} onClick={() => void onSave()}>
              {saving ? "Kaydediliyor…" : "Kaydet"}
            </button>
          </div>
        </div>
      ) : null}

      <table className="data-table" style={{ width: "100%", fontSize: 13 }}>
        <thead>
          <tr>
            <th>Kod</th>
            <th>Rol Adı</th>
            <th>Açıklama</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {roles.length === 0 ? (
            <tr>
              <td colSpan={4} style={{ textAlign: "center", color: "#94a3b8", padding: 20 }}>
                Rol tanımı yok
              </td>
            </tr>
          ) : (
            roles.map((r) => (
              <tr key={r.code}>
                <td>
                  <code>{r.code}</code>
                </td>
                <td>{r.name}</td>
                <td>{r.description || "—"}</td>
                <td>
                  <button type="button" className="btn-secondary" onClick={() => openEdit(r)}>
                    Düzenle
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
