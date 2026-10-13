import { api } from "@/services/api";

export type CostCalculation = {
  id: number;
  calc_no: string;
  calc_type: string;
  standard_total: number;
  actual_total: number;
  variance_total: number;
  lines: Array<{
    line_type: string;
    amount: number;
    standard_amount: number;
    actual_amount: number;
    variance_amount: number;
  }>;
};

export type InvestmentScenario = {
  id: number;
  name: string;
  roi_pct?: number;
  npv?: number;
  irr_pct?: number;
  payback_years?: number;
};

export type AiAdvisory = {
  data: Record<string, unknown>;
  confidence: number;
  source: string;
  explanation?: string;
  requires_user_approval: boolean;
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

export const maliyetApi = {
  listCalculations: (branch_id?: number) =>
    api<{ items: CostCalculation[]; total: number }>(`/maliyet/hesaplar${qs({ branch_id })}`),
  runBomCost: (body: Record<string, unknown>) =>
    api<CostCalculation>("/maliyet/hesaplar/bom", { method: "POST", body }),
  pricing: (body: Record<string, unknown>) =>
    api<Record<string, unknown>>("/maliyet/fiyat/hesapla", { method: "POST", body }),
  marketResearch: (stock_id: number, competitors: Array<Record<string, unknown>> = []) =>
    api<AiAdvisory>("/maliyet/ai/piyasa", {
      method: "POST",
      body: { stock_id, competitors },
    }),
  exportPrice: (body: Record<string, unknown>) =>
    api<Record<string, unknown>>("/maliyet/ihracat", { method: "POST", body }),
  listInvestments: (branch_id?: number) =>
    api<InvestmentScenario[]>(`/maliyet/yatirim${qs({ branch_id })}`),
  createInvestment: (body: Record<string, unknown>) =>
    api<InvestmentScenario>("/maliyet/yatirim", { method: "POST", body }),
  cashFlowProjection: (body: Record<string, unknown>) =>
    api<Record<string, unknown>>("/maliyet/nakit-projeksiyon", { method: "POST", body }),
  stockBudget: (branch_id: number) =>
    api<Record<string, unknown>>(`/maliyet/stok-butce${qs({ branch_id })}`, { method: "POST" }),
  proforma: (body: Record<string, unknown>) =>
    api<Record<string, unknown>>("/maliyet/proforma", { method: "POST", body }),
  subsidy: (body: Record<string, unknown>) =>
    api<Record<string, unknown>>("/maliyet/tesvik-ara", { method: "POST", body }),
  taxPrep: (branch_id: number) =>
    api<Record<string, unknown>>(`/maliyet/vergi-hazirlik${qs({ branch_id })}`),
  reconciliation: (branch_id: number) =>
    api<Record<string, unknown>>(`/maliyet/mutabakat${qs({ branch_id })}`),
  masterSync: (body: Record<string, unknown>) =>
    api<Record<string, unknown>>("/maliyet/master-sync", { method: "POST", body }),
};
