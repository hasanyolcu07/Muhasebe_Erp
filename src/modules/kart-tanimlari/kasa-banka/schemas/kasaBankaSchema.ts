import { z } from "zod";

export type KasaBankaTab = "kasa" | "banka";

export const posInfoSchema = z.object({
  pos_enabled: z.boolean().default(false),
  pos_terminal_id: z.string().max(80).optional().nullable(),
  virtual_pos_merchant_id: z.string().max(80).optional().nullable(),
  virtual_pos_api_key: z.string().max(255).optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const kasaFormSchema = z.object({
  branch_id: z.number().int().min(1),
  record_type_id: z.number().int().min(1),
  code: z.string().min(1, "Kasa kodu zorunlu").max(32),
  name: z.string().min(1, "Kasa adı zorunlu").max(150),
  currency_id: z.number().int().nullable().optional(),
  responsible_user_id: z.number().int().nullable().optional(),
  opening_balance: z.coerce.number().default(0),
  coa_id: z.number().int().nullable().optional(),
  is_passive: z.boolean().default(false),
});

export const bankaFormSchema = z.object({
  branch_id: z.number().int().min(1),
  record_type_id: z.number().int().min(1),
  code: z.string().min(1, "Banka kodu zorunlu").max(32),
  name: z.string().min(1, "Hesap adı zorunlu").max(150),
  bank_name: z.string().min(1, "Banka adı zorunlu").max(150),
  branch_name: z.string().max(150).optional().nullable(),
  account_no: z.string().max(50).optional().nullable(),
  iban: z.string().min(10, "IBAN zorunlu").max(34),
  currency_id: z.number().int().nullable().optional(),
  opening_balance: z.coerce.number().default(0),
  coa_id: z.number().int().nullable().optional(),
  pos_info: posInfoSchema.default({ pos_enabled: false }),
  is_passive: z.boolean().default(false),
});

export type KasaFormValues = z.infer<typeof kasaFormSchema>;
export type BankaFormValues = z.infer<typeof bankaFormSchema>;

export function emptyKasaForm(branchId: number, recordTypeId: number): KasaFormValues {
  return {
    branch_id: branchId,
    record_type_id: recordTypeId,
    code: "",
    name: "",
    currency_id: null,
    responsible_user_id: null,
    opening_balance: 0,
    coa_id: null,
    is_passive: false,
  };
}

export function emptyBankaForm(branchId: number, recordTypeId: number): BankaFormValues {
  return {
    branch_id: branchId,
    record_type_id: recordTypeId,
    code: "",
    name: "",
    bank_name: "Garanti BBVA",
    branch_name: "",
    account_no: "",
    iban: "",
    currency_id: null,
    opening_balance: 0,
    coa_id: null,
    pos_info: { pos_enabled: false, pos_terminal_id: "", virtual_pos_merchant_id: "", virtual_pos_api_key: "", notes: "" },
    is_passive: false,
  };
}

export function kasaDetailToForm(d: Record<string, unknown>): KasaFormValues {
  return {
    branch_id: Number(d.branch_id),
    record_type_id: Number(d.record_type_id),
    code: String(d.code ?? ""),
    name: String(d.name ?? ""),
    currency_id: d.currency_id != null ? Number(d.currency_id) : null,
    responsible_user_id: d.responsible_user_id != null ? Number(d.responsible_user_id) : null,
    opening_balance: Number(d.opening_balance ?? 0),
    coa_id: d.coa_id != null ? Number(d.coa_id) : null,
    is_passive: Boolean(d.is_passive),
  };
}

export function bankaDetailToForm(d: Record<string, unknown>): BankaFormValues {
  const pos = (d.pos_info as Record<string, unknown>) || {};
  return {
    branch_id: Number(d.branch_id),
    record_type_id: Number(d.record_type_id),
    code: String(d.code ?? ""),
    name: String(d.name ?? ""),
    bank_name: String(d.bank_name ?? ""),
    branch_name: d.branch_name != null ? String(d.branch_name) : "",
    account_no: d.account_no != null ? String(d.account_no) : "",
    iban: String(d.iban ?? ""),
    currency_id: d.currency_id != null ? Number(d.currency_id) : null,
    opening_balance: Number(d.opening_balance ?? 0),
    coa_id: d.coa_id != null ? Number(d.coa_id) : null,
    pos_info: {
      pos_enabled: Boolean(pos.pos_enabled),
      pos_terminal_id: pos.pos_terminal_id != null ? String(pos.pos_terminal_id) : "",
      virtual_pos_merchant_id: pos.virtual_pos_merchant_id != null ? String(pos.virtual_pos_merchant_id) : "",
      virtual_pos_api_key: pos.virtual_pos_api_key != null ? String(pos.virtual_pos_api_key) : "",
      notes: pos.notes != null ? String(pos.notes) : "",
    },
    is_passive: Boolean(d.is_passive),
  };
}

export const BANK_OPTIONS = [
  "Garanti BBVA",
  "Akbank",
  "İş Bankası",
  "Yapı Kredi",
  "Ziraat Bankası",
  "Halkbank",
  "QNB Finansbank",
  "Denizbank",
  "TEB",
  "Vakıfbank",
];
