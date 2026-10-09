import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useAppStore } from "@/store/appStore";
import {
  stokRaporApi,
  type LookupItem,
  type ReportColumn,
  type ReportResponse,
  type StockReportFilters,
} from "../api/stokRaporApi";

const filterSchema = z.object({
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  warehouse_id: z.string().optional(),
  category_id: z.string().optional(),
  q: z.string().optional(),
  slow_days: z.string().optional(),
});

type FilterForm = z.infer<typeof filterSchema>;

type Props = {
  reportId: string;
  title: string;
};

function yearStart(): string {
  return format(new Date(new Date().getFullYear(), 0, 1), "yyyy-MM-dd");
}

function today(): string {
  return format(new Date(), "yyyy-MM-dd");
}

function cellValue(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "number") {
    return Number.isInteger(v)
      ? String(v)
      : v.toLocaleString("tr-TR", { maximumFractionDigits: 4 });
  }
  return String(v);
}

export function StockReportPanel({ reportId, title }: Props) {
  const branchId = useAppStore((s) => s.branchId);
  const recordTypeId = useAppStore((s) => s.recordTypeId);

  const [warehouses, setWarehouses] = useState<LookupItem[]>([]);
  const [categories, setCategories] = useState<LookupItem[]>([]);
  const [data, setData] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<"xlsx" | "pdf" | null>(null);

  const needsDate = !["durum", "kritik", "lot-seri", "degerleme"].includes(reportId);
  const needsSlow = reportId === "yaslandirma";

  const { register, handleSubmit, getValues, reset } = useForm<FilterForm>({
    resolver: zodResolver(filterSchema),
    defaultValues: {
      date_from: yearStart(),
      date_to: today(),
      warehouse_id: "",
      category_id: "",
      q: "",
      slow_days: "90",
    },
  });

  useEffect(() => {
    reset({
      date_from: yearStart(),
      date_to: today(),
      warehouse_id: "",
      category_id: "",
      q: "",
      slow_days: "90",
    });
    setData(null);
    setError(null);
  }, [reportId, reset]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [wh, cat] = await Promise.all([
          stokRaporApi.lookupsWarehouses(branchId ?? undefined),
          stokRaporApi.lookupsCategories(),
        ]);
        if (!cancelled) {
          setWarehouses(wh.items ?? []);
          setCategories(cat.items ?? []);
        }
      } catch {
        if (!cancelled) {
          setWarehouses([]);
          setCategories([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [branchId]);

  const buildFilters = useCallback((): StockReportFilters => {
    const v = getValues();
    return {
      date_from: needsDate || true ? v.date_from || undefined : undefined,
      date_to: needsDate || true ? v.date_to || undefined : undefined,
      warehouse_id: v.warehouse_id ? Number(v.warehouse_id) : undefined,
      category_id: v.category_id ? Number(v.category_id) : undefined,
      branch_id: branchId ?? undefined,
      record_type_id: recordTypeId ?? undefined,
      q: v.q?.trim() || undefined,
      slow_days: needsSlow && v.slow_days ? Number(v.slow_days) : undefined,
      limit: 500,
    };
  }, [branchId, getValues, needsDate, needsSlow, recordTypeId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await stokRaporApi.getReport(reportId, buildFilters());
      setData(res);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : "Rapor yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [buildFilters, reportId]);

  useEffect(() => {
    void load();
  }, [load]);

  const columns: ReportColumn[] = useMemo(
    () => data?.meta?.columns ?? [],
    [data]
  );
  const rows = data?.rows ?? [];

  async function onExport(fmt: "xlsx" | "pdf") {
    setExporting(fmt);
    try {
      await stokRaporApi.exportReport(reportId, fmt, buildFilters());
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Dışa aktarım başarısız");
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="reports-content-panel">
      <div className="reports-content-header">
        <div>
          <div className="reports-content-kicker">Stok Raporları</div>
          <h2>{title}</h2>
        </div>
        <div className="reports-export-btns">
          <button
            type="button"
            className="btn-top"
            disabled={!!exporting || loading}
            onClick={() => void onExport("xlsx")}
          >
            {exporting === "xlsx" ? "Excel…" : "📥 Excel"}
          </button>
          <button
            type="button"
            className="btn-top"
            disabled={!!exporting || loading}
            onClick={() => void onExport("pdf")}
          >
            {exporting === "pdf" ? "PDF…" : "📄 PDF"}
          </button>
        </div>
      </div>

      <form className="reports-filter-bar" onSubmit={handleSubmit(() => void load())}>
        <label>
          Başlangıç
          <input type="date" {...register("date_from")} />
        </label>
        <label>
          Bitiş
          <input type="date" {...register("date_to")} />
        </label>
        <label>
          Depo
          <select {...register("warehouse_id")}>
            <option value="">Tümü</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.code} — {w.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Kategori
          <select {...register("category_id")}>
            <option value="">Tümü</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} — {c.name}
              </option>
            ))}
          </select>
        </label>
        {needsSlow ? (
          <label>
            Min. hareketsiz gün
            <input type="number" min={1} {...register("slow_days")} />
          </label>
        ) : null}
        <label className="reports-filter-q">
          Ara
          <input type="search" placeholder="Stok kod / ad" {...register("q")} />
        </label>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "Yükleniyor…" : "Raporla"}
        </button>
      </form>

      {error ? <div className="reports-error">{error}</div> : null}

      <div className="reports-table-wrap">
        <div className="reports-meta-line">
          {data ? `${data.meta?.row_count ?? rows.length} satır` : loading ? "Yükleniyor…" : "—"}
        </div>
        <table className="resizable-data-table reports-table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key}>{c.label}</th>
              ))}
              {!columns.length ? <th>Kolon yok</th> : null}
            </tr>
          </thead>
          <tbody>
            {!loading && data && rows.length === 0 ? (
              <tr>
                <td colSpan={Math.max(columns.length, 1)} style={{ textAlign: "center" }}>
                  Kayıt bulunamadı
                </td>
              </tr>
            ) : null}
            {rows.map((row, idx) => (
              <tr key={idx}>
                {columns.map((c) => (
                  <td key={c.key}>{cellValue(row[c.key])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
