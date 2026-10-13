import { PublicError } from "../security/publicError";
import { calculateGrossToNet } from "../../modules/personel/services/payrollCalculator";
import { PAYROLL_PARAMETERS_REGISTRY } from "../../modules/personel/services/payrollParameters";

export type PayrollDraft = {
  brut: number;
  sgkIsci: number;
  issizlik: number;
  sgkIsveren: number;
  gelirVergisi: number;
  damga: number;
  net: number;
  gvMatrah: number;
  cumulative: number;
  topTaxRate: number;
  source: string;
  sgkBase: number;
};

import { moneyNumber } from "../money";

function round2(value: number): number {
  return moneyNumber(value);
}

/** Kayıtlı parametre tablosu yoksa başka yılın tarifesi kullanılmaz. */
export function payrollDraftFromEngine(input: {
  grossWage: number;
  period: string;
  workedDays?: number;
  cumulativeTaxBasePrevious?: number;
  has5510Discount?: boolean;
  parameters?: import("../../modules/personel/types/personelTypes").PayrollParameterSet;
}): PayrollDraft {
  const year = Number(String(input.period).slice(0, 4));
  const params = input.parameters ?? PAYROLL_PARAMETERS_REGISTRY[year];
  if (!params) {
    throw new PublicError(
      `${year} yılı için bordro parametre tablosu yok. Resmi tarife eklenmeden hesap yapılmaz.`,
      422,
    );
  }
  const calc = calculateGrossToNet({
    grossWage: input.grossWage,
    period: input.period,
    workedDays: input.workedDays,
    cumulativeTaxBasePrevious: input.cumulativeTaxBasePrevious ?? 0,
    parameters: input.parameters,
    has5510Discount: input.parameters
      ? Boolean(input.has5510Discount) && input.parameters.sgk_5510_tesvik_orani > 0
      : undefined,
  });
  return {
    brut: calc.grossTotal,
    sgkIsci: calc.sgkEmployeeShare,
    issizlik: calc.unemploymentEmployeeShare,
    sgkIsveren: round2(calc.sgkEmployerShare + calc.unemploymentEmployerShare - calc.sgkIncentiveDiscount),
    gelirVergisi: calc.payableIncomeTax,
    damga: calc.payableStampTax,
    net: calc.netPayable,
    gvMatrah: calc.incomeTaxBase,
    cumulative: calc.cumulativeIncomeTaxBase,
    topTaxRate: calc.topTaxRate,
    source: params.source,
    sgkBase: calc.sgkBase,
  };
}
