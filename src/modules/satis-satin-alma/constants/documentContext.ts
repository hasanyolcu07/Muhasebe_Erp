import type { InvoiceTypeCode } from "../fatura/constants/invoiceTypes";
import { INVOICE_TYPES } from "../fatura/constants/invoiceTypes";
import type { WaybillTypeCode } from "../irsaliye/constants/dispatchTypes";
import { WAYBILL_TYPES } from "../irsaliye/constants/dispatchTypes";

export type DocumentSide = "sales" | "purchase";

export type DocumentModule = "fatura" | "irsaliye";

export const SALES_INVOICE_TYPES: InvoiceTypeCode[] = ["SATIS", "IADE_SATIS", "IHRACAT", "PROFORMA"];
export const PURCHASE_INVOICE_TYPES: InvoiceTypeCode[] = ["ALIS", "IADE_ALIS", "ITHALAT", "PROFORMA"];

/** Satış tarafı irsaliye: çıkış + iade */
export const SALES_WAYBILL_TYPES: WaybillTypeCode[] = ["SATIS", "IADE"];
/** Alış tarafı irsaliye: giriş + iade */
export const PURCHASE_WAYBILL_TYPES: WaybillTypeCode[] = ["ALIS", "IADE"];

export function resolveDocumentContext(pathname: string): {
  side: DocumentSide;
  module: DocumentModule;
} | null {
  const rel = pathname.replace(/^\/app\/?/, "");
  if (rel.startsWith("satis-satin-alma/satislar-e-fatura")) {
    if (rel.includes("/irsaliyeler")) return { side: "sales", module: "irsaliye" };
    return { side: "sales", module: "fatura" };
  }
  if (rel.startsWith("satis-satin-alma/alislar-giderler")) {
    if (rel.includes("/irsaliyeler")) return { side: "purchase", module: "irsaliye" };
    return { side: "purchase", module: "fatura" };
  }
  return null;
}

export function invoiceTypesForSide(side: DocumentSide): InvoiceTypeCode[] {
  return side === "sales" ? SALES_INVOICE_TYPES : PURCHASE_INVOICE_TYPES;
}

export function waybillTypesForSide(side: DocumentSide): WaybillTypeCode[] {
  return side === "sales" ? SALES_WAYBILL_TYPES : PURCHASE_WAYBILL_TYPES;
}

export function defaultInvoiceTypeForSide(side: DocumentSide): InvoiceTypeCode {
  return side === "sales" ? "SATIS" : "ALIS";
}

export function defaultWaybillTypeForSide(side: DocumentSide): WaybillTypeCode {
  return side === "sales" ? "SATIS" : "ALIS";
}

export function parseInvoiceTypeForContext(
  search: URLSearchParams,
  side: DocumentSide
): InvoiceTypeCode {
  const allowed = invoiceTypesForSide(side);
  const t = (search.get("type") || defaultInvoiceTypeForSide(side)).toUpperCase();
  return (allowed.includes(t as InvoiceTypeCode) ? t : defaultInvoiceTypeForSide(side)) as InvoiceTypeCode;
}

export function parseWaybillTypeForContext(
  search: URLSearchParams,
  side: DocumentSide
): WaybillTypeCode {
  const allowed = waybillTypesForSide(side);
  const t = (search.get("type") || defaultWaybillTypeForSide(side)).toUpperCase();
  return (allowed.includes(t as WaybillTypeCode) ? t : defaultWaybillTypeForSide(side)) as WaybillTypeCode;
}

export function invoiceTypeDefsForSide(side: DocumentSide) {
  const codes = invoiceTypesForSide(side);
  return INVOICE_TYPES.filter((t) => codes.includes(t.code));
}

export function waybillTypeDefsForSide(side: DocumentSide) {
  const codes = waybillTypesForSide(side);
  return WAYBILL_TYPES.filter((t) => codes.includes(t.code));
}

export function breadcrumbForContext(side: DocumentSide, module: DocumentModule): string {
  if (side === "sales" && module === "fatura") return "Satışlar & e-Fatura / Satış Faturaları";
  if (side === "sales" && module === "irsaliye") return "Satışlar & e-Fatura / Satış İrsaliyeleri";
  if (side === "purchase" && module === "fatura") return "Alışlar & Giderler / Alış Faturaları";
  return "Alışlar & Giderler / Alış İrsaliyeleri";
}
