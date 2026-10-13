/**
 * Bordro Hesaplama Motoru (TMS, 5510, 193 GVK ve 7349 Uyumlu)
 * Brütten Nete, Netten Brüte, Kümülatif Matrah Taşıma ve Muhasebe Fişi Taslağı
 */

import { toDecimal, roundMoney } from "@/lib/financialMath";
import { getPayrollParameters } from "./payrollParameters";
import type { BordroRecord, PayrollParameterSet, PuantajRecord, PersonelRecord } from "../types/personelTypes";

export interface CalculationInput {
  grossWage: number;
  period: string; // "2026-03"
  workedDays?: number; // Varsayılan 30
  overtimeHours150?: number;
  overtimeHours200?: number;
  bonus?: number;
  deductions?: number; // Avans, icra vb.
  cumulativeTaxBasePrevious?: number; // Önceki aylardan devreden kümülatif GV matrahı
  has5510Discount?: boolean; // %5 Hazine teşviki (varsayılan true)
  department?: string;
  isDailyWage?: boolean;
  /** Verilirse çalışma yılının kayıtlı parametresi kullanılır. */
  parameters?: PayrollParameterSet;
}

/**
 * Artan oranlı gelir vergisi tarifesi hesabı
 */
export function calculateProgressiveTax(
  taxBase: number,
  previousCumulativeBase: number,
  brackets: Array<{ limit: number; rate: number }>
): { taxAmount: number; topBracketRate: number } {
  if (taxBase <= 0) return { taxAmount: 0, topBracketRate: brackets[0]?.rate ?? 0.15 };

  const startBase = previousCumulativeBase;
  const endBase = previousCumulativeBase + taxBase;

  let totalTax = toDecimal(0);
  let currentBase = startBase;
  let topRate = brackets[0]?.rate ?? 0.15;

  let lowerLimit = 0;
  for (const b of brackets) {
    const upperLimit = b.limit;

    if (currentBase < upperLimit) {
      // Bu dilimde vergilendirilecek matrah dilimi
      const chunkStart = Math.max(currentBase, lowerLimit);
      const chunkEnd = Math.min(endBase, upperLimit);

      if (chunkEnd > chunkStart) {
        const taxableChunk = chunkEnd - chunkStart;
        const chunkTax = toDecimal(taxableChunk).mul(b.rate);
        totalTax = totalTax.plus(chunkTax);
        topRate = b.rate;
        currentBase = chunkEnd;
      }
    }

    lowerLimit = upperLimit;
    if (currentBase >= endBase) break;
  }

  return {
    taxAmount: roundMoney(totalTax).toNumber(),
    topBracketRate: topRate,
  };
}

/**
 * Brütten Nete Bordro Hesaplama
 */
