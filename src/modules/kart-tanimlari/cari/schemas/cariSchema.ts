import { z } from "zod";

const blockAction = z.enum(["CONTINUE", "WARN", "STOP"]);

export const cariContactSchema = z.object({
  id: z.number().optional().nullable(),
  full_name: z.string().min(1, "Ad soyad zorunlu"),
  title: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email("Geçerli e-posta girin").optional().nullable().or(z.literal("")),
});

export const cariBankSchema = z.object({
  id: z.number().optional().nullable(),
  bank_name: z.string().min(1, "Banka adı zorunlu"),
  branch_name: z.string().optional().nullable(),
  iban: z.string().min(10, "Geçerli IBAN girin"),
  currency_id: z.number().optional().nullable(),
  is_default: z.boolean().default(false),
});

export const cariAddressSchema = z.object({
  id: z.number().optional().nullable(),
  address_type: z.string().default("SEVKIYAT"),
  city: z.string().optional().nullable(),
  district: z.string().optional().nullable(),
  street: z.string().optional().nullable(),
  postal_code: z.string().optional().nullable(),
  country: z.string().default("Türkiye"),
  is_default: z.boolean().default(false),
});

export const cariGibSchema = z.object({
  id: z.number().optional().nullable(),
  mailbox_type: z.enum(["GB", "PK"]),
  alias: z.string().optional().nullable(),
  label: z.string().optional().nullable(),
  scenario: z.string().optional().nullable(),
  is_default: z.boolean().default(false),
});

export const cariDocumentSchema = z.object({
  id: z.number().optional().nullable(),
  doc_type: z.string().optional().nullable(),
  file_name: z.string().min(1, "Dosya adı zorunlu"),
  file_path: z.string().optional().nullable(),
});

export const cariNoteSchema = z.object({
  id: z.number().optional().nullable(),
  note_date: z.string().optional().nullable(),
  note_text: z.string().min(1, "Not metni zorunlu"),
  remind_at: z.string().optional().nullable(),
});

export const cariRiskSchema = z.object({
  credit_limit: z.number().min(0).default(0),
  collateral_total: z.number().min(0).default(0),
  risk_factor: z.number().min(0).default(1),
  risk_group: z.string().optional().nullable(),
  overdue_days: z.number().min(0).default(0),
  risk_currency_mode: z.enum(["LOCAL", "TRANSACTION"]).default("LOCAL"),
  risk_control_mode: z.enum(["BALANCE", "TOTALS"]).default("BALANCE"),
  block_on_order: blockAction.default("WARN"),
  block_on_dispatch: blockAction.default("WARN"),
  block_on_invoice: blockAction.default("STOP"),
  notes: z.string().optional().nullable(),
});

export const cariParametersSchema = z.object({
  partial_shipment: z.boolean().default(true),
  invoice_copies: z.number().min(1).default(1),
  dispatch_copies: z.number().min(1).default(1),
  usage_purchase: z.boolean().default(true),
  usage_sales: z.boolean().default(true),
  usage_finance: z.boolean().default(true),
  due_tracking_mode: z.string().default("ALL"),
  aging_days: z.number().min(0).default(30),
  due_exceeded_action: blockAction.default("WARN"),
  custom_code_1: z.string().optional().nullable(),
  custom_code_2: z.string().optional().nullable(),
  custom_code_3: z.string().optional().nullable(),
  custom_code_4: z.string().optional().nullable(),
  custom_code_5: z.string().optional().nullable(),
  group_code: z.string().optional().nullable(),
  dispatch_send_channel: z.string().default("EMAIL"),
  dispatch_send_format: z.string().default("HTML"),
  order_send_channel: z.string().default("EMAIL"),
  order_send_format: z.string().default("HTML"),
  invoice_send_channel: z.string().default("EMAIL"),
  invoice_send_format: z.string().default("PDF"),
  invoice_design: z.string().optional().nullable(),
  dispatch_design: z.string().optional().nullable(),
});

export const cariIntegrationSchema = z.object({
  ecommerce_platform: z.string().optional().nullable(),
  ecommerce_store_url: z.string().optional().nullable(),
  crm_provider: z.string().optional().nullable(),
  crm_external_id: z.string().optional().nullable(),
  extra: z.record(z.string(), z.unknown()).default({}),
});

