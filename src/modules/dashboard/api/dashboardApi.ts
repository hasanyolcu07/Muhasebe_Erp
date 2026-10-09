import { api } from "@/services/api";

function qs(params: Record<string, string | number | undefined | null>): string {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    sp.set(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export type KpiCard = {
  key: string;
  label: string;
  value: number | string;
  unit?: string | null;
  trend_pct?: number | null;
};

export type TrendPoint = { label: string; value: number };
export type AlertItem = { key: string; label: string; count: number; severity: string };
export type IncomeExpensePoint = { label: string; income: number; expense: number };
export type NamedAmount = { name: string; value: number };
export type CashFlowPoint = { label: string; actual?: number | null; projected?: number | null };
export type TodayTask = {
  id: string;
  title: string;
  due?: string | null;
  priority?: string;
  done?: boolean;
};
export type RecentTxn = {
  id: string;
  when: string;
  doc_type: string;
  description: string;
  amount: number;
  status: string;
  /** Belge numarası (yoksa doc_type gösterilir) */
  doc_no?: string | null;
  /** Cari unvanı */
  partner?: string | null;
  cari?: string | null;
};
export type AiInsight = {
  title: string;
  body: string;
  /** fırsat | uyarı | kritik | success | warning | danger | info */
  severity?: string;
  emoji?: string;
};

export type DashboardKpiResponse = {
  cards: KpiCard[];
  sales_trend: TrendPoint[];
  alerts: AlertItem[];
  gib_summary: Record<string, number>;
  income_expense?: IncomeExpensePoint[];
  income_breakdown?: NamedAmount[];
  /** Ürün bazında gelir dağılımı (opsiyonel) */
  product_income_breakdown?: NamedAmount[];
  estimated_vat?: number;
  estimated_vat_note?: string;
  yevmiye_success_pct?: number;
  cash_flow?: CashFlowPoint[];
  today_tasks?: TodayTask[];
  recent_transactions?: RecentTxn[];
  ai_insights?: AiInsight[];
};

export type WidgetLayoutItem = { id: string; visible: boolean; order: number };

export const dashboardApi = {
  kpi: (branchId?: number, recordTypeId?: number) =>
    api<DashboardKpiResponse>(
      `/dashboard/kpi${qs({ branch_id: branchId, record_type_id: recordTypeId })}`
    ),
  layout: () => api<{ layout_key: string; widgets: WidgetLayoutItem[] }>("/dashboard/layout"),
  saveLayout: (widgets: WidgetLayoutItem[]) =>
    api<{ layout_key: string; widgets: WidgetLayoutItem[] }>("/dashboard/layout", {
      method: "PUT",
      body: { layout_key: "main", widgets },
    }),
};

export const myasistanApi = {
  ask: (question: string, branchId?: number, recordTypeId?: number) =>
    api<{
      answer: string;
      confidence: number;
      data?: unknown;
      chart?: { type: string; labels: string[]; values: number[] };
    }>("/myasistan/sor", {
      method: "POST",
      body: { question, branch_id: branchId, record_type_id: recordTypeId },
    }),
};