export function calculateGrossToNet(input: CalculationInput): {
  grossTotal: number;
  sgkBase: number;
  sgkEmployeeShare: number;
  unemploymentEmployeeShare: number;
  incomeTaxBase: number;
  cumulativeIncomeTaxBase: number;
  topTaxRate: number;
  calculatedIncomeTax: number;
  asgariUcretGvIstisnasi: number;
  payableIncomeTax: number;
  calculatedStampTax: number;
  asgariUcretDvIstisnasi: number;
  payableStampTax: number;
  deductionsTotal: number;
  netPayable: number;
  sgkEmployerShare: number;
  unemploymentEmployerShare: number;
  sgkIncentiveDiscount: number;
  totalEmployerCost: number;
} {
  const params = input.parameters ?? getPayrollParameters(input.period);
  const workedDays = input.workedDays ?? 30;
  const overtime150 = input.overtimeHours150 ?? 0;
  const overtime200 = input.overtimeHours200 ?? 0;
  const bonus = input.bonus ?? 0;
  const deductions = input.deductions ?? 0;
  const prevCumulative = input.cumulativeTaxBasePrevious ?? 0;
  const has5510 = input.has5510Discount ?? true;

  // Günlük ve saatlik ücretler (Yasal standart: 30 gün / 225 saat)
  const baseMonthly = input.grossWage;
  const dailyWage = toDecimal(baseMonthly).div(30);
  const hourlyWage = toDecimal(baseMonthly).div(225);

  // Normal çalışma kazancı
  const normalEarning = roundMoney(dailyWage.mul(Math.min(workedDays, 30)));

  // Fazla mesai kazancı: 1.5 ve 2.0 kat
  const ot150Earning = roundMoney(hourlyWage.mul(overtime150).mul(1.5));
  const ot200Earning = roundMoney(hourlyWage.mul(overtime200).mul(2.0));
  const totalOvertime = ot150Earning.plus(ot200Earning);

  // Toplam Brüt Hak Ediş
  const grossTotalDec = normalEarning.plus(totalOvertime).plus(bonus);
  const grossTotal = roundMoney(grossTotalDec).toNumber();

  // SGK matrahı taban ve tavanla sınırlanır. Eksik günde taban ve tavan çalışılan gün / 30 oranında küçülür.
  const gunPay = toDecimal(Math.min(workedDays, 30)).div(30);
  const taban = toDecimal(params.sgk_taban).mul(gunPay);
  const tavan = toDecimal(params.sgk_tavan).mul(gunPay);
  let sgkBaseDec = grossTotalDec;
  if (sgkBaseDec.lt(taban)) sgkBaseDec = taban;
  if (sgkBaseDec.gt(tavan)) sgkBaseDec = tavan;
  const sgkBase = roundMoney(sgkBaseDec).toNumber();

  // SGK İşçi Payı (%14) & İşsizlik İşçi Payı (%1)
  const sgkEmployeeShare = roundMoney(toDecimal(sgkBase).mul(params.sgk_isci_orani)).toNumber();
  const unemploymentEmployeeShare = roundMoney(toDecimal(sgkBase).mul(params.issizlik_isci_orani)).toNumber();

  // Gelir Vergisi Matrahı
  const incomeTaxBaseDec = toDecimal(grossTotal).minus(sgkEmployeeShare).minus(unemploymentEmployeeShare);
  const incomeTaxBase = Math.max(0, roundMoney(incomeTaxBaseDec).toNumber());

  // Kümülatif Gelir Vergisi Matrahı
  const cumulativeIncomeTaxBase = roundMoney(toDecimal(prevCumulative).plus(incomeTaxBase)).toNumber();

  // Artan Oranlı Gelir Vergisi Hesabı
  const { taxAmount: calculatedIncomeTax, topBracketRate: topTaxRate } = calculateProgressiveTax(
    incomeTaxBase,
    prevCumulative,
    params.tax_brackets
  );

  // Asgari ücret matrahı, kayıtlı SGK işçi ve işsizlik payı düşülerek bulunur.
  const sgkDusum = toDecimal(params.sgk_isci_orani).plus(params.issizlik_isci_orani);
  const asgariUcretMatrah = toDecimal(params.asgari_ucret_brut).mul(toDecimal(1).minus(sgkDusum)).toNumber();
  const { taxAmount: asgariUcretGvIstisnaTutar } = calculateProgressiveTax(
    asgariUcretMatrah,
    prevCumulative,
    params.tax_brackets
  );
  // TODO(MEVZUAT-DOGRULA): Eksik günde asgari ücret gelir ve damga istisnası tam ay mı, çalışılan güne orantılı mı uygulanır. Şimdilik parametre tutarı tam ay olarak, ayın vergisini aşmadan indirilir.
  const asgariUcretGvIstisnasi =
    params.gv_istisna_tutari != null
      ? Math.min(calculatedIncomeTax, params.gv_istisna_tutari)
      : Math.min(calculatedIncomeTax, asgariUcretGvIstisnaTutar);

  // Ödenecek Gelir Vergisi
  const payableIncomeTax = Math.max(
    0,
    roundMoney(toDecimal(calculatedIncomeTax).minus(asgariUcretGvIstisnasi)).toNumber()
  );

  // Damga Vergisi Hesabı (Binde 7.59)
  const calculatedStampTax = roundMoney(toDecimal(grossTotal).mul(params.damga_vergisi_orani)).toNumber();
  const turetilenDvIstisna = roundMoney(toDecimal(params.asgari_ucret_brut).mul(params.damga_vergisi_orani)).toNumber();
  const asgariUcretDvIstisnasi =
    params.dv_istisna_tutari != null ? Math.min(calculatedStampTax, params.dv_istisna_tutari) : turetilenDvIstisna;
  const payableStampTax = Math.max(
    0,
    roundMoney(toDecimal(calculatedStampTax).minus(asgariUcretDvIstisnasi)).toNumber()
  );

  // Net Ödenecek Ücret
  const totalDeductionsDec = toDecimal(sgkEmployeeShare)
    .plus(unemploymentEmployeeShare)
    .plus(payableIncomeTax)
    .plus(payableStampTax)
    .plus(deductions);
  const netPayable = roundMoney(toDecimal(grossTotal).minus(totalDeductionsDec)).toNumber();

  // İşveren Payları
  const sgkEmployerShare = roundMoney(toDecimal(sgkBase).mul(params.sgk_isveren_orani)).toNumber();
  const unemploymentEmployerShare = roundMoney(toDecimal(sgkBase).mul(params.issizlik_isveren_orani)).toNumber();
  const sgkIncentiveDiscount = has5510
    ? roundMoney(toDecimal(sgkBase).mul(params.sgk_5510_tesvik_orani)).toNumber()
    : 0;

  // Toplam İşveren Maliyeti = Brüt + SGK İşveren + İşsizlik İşveren - Teşvik
  const totalEmployerCost = roundMoney(
    toDecimal(grossTotal)
      .plus(sgkEmployerShare)
      .plus(unemploymentEmployerShare)
      .minus(sgkIncentiveDiscount)
  ).toNumber();

  return {
    grossTotal,
    sgkBase,
    sgkEmployeeShare,
    unemploymentEmployeeShare,
    incomeTaxBase,
    cumulativeIncomeTaxBase,
    topTaxRate,
    calculatedIncomeTax,
    asgariUcretGvIstisnasi,
    payableIncomeTax,
    calculatedStampTax,
    asgariUcretDvIstisnasi,
    payableStampTax,
    deductionsTotal: deductions,
    netPayable,
    sgkEmployerShare,
    unemploymentEmployerShare,
    sgkIncentiveDiscount,
    totalEmployerCost,
  };
}

