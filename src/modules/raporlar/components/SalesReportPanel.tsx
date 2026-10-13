import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { useAppStore } from "@/store/appStore";
import {
  raporApi,
  type CommonReportFilters,
  type LookupItem,
  type PeriodPreset,
  type ReportChart,
  type ReportColumn,
  type ReportKpiCard,
  type ReportResponse,
  type ReportSection,
} from "../api/raporApi";
import type { ReportItem } from "../config/reportMenu";
import { ReportFilterBar, type ReportFilterValues } from "./ReportFilterBar";
import { toDecimal, roundMoney } from "@/lib/financialMath";

type Props = {
  report: ReportItem;
  groupLabel: string;
};

const PERIOD_PRESETS: { value: PeriodPreset; label: string }[] = [
  { value: "this_month", label: "Bu Ay" },
  { value: "last_month", label: "Son Ay" },
  { value: "last_6_months", label: "Son 6 Ay" },
  { value: "last_1_year", label: "Son 1 Yıl" },
  { value: "this_year", label: "Bu Yıl" },
  { value: "custom", label: "Tarih" },
];

function yearStart(): string {
  return format(new Date(new Date().getFullYear(), 0, 1), "yyyy-MM-dd");
}

function today(): string {
  return format(new Date(), "yyyy-MM-dd");
}

function defaultFilters(branchId?: number | null, recordTypeId?: number | null): ReportFilterValues {
  return {
    branch_id: branchId != null ? String(branchId) : "",
    record_type_id: recordTypeId != null ? String(recordTypeId) : "",
    period_mode: "range",
    date_from: yearStart(),
    date_to: today(),
    year: String(new Date().getFullYear()),
    month: String(new Date().getMonth() + 1),
    cash_account_id: "",
    bank_account_id: "",
    due_days: "",
    due_days_custom: "",
    q: "",
  };
}

function cellValue(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "Evet" : "Hayır";
  if (typeof v === "number") {
    return Number.isInteger(v)
      ? String(v)
      : v.toLocaleString("tr-TR", { maximumFractionDigits: 4 });
  }
  return String(v);
}

