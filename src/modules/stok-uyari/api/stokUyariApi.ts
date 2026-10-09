import { api } from "@/services/api";

export type AlertType = "MIN" | "MAX" | "SKT";
export type AlertSeverity = "CRITICAL" | "LOW" | "OVERSTOCK" | "HIGH" | "WARN" | "EXPIRED";

export type AlertSummary = {
  min_critical: number;
  min_low: number;
  max_overstock: number;
  skt_expired: number;
  skt_critical: number;
  skt_high: number;
  skt_warn: number;
  total: number;
};

export type AlertItem = {
  alert_type: AlertType;
  severity: AlertSeverity;
  stock_id: number;
  stock_code?: string | null;
  stock_name?: string | null;
  warehouse_id?: number | null;
  warehouse_code?: string | null;
  warehouse_name?: string | null;
  lot_id?: number | null;
  lot_no?: string | null;
  qty_on_hand?: number | null;
  qty_available?: number | null;
  min_level?: number | null;
  max_level?: number | null;
  expiry_date?: string | null;
  days_to_expiry?: number | null;
  title: string;
  message: string;
  fingerprint: string;
};

export type AlertSettings = {
  enable_min_alerts: boolean;
  enable_max_alerts: boolean;
  enable_skt_alerts: boolean;
  skt_days_critical: number;
  skt_days_high: number;
  skt_days_warn: number;
  email_enabled: boolean;
  email_recipients: string | null;
  notify_in_app: boolean;
};

export type StockNotification = {
  id: number;
  alert_type: AlertType;
  severity: AlertSeverity;
  stock_id?: number | null;
  title: string;
  message: string;
  is_read: boolean;
  created_at?: string | null;
};

function qs(params?: Record<string, string | number | boolean | null | undefined>): string {
  if (!params) return "";
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    sp.set(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export const stokUyariApi = {
  summary: (params?: { branch_id?: number }) =>
    api<AlertSummary>(`/stok-uyari/summary${qs(params)}`),
  alerts: async (params?: Record<string, string | number | boolean | null | undefined>) => {
    const res = await api<AlertItem[] | { items: AlertItem[] }>(`/stok-uyari/alerts${qs(params)}`);
    if (Array.isArray(res)) return res;
    if (res && Array.isArray((res as { items?: AlertItem[] }).items)) return (res as { items: AlertItem[] }).items;
    return [];
  },
  getSettings: () => api<AlertSettings>("/stok-uyari/settings"),
  updateSettings: (body: AlertSettings) =>
    api<AlertSettings>("/stok-uyari/settings", { method: "PUT", body }),
  scan: (body?: { enqueue_email?: boolean; branch_id?: number | null }) =>
    api<{ detected: number; inserted: number; emails_queued: number; message: string; summary: AlertSummary }>(
      "/stok-uyari/scan",
      { method: "POST", body: body ?? {} }
    ),
  notifications: async (params?: { unread_only?: boolean; limit?: number }) => {
    const res = await api<StockNotification[] | { items: StockNotification[] }>(
      `/stok-uyari/notifications${qs(params)}`
    );
    if (Array.isArray(res)) return res;
    if (res && Array.isArray((res as { items?: StockNotification[] }).items)) {
      return (res as { items: StockNotification[] }).items;
    }
    return [];
  },
  markRead: (id: number) =>
    api<void>(`/stok-uyari/notifications/${id}/read`, { method: "POST" }),
};

export const SEVERITY_STYLE: Record<AlertSeverity, { bg: string; color: string; label: string }> = {
  CRITICAL: { bg: "#fee2e2", color: "#b91c1c", label: "Kritik" },
  LOW: { bg: "#ffedd5", color: "#c2410c", label: "Düşük" },
  OVERSTOCK: { bg: "#e0e7ff", color: "#3730a3", label: "Max aşımı" },
  HIGH: { bg: "#fef3c7", color: "#b45309", label: "Yüksek" },
  WARN: { bg: "#fef9c3", color: "#a16207", label: "Uyarı" },
  EXPIRED: { bg: "#fecaca", color: "#991b1b", label: "SKT geçmiş" },
};
