import { z } from "zod";

export type BankTxnType =
  | "HAVALE_EFT"
  | "POS_TAHSILAT"
  | "POS_BLOKE_COZUMU"
  | "VIRMAN"
  | "KUR_FARKI"
  | "BANKA_MASRAFI"
  | "CEK_TAHSIL_TEDIYE";

export type BankTxnDirection = "GELEN" | "GIDEN";
export type KurFarkiType = "GELIR" | "GIDER";

export const TXN_TYPE_OPTIONS: {
  value: BankTxnType;
  label: string;
  color: string;
  shortLabel: string;
}[] = [
  { value: "HAVALE_EFT", label: "Havale / EFT", shortLabel: "Havale/EFT", color: "#2563eb" },
  { value: "POS_TAHSILAT", label: "POS Tahsilat", shortLabel: "POS Tahsilat", color: "#10b981" },
  { value: "POS_BLOKE_COZUMU", label: "POS Bloke Çözümü", shortLabel: "POS Bloke", color: "#047857" },
  { value: "VIRMAN", label: "Banka Virman", shortLabel: "Virman", color: "#92400e" },
  { value: "KUR_FARKI", label: "Kur Farkı", shortLabel: "Kur Farkı", color: "#7c3aed" },
  { value: "BANKA_MASRAFI", label: "Banka Masrafı", shortLabel: "Masraf", color: "#ef4444" },
  { value: "CEK_TAHSIL_TEDIYE", label: "Çek Tahsil / Tediye", shortLabel: "Çek", color: "#0ea5e9" },
];

export const bankIslemFormSchema = z
  .object({
    branch_id: z.number({ message: "Şube zorunludur" }),
    record_type_id: z.number({ message: "Kayıt türü zorunludur" }),
    txn_type: z.enum([
      "HAVALE_EFT",
      "POS_TAHSILAT",
      "POS_BLOKE_COZUMU",
      "VIRMAN",
      "KUR_FARKI",
      "BANKA_MASRAFI",
      "CEK_TAHSIL_TEDIYE",
    ]),
    txn_date: z.string().min(1, "Tarih zorunludur"),
    bank_account_id: z.coerce.number().int().positive("Banka hesabı seçimi zorunludur"),
    target_bank_account_id: z.number().nullable().optional(),
    amount: z.coerce.number().positive("Tutar sıfırdan büyük olmalıdır"),
    description: z.string().trim().min(1, "Açıklama zorunludur"),
    account_id: z.number().nullable().optional(),
    direction: z.enum(["GELEN", "GIDEN"]).nullable().optional(),
    document_no: z.string().nullable().optional(),
    check_ref: z.string().nullable().optional(),
    pos_batch_no: z.string().nullable().optional(),
    commission_amount: z.coerce.number().nullable().optional(),
    currency_id: z.number().nullable().optional(),
    exchange_rate: z.coerce.number().nullable().optional(),
    foreign_amount: z.coerce.number().nullable().optional(),
    kur_farki_type: z.enum(["GELIR", "GIDER"]).nullable().optional(),
    check_bond_id: z.number().nullable().optional(),
    coa_id: z.number().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.txn_type === "HAVALE_EFT" || data.txn_type === "CEK_TAHSIL_TEDIYE") {
      if (!data.direction) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "İşlem yönü (Gelen/Giden) zorunludur",
          path: ["direction"],
        });
      }
    }
    if (data.txn_type === "VIRMAN") {
      if (!data.target_bank_account_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Virman işleminde hedef banka zorunludur",
          path: ["target_bank_account_id"],
        });
      } else if (data.target_bank_account_id === data.bank_account_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Kaynak ve hedef banka aynı olamaz",
          path: ["target_bank_account_id"],
        });
      }
    }
    if (data.txn_type === "KUR_FARKI") {
      if (!data.kur_farki_type) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Kur farkı gelir/gider tipi zorunludur",
          path: ["kur_farki_type"],
        });
      }
      if (!data.exchange_rate || data.exchange_rate <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Döviz kuru zorunludur",
          path: ["exchange_rate"],
        });
      }
    }
    if (data.txn_type === "CEK_TAHSIL_TEDIYE" && !data.check_bond_id && !data.check_ref?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Çek seçimi zorunludur",
        path: ["check_bond_id"],
      });
    }
    if (data.commission_amount != null && data.commission_amount >= data.amount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Komisyon tutarı işlem tutarından küçük olmalıdır",
        path: ["commission_amount"],
      });
    }
  });

export type BankIslemFormValues = z.infer<typeof bankIslemFormSchema>;

export function emptyBankIslemForm(
  branchId: number,
  recordTypeId: number,
  txnType: BankTxnType = "HAVALE_EFT"
): BankIslemFormValues {
  const today = new Date().toISOString().slice(0, 10);
  return {
    branch_id: branchId,
    record_type_id: recordTypeId,
    txn_type: txnType,
    txn_date: today,
    bank_account_id: 0,
    target_bank_account_id: null,
    amount: 0,
    description: "",
    account_id: null,
    direction: txnType === "HAVALE_EFT" || txnType === "CEK_TAHSIL_TEDIYE" ? "GELEN" : null,
    document_no: null,
    check_ref: null,
    pos_batch_no: null,
    commission_amount: null,
    currency_id: null,
    exchange_rate: null,
    foreign_amount: null,
    kur_farki_type: txnType === "KUR_FARKI" ? "GELIR" : null,
    check_bond_id: null,
    coa_id: null,
  };
}

export function formatMoney(n: number): string {
  return n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function needsDirection(txnType: BankTxnType): boolean {
  return txnType === "HAVALE_EFT" || txnType === "CEK_TAHSIL_TEDIYE";
}

export function needsTargetBank(txnType: BankTxnType): boolean {
  return txnType === "VIRMAN";
}

export function needsKurFarkiFields(txnType: BankTxnType): boolean {
  return txnType === "KUR_FARKI";
}

export function needsCheckRef(txnType: BankTxnType): boolean {
  return txnType === "CEK_TAHSIL_TEDIYE";
}

export function needsPosFields(txnType: BankTxnType): boolean {
  return txnType === "POS_TAHSILAT" || txnType === "POS_BLOKE_COZUMU";
}
