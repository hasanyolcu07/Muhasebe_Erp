import { api } from "@/services/api";

export type TrackingSettings = {
  require_lot_on_transfer: boolean;
  require_serial_on_transfer: boolean;
};

export type LotLookup = {
  id: number;
  stock_id: number;
  warehouse_id: number;
  lot_no: string;
  lot_name: string | null;
  qty: number;
  expiry_date: string | null;
};

export type SerialLookup = {
  id: number;
  stock_id: number;
  warehouse_id: number;
  serial_no: string;
  lot_id: number | null;
  status: string;
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

export const stokDepoApi = {
  getSettings: () => api<TrackingSettings>("/stok-depo/settings"),
  updateSettings: (body: TrackingSettings) =>
    api<TrackingSettings>("/stok-depo/settings", { method: "PUT", body }),
  listLots: (params?: Record<string, string | number | boolean | null | undefined>) =>
    api<LotLookup[]>(`/stok-depo/lots${qs(params)}`),
  listSerials: (params?: Record<string, string | number | boolean | null | undefined>) =>
    api<SerialLookup[]>(`/stok-depo/serials${qs(params)}`),
  listBalances: (params?: Record<string, string | number | boolean | null | undefined>) =>
    api<{ items: unknown[]; total: number }>(`/stok-depo/balances${qs(params)}`),
};
