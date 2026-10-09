import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { useAppStore } from "@/store/appStore";
import {
  raporApi,
  type CommonReportFilters,
  type LookupItem,
  type ReportColumn,
  type ReportResponse,
} from "../api/raporApi";
import type { ReportItem } from "../config/reportMenu";
import { ReportFilterBar, type ReportFilterValues } from "./ReportFilterBar";

type Props = {
  report: ReportItem;
  groupLabel: string;
  apiGroup: string;
};

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

export function GenericReportPanel({ report, groupLabel, apiGroup }: Props) {
  const storeBranchId = useAppStore((s) => s.branchId);
  const storeRecordTypeId = useAppStore((s) => s.recordTypeId);

  const [filters, setFilters] = useState<ReportFilterValues>(() =>
    defaultFilters(storeBranchId, storeRecordTypeId)
  );
  const [branches, setBranches] = useState<LookupItem[]>([]);
  const [recordTypes, setRecordTypes] = useState<LookupItem[]>([]);
  const [cashAccounts, setCashAccounts] = useState<LookupItem[]>([]);
  const [bankAccounts, setBankAccounts] = useState<LookupItem[]>([]);
  const [data, setData] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<"xlsx" | "pdf" | null>(null);

  const showCash = !!report.filters?.cashPicker;
  const showBank = !!report.filters?.bankPicker;
  const showDue = !!report.filters?.dueDays;
  const showMali = !!report.filters?.maliCompare;

  useEffect(() => {
    setFilters(defaultFilters(storeBranchId, storeRecordTypeId));
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

  useEffect(() => {
    if (!showCash && !showBank) return;
    let cancelled = false;
    const bid = filters.branch_id ? Number(filters.branch_id) : undefined;
    const rid = filters.record_type_id ? Number(filters.record_type_id) : undefined;
    (async () => {
      try {
        const tasks: Promise<void>[] = [];
        if (showCash) {
          tasks.push(
            raporApi.lookupsCashAccounts(bid, rid).then((res) => {
              if (!cancelled) setCashAccounts(res.items ?? []);
            })
          );
        }
        if (showBank) {
          tasks.push(
            raporApi.lookupsBankAccounts(bid, rid).then((res) => {
              if (!cancelled) setBankAccounts(res.items ?? []);
            })
          );
        }
        await Promise.all(tasks);
      } catch {
        if (!cancelled) {
          if (showCash) setCashAccounts([]);
          if (showBank) setBankAccounts([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showCash, showBank, filters.branch_id, filters.record_type_id]);

  const buildApiFilters = useCallback((): CommonReportFilters => {
    const f: CommonReportFilters = {
      branch_id: filters.branch_id ? Number(filters.branch_id) : undefined,
      record_type_id: filters.record_type_id ? Number(filters.record_type_id) : undefined,
      period_mode: filters.period_mode,
      q: filters.q.trim() || undefined,
      limit: 500,
    };
    if (filters.period_mode === "range") {
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
    if (showCash && filters.cash_account_id) f.cash_account_id = Number(filters.cash_account_id);
    if (showBank && filters.bank_account_id) f.bank_account_id = Number(filters.bank_account_id);
    if (showDue) {
      const days = filters.due_days_custom || filters.due_days;
      if (days) f.due_days = Number(days);
      f.date_from = filters.date_from || undefined;
      f.date_to = filters.date_to || undefined;
    }
    return f;
  }, [filters, showBank, showCash, showDue]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await raporApi.getReport(apiGroup, report.id, buildApiFilters());
      setData(res);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : "Rapor yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [apiGroup, buildApiFilters, report.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const columns: ReportColumn[] = useMemo(() => data?.meta?.columns ?? [], [data]);
  const rows = data?.rows ?? [];

  async function onExport(fmt: "xlsx" | "pdf") {
    setExporting(fmt);
    try {
      await raporApi.exportReport(apiGroup, report.id, fmt, buildApiFilters());
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
          {report.filters?.groupHeader ? (
            <div className="reports-group-header">{report.filters.groupHeader}</div>
          ) : null}
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

      <ReportFilterBar
        values={filters}
        onChange={(patch) => setFilters((prev) => ({ ...prev, ...patch }))}
        onSubmit={() => void load()}
        loading={loading}
        branches={branches}
        recordTypes={recordTypes}
        cashAccounts={cashAccounts}
        bankAccounts={bankAccounts}
        showCashPicker={showCash}
        showBankPicker={showBank}
        showDueDays={showDue}
        showMaliCompare={showMali}
      />

      {data?.meta?.period_labels?.length ? (
        <div className="reports-period-labels">
          Dönem: {data.meta.period_labels.join(" · ")}
        </div>
      ) : null}

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