function formatKpi(card: ReportKpiCard): string {
  const v = card.value;
  if (v === null || v === undefined) return "—";
  const fmt = card.format ?? "number";
  if (fmt === "money") {
    return Number(v).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (fmt === "pct") {
    return `${Number(v).toLocaleString("tr-TR", { maximumFractionDigits: 2 })} %`;
  }
  return cellValue(v);
}

function SimpleBarChart({ chart }: { chart: ReportChart }) {
  const series = chart.series ?? [];
  const max = Math.max(...series.map((s) => Number(s.amount ?? s.value ?? 0)), 1);
  return (
    <div className="reports-chart-block">
      <div className="reports-chart-title">{chart.label}</div>
      {series.length === 0 ? (
        <div className="reports-chart-empty">Veri yok</div>
      ) : (
        <div className="reports-bar-chart">
          {series.map((item, idx) => {
            const val = Number(item.amount ?? item.value ?? 0);
            const pct = Math.max(4, (val / max) * 100);
            const label = String(item.period ?? item.label ?? idx + 1);
            return (
              <div key={`${chart.key}-${label}`} className="reports-bar-row">
                <span className="reports-bar-label">{label}</span>
                <div className="reports-bar-track">
                  <div className="reports-bar-fill" style={{ width: `${pct}%` }} />
                </div>
                <span className="reports-bar-value">{cellValue(val)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ReportSectionBlock({
  section,
  defaultOpen,
}: {
  section: ReportSection;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const columns = section.columns ?? [];
  const rows = section.rows ?? [];

  return (
    <div className={`reports-section-block${open ? " open" : ""}`}>
      <button
        type="button"
        className="reports-section-header"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="reports-section-chevron">{open ? "▾" : "▸"}</span>
        <span>{section.label}</span>
        <span className="reports-section-count">{rows.length} satır</span>
      </button>
      {open ? (
        <div className="reports-table-wrap reports-section-body">
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
              {rows.length === 0 ? (
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
      ) : null}
    </div>
  );
}

export function SalesReportPanel({ report, groupLabel }: Props) {
  const storeBranchId = useAppStore((s) => s.branchId);
  const storeRecordTypeId = useAppStore((s) => s.recordTypeId);

  const [filters, setFilters] = useState<ReportFilterValues>(() =>
    defaultFilters(storeBranchId, storeRecordTypeId)
  );
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>("this_year");
  const [branches, setBranches] = useState<LookupItem[]>([]);
  const [recordTypes, setRecordTypes] = useState<LookupItem[]>([]);
  const [data, setData] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<"xlsx" | "pdf" | null>(null);

  useEffect(() => {
    setFilters(defaultFilters(storeBranchId, storeRecordTypeId));
    setPeriodPreset("this_year");
    setData(null);
    setError(null);
  }, [report.id, storeBranchId, storeRecordTypeId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [b, r] = await Promise.all([
          raporApi.lookupsBranches(),
          raporApi.lookupsRecordTypes(),
        ]);
        if (!cancelled) {
          setBranches(b.items ?? []);
          setRecordTypes(r.items ?? []);
        }
      } catch {
        if (!cancelled) {
          setBranches([]);
          setRecordTypes([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const buildApiFilters = useCallback((): CommonReportFilters => {
    const f: CommonReportFilters = {
      branch_id: filters.branch_id ? Number(filters.branch_id) : undefined,
      record_type_id: filters.record_type_id ? Number(filters.record_type_id) : undefined,
      period_mode: filters.period_mode,
      period_preset: periodPreset,
      q: filters.q.trim() || undefined,
      limit: 500,
    };
    if (periodPreset === "custom") {
      f.date_from = filters.date_from || undefined;
      f.date_to = filters.date_to || undefined;
    } else if (filters.period_mode === "range") {
      f.date_from = filters.date_from || undefined;
      f.date_to = filters.date_to || undefined;
    } else {
      f.year = filters.year ? Number(filters.year) : undefined;
      if (
        filters.period_mode === "month" ||
        filters.period_mode === "month_compare_3" ||
        filters.period_mode === "year_month_compare"
      ) {
        f.month = filters.month ? Number(filters.month) : undefined;
      }
    }
    return f;
  }, [filters, periodPreset]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await raporApi.getReport("satis", report.id, buildApiFilters());
      setData(res);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : "Rapor yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [buildApiFilters, report.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const columns: ReportColumn[] = useMemo(() => data?.meta?.columns ?? [], [data]);
  const kpiCards = data?.meta?.kpi_cards ?? [];
  const charts = data?.meta?.charts ?? [];
  const sections = data?.meta?.sections ?? [];
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
      await raporApi.exportReport("satis", report.id, fmt, buildApiFilters());
      setExportNotice({
        type: "success",
        text: `✔ ${report.label} (${fmt.toUpperCase()}) başarıyla indirildi.`,
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

  // Toplamlar (Decimal ile hesaplanır)
  const columnTotals = useMemo(() => {
    const totals: Record<string, number | null> = {};
    for (const c of columns) {
      const k = c.key.toLowerCase();
      const isNum = k.includes("total") || k.includes("tutar") || k.includes("subtotal") || k.includes("tax") || k.includes("grand") || k.includes("qty");
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
          <div className="reports-content-kicker">{groupLabel}</div>
          <h2>{report.label}</h2>
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

      <div className="reports-preset-bar">
        {PERIOD_PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            className={`btn-top${periodPreset === p.value ? " active" : ""}`}
            onClick={() => setPeriodPreset(p.value)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <ReportFilterBar
        values={filters}
        onChange={(patch) => setFilters((prev) => ({ ...prev, ...patch }))}
        onSubmit={() => void load()}
        loading={loading}
        branches={branches}
        recordTypes={recordTypes}
        showMaliCompare={report.id === "genel-satis"}
      />

      {data?.meta.period_labels?.length ? (
        <div className="reports-period-labels">
          Dönem: {data.meta.period_labels.join(" · ")}
        </div>
      ) : null}

      {error ? <div className="reports-error">{error}</div> : null}

      {kpiCards.length > 0 ? (
        <div className="kpi-grid reports-kpi-grid">
          {kpiCards.map((card) => (
            <div key={card.key} className="kpi-card">
              <div className="kpi-label">{card.label}</div>
              <div className="kpi-value">{formatKpi(card)}</div>
            </div>
          ))}
        </div>
      ) : null}

      {charts.length > 0 ? (
        <div className="reports-charts-grid">
          {charts.map((chart) => (
            <SimpleBarChart key={chart.key} chart={chart} />
          ))}
        </div>
      ) : null}

      {sections.length > 0 ? (
        <div className="reports-sections">
          {sections.map((section, idx) => (
            <ReportSectionBlock key={section.key} section={section} defaultOpen={idx === 0} />
          ))}
        </div>
      ) : (
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
                    <div style={{ fontSize: 14, color: "#64748b" }}>🔍 Belirtilen kriterlere uygun satış kaydı bulunamadı.</div>
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
                      return <td key={c.key}>GENEL TOPLAM ({totalRowsCount} Fatura)</td>;
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
      )}
    </div>
  );
}
