export type DocumentChannel =
  | "KAGIT"
  | "E_FATURA"
  | "E_ARSIV"
  | "ENTEGRATOR_INCOMING"
  | string;

export function invoiceDocumentTypeLabel(
  channel?: DocumentChannel | null,
  eFaturaType?: string | null
): string {
  const ch = (channel || eFaturaType || "KAGIT").toUpperCase();
  if (ch === "E_FATURA" || ch === "EFATURA") return "E-Fatura";
  if (ch === "E_ARSIV" || ch === "EARSIV") return "E-Arşiv";
  if (ch === "ENTEGRATOR_INCOMING") return "Gelen e-Fatura";
  return "Kağıt Fatura";
}

export function waybillDocumentTypeLabel(
  channel?: DocumentChannel | null,
  eIrsaliyeType?: string | null
): string {
  const ch = (channel || "").toUpperCase();
  if (ch === "ENTEGRATOR_INCOMING") return "Gelen e-İrsaliye";
  if (ch === "E_IRSALIYE") return "Giden e-İrsaliye";
  const t = (eIrsaliyeType || "KAGIT").toUpperCase();
  if (t === "E_IRSALIYE") return "e-İrsaliye";
  if (t === "OKC") return "ÖKC";
  return "Kağıt İrsaliye";
}

export function integratorBadge(
  channel?: DocumentChannel | null,
  integratorSource?: string | null,
  isIncoming?: boolean
): string | null {
  if (!isIncoming && channel !== "ENTEGRATOR_INCOMING") return null;
  if (integratorSource) return "Entegratör";
  if (channel === "ENTEGRATOR_INCOMING") return isIncoming ? "Gelen e-İrsaliye" : "Gelen e-Fatura";
  if (channel === "E_FATURA" || channel === "E_ARSIV" || channel === "E_IRSALIYE") return "e-Belge";
  return null;
}

export function directionBadge(direction?: string | null): string | null {
  const d = (direction || "").toUpperCase();
  if (d === "ALIS" || d === "GELEN" || d === "INCOMING") return "Gelen";
  if (d === "SATIS" || d === "GIDEN" || d === "OUTGOING") return "Giden";
  return null;
}
