import { useEffect, useState, type CSSProperties } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FormActionFooter } from "@/components/FormActionFooter";
import { useAppStore } from "@/store/appStore";
import { bomApi, type BomListItem, type ProductionOrder } from "../api/bomApi";

const schema = z.object({
  bom_id: z.coerce.number().int().positive("BOM seçin"),
  qty_planned: z.coerce.number().positive("Planlanan miktar zorunlu"),
  planned_date: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  explode_multi_level: z.boolean().default(true),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  onClose: () => void;
  onSaved: (order: ProductionOrder) => void;
};

export function ProductionOrderFormPanel({ onClose, onSaved }: Props) {
  const branchId = useAppStore((s) => s.branchId) ?? 1;
  const recordTypeId = useAppStore((s) => s.recordTypeId) ?? 1;
  const [boms, setBoms] = useState<BomListItem[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<ProductionOrder | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      bom_id: 0,
      qty_planned: 1,
      planned_date: new Date().toISOString().slice(0, 10),
      notes: "",
      explode_multi_level: true,
    },
  });

  useEffect(() => {
    bomApi
      .list({ branch_id: branchId, active_only: true, page_size: 100 })
      .then((r) => setBoms(r.items ?? []))
      .catch(() => setBoms([]));
  }, [branchId]);

  async function onSubmit(values: FormValues) {
    setSaving(true);
    setErr(null);
    try {
      const order = await bomApi.createOrder({
        branch_id: branchId,
        record_type_id: recordTypeId,
        bom_id: values.bom_id,
        qty_planned: values.qty_planned,
        planned_date: values.planned_date || null,
        notes: values.notes || null,
        explode_multi_level: values.explode_multi_level,
      });
      setPreview(order);
      onSaved(order);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Üretim emri oluşturulamadı");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card" style={{ padding: 16 }}>
      <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 800 }}>Üretim Emri Oluştur</h3>
      <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginBottom: 12 }}>
        Aktif BOM seçildiğinde malzeme ihtiyaçları çok seviyeli patlatma ile otomatik hesaplanır
        (miktar × (1 + fire%)).
      </p>
      {err && (
        <div style={{ marginBottom: 10, color: "#b91c1c", fontSize: 13, fontWeight: 600 }}>{err}</div>
      )}

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 12,
            marginBottom: 12,
          }}
        >
          <label style={lab}>
            Aktif BOM
            <select {...form.register("bom_id", { valueAsNumber: true })} style={inp}>
              <option value={0}>Seçin...</option>
              {boms.map((b) => (
                <option key={b.id} value={b.id}>
                  {(b.stock_code || b.stock_id) +
                    " · v" +
                    (b.version_no || b.version) +
                    " — " +
                    (b.stock_name || "")}
                </option>
              ))}
            </select>
          </label>
          <label style={lab}>
            Planlanan Miktar
            <input
              type="number"
              step="0.0001"
              {...form.register("qty_planned", { valueAsNumber: true })}
              style={inp}
            />
          </label>
          <label style={lab}>
            Plan Tarihi
            <input type="date" {...form.register("planned_date")} style={inp} />
          </label>
          <label style={{ ...lab, flexDirection: "row", alignItems: "center", gap: 8, marginTop: 18 }}>
            <input type="checkbox" {...form.register("explode_multi_level")} />
            Çok seviyeli patlatma
          </label>
        </div>
        <label style={{ ...lab, marginBottom: 12 }}>
          Notlar
          <textarea {...form.register("notes")} rows={2} style={{ ...inp, resize: "vertical" }} />
        </label>

        {preview && (
          <div style={{ marginBottom: 12 }}>
            <strong style={{ fontSize: 13 }}>
              Emir {preview.order_no} — {preview.materials.length} malzeme satırı
            </strong>
            <div style={{ overflowX: "auto", marginTop: 8 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Sv</th>
                    <th>Kod</th>
                    <th>Ad</th>
                    <th>İhtiyaç</th>
                    <th>Fire%</th>
                    <th>Maliyet</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.materials.map((m) => (
                    <tr key={m.id}>
                      <td>{m.level_no}</td>
                      <td>{m.component_code}</td>
                      <td>{m.component_name}</td>
                      <td>{Number(m.qty_required).toFixed(4)}</td>
                      <td>{Number(m.scrap_rate).toFixed(2)}</td>
                      <td>{Number(m.line_cost).toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <FormActionFooter sticky={false}>
          <button type="button" className="btn-cancel" onClick={onClose} disabled={saving}>
            Kapat
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Oluşturuluyor..." : "Emir Oluştur + Malzeme Hesapla"}
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