export const cariFormSchema = z.object({
  branch_id: z.number().min(1, "Şube seçin"),
  record_type_id: z.number().min(1, "Kayıt türü seçin"),
  code: z.string().min(1, "Cari kodu zorunlu").max(50),
  title: z.string().min(1, "Cari ünvanı zorunlu").max(255),
  account_type: z.enum(["MUSTERI_TEDARIKCI", "ALICI", "SATICI"]).default("MUSTERI_TEDARIKCI"),
  tax_number: z.string().optional().nullable(),
  tax_office: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email("Geçerli e-posta").optional().nullable().or(z.literal("")),
  city: z.string().optional().nullable(),
  district: z.string().optional().nullable(),
  neighborhood: z.string().optional().nullable(),
  address_line: z.string().optional().nullable(),
  country: z.string().default("Türkiye"),
  building_name: z.string().optional().nullable(),
  block_name: z.string().optional().nullable(),
  currency_id: z.number().optional().nullable(),
  coa_id: z.number().optional().nullable(),
  is_efatura: z.boolean().default(false),
  is_eirsaliye: z.boolean().default(false),
  is_passive: z.boolean().default(false),
  discount_rate: z.number().min(0).max(100).default(0),
  payment_days: z.number().min(0).default(0),
  opening_balance: z.number().default(0),
  opening_side: z.enum(["BORC", "ALACAK"]).default("BORC"),
  price_list_ids: z.array(z.number()).default([]),
  contacts: z.array(cariContactSchema).default([]),
  banks: z.array(cariBankSchema).default([]),
  addresses: z.array(cariAddressSchema).default([]),
  gib_mailboxes: z.array(cariGibSchema).default([]),
  documents: z.array(cariDocumentSchema).default([]),
  notes: z.array(cariNoteSchema).default([]),
  risk: cariRiskSchema.optional().nullable(),
  parameters: cariParametersSchema,
  integration: cariIntegrationSchema,
});

export type CariFormValues = z.infer<typeof cariFormSchema>;

export function emptyCariForm(
  branchId: number,
  recordTypeId: number,
  nextCode = ""
): CariFormValues {
  return {
    branch_id: branchId,
    record_type_id: recordTypeId,
    code: nextCode,
    title: "",
    account_type: "MUSTERI_TEDARIKCI",
    tax_number: "",
    tax_office: "",
    phone: "",
    email: "",
    city: "",
    district: "",
    neighborhood: "",
    address_line: "",
    country: "Türkiye",
    building_name: "",
    block_name: "",
    currency_id: null,
    coa_id: null,
    is_efatura: false,
    is_eirsaliye: false,
    is_passive: false,
    discount_rate: 0,
    payment_days: 30,
    opening_balance: 0,
    opening_side: "BORC",
    price_list_ids: [],
    contacts: [],
    banks: [],
    addresses: [],
    gib_mailboxes: [],
    documents: [],
    notes: [],
    risk: {
      credit_limit: 0,
      collateral_total: 0,
      risk_factor: 1,
      risk_group: "",
      overdue_days: 0,
      risk_currency_mode: "LOCAL",
      risk_control_mode: "BALANCE",
      block_on_order: "WARN",
      block_on_dispatch: "WARN",
      block_on_invoice: "STOP",
      notes: "",
    },
    parameters: {
      partial_shipment: true,
      invoice_copies: 1,
      dispatch_copies: 1,
      usage_purchase: true,
      usage_sales: true,
      usage_finance: true,
      due_tracking_mode: "ALL",
      aging_days: 30,
      due_exceeded_action: "WARN",
      custom_code_1: "",
      custom_code_2: "",
      custom_code_3: "",
      custom_code_4: "",
      custom_code_5: "",
      group_code: "",
      dispatch_send_channel: "EMAIL",
      dispatch_send_format: "HTML",
      order_send_channel: "EMAIL",
      order_send_format: "HTML",
      invoice_send_channel: "EMAIL",
      invoice_send_format: "PDF",
      invoice_design: "",
      dispatch_design: "",
    },
    integration: {
      ecommerce_platform: "",
      ecommerce_store_url: "",
      crm_provider: "",
      crm_external_id: "",
      extra: {},
    },
  };
}

export function detailToFormValues(detail: Record<string, unknown>): CariFormValues {
  const parsed = cariFormSchema.safeParse({
    ...detail,
    email: detail.email || "",
    risk: detail.risk ?? emptyCariForm(1, 1).risk,
    parameters: detail.parameters ?? {},
    integration: detail.integration ?? {},
  });
  if (parsed.success) return parsed.data;
  return emptyCariForm(
    Number(detail.branch_id) || 1,
    Number(detail.record_type_id) || 1,
    String(detail.code || "")
  );
}
