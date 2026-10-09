import { z } from "zod";

export type CashTxnType = "TAHSILAT" | "ODEME" | "VIRMAN";

export const TXN_TYPE_OPTIONS: { value: CashTxnType; label: string; color: string }[] = [
  { value: "TAHSILAT", label: "Tahsilat (Giriş)", color: "#10b981" },
  { value: "ODEME", label: "Ödeme (Çıkış)", color: "#ef4444" },
  { value: "VIRMAN", label: "Kasa Virman / Transfer", color: "#2563eb" },
];

export const kasaIslemFormSchema = z
  .object({
    branch_id: z.number({ message: "Şube zorunludur" }),
    record_type_id: z.number({ message: "Kayıt türü zorunludur" }),
    txn_type: z.enum(["TAHSILAT", "ODEME", "VIRMAN"]),
    txn_date: z.string().min(1, "Tarih zorunludur"),
    cash_account_id: z.coerce.number().int().positive("Kasa seçimi zorunludur"),
    target_cash_account_id: z.number().nullable().optional(),
    amount: z.coerce.number().positive("Tutar sıfırdan büyük olmalıdır"),
    description: z.string().trim().min(1, "Açıklama zorunludur"),
    account_id: z.number().nullable().optional(),
    invoice_id: z.number().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.txn_type === "VIRMAN") {
      if (!data.target_cash_account_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Virman işleminde hedef kasa zorunludur",
          path: ["target_cash_account_id"],
        });
      } else if (data.target_cash_account_id === data.cash_account_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Kaynak ve hedef kasa aynı olamaz",
          path: ["target_cash_account_id"],
        });
      }
    }
  });

export type KasaIslemFormValues = z.infer<typeof kasaIslemFormSchema>;

export function emptyKasaIslemForm(
  branchId: number,
  recordTypeId: number,
  txnType: CashTxnType = "TAHSILAT"
): KasaIslemFormValues {
  const today = new Date().toISOString().slice(0, 10);
  return {
    branch_id: branchId,
    record_type_id: recordTypeId,
    txn_type: txnType,
    txn_date: today,
    cash_account_id: 0,
    target_cash_account_id: null,
    amount: 0,
    description: "",
    account_id: null,
    invoice_id: null,
  };
}

export function formatMoney(n: number): string {
  return n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
