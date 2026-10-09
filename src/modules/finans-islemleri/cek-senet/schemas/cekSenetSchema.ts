import { z } from "zod";

export type InstrumentType = "CEK" | "SENET";
export type Direction = "ALINAN" | "VERILEN";

export type AlinanTxnType =
  | "PORTFOY_GIRIS"
  | "CIRO"
  | "PORTFOY_TAHSIL"
  | "IADE_KARSILIKSIZ"
  | "BANKA_TAHSIL"
  | "BANKA_TEMINATA"
  | "BANKADAN_PORTFOY_IADE"
  | "BANKADAN_KARSILIKSIZ"
  | "CIRODAN_PORTFOYE_IADE";

export type VerilenTxnType =
  | "CEK_SENET_CIKIS"
  | "MUSTERIDEN_PORTFOYE_IADE"
  | "MUSTERIDE_ELDEN_TAHSIL";

export type CekSenetTxnType = AlinanTxnType | VerilenTxnType;

export const ALINAN_TXN_OPTIONS: { value: AlinanTxnType; label: string }[] = [
  { value: "PORTFOY_GIRIS", label: "Portföy Giriş (Cari Hesaptan)" },
  { value: "CIRO", label: "Ciro (Herhangi bir Cari Hesaba)" },
  { value: "PORTFOY_TAHSIL", label: "Portföyden Tahsil (Banka/Kasa)" },
  { value: "IADE_KARSILIKSIZ", label: "İade / Karşılıksız" },
  { value: "BANKA_TAHSIL", label: "Banka Tahsil" },
  { value: "BANKA_TEMINATA", label: "Banka Teminata" },
  { value: "BANKADAN_PORTFOY_IADE", label: "Bankadan Portföy İade" },
  { value: "BANKADAN_KARSILIKSIZ", label: "Bankadan Karşılıksız" },
  { value: "CIRODAN_PORTFOYE_IADE", label: "Cirodan Portföye İade/Karşılıksız" },
];

export const VERILEN_TXN_OPTIONS: { value: VerilenTxnType; label: string }[] = [
  { value: "CEK_SENET_CIKIS", label: "Çek/Senet Çıkış (Cari Hesaba)" },
  { value: "MUSTERIDEN_PORTFOYE_IADE", label: "Müşteriden Portföye İade" },
  { value: "MUSTERIDE_ELDEN_TAHSIL", label: "Müşteride Elden Tahsil" },
];

export const STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  PORTFOY: { label: "Portföyde", color: "#1d4ed8", bg: "#dbeafe" },
  CIRO: { label: "Ciro", color: "#7c3aed", bg: "#ede9fe" },
  TAHSIL: { label: "Tahsil", color: "#047857", bg: "#d1fae5" },
  IADE: { label: "İade", color: "#92400e", bg: "#fef3c7" },
  KARSILIKSIZ: { label: "Karşılıksız", color: "#b91c1c", bg: "#fee2e2" },
  TEMINATTA: { label: "Teminatta", color: "#0e7490", bg: "#cffafe" },
  BANKADA: { label: "Bankada", color: "#0369a1", bg: "#e0f2fe" },
  VERILDI: { label: "Verildi", color: "#c2410c", bg: "#ffedd5" },
};

export const cekSenetTxnSchema = z
  .object({
    branch_id: z.number({ message: "Şube zorunludur" }),
    record_type_id: z.number({ message: "Kayıt türü zorunludur" }),
    transaction_type: z.string().min(1),
    transaction_date: z.string().min(1, "Tarih zorunludur"),
    amount: z.coerce.number().positive("Tutar sıfırdan büyük olmalıdır"),
    description: z.string().trim().min(1, "Açıklama zorunludur"),
    check_bond_id: z.number().nullable().optional(),
    instrument_type: z.enum(["CEK", "SENET"]).nullable().optional(),
    direction: z.enum(["ALINAN", "VERILEN"]).nullable().optional(),
    document_no: z.string().nullable().optional(),
    due_date: z.string().nullable().optional(),
    currency_id: z.number().nullable().optional(),
    account_id: z.number().nullable().optional(),
    target_account_id: z.number().nullable().optional(),
    bank_account_id: z.number().nullable().optional(),
    cash_account_id: z.number().nullable().optional(),
    is_bounced: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    const txn = data.transaction_type;
    const isEntry = txn === "PORTFOY_GIRIS" || txn === "CEK_SENET_CIKIS";
    if (isEntry) {
      if (!data.instrument_type) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enstrüman türü zorunludur", path: ["instrument_type"] });
      }
      if (!data.direction) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Yön zorunludur", path: ["direction"] });
      }
      if (!data.document_no?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Seri/No zorunludur", path: ["document_no"] });
      }
      if (!data.account_id) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Cari hesap zorunludur", path: ["account_id"] });
      }
    } else if (!data.check_bond_id) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Çek/senet seçimi zorunludur", path: ["check_bond_id"] });
    }
    if (txn === "CIRO" && !data.target_account_id) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Ciro hedef cari zorunludur", path: ["target_account_id"] });
    }
    if (txn === "PORTFOY_TAHSIL" && !data.bank_account_id && !data.cash_account_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Banka veya kasa seçimi zorunludur",
        path: ["bank_account_id"],
      });
    }
    if (["BANKA_TAHSIL", "BANKA_TEMINATA", "BANKADAN_PORTFOY_IADE", "BANKADAN_KARSILIKSIZ"].includes(txn) && !data.bank_account_id) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Banka hesabı zorunludur", path: ["bank_account_id"] });
    }
  });

export type CekSenetTxnFormValues = z.infer<typeof cekSenetTxnSchema>;

export function emptyTxnForm(
  branchId: number,
  recordTypeId: number,
  txnType: CekSenetTxnType,
  direction: Direction
): CekSenetTxnFormValues {
  const today = new Date().toISOString().slice(0, 10);
  return {
    branch_id: branchId,
    record_type_id: recordTypeId,
    transaction_type: txnType,
    transaction_date: today,
    amount: 0,
    description: "",
    check_bond_id: null,
    instrument_type: "CEK",
    direction,
    document_no: "",
    due_date: today,
    currency_id: null,
    account_id: null,
    target_account_id: null,
    bank_account_id: null,
    cash_account_id: null,
    is_bounced: false,
  };
}

export function needsExistingCheck(txnType: string): boolean {
  return txnType !== "PORTFOY_GIRIS" && txnType !== "CEK_SENET_CIKIS";
}

export function needsTargetCari(txnType: string): boolean {
  return txnType === "CIRO";
}

export function needsBankOrCash(txnType: string): boolean {
  return txnType === "PORTFOY_TAHSIL";
}

export function needsBank(txnType: string): boolean {
  return ["BANKA_TAHSIL", "BANKA_TEMINATA", "BANKADAN_PORTFOY_IADE", "BANKADAN_KARSILIKSIZ"].includes(txnType);
}

export function needsBouncedFlag(txnType: string): boolean {
  return ["IADE_KARSILIKSIZ", "BANKADAN_KARSILIKSIZ", "CIRODAN_PORTFOYE_IADE"].includes(txnType);
}

export function isEntryTxn(txnType: string): boolean {
  return txnType === "PORTFOY_GIRIS" || txnType === "CEK_SENET_CIKIS";
}
