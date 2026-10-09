import { api } from "@/services/api";

export type BomStatus = "DRAFT" | "ACTIVE" | "PASSIVE" | "ARCHIVED";

export type BomLine = {
  id?: number;
  component_stock_id: number;
  component_code?: string | null;
  component_name?: string | null;
  component_stock_type?: string | null;
  quantity?: number;
  qty?: number;
  unit_id?: number | null;
  unit_code?: string | null;
  scrap_rate: number;
  line_no: number;
  notes?: string | null;
  qty_with_scrap?: number | null;
};

export type BomListItem = {
  id: number;
  branch_id: number;
  stock_id: number;
  stock_code?: string | null;
  stock_name?: string | null;
  stock_type?: string | null;
  version?: string;
  version_no?: string;
  status: BomStatus | string;
  is_active: boolean;
  effective_from?: string | null;
  effective_to?: string | null;
  standard_cost: number;
  line_count: number;
  updated_at?: string | null;
};

export type BomDetail = BomListItem & {
  notes?: string | null;
  standard_cost_at?: string | null;
  lines: BomLine[];
};

export type ExplodeNode = {
  component_stock_id: number;
  component_code?: string | null;
  component_name?: string | null;
  quantity_per_parent: number;
  scrap_rate: number;
  quantity_gross: number;
  quantity_net: number;
  level_no: number;
  path: string;
  is_leaf: boolean;
  has_bom: boolean;
  unit_cost: number;
  extended_cost: number;
  children?: ExplodeNode[];
};

export type ExplodeResult = {
  bom_id: number;
  parent_stock_id: number;
  parent_code?: string | null;
  parent_name?: string | null;
  root_qty: number;
  flat_leaves: ExplodeNode[];
  tree: ExplodeNode[];
  total_standard_cost: number;
};

export type StandardCostResult = {
  bom_id: number;
  parent_stock_id: number;
  root_qty: number;
  total_standard_cost: number;
  unit_standard_cost: number;
  lines: Array<{
    component_stock_id: number;
    component_code?: string | null;
    component_name?: string | null;
    quantity_gross: number;
    unit_cost: number;
    line_cost: number;
    level_no: number;
    is_leaf: boolean;
  }>;
  saved: boolean;
};

export type ProductionMaterial = {
  id: number;
  component_stock_id: number;
  component_code?: string | null;
  component_name?: string | null;
  unit_code?: string | null;
  qty_per_unit: number;
  scrap_rate: number;
  qty_required: number;
  level_no: number;
  unit_cost: number;
  line_cost: number;
};

export type ProductionOrder = {
  id: number;
  order_no: string;
  bom_id?: number | null;
  stock_id: number;
  stock_code?: string | null;
  stock_name?: string | null;
  qty_planned: number;
  status: string;
  planned_date?: string | null;
  notes?: string | null;
  qty_required_total: number;
  materials: ProductionMaterial[];
};

export type StockLookup = {
  id: number;
  code: string;
  name: string;
  stock_type?: string | null;
  unit_id?: number | null;
  unit_code?: string | null;
  purchase_price: number;
};

export type UnitLookup = { id: number; code: string; name: string };

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

export type BomCreateBody = {
  branch_id: number;
  stock_id: number;
  version?: string;
  version_no?: string;
  status?: BomStatus;
  is_active?: boolean;
  notes?: string | null;
  effective_from?: string | null;
  effective_to?: string | null;
  lines: Array<{
    component_stock_id: number;
    quantity: number;
    unit_id?: number | null;
    scrap_rate?: number;
    line_no?: number;
    notes?: string | null;
  }>;
};

export const bomApi = {
  list: (params?: Record<string, string | number | boolean | null | undefined>) =>
    api<{ items: BomListItem[]; total: number; page: number; page_size: number }>(
      `/bom${qs(params)}`
    ),
  get: (id: number) => api<BomDetail>(`/bom/${id}`),
  create: (body: BomCreateBody) => api<BomDetail>("/bom", { method: "POST", body }),
  update: (id: number, body: Partial<BomCreateBody>) =>
    api<BomDetail>(`/bom/${id}`, { method: "PUT", body }),
  remove: (id: number) => api<void>(`/bom/${id}`, { method: "DELETE" }),
  explode: (id: number, qty = 1, multi_level = true) =>
    api<ExplodeResult>(`/bom/${id}/explode${qs({ qty, multi_level })}`),
  standardCost: (id: number, qty = 1) =>
    api<StandardCostResult>(`/bom/${id}/standard-cost${qs({ qty })}`),
  saveStandardCost: (id: number, qty = 1) =>
    api<StandardCostResult>(`/bom/${id}/standard-cost${qs({ qty, save: true })}`, {
      method: "POST",
    }),
  lookupStocks: (params?: {
    branch_id?: number;
    q?: string;
    parent_only?: boolean;
    limit?: number;
  }) => api<{ items: StockLookup[] }>(`/bom/lookups/stocks${qs(params)}`),
  lookupUnits: (params?: { q?: string }) =>
    api<{ items: UnitLookup[] }>(`/bom/lookups/units${qs(params)}`),
  listOrders: (params?: Record<string, string | number | boolean | null | undefined>) =>
    api<{ items: ProductionOrder[]; total: number }>(`/uretim/emir${qs(params)}`),
  getOrder: (id: number) => api<ProductionOrder>(`/uretim/emir/${id}`),
  createOrder: (body: {
    branch_id: number;
    record_type_id: number;
    bom_id?: number | null;
    stock_id?: number | null;
    qty_planned: number;
    planned_date?: string | null;
    notes?: string | null;
    warehouse_id?: number | null;
    explode_multi_level?: boolean;
  }) => api<ProductionOrder>("/uretim/emir", { method: "POST", body }),
};
