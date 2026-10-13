import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/services/api";
import { AktifPasifToggle } from "../AktifPasifToggle";
import { AyarField } from "../AyarFormBits";

type TabId = "subeler" | "proje" | "masraf";

type BranchItem = {
  id: number;
  code: string;
  name: string;
  address?: string | null;
  city?: string | null;
  is_head_office?: boolean;
  is_active?: boolean;
};

type ProjectCodeItem = {
  id: number;
  code: string;
  name: string;
  address?: string | null;
  branch_id?: number | null;
  is_active?: boolean;
};

type CostCenterItem = {
  id: number;
  branch_id: number;
  code: string;
  name: string;
  project_id?: number | null;
  project_code?: string | null;
};

const TABS: { id: TabId; label: string }[] = [
  { id: "subeler", label: "Şubeler" },
  { id: "proje", label: "Proje Kodları" },
  { id: "masraf", label: "Masraf Merkezleri" },
];

function asItems<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (raw && typeof raw === "object") {
    const obj = raw as { items?: unknown[] };
    if (Array.isArray(obj.items)) return obj.items as T[];
  }
  return [];
}

/**
 * Şube / Proje / Masraf — sol form + sağ liste (Stok Birim mantığı).
 * Şube alanları: Kod, Ad, Adres, Merkez/Şube, Durum
 * Proje: Kod, Ad, Adres, Merkez/Şube, Durum
 * Masraf: Kod, Ad, Merkez/Şube, Proje Kodu (liste + Tüm projeler)
 */
