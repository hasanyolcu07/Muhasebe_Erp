import { api } from "@/services/api";

export type Machine = {
  id: number;
  branch_id: number;
  code: string;
  name: string;
  machine_type: string;
  hourly_cost: number;
  capacity_hours_per_day: number;
  setup_minutes: number;
  efficiency_pct: number;
  maintenance_notes?: string | null;
  cost_center_id?: number | null;
  is_passive: boolean;
};

export type CapacityReport = {
  branch_id: number;
  week_start: string;
  week_end: string;
  machines: Array<{
    machine_id: number;
    machine_code: string;
    machine_name: string;
    capacity_hours: number;
    planned_hours: number;
    usage_pct: number;
    is_bottleneck: boolean;
  }>;
  overall_usage_pct: number;
};

export type ScheduleSlot = {
  id: number;
  machine_id: number;
  machine_code?: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  planned_hours: number;
  status: string;
  work_order_no?: string | null;
  production_order_no?: string | null;
};

export type MrpRun = {
  id: number;
  run_no: string;
  status: string;
  source_type?: string | null;
  source_id?: number | null;
  lines: Array<{
    id: number;
    stock_code?: string;
    stock_name?: string;
    net_requirement: number;
    suggestion_type: string;
    suggested_qty: number;
    production_order_id?: number | null;
  }>;
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

export const uretimApi = {
  listMachines: (params?: { branch_id?: number; q?: string }) =>
    api<{ items: Machine[]; total: number }>(`/uretim/makineler${qs(params)}`),

  createMachine: (body: Partial<Machine> & { branch_id: number; code: string; name: string }) =>
    api<Machine>("/uretim/makineler", { method: "POST", body }),

  capacity: (branch_id: number, week_start: string) =>
    api<CapacityReport>(`/uretim/kapasite${qs({ branch_id, week_start })}`),

  weeklyPlan: (branch_id: number, week_start: string) =>
    api<{ week_start: string; week_end: string; slots: ScheduleSlot[] }>(
      `/uretim/plan/haftalik${qs({ branch_id, week_start })}`
    ),

  createSlot: (body: Record<string, unknown>) =>
    api<ScheduleSlot>("/uretim/plan/slot", { method: "POST", body }),

  runMrp: (body: {
    branch_id: number;
    record_type_id: number;
    source_type?: string;
    source_id?: number;
    warehouse_id?: number;
  }) => api<MrpRun>("/uretim/mrp/run", { method: "POST", body }),

  applyMrp: (runId: number, body?: { create_production_orders?: boolean; warehouse_id?: number }) =>
    api<MrpRun>(`/uretim/mrp/run/${runId}/apply`, { method: "POST", body: body ?? {} }),

  releaseOrder: (poId: number, warehouse_id: number) =>
    api(`/uretim/emir/${poId}/release`, { method: "POST", body: { warehouse_id } }),

  completeOrder: (
    poId: number,
    body: { warehouse_id: number; qty_produced: number; qty_scrapped?: number }
  ) => api(`/uretim/emir/${poId}/complete`, { method: "POST", body }),
};
