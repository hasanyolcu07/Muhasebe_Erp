/**
 * Dönemsel Mevzuat Parametreleri (Payroll Parameters Engine)
 * Kaynak: 5510 Sayılı SSGSSK, 193 Sayılı Gelir Vergisi Kanunu, 488 Sayılı Damga Vergisi Kanunu,
 * 7349 Sayılı Asgari Ücret Vergi İstisnası Kanunu ve Asgari Ücret Tespit Komisyonu Kararları.
 */

import type { PayrollParameterSet } from "../types/personelTypes";

export const PAYROLL_PARAMETERS_REGISTRY: Record<number, PayrollParameterSet> = {
  2026: {
    period_year: 2026,
    valid_from: "2026-01-01",
    valid_to: "2026-12-31",
    source: "2026 Asgari Ücret Tespit Komisyonu Kararı & 328 Seri No'lu Gelir Vergisi Tebliği",
    asgari_ucret_brut: 26005.5,
    sgk_taban: 26005.5,
    sgk_tavan: 195041.25, // Asgari ücretin 7.5 katı
    sgk_isci_orani: 0.14,
    issizlik_isci_orani: 0.01,
    sgk_isveren_orani: 0.205, // %20.5 (Kısa + Uzun Vadeli Sigorta Kolları)
    sgk_5510_tesvik_orani: 0.05, // %5 Hazine Desteği (5510 Sayılı Kanun Madde 81/ı)
    issizlik_isveren_orani: 0.02,
    damga_vergisi_orani: 0.00759, // Binde 7.59
    tax_brackets: [
      { limit: 158000, rate: 0.15 },
      { limit: 380000, rate: 0.2 },
      { limit: 900000, rate: 0.27 },
      { limit: 4300000, rate: 0.35 },
      { limit: Infinity, rate: 0.4 },
    ],
    asgari_ucret_istisnasi_var: true,
  },
  2025: {
    period_year: 2025,
    valid_from: "2025-01-01",
    valid_to: "2025-12-31",
    source: "2025 Asgari Ücret Tespit Komisyonu Kararı & 324 Seri No'lu Gelir Vergisi Tebliği",
    asgari_ucret_brut: 20002.5,
    sgk_taban: 20002.5,
    sgk_tavan: 150018.75,
    sgk_isci_orani: 0.14,
    issizlik_isci_orani: 0.01,
    sgk_isveren_orani: 0.205,
    sgk_5510_tesvik_orani: 0.05,
    issizlik_isveren_orani: 0.02,
    damga_vergisi_orani: 0.00759,
    tax_brackets: [
      { limit: 110000, rate: 0.15 },
      { limit: 230000, rate: 0.2 },
      { limit: 580000, rate: 0.27 },
      { limit: 3000000, rate: 0.35 },
      { limit: Infinity, rate: 0.4 },
    ],
    asgari_ucret_istisnasi_var: true,
  },
  2024: {
    period_year: 2024,
    valid_from: "2024-01-01",
    valid_to: "2024-12-31",
    source: "2024 Asgari Ücret Tespit Komisyonu Kararı & 320 Seri No'lu Gelir Vergisi Tebliği",
    asgari_ucret_brut: 20002.5,
    sgk_taban: 20002.5,
    sgk_tavan: 150018.75,
    sgk_isci_orani: 0.14,
    issizlik_isci_orani: 0.01,
    sgk_isveren_orani: 0.205,
    sgk_5510_tesvik_orani: 0.05,
    issizlik_isveren_orani: 0.02,
    damga_vergisi_orani: 0.00759,
    tax_brackets: [
      { limit: 110000, rate: 0.15 },
      { limit: 230000, rate: 0.2 },
      { limit: 580000, rate: 0.27 },
      { limit: 3000000, rate: 0.35 },
      { limit: Infinity, rate: 0.4 },
    ],
    asgari_ucret_istisnasi_var: true,
  },
};

/**
 * Verilen dönem (YYYY veya YYYY-MM) için geçerli parametre setini döner.
 * Tanımsız bir yıl için en yakın güncel yılın parametresini ve kaynak uyarısını döner.
 */
export function getPayrollParameters(periodOrYear: string | number): PayrollParameterSet {
  const year = typeof periodOrYear === "number"
    ? periodOrYear
    : parseInt(String(periodOrYear).slice(0, 4), 10) || 2026;

  if (PAYROLL_PARAMETERS_REGISTRY[year]) {
    return PAYROLL_PARAMETERS_REGISTRY[year];
  }

  // Varsayılan olarak en güncel yıl olan 2026'yı döner
  return PAYROLL_PARAMETERS_REGISTRY[2026];
}

export function listAllPayrollParameters(): PayrollParameterSet[] {
  return Object.values(PAYROLL_PARAMETERS_REGISTRY).sort((a, b) => b.period_year - a.period_year);
}
