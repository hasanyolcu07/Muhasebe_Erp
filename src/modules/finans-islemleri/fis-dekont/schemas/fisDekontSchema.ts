import { z } from "zod";
import type { FisTypeCode } from "../constants/fisTypes";

export const voucherLineSchema = z.object({
  account_id: z.number().nullable().optional(),
  counter_account_label: z.string().optional(),
  description: z.string().optional(),
  debit: z.coerce.number().min(0),
  credit: z.coerce.number().min(0),
  currency_id: z.number().nullable().optional(),
  exchange_rate: z.coerce.number().positive().optional(),
  payment_plan: z.string().optional(),
  coa_id: z.number().nullable().optional(),
});

export const fisDekontFormSchema = z
  .object({
    branch_id: z.number(),
    record_type_id: z.number(),
    voucher_type: z.string(),
    fis_no: z.string().optional(),
    document_no: z.string().optional(),
    voucher_date: z.string().min(1, "Tarih zorunludur"),
    voucher_time: z.string().optional(),
    description: z.string().min(1, "Fiş açıklaması zorunludur"),
    cash_account_id: z.number().nullable().optional(),
    bank_account_id: z.number().nullable().optional(),
    currency_id: z.number().nullable().optional(),
    exchange_rate: z.coerce.number().positive().optional(),
    document_type: z.string().optional(),
    type_specific: z.record(z.string(), z.unknown()).optional(),
    lines: z.array(voucherLineSchema).min(1, "En az bir kalem satırı gerekir"),
  })
  .superRefine((data, ctx) => {
    const totalDebit = data.lines.reduce((s, l) => s + Number(l.debit || 0), 0);
    const totalCredit = data.lines.reduce((s, l) => s + Number(l.credit || 0), 0);
    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Fiş dengeli değil: Borç ${totalDebit.toFixed(2)} ≠ Alacak ${totalCredit.toFixed(2)}`,
        path: ["lines"],
      });
    }
    if (totalDebit <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Toplam tutar sıfırdan büyük olmalıdır",
        path: ["lines"],
      });
    }
    const kasaTypes = ["TAH", "ODM", "NT", "NO"];
    if (kasaTypes.includes(data.voucher_type) && !data.cash_account_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Kasa seçimi zorunludur",
        path: ["cash_account_id"],
      });
    }
    const posTypes = ["KK", "KI", "IK", "II", "SK"];
    if (posTypes.includes(data.voucher_type) && !data.bank_account_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Banka/POS seçimi zorunludur",
        path: ["bank_account_id"],
      });
    }
  });

export type FisDekontFormValues = z.infer<typeof fisDekontFormSchema>;
export type VoucherLineValues = z.infer<typeof voucherLineSchema>;

export function emptyLine(partial?: Partial<VoucherLineValues>): VoucherLineValues {
  return {
    account_id: null,
    counter_account_label: "",
    description: "",
    debit: 0,
    credit: 0,
    exchange_rate: 1,
    payment_plan: "",
    ...partial,
  };
}

export function emptyFisForm(
  branchId: number,
  recordTypeId: number,
  voucherType: FisTypeCode = "TAH"
): FisDekontFormValues {
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date().toTimeString().slice(0, 8);
  return {
    branch_id: branchId,
    record_type_id: recordTypeId,
    voucher_type: voucherType,
    fis_no: "",
    document_no: "",
    voucher_date: today,
    voucher_time: now,
    description: "",
    cash_account_id: null,
    bank_account_id: null,
    exchange_rate: 1,
    document_type: "",
    type_specific: {},
    lines: [emptyLine({ credit: 0, debit: 0 })],
  };
}

export function buildBalancedLinesForType(
  voucherType: FisTypeCode,
  amount: number,
  accountId: number | null,
  isCreditSide: boolean
): VoucherLineValues[] {
  const amt = Math.abs(amount);
  if (["AF", "OF", "VF", "AD", "BD", "KF"].includes(voucherType)) {
    return [
      emptyLine({ account_id: accountId, debit: isCreditSide ? 0 : amt, credit: isCreditSide ? amt : 0 }),
      emptyLine({ debit: isCreditSide ? amt : 0, credit: isCreditSide ? 0 : amt, description: "Karşı hesap" }),
    ];
  }
  const creditTypes = ["ODM", "NO", "BD", "KI", "II", "SK"];
  const creditFirst = creditTypes.includes(voucherType);
  return [
    emptyLine({
      account_id: accountId,
      debit: creditFirst ? amt : 0,
      credit: creditFirst ? 0 : amt,
      description: "Cari hareket",
    }),
    emptyLine({
      debit: creditFirst ? 0 : amt,
      credit: creditFirst ? amt : 0,
      description: "Karşı hesap",
    }),
  ];
}