/**
 * Netten Brüte İteratif Hesaplama (İkili Arama Algoritması)
 */
export function calculateNetToGross(
  targetNet: number,
  input: Omit<CalculationInput, "grossWage">
): number {
  if (targetNet <= 0) return 0;

  let low = targetNet;
  let high = targetNet * 2.2;
  let bestGross = targetNet;
  let iterations = 0;

  while (low <= high && iterations < 35) {
    iterations++;
    const mid = (low + high) / 2;
    const result = calculateGrossToNet({ ...input, grossWage: mid });

    const diff = result.netPayable - targetNet;
    if (Math.abs(diff) < 0.01) {
      return roundMoney(mid).toNumber();
    }

    if (result.netPayable < targetNet) {
      low = mid + 0.005;
      bestGross = mid;
    } else {
      high = mid - 0.005;
      bestGross = mid;
    }
  }

  return roundMoney(bestGross).toNumber();
}

/**
 * Personel ve Puantaj kaydından tam Bordro Kaydı oluşturur
 */
export function generateBordroRecord(
  personel: PersonelRecord,
  puantaj: PuantajRecord,
  cumulativeTaxBasePrevious = 0,
  parameters?: PayrollParameterSet,
): BordroRecord {
  // İşten çıkmış personelin çıkış tarihinden sonraki dönemlerde bordrosu engellenir
  if (personel.end_date) {
    const exitPeriod = personel.end_date.slice(0, 7); // YYYY-MM
    if (puantaj.period > exitPeriod) {
      throw new Error(
        `${personel.full_name} (${personel.personel_no}) ${personel.end_date} tarihinde işten ayrılmıştır. ${puantaj.period} dönemi için bordro hesaplanamaz.`
      );
    }
  }

  let effectiveGrossWage = personel.wage_amount;
  if (personel.wage_calc_type === "NETTEN_BRUTE") {
    effectiveGrossWage = calculateNetToGross(personel.wage_amount, {
      period: puantaj.period,
      workedDays: puantaj.worked_days + puantaj.weekly_rest_days + puantaj.holiday_days + puantaj.paid_leave_days,
      overtimeHours150: puantaj.overtime_hours_150,
      overtimeHours200: puantaj.overtime_hours_200,
      cumulativeTaxBasePrevious,
      has5510Discount: personel.sgk_law_code === "05510",
      parameters,
    });
  }

  const effectiveWorkedDays =
    puantaj.worked_days + puantaj.weekly_rest_days + puantaj.holiday_days + puantaj.paid_leave_days;

  const calc = calculateGrossToNet({
    grossWage: effectiveGrossWage,
    period: puantaj.period,
    workedDays: effectiveWorkedDays,
    overtimeHours150: puantaj.overtime_hours_150,
    overtimeHours200: puantaj.overtime_hours_200,
    cumulativeTaxBasePrevious,
    has5510Discount: personel.sgk_law_code === "05510",
    parameters,
  });

  return {
    id: Date.now() + Math.floor(Math.random() * 1000),
    period: puantaj.period,
    personel_id: personel.id,
    personel_name: personel.full_name,
    personel_tc: personel.tc_kimlik_no.slice(0, 3) + "*****" + personel.tc_kimlik_no.slice(8),
    department: personel.department,
    job_title: personel.job_title,
    branch_name: personel.branch_name,
    wage_type: personel.wage_type,
    base_wage: personel.wage_amount,
    worked_days: effectiveWorkedDays,
    worked_hours: Math.round(effectiveWorkedDays * 7.5),
    normal_earning: roundMoney(toDecimal(effectiveGrossWage).div(30).mul(Math.min(effectiveWorkedDays, 30))).toNumber(),
    overtime_earning: roundMoney(
      toDecimal(effectiveGrossWage).div(225).mul(puantaj.overtime_hours_150 * 1.5 + puantaj.overtime_hours_200 * 2.0)
    ).toNumber(),
    holiday_earning: 0,
    bonus_earning: 0,
    gross_total: calc.grossTotal,
    sgk_base: calc.sgkBase,
    sgk_employee_share: calc.sgkEmployeeShare,
    unemployment_employee_share: calc.unemploymentEmployeeShare,
    income_tax_base: calc.incomeTaxBase,
    cumulative_income_tax_base: calc.cumulativeIncomeTaxBase,
    applicable_tax_bracket_rate: calc.topTaxRate,
    calculated_income_tax: calc.calculatedIncomeTax,
    asgari_ucret_gv_istisnasi: calc.asgariUcretGvIstisnasi,
    payable_income_tax: calc.payableIncomeTax,
    calculated_stamp_tax: calc.calculatedStampTax,
    asgari_ucret_dv_istisnasi: calc.asgariUcretDvIstisnasi,
    payable_stamp_tax: calc.payableStampTax,
    deductions_total: calc.deductionsTotal,
    net_payable: calc.netPayable,
    sgk_employer_share: calc.sgkEmployerShare,
    unemployment_employer_share: calc.unemploymentEmployerShare,
    sgk_incentive_discount: calc.sgkIncentiveDiscount,
    total_employer_cost: calc.totalEmployerCost,
    status: "TASLAK",
    revision_no: 1,
  };
}

