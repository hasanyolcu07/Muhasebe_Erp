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

  async function onExport(fmt: "xlsx" | "pdf") {
    setExporting(fmt);
    try {
      await raporApi.exportReport("satis", report.id, fmt, buildApiFilters());
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
      )}
    </div>
  );
}
