import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useFieldArray, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FormActionFooter } from "@/components/FormActionFooter";
import { useAppStore } from "@/store/appStore";
import { mockStore } from "@/services/mockDataStore";
import {
  bomApi,
  type BomDetail,
  type ExplodeResult,
  type StandardCostResult,
  type StockLookup,
  type UnitLookup,
} from "../api/bomApi";

const lineSchema = z.object({
  component_stock_id: z.coerce.number().int().positive("Bileşen stok seçin"),
  quantity: z.coerce.number().positive("Miktar 0'dan büyük olmalı"),
  unit_id: z.coerce.number().optional().nullable(),
  scrap_rate: z.coerce.number().min(0).lt(100, "Fire oranı 100'den küçük olmalı"),
  line_no: z.coerce.number().int().min(1).default(10),
  notes: z.string().optional().nullable(),
});

const bomSchema = z.object({
  stock_id: z.coerce.number().int().positive("Üst ürün seçin"),
  version: z.string().min(1, "Versiyon zorunlu").max(20),
  status: z.enum(["DRAFT", "ACTIVE", "PASSIVE", "ARCHIVED"]),
  is_active: z.boolean(),
  notes: z.string().optional().nullable(),
  effective_from: z.string().optional().nullable(),
  effective_to: z.string().optional().nullable(),
  lines: z.array(lineSchema).min(1, "En az bir bileşen satırı ekleyin"),
});

type BomFormValues = z.infer<typeof bomSchema>;

type Props = {
  editId: number | null;
  onClose: () => void;
  onSaved: () => void;
};