/**
 * Bordro listesinden Türkiye Tekdüzen Hesap Planına (TDHP) uygun Yevmiye Fişi Taslağı Üretir.
 * 720 (Üretim İşçiliği) veya 770 (Yönetim Ücretleri) -> 335, 360, 361
 */
export function generatePayrollJournalVoucher(bordrolar: BordroRecord[]): {
  description: string;
  lines: Array<{
    account_code: string;
    account_name: string;
    debit: number;
    credit: number;
    description: string;
  }>;
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
} {
  let grossUretim = toDecimal(0);
  let grossYonetim = toDecimal(0);
  let sgkIsverenUretim = toDecimal(0);
  let sgkIsverenYonetim = toDecimal(0);
  let netPayableTotal = toDecimal(0);
  let taxPayableTotal = toDecimal(0);
  let sgkPayableTotal = toDecimal(0);

  for (const b of bordrolar) {
    const isUretim = b.department.toLowerCase().includes("üretim") || b.department.toLowerCase().includes("imalat");
    const netIsverenSgk = toDecimal(b.sgk_employer_share)
      .plus(b.unemployment_employer_share)
      .minus(b.sgk_incentive_discount);

    if (isUretim) {
      grossUretim = grossUretim.plus(b.gross_total);
      sgkIsverenUretim = sgkIsverenUretim.plus(netIsverenSgk);
    } else {
      grossYonetim = grossYonetim.plus(b.gross_total);
      sgkIsverenYonetim = sgkIsverenYonetim.plus(netIsverenSgk);
    }

    netPayableTotal = netPayableTotal.plus(b.net_payable);
    taxPayableTotal = taxPayableTotal.plus(b.payable_income_tax).plus(b.payable_stamp_tax);

    const totalSgkLiability = toDecimal(b.sgk_employee_share)
      .plus(b.unemployment_employee_share)
      .plus(b.sgk_employer_share)
      .plus(b.unemployment_employer_share)
      .minus(b.sgk_incentive_discount);

    sgkPayableTotal = sgkPayableTotal.plus(totalSgkLiability);
  }

  const lines = [];

  // BORÇ SATIRLARI
  if (grossUretim.gt(0)) {
    lines.push({
      account_code: "720.01.001",
      account_name: "Direkt İşçilik Ücret Giderleri",
      debit: roundMoney(grossUretim).toNumber(),
      credit: 0,
      description: "Üretim personeli brüt ücret tahakkuku",
    });
  }
  if (sgkIsverenUretim.gt(0)) {
    lines.push({
      account_code: "720.02.001",
      account_name: "Direkt İşçilik SGK İşveren Payı",
      debit: roundMoney(sgkIsverenUretim).toNumber(),
      credit: 0,
      description: "Üretim personeli SGK ve işsizlik işveren payı",
    });
  }
  if (grossYonetim.gt(0)) {
    lines.push({
      account_code: "770.01.001",
      account_name: "Genel Yönetim Personel Ücret Giderleri",
      debit: roundMoney(grossYonetim).toNumber(),
      credit: 0,
      description: "Yönetim/Ofis personeli brüt ücret tahakkuku",
    });
  }
  if (sgkIsverenYonetim.gt(0)) {
    lines.push({
      account_code: "770.02.001",
      account_name: "Genel Yönetim SGK İşveren Payı",
      debit: roundMoney(sgkIsverenYonetim).toNumber(),
      credit: 0,
      description: "Yönetim personeli SGK ve işsizlik işveren payı",
    });
  }

  // ALACAK SATIRLARI
  lines.push({
    account_code: "335.01.001",
    account_name: "Personele Borçlar (Net Ücretler)",
    debit: 0,
    credit: roundMoney(netPayableTotal).toNumber(),
    description: "Personele ödenecek net ücret tahakkuku",
  });

  lines.push({
    account_code: "360",
    account_name: "Ödenecek Vergi ve Fonlar",
    debit: 0,
    credit: roundMoney(taxPayableTotal).toNumber(),
    description: "Ödenecek gelir ve damga vergisi. 360.01 KDV tevkifat hesabı değildir.",
  });

  lines.push({
    account_code: "361.01.001",
    account_name: "Ödenecek Sosyal Güvenlik Kesintileri",
    debit: 0,
    credit: roundMoney(sgkPayableTotal).toNumber(),
    description: "SGK işçi + işveren + işsizlik prim tahakkuku",
  });

  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
  const diff = Math.abs(totalDebit - totalCredit);
  const isBalanced = diff < 0.01;

  return {
    description: `${bordrolar[0]?.period || ""} Dönemi Personel Bordro Tahakkuk Fişi`,
    lines,
    totalDebit: roundMoney(totalDebit).toNumber(),
    totalCredit: roundMoney(totalCredit).toNumber(),
    isBalanced,
  };
}
