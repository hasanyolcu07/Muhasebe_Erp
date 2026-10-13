import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useAppStore } from "@/store/appStore";
import { toDecimal, roundMoney } from "@/lib/financialMath";
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

  const [exportNotice, setExportNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);

  async function onExport(fmt: "xlsx" | "pdf") {
    setExporting(fmt);
    setExportNotice(null);
    try {
      await stokRaporApi.exportReport(reportId, fmt, buildFilters());
      setExportNotice({
        type: "success",
        text: `✔ ${title} (${fmt.toUpperCase()}) başarıyla indirildi.`,
      });
    } catch (e) {
      setExportNotice({
        type: "error",
        text: e instanceof Error ? e.message : "Dışa aktarım başarısız",
      });
    } finally {
      setExporting(null);
    }
  }

  // Sıralanmış satırlar
  const sortedRows = useMemo(() => {
    if (!sortKey) return rows;
    return [...rows].sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;
      if (typeof valA === "number" && typeof valB === "number") {
        return sortOrder === "asc" ? valA - valB : valB - valA;
      }
      return sortOrder === "asc"
        ? String(valA).localeCompare(String(valB), "tr")
        : String(valB).localeCompare(String(valA), "tr");
    });
  }, [rows, sortKey, sortOrder]);

  const totalRowsCount = sortedRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRowsCount / pageSize));
  const displayedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, currentPage, pageSize]);

  // Toplamlar
  const columnTotals = useMemo(() => {
    const totals: Record<string, number | null> = {};
    for (const c of columns) {
      const k = c.key.toLowerCase();
      const isNum = k.includes("qty") || k.includes("miktar") || k.includes("cost") || k.includes("maliyet") || k.includes("sale") || k.includes("fiyat") || k.includes("total");
      if (isNum) {
        let sum = toDecimal(0);
        let hasNum = false;
        for (const row of rows) {
          const v = row[c.key];
          if (typeof v === "number" && !isNaN(v)) {
            sum = sum.plus(toDecimal(v));
            hasNum = true;
          }
        }
        totals[c.key] = hasNum ? roundMoney(sum).toNumber() : null;
      } else {
        totals[c.key] = null;
      }
    }
    return totals;
  }, [columns, rows]);

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

      {exportNotice ? (
        <div
          className={exportNotice.type === "success" ? "alert-success" : "alert-error"}
          style={{
            padding: "10px 14px",
            marginBottom: 12,
            borderRadius: 6,
            fontSize: 13,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{exportNotice.text}</span>
          <button
            type="button"
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14 }}
            onClick={() => setExportNotice(null)}
          >
            ✕
          </button>
        </div>
      ) : null}

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
          <div
            className="reports-meta-line"
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
          >
            <span>
              {loading
                ? "⏳ Rapor verileri taranıyor…"
                : data
                ? `Toplam ${totalRowsCount} kayıt bulundu`
                : "—"}
            </span>
            {totalRowsCount > 0 ? (
              <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12 }}>
                <label>Sayfa Başı:</label>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  style={{ padding: "2px 6px", borderRadius: 4, border: "1px solid #cbd5e1" }}
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            ) : null}
          </div>
          <table className="resizable-data-table reports-table">
            <thead>
              <tr>
                {columns.map((c) => {
                  const isSorted = sortKey === c.key;
                  return (
                    <th
                      key={c.key}
                      onClick={() => {
                        if (sortKey === c.key) {
                          setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
                        } else {
                          setSortKey(c.key);
                          setSortOrder("asc");
                        }
                      }}
                      style={{ cursor: "pointer", userSelect: "none" }}
                      title={`${c.label} sıralamak için tıklayın`}
                    >
                      <span>{c.label}</span>
                      <span style={{ marginLeft: 6, fontSize: 10, color: isSorted ? "#2563eb" : "#94a3b8" }}>
                        {isSorted ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                      </span>
                    </th>
                  );
                })}
                {!columns.length ? <th>Kolon yok</th> : null}
              </tr>
            </thead>
            <tbody>
              {!loading && data && totalRowsCount === 0 ? (
                <tr>
                  <td colSpan={Math.max(columns.length, 1)} style={{ textAlign: "center", padding: 32 }}>
                    <div style={{ fontSize: 14, color: "#64748b" }}>🔍 Belirtilen kriterlere uygun stok kaydı bulunamadı.</div>
                  </td>
                </tr>
              ) : null}
              {displayedRows.map((row, idx) => (
                <tr key={idx}>
                  {columns.map((c) => (
                    <td key={c.key}>{cellValue(row[c.key])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
            {/* FAZ 7: Alt Toplamlar Satırı */}
            {!loading && totalRowsCount > 0 && Object.values(columnTotals).some((v) => v !== null) ? (
              <tfoot>
                <tr style={{ background: "#f8fafc", fontWeight: 700, borderTop: "2px solid #cbd5e1" }}>
                  {columns.map((c, idx) => {
                    if (idx === 0) {
                      return <td key={c.key}>GENEL TOPLAM ({totalRowsCount} Kalem)</td>;
                    }
                    const tot = columnTotals[c.key];
                    return (
                      <td key={c.key}>
                        {tot !== null ? cellValue(tot) : "—"}
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            ) : null}
          </table>

          {/* Sayfalama Kontrolleri */}
          {!loading && totalPages > 1 ? (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 8px",
                fontSize: 13,
                borderTop: "1px solid #e2e8f0",
              }}
            >
              <div>
                Sayfa {currentPage} / {totalPages}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  ◀ Önceki
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                >
                  Sonraki ▶
                </button>
              </div>
            </div>
          ) : null}
        </div>
    </div>
  );
}
