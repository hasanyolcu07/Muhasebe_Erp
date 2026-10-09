import { api, http } from "@/services/api";
import { useAuthStore } from "@/store/appStore";

export type ReportColumn = { key: string; label: string };

export type ReportKpiCard = {
  key: string;
  label: string;
  value: number | string | null;
  format?: "number" | "money" | "pct" | string;
};

export type ReportChart = {
  key: string;
  label: string;
  type?: string;
  series?: Array<Record<string, unknown>>;
};

export type ReportSection = {
  key: string;
  label: string;
  columns?: ReportColumn[];
  rows?: Record<string, unknown>[];
};

export type ReportMeta = {
  report_key: string;
  title: string;
  columns: ReportColumn[];
  row_count: number;
  filters: Record<string, unknown>;
  period_labels?: string[];
  kpi_cards?: ReportKpiCard[];
  charts?: ReportChart[];
  sections?: ReportSection[];
};

export type ReportResponse = {
  meta: ReportMeta;
  rows: Record<string, unknown>[];
};

export type LookupItem = { id: number; code?: string | null; name?: string | null };

export type PeriodMode =
  | "range"
  | "month"
  | "year"
  | "month_compare_3"
  | "year_compare_3"
  | "year_compare_5"
  | "year_month_compare";

export type PeriodPreset =
  | "this_month"
  | "last_month"
  | "last_6_months"
  | "last_1_year"
  | "this_year"
  | "custom";

export type CommonReportFilters = {
  branch_id?: number;
  record_type_id?: number;
  period_mode?: PeriodMode | string;
  period_preset?: PeriodPreset | string;
  date_from?: string;
  date_to?: string;
  year?: number;
  month?: number;
  cash_account_id?: number;
  bank_account_id?: number;
  account_id?: number;
  due_days?: number;
  q?: string;
  limit?: number;
};

function qs(params: Record<string, string | number | undefined | null>): string {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    sp.set(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
}

async function downloadBlob(path: string, filename: string): Promise<void> {
  const token = useAuthStore.getState().accessToken;
  try {
    const res = await http.get(path, {
      responseType: "blob",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    const contentType = String(res.headers["content-type"] || "");
    if (contentType.includes("application/json")) {
      const text = await (res.data as Blob).text();
      let msg = "Dışa aktarım başarısız";
      try {
        const j = JSON.parse(text) as { detail?: string };
        if (j.detail) msg = j.detail;
      } catch {
        /* ignore */
      }
      throw new Error(msg);
    }
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error("Dışa aktarım başarısız");
  }
}

export const raporApi = {
  lookupsBranches: () => api<{ items: LookupItem[] }>("/raporlar/lookups/branches"),
  lookupsRecordTypes: () => api<{ items: LookupItem[] }>("/raporlar/lookups/record-types"),
  lookupsCashAccounts: (branchId?: number, recordTypeId?: number) =>
    api<{ items: LookupItem[] }>(
      `/raporlar/lookups/cash-accounts${qs({ branch_id: branchId, record_type_id: recordTypeId })}`
    ),
  lookupsBankAccounts: (branchId?: number, recordTypeId?: number) =>
    api<{ items: LookupItem[] }>(
      `/raporlar/lookups/bank-accounts${qs({ branch_id: branchId, record_type_id: recordTypeId })}`
    ),

  getReport: (apiGroup: string, reportKey: string, filters: CommonReportFilters) =>
    api<ReportResponse>(`/raporlar/${apiGroup}/${reportKey}${qs(filters)}`),

  exportReport: async (
    apiGroup: string,
    reportKey: string,
    format: "xlsx" | "pdf",
    filters: CommonReportFilters
  ) => {
    const path = `/raporlar/${apiGroup}/${reportKey}/export${qs({ ...filters, format })}`;
    await downloadBlob(path, `${apiGroup}_rapor_${reportKey}.${format}`);
  },
};
