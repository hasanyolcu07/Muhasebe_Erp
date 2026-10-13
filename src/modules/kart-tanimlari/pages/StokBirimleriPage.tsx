import { useCallback, useEffect, useMemo, useState } from "react";
import { FormProvider, useForm, useFormContext } from "react-hook-form";
import { BranchRecordTypeFields } from "@/components/financial/BranchRecordTypeFields";
import { StatusBadge } from "@/components/ui";
import { useAppStore } from "@/store/appStore";
import { stokBirimApi, type StockUnit, type StockUnitPayload } from "../api/kartExtraApi";

function emptyUnit(branchId: number, recordTypeId: number): StockUnitPayload {
  return {
    code: "",
    name: "",
    symbol: "",
    conversion_factor: 1,
    base_unit_id: null,
    is_base: false,
    branch_id: branchId,
    record_type_id: recordTypeId,
    is_active: true,
    description: "",
    width_val: null,
    width_unit_id: null,
    length_val: null,
    length_unit_id: null,
    height_val: null,
    height_unit_id: null,
    area_val: null,
    area_unit_id: null,
    volume_val: null,
    volume_unit_id: null,
    weight_val: null,
    weight_unit_id: null,
    content_qty: null,
  };
}

function numOrNull(v: unknown): number | null {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

type DimKey = "width" | "length" | "height" | "area" | "volume" | "weight";

const DIM_ROWS: { key: DimKey; label: string }[] = [
  { key: "width", label: "En" },
  { key: "length", label: "Boy" },
  { key: "height", label: "Yükseklik" },
  { key: "area", label: "Alan" },
  { key: "volume", label: "Hacim" },
  { key: "weight", label: "Ağırlık" },
];

function UnitSelect({
  name,
  units,
  disabled,
  excludeId,
}: {
  name: keyof StockUnitPayload;
  units: StockUnit[];
  disabled?: boolean;
  excludeId?: number | null;
}) {
  const { register } = useFormContext<StockUnitPayload>();
  return (
    <select
      className="form-control"
      disabled={disabled}
      style={{ minWidth: 90 }}
      {...register(name, {
        setValueAs: (v) => (v === "" || v == null ? null : Number(v)),
      })}
    >
      <option value="">Birim</option>
      {units
        .filter((u) => u.id !== excludeId)
        .map((u) => (
          <option key={u.id} value={u.id}>
            {u.symbol || u.code}
          </option>
        ))}
    </select>
  );
}

function DimRow({
  label,
  valName,
  unitName,
  units,
  disabled,
  excludeId,
}: {
  label: string;
  valName: keyof StockUnitPayload;
  unitName: keyof StockUnitPayload;
  units: StockUnit[];
  disabled?: boolean;
  excludeId?: number | null;
}) {
  const { register } = useFormContext<StockUnitPayload>();
  return (
    <div
      className="form-row"
      style={{
        marginBottom: 6,
        display: "grid",
        gridTemplateColumns: "72px 56px 1fr",
        gap: 6,
        alignItems: "center",
      }}
    >
      <label style={{ minWidth: 0, fontSize: 12 }}>{label}</label>
      <input
        type="number"
        step="any"
        className="form-control"
        disabled={disabled}
        placeholder="0"
        style={{ padding: "4px 6px", fontSize: 12 }}
        {...register(valName, { setValueAs: numOrNull })}
      />
      <UnitSelect name={unitName} units={units} disabled={disabled} excludeId={excludeId} />
    </div>
  );
}

type Props = {
  embedded?: boolean;
  title?: string;
  description?: string;
};

/** Stok Birim Tanımları — sol form + sağ liste; Şube + Kayıt Türü */
export function StokBirimleriPanel({
  embedded = false,
  title = "Stok Birim Tanımları",
  description = "Birim kodları, sembol, dönüşüm ve paket boyutları. Stok hareketlerinde dönüşüm katsayısı kullanılır.",
}: Props) {
  const branchId = useAppStore((s) => s.branchId);
  const recordTypeId = useAppStore((s) => s.recordTypeId);
  const branches = useAppStore((s) => s.branches);
  const recordTypes = useAppStore((s) => s.recordTypes);
  const defaultBranch = branchId ?? branches[0]?.id ?? 1;
  const defaultRt = recordTypeId ?? recordTypes[0]?.id ?? 1;

  const [items, setItems] = useState<StockUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"idle" | "create" | "edit">("idle");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const methods = useForm<StockUnitPayload>({
    defaultValues: emptyUnit(defaultBranch, defaultRt),
  });
  const { register, handleSubmit, reset, watch } = methods;
  const formEnabled = mode !== "idle";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await stokBirimApi.list({ branch_id: branchId ?? undefined });
      setItems(res.items ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Liste alınamadı");
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    void load();
  }, [load]);

  function startCreate() {
    setMode("create");
    setSelectedId(null);
    reset(emptyUnit(defaultBranch, defaultRt));
  }

  function startEdit(row: StockUnit) {
    setMode("edit");
    setSelectedId(row.id);
    reset({
      code: row.code,
      name: row.name,
      symbol: row.symbol ?? "",
      conversion_factor: Number(row.conversion_factor) || 1,
      base_unit_id: row.base_unit_id,
      is_base: row.is_base,
      branch_id: row.branch_id ?? defaultBranch,
      record_type_id: row.record_type_id ?? defaultRt,
      is_active: row.is_active,
      description: row.description ?? "",
      width_val: numOrNull(row.width_val),
      width_unit_id: row.width_unit_id ?? null,
      length_val: numOrNull(row.length_val),
      length_unit_id: row.length_unit_id ?? null,
      height_val: numOrNull(row.height_val),
      height_unit_id: row.height_unit_id ?? null,
      area_val: numOrNull(row.area_val),
      area_unit_id: row.area_unit_id ?? null,
      volume_val: numOrNull(row.volume_val),
      volume_unit_id: row.volume_unit_id ?? null,
      weight_val: numOrNull(row.weight_val),
      weight_unit_id: row.weight_unit_id ?? null,
      content_qty: numOrNull(row.content_qty),
    });
  }

  function cancel() {
    setMode("idle");
    setSelectedId(null);
    reset(emptyUnit(defaultBranch, defaultRt));
  }

  async function onSave(values: StockUnitPayload) {
    setSaving(true);
    setError(null);
    try {
      const body: StockUnitPayload = {
        ...values,
        code: values.code.trim().toUpperCase(),
        name: values.name.trim(),
        symbol: values.symbol || null,
        description: values.description || null,
        base_unit_id: values.base_unit_id || null,
        conversion_factor: Number(values.conversion_factor) || 1,
      };
      if (mode === "edit" && selectedId) await stokBirimApi.update(selectedId, body);
      else await stokBirimApi.create(body);
      cancel();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kayıt hatası");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(row: StockUnit) {
    if (!window.confirm(`"${row.name}" birimini silmek istiyor musunuz?`)) return;
    await stokBirimApi.remove(row.id);
    if (selectedId === row.id) cancel();
    await load();
  }

  const [activeSetFilter, setActiveSetFilter] = useState("ALL");
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    if (activeSetFilter === "ALL") return items;
    return items.filter((u) => {
      const set = (u as any).set_name || "";
      return set.toLowerCase().includes(activeSetFilter.toLowerCase());
    });
  }, [items, activeSetFilter]);

  function showToast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  }
  const baseUnitId = watch("base_unit_id");
  const conversionFactor = watch("conversion_factor");
  const codeWatch = watch("code");
  const symbolWatch = watch("symbol");

  const conversionHint = useMemo(() => {
    const factor = Number(conversionFactor) || 1;
    const thisLabel = (symbolWatch || codeWatch || "bu birim").trim() || "bu birim";
    const base = items.find((u) => u.id === baseUnitId);
    if (!baseUnitId || !base) {
      return `Örn: ${factor} ${thisLabel} = 1 temel birim`;
    }
    const baseLabel = base.symbol || base.code;
    return `${factor} ${thisLabel} = 1 ${baseLabel}`;
  }, [baseUnitId, codeWatch, conversionFactor, items, symbolWatch]);

  const body = (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>{title}</h3>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "#64748b" }}>{description}</p>
        </div>
        <button type="button" className="btn-save" onClick={startCreate}>
          + Ekle
        </button>
      </div>

      {error ? (
        <div className="alert alert-error" style={{ marginBottom: 12 }}>
          {error}
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(440px, 1.35fr) minmax(280px, 0.85fr)",
          gap: 16,
          alignItems: "start",
        }}
      >
        <FormProvider {...methods}>
          <form
            onSubmit={handleSubmit(onSave)}
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              padding: 16,
              background: formEnabled ? "#fff" : "#f8fafc",
              opacity: formEnabled ? 1 : 0.75,
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 14px" }}>
              <div className="form-row">
                <label>Kod</label>
                <input
                  className="form-control"
                  disabled={!formEnabled || mode === "edit"}
                  maxLength={16}
                  {...register("code", { required: true })}
                />
              </div>
              <div className="form-row">
                <label>Sembol</label>
                <input
                  className="form-control"
                  disabled={!formEnabled}
                  maxLength={16}
                  {...register("symbol")}
                  placeholder="kg, lt, mm…"
                />
              </div>
            </div>
            <div className="form-row">
              <label>Ad</label>
              <input className="form-control" disabled={!formEnabled} {...register("name", { required: true })} />
            </div>

            <div
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: 10,
                padding: 12,
                marginBottom: 12,
                background: "#f8fafc",
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 8 }}>
                Dönüşüm (stok hareketlerinde kullanılır)
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 6 }}>
                <input
                  type="number"
                  step="0.000001"
                  className="form-control"
                  disabled={!formEnabled}
                  style={{ width: 110 }}
                  {...register("conversion_factor", { valueAsNumber: true })}
                />
                <span style={{ fontSize: 13, color: "#64748b" }}>
                  {symbolWatch || codeWatch || "birim"} =
                </span>
                <strong style={{ fontSize: 13 }}>1</strong>
                <select
                  className="form-control"
                  disabled={!formEnabled}
                  style={{ width: 160 }}
                  value={baseUnitId ?? ""}
                  {...register("base_unit_id", {
                    setValueAs: (v) => (v === "" || v == null ? null : Number(v)),
                  })}
                >
                  <option value="">— Temel birim —</option>
                  {items
                    .filter((u) => u.id !== selectedId)
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.code} — {u.symbol || u.name}
                      </option>
                    ))}
                </select>
              </div>
              <div style={{ fontSize: 12, color: "#6366f1", fontWeight: 600 }}>{conversionHint}</div>
              <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, marginTop: 8 }}>
                <input type="checkbox" disabled={!formEnabled} {...register("is_base")} />
                Bu kayıt temel birimdir
              </label>
            </div>

            <div
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: 10,
                padding: 12,
                marginBottom: 12,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 4 }}>
                Paket / boyut (koli vb.)
              </div>
              <p style={{ margin: "0 0 10px", fontSize: 12, color: "#94a3b8" }}>
                Değer + birim seçimi tanımlı stok birimlerinden yapılır.
              </p>
              <div className="form-row" style={{ marginBottom: 8 }}>
                <label style={{ minWidth: 88 }}>İçerik adedi</label>
                <input
                  type="number"
                  step="any"
                  className="form-control"
                  disabled={!formEnabled}
                  placeholder="örn. 24 (koli başına adet)"
                  {...register("content_qty", { setValueAs: numOrNull })}
                />
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "8px 12px",
                }}
              >
                <div>
                  {DIM_ROWS.slice(0, 3).map((d) => (
                    <DimRow
                      key={d.key}
                      label={d.label}
                      valName={`${d.key}_val` as keyof StockUnitPayload}
                      unitName={`${d.key}_unit_id` as keyof StockUnitPayload}
                      units={items}
                      disabled={!formEnabled}
                      excludeId={selectedId}
                    />
                  ))}
                </div>
                <div>
                  {DIM_ROWS.slice(3).map((d) => (
                    <DimRow
                      key={d.key}
                      label={d.label}
                      valName={`${d.key}_val` as keyof StockUnitPayload}
                      unitName={`${d.key}_unit_id` as keyof StockUnitPayload}
                      units={items}
                      disabled={!formEnabled}
                      excludeId={selectedId}
                    />
                  ))}
                </div>
              </div>
            </div>

            <BranchRecordTypeFields variant="card" disabled={!formEnabled} />
            <div className="form-row">
              <label>Açıklama</label>
              <input className="form-control" disabled={!formEnabled} {...register("description")} />
            </div>
            <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, marginBottom: 12 }}>
              <input type="checkbox" disabled={!formEnabled} {...register("is_active")} />
              Aktif
            </label>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button type="button" className="btn-cancel" disabled={!formEnabled || saving} onClick={cancel}>
                Vazgeç
              </button>
              <button type="submit" className="btn-save" disabled={!formEnabled || saving}>
                {saving ? "Kaydediliyor…" : "Kaydet"}
              </button>
            </div>
          </form>
        </FormProvider>

        <div style={{ minWidth: 0 }}>
          {/* Birim Seti Filtre Butonları */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
            {[
              { id: "ALL", label: `Tüm Birimler (${items.length})` },
              { id: "Adet", label: "📦 Adet / Koli / Palet Seti" },
              { id: "Ağırlık", label: "⚖️ Ağırlık Seti (gr/kg/ton)" },
              { id: "Uzunluk", label: "📏 Uzunluk Seti (m/top)" },
              { id: "Hacim", label: "🧪 Hacim Seti (lt/varil)" },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                style={{
                  padding: "5px 10px",
                  borderRadius: 6,
                  cursor: "pointer",
                  border: activeSetFilter === f.id ? "1px solid #2563eb" : "1px solid #e2e8f0",
                  background: activeSetFilter === f.id ? "#eff6ff" : "#ffffff",
                  color: activeSetFilter === f.id ? "#1d4ed8" : "#475569",
                  fontWeight: activeSetFilter === f.id ? 700 : 500,
                  fontSize: 12,
                }}
                onClick={() => setActiveSetFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>

          {loading ? (
            <p style={{ color: "#64748b" }}>Yükleniyor…</p>
          ) : (
            <table className="data-table" style={{ width: "100%", fontSize: 13, tableLayout: "fixed" }}>
              <thead>
                <tr>
                  <th style={{ width: "14%" }}>Kod</th>
                  <th style={{ width: "26%" }}>Ad</th>
                  <th style={{ width: "12%" }}>Sembol</th>
                  <th style={{ width: "16%" }}>Dönüşüm / Çarpan</th>
                  <th style={{ width: "12%" }}>Durum</th>
                  <th style={{ width: "20%", textAlign: "right" }}>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", color: "#94a3b8", padding: 20 }}>
                      Kayıt yok
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((row) => {
                    const base = items.find((u) => u.id === row.base_unit_id);
                    const cf = Number(row.conversion_factor) || 1;
                    const convLabel = base
                      ? `${cf}→1 ${base.symbol || base.code}`
                      : String(cf);
                    return (
                      <tr key={row.id} style={{ background: selectedId === row.id ? "#eff6ff" : undefined }}>
                        <td>
                          <code>{row.code}</code>
                        </td>
                        <td style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {row.name}
                        </td>
                        <td>{row.symbol || "—"}</td>
                        <td style={{ fontSize: 11 }} title={convLabel}>
                          {convLabel}
                        </td>
                        <td>
                          <StatusBadge status={row.is_active ? "aktif" : "pasif"} />
                        </td>
                        <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ fontSize: 11, marginRight: 4 }}
                            onClick={() => startEdit(row)}
                          >
                            Değiştir
                          </button>
                          <button
                            type="button"
                            className="btn-cancel"
                            style={{ fontSize: 11 }}
                            onClick={() => void onDelete(row)}
                          >
                            Sil
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );

  if (embedded) {
    return <div className="ayar-form-card">{body}</div>;
  }

  return (
    <>
      <div className="header-bar">
        <div className="header-breadcrumb">Kart Tanımları / Stok Birimleri</div>
      </div>
      <div className="fis-box">{body}</div>
    </>
  );
}

export function StokBirimleriPage() {
  return <StokBirimleriPanel />;
}
