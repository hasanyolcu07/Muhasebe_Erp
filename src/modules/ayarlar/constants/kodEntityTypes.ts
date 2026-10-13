/** Kod tanımları — kart/belge kayıt türleri (entity_type) */

export type KodEntityType =
  | "ACCOUNT"
  | "STOCK"
  | "CASH"
  | "BANK"
  | "CHEQUE"
  | "COA"
  | "VOUCHER"
  | "INVOICE"
  | "WAYBILL"
  | "QUOTE"
  | "ORDER";

/** @deprecated use KodEntityType */
export type CodeEntityType = KodEntityType;

export const CODE_ENTITY_LABELS: Record<KodEntityType, string> = {
  ACCOUNT: "Cari",
  STOCK: "Stok",
  CASH: "Kasa",
  BANK: "Banka",
  CHEQUE: "Çek/Senet",
  COA: "Hesap Planı",
  VOUCHER: "Fiş&Dekont",
  INVOICE: "Alış/Satış Fatura",
  WAYBILL: "İrsaliye",
  QUOTE: "Teklif",
  ORDER: "Sipariş",
};

export const CODE_ENTITY_OPTIONS = (Object.keys(CODE_ENTITY_LABELS) as KodEntityType[]).map((value) => ({
  value,
  label: CODE_ENTITY_LABELS[value],
}));
