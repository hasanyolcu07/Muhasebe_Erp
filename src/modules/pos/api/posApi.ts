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

export type PosStock = {
  id: number;
  code: string;
  name: string;
  sale_price: number;
  barcode?: string | null;
  tax_rate: number;
  group_name?: string | null;
};

export type PosCatalogItem = PosStock & {
  group_name: string;
  stock_type?: string | null;
};

export type PosCartLine = {
  stock_id?: number;
  barcode?: string;
  description?: string;
  qty: number;
  unit_price: number;
  discount_rate: number;
  tax_rate: number;
};

export type PosSaleOut = {
  id: number;
  sale_no: string;
  grand_total: number;
  status: string;
};

export const posApi = {
  lookup: (q: string, branchId?: number) =>
    api<PosStock>(`/pos/urun${qs({ q, branch_id: branchId })}`),
  catalog: (params?: { branchId?: number; q?: string; group?: string }) =>
    api<{ groups: string[]; items: PosCatalogItem[] }>(
      `/pos/katalog${qs({
        branch_id: params?.branchId,
        q: params?.q,
        group: params?.group,
      })}`
    ),
  openShift: (registerId: number, openingCash = 0) =>
    api("/pos/vardiya/ac", { method: "POST", body: { register_id: registerId, opening_cash: openingCash } }),
  completeSale: (payload: {
    register_id: number;
    lines: PosCartLine[];
    payments: { payment_type: string; amount: number }[];
    discount_total?: number;
  }) => api<PosSaleOut>("/pos/satis", { method: "POST", body: payload }),
  registers: (branchId?: number) =>
    api<{ id: number; code: string; name: string; cash_account_id: number }[]>(
      `/pos/kayitlar${qs({ branch_id: branchId })}`
    ),
};
