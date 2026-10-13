export type InvoiceTypeCode =
  | "SATIS"
  | "ALIS"
  | "IADE_SATIS"
  | "IADE_ALIS"
  | "IHRACAT"
  | "ITHALAT"
  | "PROFORMA";

export type InvoiceTypeDef = {
  code: InvoiceTypeCode;
  label: string;
  pillLabel: string;
  icon: string;
  variant: "green" | "red" | "blue" | "amber" | "default";
  documentType: string;
};

export const INVOICE_TYPES: InvoiceTypeDef[] = [
  { code: "SATIS", label: "Satış Faturası", pillLabel: "Satış", icon: "🟢", variant: "green", documentType: "FAT_SATIS" },
  { code: "ALIS", label: "Alış Faturası", pillLabel: "Alış", icon: "🔴", variant: "red", documentType: "FAT_ALIS" },
  { code: "IADE_SATIS", label: "İade Satış", pillLabel: "İade Satış", icon: "↩️", variant: "amber", documentType: "FAT_IADE_SATIS" },
  { code: "IADE_ALIS", label: "İade Alış", pillLabel: "İade Alış", icon: "↩️", variant: "amber", documentType: "FAT_IADE_ALIS" },
  { code: "IHRACAT", label: "İhracat", pillLabel: "İhracat", icon: "🌍", variant: "blue", documentType: "FAT_IHRACAT" },
  { code: "ITHALAT", label: "İthalat", pillLabel: "İthalat", icon: "📦", variant: "blue", documentType: "FAT_ITHALAT" },
  { code: "PROFORMA", label: "Proforma", pillLabel: "Proforma", icon: "📄", variant: "default", documentType: "FAT_PROFORMA" },
];

export function getInvoiceType(code: string): InvoiceTypeDef | undefined {
  return INVOICE_TYPES.find((t) => t.code === code);
}

export function parseInitialInvoiceType(search: URLSearchParams): InvoiceTypeCode {
  const t = (search.get("type") || "SATIS").toUpperCase();
  return (INVOICE_TYPES.some((x) => x.code === t) ? t : "SATIS") as InvoiceTypeCode;
}

export function formatMoney(value: number, currency = "₺"): string {
  return `${value.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}