export function BomFormPanel({ editId, onClose, onSaved }: Props) {
  const branchId = useAppStore((s) => s.branchId) ?? 1;
  const setDirty = useAppStore((s) => s.setDirty);
  const [parents, setParents] = useState<StockLookup[]>([]);
  const [components, setComponents] = useState<StockLookup[]>([]);
  const [units, setUnits] = useState<UnitLookup[]>([]);
  const [saving, setSaving] = useState(false);
  const [explodeQty, setExplodeQty] = useState(1);
  const [explode, setExplode] = useState<ExplodeResult | null>(null);
  const [cost, setCost] = useState<StandardCostResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [quickStockOpen, setQuickStockOpen] = useState(false);
  const [quickCode, setQuickCode] = useState("");
  const [quickName, setQuickName] = useState("");
  const [quickType, setQuickType] = useState<"MM" | "YM">("MM");
  const [quickUnit, setQuickUnit] = useState("Adet");

  async function handleCreateQuickStock(e: React.FormEvent) {
    e.preventDefault();
    if (!quickName.trim()) return;
    try {
      const code = quickCode.trim() || `STK-${Date.now().toString().slice(-4)}`;
      const newStock = mockStore.saveStock({
        code,
        name: quickName.trim(),
        stock_type: quickType,
        unit_name: quickUnit,
        branch_id: branchId,
      });
      const updatedParents = await bomApi.lookupStocks({ branch_id: branchId, parent_only: true, limit: 100 });
      setParents(updatedParents.items ?? []);
      const updatedComps = await bomApi.lookupStocks({ branch_id: branchId, limit: 100 });
      setComponents(updatedComps.items ?? []);
      setValue("stock_id", newStock.id, { shouldDirty: true });
      setQuickStockOpen(false);
      setQuickCode("");
      setQuickName("");
    } catch {
      /* ignore */
    }
  }

  const form = useForm<BomFormValues>({
    resolver: zodResolver(bomSchema) as Resolver<BomFormValues>,
    defaultValues: {
      stock_id: 0,
      version: "1.0",
      status: "DRAFT",
      is_active: false,
      notes: "",
      effective_from: "",
      effective_to: "",
      lines: [{ component_stock_id: 0, quantity: 1, unit_id: null, scrap_rate: 0, line_no: 10, notes: "" }],
    },
  });

  const { control, register, handleSubmit, reset, watch, setValue, formState } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "lines" });

  useEffect(() => {
    setDirty(formState.isDirty);
  }, [formState.isDirty, setDirty]);

  useEffect(() => {
    bomApi.lookupStocks({ branch_id: branchId, parent_only: true, limit: 100 }).then((r) => {
      setParents(r.items ?? []);
    });
    bomApi.lookupStocks({ branch_id: branchId, limit: 100 }).then((r) => {
      setComponents(r.items ?? []);
    });
    bomApi.lookupUnits().then((r) => setUnits(r.items ?? []));
  }, [branchId]);

  useEffect(() => {
    if (!editId) return;
    bomApi
      .get(editId)
      .then((d: BomDetail) => {
        reset({
          stock_id: d.stock_id,
          version: d.version_no || d.version || "1.0",
          status: (d.status as BomFormValues["status"]) || "DRAFT",
          is_active: d.is_active,
          notes: d.notes ?? "",
          effective_from: d.effective_from ?? "",
          effective_to: d.effective_to ?? "",
          lines: (d.lines || []).map((ln, i) => ({
            component_stock_id: ln.component_stock_id,
            quantity: Number(ln.quantity ?? ln.qty ?? 1),
            unit_id: ln.unit_id ?? null,
            scrap_rate: Number(ln.scrap_rate ?? 0),
            line_no: ln.line_no || (i + 1) * 10,
            notes: ln.notes ?? "",
          })),
        });
      })
      .catch((e) => setErr(e instanceof Error ? e.message : "BOM yüklenemedi"));
  }, [editId, reset]);

  const stockMap = useMemo(() => {
    const m = new Map<number, StockLookup>();
    [...parents, ...components].forEach((s) => m.set(s.id, s));
    return m;
  }, [parents, components]);

  async function onSubmit(values: BomFormValues) {
    setSaving(true);
    setErr(null);
    try {
      const body = {
        branch_id: branchId,
        stock_id: values.stock_id,
        version: values.version,
        status: values.status,
        is_active: values.is_active || values.status === "ACTIVE",
        notes: values.notes || null,
        effective_from: values.effective_from || null,
        effective_to: values.effective_to || null,
        lines: values.lines.map((ln, i) => ({
          component_stock_id: ln.component_stock_id,
          quantity: ln.quantity,
          unit_id: ln.unit_id || null,
          scrap_rate: ln.scrap_rate,
          line_no: ln.line_no || (i + 1) * 10,
          notes: ln.notes || null,
        })),
      };
      if (editId) await bomApi.update(editId, body);
      else await bomApi.create(body);
      setDirty(false);
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Kayıt başarısız");
    } finally {
      setSaving(false);
    }
  }

  async function runExplode() {
    if (!editId) {
      setErr("Patlatma için önce BOM kaydedin");
      return;
    }
    try {
      const res = await bomApi.explode(editId, explodeQty, true);
      setExplode(res);
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Patlatma başarısız");
    }
  }

  async function runCost(save: boolean) {
    if (!editId) {
      setErr("Standart maliyet için önce BOM kaydedin");
      return;
    }
    try {
      const res = save
        ? await bomApi.saveStandardCost(editId, 1)
        : await bomApi.standardCost(editId, 1);
      setCost(res);
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Maliyet hesaplanamadı");
    }
  }

  return (
    <div className="card" style={{ padding: 16 }}>
      <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 800 }}>
        {editId ? "BOM Düzenle" : "Yeni BOM Tanımı"}
      </h3>
      {err && (
        <div style={{ marginBottom: 10, color: "#b91c1c", fontSize: 13, fontWeight: 600 }}>{err}</div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12,
            marginBottom: 14,
          }}
        >
          <div>
            <label style={lab}>
              Üst Ürün (Mamul / Yarı Mamul)
              <div style={{ display: "flex", gap: 6 }}>
                <select {...register("stock_id", { valueAsNumber: true })} style={{ ...inp, flex: 1 }}>
                  <option value={0}>Seçin...</option>
                  {parents.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} — {p.name} ({p.stock_type})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: "0 8px", fontSize: 11, whiteSpace: "nowrap" }}
                  onClick={() => setQuickStockOpen(true)}
                  title="Listede yoksa hızlıca yeni Mamül/Yarı Mamül stok kartı oluşturun"
                >
                  + Yeni
                </button>
              </div>
            </label>
          </div>
          <label style={lab}>
            Versiyon
            <input {...register("version")} style={inp} />
          </label>
          <label style={lab}>
            Durum
            <select {...register("status")} style={inp}>
              <option value="DRAFT">Taslak</option>
              <option value="ACTIVE">Aktif</option>
              <option value="PASSIVE">Pasif</option>
              <option value="ARCHIVED">Arşiv</option>
            </select>
          </label>
          <label style={{ ...lab, flexDirection: "row", alignItems: "center", gap: 8, marginTop: 18 }}>
            <input type="checkbox" {...register("is_active")} />
            Aktif versiyon
          </label>
          <label style={lab}>
            Geçerlilik Başlangıç
            <input type="date" {...register("effective_from")} style={inp} />
          </label>
          <label style={lab}>
            Geçerlilik Bitiş
            <input type="date" {...register("effective_to")} style={inp} />
          </label>
        </div>

        <label style={{ ...lab, marginBottom: 12 }}>
          Notlar
          <textarea {...register("notes")} rows={2} style={{ ...inp, resize: "vertical" }} />
        </label>

        <div style={{ marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <strong style={{ fontSize: 13 }}>Bileşen Satırları</strong>
          <button
            type="button"
            className="btn-secondary"
            onClick={() =>
              append({
                component_stock_id: 0,
                quantity: 1,
                unit_id: null,
                scrap_rate: 0,
                line_no: (fields.length + 1) * 10,
                notes: "",
              })
            }
          >
            + Satır
          </button>
        </div>

        <div style={{ overflowX: "auto", marginBottom: 12 }}>
          <table className="data-table" style={{ minWidth: 780 }}>
            <thead>
              <tr>
                <th style={{ width: 56 }}>No</th>
                <th>Bileşen</th>
                <th style={{ width: 100 }}>Miktar</th>
                <th style={{ width: 100 }}>Birim</th>
                <th style={{ width: 90 }}>Fire %</th>
                <th style={{ width: 70 }} />
              </tr>
            </thead>
            <tbody>
              {fields.map((f, idx) => {
                const cid = watch(`lines.${idx}.component_stock_id`);
                return (
                  <tr key={f.id}>
                    <td>
                      <input
                        type="number"
                        {...register(`lines.${idx}.line_no`, { valueAsNumber: true })}
                        style={inp}
                      />
                    </td>
                    <td>
                      <select
                        {...register(`lines.${idx}.component_stock_id`, { valueAsNumber: true })}
                        style={inp}
                        onChange={(e) => {
                          const id = Number(e.target.value);
                          setValue(`lines.${idx}.component_stock_id`, id, { shouldDirty: true });
                          const st = stockMap.get(id);
                          if (st?.unit_id) {
                            setValue(`lines.${idx}.unit_id`, st.unit_id, { shouldDirty: true });
                          }
                        }}
                      >
                        <option value={0}>Seçin...</option>
                        {components.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.code} — {c.name}
                          </option>
                        ))}
                      </select>
                      {cid > 0 && stockMap.get(cid)?.stock_type && (
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                          {stockMap.get(cid)?.stock_type}
                        </div>
                      )}
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.0001"
                        {...register(`lines.${idx}.quantity`, { valueAsNumber: true })}
                        style={inp}
                      />
                    </td>
                    <td>
                      <select
                        {...register(`lines.${idx}.unit_id`, { valueAsNumber: true })}
                        style={inp}
                      >
                        <option value={0}>—</option>
                        {units.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.code}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        {...register(`lines.${idx}.scrap_rate`, { valueAsNumber: true })}
                        style={inp}
                      />
                    </td>
                    <td>
                      <button type="button" className="btn-cancel" onClick={() => remove(idx)}>
                        Sil
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {editId && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 14,
            }}
          >
            <div className="card" style={{ padding: 12, background: "var(--placeholder-bg)" }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                <strong style={{ fontSize: 13 }}>Çok Seviyeli Patlatma</strong>
                <input
                  type="number"
                  min={0.0001}
                  step="0.01"
                  value={explodeQty}
                  onChange={(e) => setExplodeQty(Number(e.target.value) || 1)}
                  style={{ ...inp, width: 90 }}
                />
                <button type="button" className="btn-secondary" onClick={runExplode}>
                  Patlat
                </button>
              </div>
              {explode && (
                <div style={{ fontSize: 12, maxHeight: 180, overflow: "auto" }}>
                  <div style={{ marginBottom: 6 }}>
                    Toplam standart maliyet: <b>{Number(explode.total_standard_cost).toFixed(4)}</b>
                  </div>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Sv</th>
                        <th>Kod</th>
                        <th>Brüt</th>
                        <th>Fire%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {explode.flat_leaves.map((n) => (
                        <tr key={`${n.component_stock_id}-${n.path}`}>
                          <td>{n.level_no}</td>
                          <td>{n.component_code}</td>
                          <td>{Number(n.quantity_gross).toFixed(4)}</td>
                          <td>{Number(n.scrap_rate).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="card" style={{ padding: 12, background: "var(--placeholder-bg)" }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <strong style={{ fontSize: 13 }}>Standart Maliyet</strong>
                <button type="button" className="btn-secondary" onClick={() => runCost(false)}>
                  Hesapla
                </button>
                <button type="button" className="btn-primary" onClick={() => runCost(true)}>
                  Kaydet
                </button>
              </div>
              {cost && (
                <div style={{ fontSize: 12 }}>
                  <div>
                    Birim maliyet: <b>{Number(cost.unit_standard_cost).toFixed(4)}</b>
                  </div>
                  <div>
                    Toplam ({cost.root_qty}): <b>{Number(cost.total_standard_cost).toFixed(4)}</b>
                  </div>
                  {cost.saved && (
                    <div style={{ color: "#15803d", marginTop: 4 }}>Stok alış fiyatına yazıldı</div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <FormActionFooter sticky={false}>
          <button type="button" className="btn-cancel" onClick={onClose} disabled={saving}>
            Vazgeç
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </FormActionFooter>
      </form>
    </div>
  );
}

const lab: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  fontSize: 12,
  fontWeight: 700,
  color: "#334155",
};

const inp: CSSProperties = {
  padding: "7px 10px",
  border: "1px solid var(--border)",
  borderRadius: 6,
  fontSize: 13,
  fontWeight: 500,
};
