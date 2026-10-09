export type WaybillTypeCode = "SATIS" | "ALIS" | "IADE";

export type WaybillTypeDef = {
  code: WaybillTypeCode;
  label: string;
  pillLabel: string;
  icon: string;
  variant: "green" | "red" | "amber";
  documentType: string;
  breadcrumb: string;
};

export const WAYBILL_TYPES: WaybillTypeDef[] = [
  {
    code: "SATIS",
    label: "Satış İrsaliyesi",
    pillLabel: "Satış İrsaliyesi (Çıkış)",
    icon: "🟢",
    variant: "green",
    documentType: "IRS_SATIS",
    breadcrumb: "Satış İrsaliyesi İşlem Girişi (Mal Çıkış / Sevkiyat)",
  },
  {
    code: "ALIS",
    label: "Alış İrsaliyesi",
    pillLabel: "Satınalma İrsaliyesi (Giriş)",
    icon: "🔴",
    variant: "red",
    documentType: "IRS_ALIS",
    breadcrumb: "Satınalma İrsaliyesi İşlem Girişi (Mal Kabul)",
  },
  {
    code: "IADE",
    label: "İade İrsaliyesi",
    pillLabel: "İade İrsaliyesi",
    icon: "↩️",
    variant: "amber",
    documentType: "IRS_IADE",
    breadcrumb: "İade İrsaliyesi İşlem Girişi",
  },
];

export const E_IRSALIYE_TYPES = [
  { value: "KAGIT", label: "Kağıt İrsaliye" },
  { value: "E_IRSALIYE", label: "e-İrsaliye (Elektronik Belge)" },
  { value: "OKC", label: "ÖKC Bilgi Fişi" },
] as const;

export function getWaybillType(code: string): WaybillTypeDef | undefined {
  return WAYBILL_TYPES.find((t) => t.code === code);
}

export function parseInitialWaybillType(search: URLSearchParams): WaybillTypeCode {
  const t = (search.get("type") || "SATIS").toUpperCase();
  return (WAYBILL_TYPES.some((x) => x.code === t) ? t : "SATIS") as WaybillTypeCode;
}