export function SubeTanimlariPanel() {
  const [tab, setTab] = useState<TabId>("subeler");
  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [projects, setProjects] = useState<ProjectCodeItem[]>([]);
  const [centers, setCenters] = useState<CostCenterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [formEnabled, setFormEnabled] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const [branchForm, setBranchForm] = useState({
    code: "",
    name: "",
    address: "",
    kind: "SUBE" as "MERKEZ" | "SUBE",
    is_active: true,
  });
  const [projectForm, setProjectForm] = useState({
    code: "",
    name: "",
    address: "",
    branch_id: "" as number | "",
    is_active: true,
  });
  const [centerForm, setCenterForm] = useState({
    code: "",
    name: "",
    branch_id: "" as number | "",
    project_id: "" as number | "" | "ALL",
  });

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [br, pr, cc] = await Promise.all([
        api<unknown>("/tenant/branches"),
        api<unknown>("/sistem/project-codes"),
        api<unknown>("/maliyet/merkezler").catch(() => []),
      ]);
      setBranches(asItems<BranchItem>(br));
      setProjects(asItems<ProjectCodeItem>(pr));
      setCenters(asItems<CostCenterItem>(cc));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Veriler yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const projectCountByBranch = useMemo(() => {
    const m = new Map<number, number>();
    for (const p of projects) {
      if (p.branch_id == null) continue;
      m.set(p.branch_id, (m.get(p.branch_id) ?? 0) + 1);
    }
    return m;
  }, [projects]);

  const centerCountByBranch = useMemo(() => {
    const m = new Map<number, number>();
    for (const c of centers) {
      m.set(c.branch_id, (m.get(c.branch_id) ?? 0) + 1);
    }
    return m;
  }, [centers]);

  function resetForms() {
    setEditId(null);
    setFormEnabled(false);
    setBranchForm({ code: "", name: "", address: "", kind: "SUBE", is_active: true });
    setProjectForm({ code: "", name: "", address: "", branch_id: "", is_active: true });
    setCenterForm({ code: "", name: "", branch_id: "", project_id: "ALL" });
  }

  function startCreate() {
    resetForms();
    setFormEnabled(true);
    setMessage(null);
    setError(null);
  }

  function branchName(id: number | null | undefined) {
    if (id == null) return "—";
    return branches.find((b) => b.id === id)?.name ?? String(id);
  }

  async function saveBranch() {
    setError("Şube oluşturma API'si henüz bağlı değil. Mevcut şubeler listeden görüntülenir.");
  }

  async function saveProject() {
    const code = projectForm.code.trim();
    const name = projectForm.name.trim();
    if (!code || !name) {
      setError("Proje kodu ve adı zorunludur");
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await api("/sistem/project-codes", {
        method: "POST",
        body: {
          code,
          name,
          address: projectForm.address.trim() || null,
          branch_id: projectForm.branch_id === "" ? null : Number(projectForm.branch_id),
          is_active: projectForm.is_active,
        },
      });
      setMessage("Proje kodu kaydedildi.");
      resetForms();
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Proje kaydedilemedi");
    } finally {
      setSaving(false);
    }
  }

  async function saveCenter() {
    const code = centerForm.code.trim();
    const name = centerForm.name.trim();
    if (!code || !name) {
      setError("Masraf merkezi kodu ve adı zorunludur");
      return;
    }
    const branchId =
      centerForm.branch_id === "" ? branches[0]?.id : Number(centerForm.branch_id);
    if (!branchId) {
      setError("Şube seçilmelidir");
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const projectId =
        centerForm.project_id === "" || centerForm.project_id === "ALL"
          ? null
          : Number(centerForm.project_id);
      await api("/maliyet/merkezler", {
        method: "POST",
        body: {
          code,
          name,
          branch_id: branchId,
          project_id: projectId,
        },
      });
      setMessage("Masraf merkezi kaydedildi.");
      resetForms();
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Masraf merkezi kaydedilemedi");
    } finally {
      setSaving(false);
    }
  }

  async function onSave() {
    if (tab === "subeler") await saveBranch();
    else if (tab === "proje") await saveProject();
    else await saveCenter();
  }

  function startEditBranch(row: BranchItem) {
    setTab("subeler");
    setEditId(row.id);
    setFormEnabled(true);
    setBranchForm({
      code: row.code,
      name: row.name,
      address: row.address ?? row.city ?? "",
      kind: row.is_head_office ? "MERKEZ" : "SUBE",
      is_active: row.is_active !== false,
    });
  }

  function startEditProject(row: ProjectCodeItem) {
    setTab("proje");
    setEditId(row.id);
    setFormEnabled(true);
    setProjectForm({
      code: row.code,
      name: row.name,
      address: row.address ?? "",
      branch_id: row.branch_id ?? "",
      is_active: row.is_active !== false,
    });
  }

  function startEditCenter(row: CostCenterItem) {
    setTab("masraf");
    setEditId(row.id);
    setFormEnabled(true);
    setCenterForm({
      code: row.code,
      name: row.name,
      branch_id: row.branch_id,
      project_id: row.project_id ?? "ALL",
    });
  }

  if (loading) return <div className="ayar-form-card">Yükleniyor…</div>;

  return (
    <div className="ayar-form-card">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Şube / Proje / Masraf Merkezi</h3>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "#64748b" }}>
            Sol tarafta tanım formu, sağda ilgili listeler. Liste başlıkları giriş alanlarıyla uyumludur.
          </p>
        </div>
        <button type="button" className="btn-add" onClick={startCreate}>
          + Ekle
        </button>
      </div>

      <div className="gg-tabs-bar" style={{ marginBottom: 14, borderRadius: 8 }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`gg-tab${tab === t.id ? " active" : ""}`}
            onClick={() => {
              setTab(t.id);
              resetForms();
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error ? <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div> : null}
      {message ? <div className="alert alert-ok" style={{ marginBottom: 12 }}>{message}</div> : null}

      <div className="tanim-split">
        <div className={`tanim-split-form${formEnabled ? "" : " is-idle"}`}>
          {tab === "subeler" ? (
            <>
              <AyarField label="Kod">
                <input
                  className="form-control"
                  disabled={!formEnabled || !!editId}
                  value={branchForm.code ?? ""}
                  onChange={(e) => setBranchForm((f) => ({ ...f, code: e.target.value }))}
                />
              </AyarField>
              <AyarField label="Ad">
                <input
                  className="form-control"
                  disabled={!formEnabled}
                  value={branchForm.name ?? ""}
                  onChange={(e) => setBranchForm((f) => ({ ...f, name: e.target.value }))}
                />
              </AyarField>
              <AyarField label="Adres">
                <input
                  className="form-control"
                  disabled={!formEnabled}
                  value={branchForm.address ?? ""}
                  onChange={(e) => setBranchForm((f) => ({ ...f, address: e.target.value }))}
                />
              </AyarField>
              <AyarField label="Merkez / Şube">
                <select
                  className="form-control"
                  disabled={!formEnabled}
                  value={branchForm.kind ?? "SUBE"}
                  onChange={(e) =>
                    setBranchForm((f) => ({ ...f, kind: e.target.value as "MERKEZ" | "SUBE" }))
                  }
                >
                  <option value="MERKEZ">Merkez</option>
                  <option value="SUBE">Şube</option>
                </select>
              </AyarField>
              <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, marginBottom: 12 }}>
                <span style={{ fontWeight: 600, color: "#64748b" }}>Durum</span>
                <AktifPasifToggle
                  value={branchForm.is_active}
                  disabled={!formEnabled}
                  onChange={(v) => setBranchForm((f) => ({ ...f, is_active: v }))}
                />
              </div>
            </>
          ) : null}

          {tab === "proje" ? (
            <>
              <AyarField label="Kod">
                <input
                  className="form-control"
                  disabled={!formEnabled || !!editId}
                  value={projectForm.code ?? ""}
                  onChange={(e) => setProjectForm((f) => ({ ...f, code: e.target.value }))}
                />
              </AyarField>
              <AyarField label="Ad">
                <input
                  className="form-control"
                  disabled={!formEnabled}
                  value={projectForm.name ?? ""}
                  onChange={(e) => setProjectForm((f) => ({ ...f, name: e.target.value }))}
                />
              </AyarField>
              <AyarField label="Adres">
                <input
                  className="form-control"
                  disabled={!formEnabled}
                  value={projectForm.address ?? ""}
                  onChange={(e) => setProjectForm((f) => ({ ...f, address: e.target.value }))}
                />
              </AyarField>
              <AyarField label="Merkez / Şube">
                <select
                  className="form-control"
                  disabled={!formEnabled}
                  value={projectForm.branch_id === "" ? "" : String(projectForm.branch_id ?? "")}
                  onChange={(e) =>
                    setProjectForm((f) => ({
                      ...f,
                      branch_id: e.target.value === "" ? "" : Number(e.target.value),
                    }))
                  }
                >
                  <option value="">— Seçin —</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.code} — {b.name}
                      {b.is_head_office ? " (Merkez)" : ""}
                    </option>
                  ))}
                </select>
              </AyarField>
              <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, marginBottom: 12 }}>
                <span style={{ fontWeight: 600, color: "#64748b" }}>Durum</span>
                <AktifPasifToggle
                  value={projectForm.is_active}
                  disabled={!formEnabled}
                  onChange={(v) => setProjectForm((f) => ({ ...f, is_active: v }))}
                />
              </div>
            </>
          ) : null}

          {tab === "masraf" ? (
            <>
              <AyarField label="Kod">
                <input
                  className="form-control"
                  disabled={!formEnabled || !!editId}
                  value={centerForm.code ?? ""}
                  onChange={(e) => setCenterForm((f) => ({ ...f, code: e.target.value }))}
                />
              </AyarField>
              <AyarField label="Ad">
                <input
                  className="form-control"
                  disabled={!formEnabled}
                  value={centerForm.name ?? ""}
                  onChange={(e) => setCenterForm((f) => ({ ...f, name: e.target.value }))}
                />
              </AyarField>
              <AyarField label="Merkez / Şube">
                <select
                  className="form-control"
                  disabled={!formEnabled}
                  value={centerForm.branch_id === "" ? "" : String(centerForm.branch_id ?? "")}
                  onChange={(e) =>
                    setCenterForm((f) => ({
                      ...f,
                      branch_id: e.target.value === "" ? "" : Number(e.target.value),
                    }))
                  }
                >
                  <option value="">— Seçin —</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.code} — {b.name}
                    </option>
                  ))}
                </select>
              </AyarField>
              <AyarField label="Proje Kodu">
                <select
                  className="form-control"
                  disabled={!formEnabled}
                  value={
                    centerForm.project_id === "" || centerForm.project_id === "ALL"
                      ? "ALL"
                      : String(centerForm.project_id ?? "ALL")
                  }
                  onChange={(e) =>
                    setCenterForm((f) => ({
                      ...f,
                      project_id: e.target.value === "ALL" ? "ALL" : Number(e.target.value),
                    }))
                  }
                >
                  <option value="ALL">Tüm projeler</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} — {p.name}
                    </option>
                  ))}
                </select>
              </AyarField>
            </>
          ) : null}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
            <button type="button" className="btn-cancel" disabled={!formEnabled || saving} onClick={resetForms}>
              Vazgeç
            </button>
            <button type="button" className="btn-save" disabled={!formEnabled || saving} onClick={() => void onSave()}>
              {saving ? "Kaydediliyor…" : "Kaydet"}
            </button>
          </div>
        </div>

        <div className="tanim-split-lists">
          {tab === "subeler" ? (
            <div className="tanim-list-frame">
              <div className="tanim-list-frame-head">
                <h4>Şube Listesi</h4>
              </div>
              <div className="tanim-list-frame-body">
              <table className="data-table" style={{ width: "100%", fontSize: 13 }}>
                <thead>
                  <tr>
                    <th>Kod</th>
                    <th>Ad</th>
                    <th>Adres</th>
                    <th>Merkez/Şube</th>
                    <th>Durum</th>
                    <th>Proje Kodları</th>
                    <th>Masraf Merkezleri</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {branches.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: "center", color: "#94a3b8", padding: 16 }}>
                        Kayıt yok
                      </td>
                    </tr>
                  ) : (
                    branches.map((b) => (
                      <tr key={b.id}>
                        <td>{b.code}</td>
                        <td>{b.name}</td>
                        <td>{b.address ?? b.city ?? "—"}</td>
                        <td>{b.is_head_office ? "Merkez" : "Şube"}</td>
                        <td>{b.is_active === false ? "Pasif" : "Aktif"}</td>
                        <td>{projectCountByBranch.get(b.id) ?? 0}</td>
                        <td>{centerCountByBranch.get(b.id) ?? 0}</td>
                        <td>
                          <button type="button" className="btn-secondary" style={{ fontSize: 11, padding: "2px 8px" }} onClick={() => startEditBranch(b)}>
                            Değiştir
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              </div>
            </div>
          ) : null}

          {tab === "proje" ? (
            <div className="tanim-list-frame">
              <div className="tanim-list-frame-head">
                <h4>Proje Kodları</h4>
              </div>
              <div className="tanim-list-frame-body">
              <table className="data-table" style={{ width: "100%", fontSize: 13 }}>
                <thead>
                  <tr>
                    <th>Kod</th>
                    <th>Ad</th>
                    <th>Adres</th>
                    <th>Merkez/Şube</th>
                    <th>Durum</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {projects.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", color: "#94a3b8", padding: 16 }}>
                        Kayıt yok
                      </td>
                    </tr>
                  ) : (
                    projects.map((p) => (
                      <tr key={p.id}>
                        <td>{p.code}</td>
                        <td>{p.name}</td>
                        <td>{p.address ?? "—"}</td>
                        <td>{branchName(p.branch_id)}</td>
                        <td>{p.is_active === false ? "Pasif" : "Aktif"}</td>
                        <td>
                          <button type="button" className="btn-secondary" style={{ fontSize: 11, padding: "2px 8px" }} onClick={() => startEditProject(p)}>
                            Değiştir
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              </div>
            </div>
          ) : null}

          {tab === "masraf" ? (
            <div className="tanim-list-frame">
              <div className="tanim-list-frame-head">
                <h4>Masraf Merkezleri</h4>
              </div>
              <div className="tanim-list-frame-body">
              <table className="data-table" style={{ width: "100%", fontSize: 13 }}>
                <thead>
                  <tr>
                    <th>Kod</th>
                    <th>Ad</th>
                    <th>Merkez/Şube</th>
                    <th>Proje Kodu</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {centers.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", color: "#94a3b8", padding: 16 }}>
                        Kayıt yok
                      </td>
                    </tr>
                  ) : (
                    centers.map((c) => (
                      <tr key={c.id}>
                        <td>{c.code}</td>
                        <td>{c.name}</td>
                        <td>{branchName(c.branch_id)}</td>
                        <td>
                          {c.project_id
                            ? projects.find((p) => p.id === c.project_id)?.code ?? c.project_code ?? c.project_id
                            : "Tüm projeler"}
                        </td>
                        <td>
                          <button type="button" className="btn-secondary" style={{ fontSize: 11, padding: "2px 8px" }} onClick={() => startEditCenter(c)}>
                            Değiştir
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

