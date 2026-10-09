import { api, http } from "@/services/api";
import { useAuthStore } from "@/store/appStore";

export type ReportColumn = { key: string; label: string };

export type ReportMeta = {
  report_key: string;
  title: string;
  columns: ReportColumn[];
  row_count: number;
  filters: Record<string, unknown>;
};

export type ReportResponse = {
  meta: ReportMeta;
  rows: Record<string, unknown>[];
};

export type LookupItem = { id: number; code?: string | null; name?: string | null };

export type StockReportFilters = {
  date_from?: string;
  date_to?: string;
  warehouse_id?: number;
  category_id?: number;
  branch_id?: number;
  record_type_id?: number;
  q?: string;
  slow_days?: number;
  limit?: number;
  format?: string;
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

export const stokRaporApi = {
  lookupsWarehouses: (branchId?: number) =>
    api<{ items: LookupItem[] }>(
      `/raporlar/stok/lookups/warehouses${qs({ branch_id: branchId })}`
    ),

  lookupsCategories: () =>
    api<{ items: LookupItem[] }>("/raporlar/stok/lookups/categories"),

  getReport: (reportKey: string, filters: StockReportFilters) =>
    api<ReportResponse>(`/raporlar/stok/${reportKey}${qs(filters)}`),

  exportReport: async (
    reportKey: string,
    format: "xlsx" | "pdf",
    filters: StockReportFilters
  ) => {
    const path = `/raporlar/stok/${reportKey}/export${qs({ ...filters, format })}`;
    await downloadBlob(path, `stok_rapor_${reportKey}.${format}`);
  },
};
