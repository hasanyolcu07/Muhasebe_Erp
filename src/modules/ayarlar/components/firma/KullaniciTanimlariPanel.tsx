import { useCallback, useEffect, useMemo, useState } from "react";
import { api, authApi, tenantApi } from "@/services/api";
import { useAuthStore } from "@/store/appStore";
import { AyarField } from "../AyarFormBits";
import { PermissionChecklist } from "../PermissionChecklist";
import { sistemAyarlariApi } from "../../api/sistemAyarlariApi";

type RoleOpt = { code: string; name: string };
type CompanyOpt = { id: number; code?: string; name: string };

type UserRow = {
  id: string;
  username: string;
  fullName: string;
  email: string;
  phone: string;
  roleCode: string;
  companyIds: number[];
  yearIds: string[];
  extraPermissions: string[];
  active: boolean;
};

const USERS_STORAGE_KEY = "tabia.ayarlar.users";

function emptyForm() {
  return {
    username: "",
    fullName: "",
    password: "",
    email: "",
    phone: "",
    roleCode: "",
    companyIds: [] as number[],
    yearIds: [] as string[],
    extraPermissions: [] as string[],
  };
}

function loadLocalUsers(): UserRow[] {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as UserRow[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalUsers(rows: UserRow[]) {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(rows));
}

/** Kullanıcı tanımları — form listenin üstünde */
export function KullaniciTanimlariPanel() {
  const sessionCompanies = useAuthStore((s) => s.companies);
  const [rows, setRows] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<RoleOpt[]>([]);
  const [companies, setCompanies] = useState<CompanyOpt[]>([]);
  const [years, setYears] = useState<{ id: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());

  const loadMeta = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const local = loadLocalUsers();
      setRows(local);

      try {
        const roleRes = await authApi.roles();
        setRoles(
          (roleRes.items || []).map((r) => ({
            code: String(r.code ?? ""),
            name: String(r.name ?? r.code ?? ""),
          })),
        );
      } catch {
        setRoles([
          { code: "ADMIN", name: "Sistem Yöneticisi" },
          { code: "ACCOUNTANT", name: "Muhasebeci" },
          { code: "SALES", name: "Satış" },
        ]);
      }

      try {
        const raw = await tenantApi.companies();
        const items = Array.isArray(raw)
          ? raw
          : ((raw as { items?: unknown[] })?.items ?? sessionCompanies);
        setCompanies(
          (items as Array<Record<string, unknown>>).map((c) => ({
            id: Number(c.id ?? c.company_id),
            code: c.code != null ? String(c.code) : undefined,
            name: String(c.name ?? c.trade_name ?? c.code ?? "Şirket"),
          })),
        );
      } catch {
        setCompanies(
          sessionCompanies.map((c) => ({
            id: Number(c.id ?? c.company_id),
            code: c.code != null ? String(c.code) : undefined,
            name: String(c.name ?? "Şirket"),
          })),
        );
      }

      try {
        const firma = await sistemAyarlariApi.getFirma();
        const extra = (firma.profile_extra || {}) as Record<string, unknown>;
        const branding = (extra.branding || {}) as {
          working_periods?: Array<{ id: string; label: string; year_start: number }>;
        };
        const periods = branding.working_periods || [];
        setYears(
          periods.map((p) => ({
            id: p.id,
            label: p.label || String(p.year_start),
          })),
        );
      } catch {
        const y = new Date().getFullYear();
        setYears([
          { id: `p-${y}`, label: String(y) },
          { id: `p-${y - 1}`, label: String(y - 1) },
        ]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Veriler yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [sessionCompanies]);

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  const roleName = useMemo(() => {
    const map = new Map(roles.map((r) => [r.code, r.name]));
    return (code: string) => map.get(code) || code || "—";
  }, [roles]);

  function openNew() {
    setEditId(null);
    setForm(emptyForm());
    setFormOpen(true);
    setMessage(null);
  }

  function openEdit(row: UserRow) {
    setEditId(row.id);
    setForm({
      username: row.username,
      fullName: row.fullName,
      password: "",
      email: row.email,
      phone: row.phone,
      roleCode: row.roleCode,
      companyIds: [...row.companyIds],
      yearIds: [...row.yearIds],
      extraPermissions: [...row.extraPermissions],
    });
    setFormOpen(true);
    setMessage(null);
  }

  function toggleCompany(id: number) {
    setForm((prev) => {
      const has = prev.companyIds.includes(id);
      return {
        ...prev,
        companyIds: has ? prev.companyIds.filter((x) => x !== id) : [...prev.companyIds, id],
      };
    });
  }

  function toggleYear(id: string) {
    setForm((prev) => {
      const has = prev.yearIds.includes(id);
      return {
        ...prev,
        yearIds: has ? prev.yearIds.filter((x) => x !== id) : [...prev.yearIds, id],
      };
    });
  }

  async function onSave() {
    const username = form.username.trim();
    const fullName = form.fullName.trim();
    if (!username || !fullName) {
      setError("Kullanıcı Adı ve Adı Soyadı zorunludur");
      return;
    }
    if (!editId && !form.password.trim()) {
      setError("Yeni kullanıcı için şifre zorunludur");
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);

    const nextRow: UserRow = {
      id: editId || `u-${Date.now()}`,
      username,
      fullName,
      email: form.email.trim(),
      phone: form.phone.trim(),
      roleCode: form.roleCode,
      companyIds: form.companyIds,
      yearIds: form.yearIds,
      extraPermissions: form.extraPermissions,
      active: true,
    };

    try {
      await api("/auth/users", {
        method: editId ? "PUT" : "POST",
        body: {
          ...nextRow,
          password: form.password || undefined,
        },
      }).catch(() => null);

      setRows((prev) => {
        const next = editId
          ? prev.map((r) => (r.id === editId ? nextRow : r))
          : [...prev, nextRow];
        saveLocalUsers(next);
        return next;
      });
      setMessage("Kullanıcı kaydedildi.");
      setFormOpen(false);
      setEditId(null);
      setForm(emptyForm());
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
          Kullanıcı Tanımları
        </h3>
        <button type="button" className="btn-save" onClick={openNew}>
          + Yeni Kullanıcı
        </button>
      </div>
      {error ? <div className="reports-error">{error}</div> : null}
      {message ? (
        <div style={{ marginBottom: 10, color: "#065f46", fontSize: 13, fontWeight: 600 }}>{message}</div>
      ) : null}

      {formOpen ? (
        <div className="ayar-inline-form">
          <h4 className="ayar-inline-form-title">
            {editId ? "Kullanıcı Düzenle" : "Yeni Kullanıcı"}
          </h4>
          <AyarField label="Kullanıcı Adı">
            <input
              className="form-control"
              value={form.username ?? ""}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
            />
          </AyarField>
          <AyarField label="Adı Soyadı">
            <input
              className="form-control"
              value={form.fullName ?? ""}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            />
          </AyarField>
          <AyarField label="Şifre">
            <input
              className="form-control"
              type="password"
              value={form.password ?? ""}
              placeholder={editId ? "Değiştirmek için doldurun" : ""}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </AyarField>
          <AyarField label="Mail">
            <input
              className="form-control"
              type="email"
              value={form.email ?? ""}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </AyarField>
          <AyarField label="Telefon">
            <input
              className="form-control"
              value={form.phone ?? ""}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </AyarField>
          <AyarField label="Atanacak Rol">
            <select
              className="form-control"
              value={form.roleCode ?? ""}
              onChange={(e) => setForm({ ...form, roleCode: e.target.value })}
            >
              <option value="">Seçim Yapın</option>
              {roles.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.name} ({r.code})
                </option>
              ))}
            </select>
          </AyarField>
          <AyarField label="İşlem yetkisi olan şirket">
            <div className="ayar-multi-checks">
              {companies.length === 0 ? (
                <span style={{ color: "#94a3b8", fontSize: 12 }}>Şirket listesi yok</span>
              ) : (
                companies.map((c) => (
                  <label key={c.id}>
                    <input
                      type="checkbox"
                      checked={form.companyIds.includes(c.id)}
                      onChange={() => toggleCompany(c.id)}
                    />
                    {c.code ? `${c.code} — ` : ""}
                    {c.name}
                  </label>
                ))
              )}
            </div>
          </AyarField>
          <AyarField label="İşlem yetkisi olan Yıl">
            <div className="ayar-multi-checks">
              {years.length === 0 ? (
                <span style={{ color: "#94a3b8", fontSize: 12 }}>Yıl tanımı yok</span>
              ) : (
                years.map((y) => (
                  <label key={y.id}>
                    <input
                      type="checkbox"
                      checked={form.yearIds.includes(y.id)}
                      onChange={() => toggleYear(y.id)}
                    />
                    {y.label}
                  </label>
                ))
              )}
            </div>
          </AyarField>
          {editId ? (
            <AyarField label="Ek yetkiler">
              <PermissionChecklist
                title="Rol dışı ek yetkiler"
                compact
                selected={form.extraPermissions}
                onChange={(extraPermissions) => setForm({ ...form, extraPermissions })}
              />
            </AyarField>
          ) : null}
          <div className="ayar-form-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setFormOpen(false);
                setEditId(null);
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
            <th>Kullanıcı Adı</th>
            <th>Ad Soyad</th>
            <th>Rol</th>
            <th>Aktif</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={5} style={{ textAlign: "center", color: "#94a3b8", padding: 20 }}>
                Gösterilecek kullanıcı yok — yeni kullanıcı ekleyin.
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.id}>
                <td>{r.username}</td>
                <td>{r.fullName}</td>
                <td>{roleName(r.roleCode)}</td>
                <td>{r.active ? "✔" : "—"}</td>
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
