import { api } from "@/services/api";

export type DocumentSeriesItem = {
  id: number;
  code: string;
  name: string;
  document_type: string;
  series_prefix: string;
  format_template: string;
  valid_from: string;
  valid_to: string;
  branch_id: number | null;
  record_type_id: number | null;
  is_active: boolean;
  category?: string | null;
  format_kind?: string;
  is_gib_series?: boolean;
  enforce_date_order?: boolean;
  starting_number?: number;
  last_number?: number;
  last_formatted?: string | null;
  next_preview?: string | null;
};

export type DocumentSeriesPayload = {
  code: string;
  name: string;
  document_type: string;
  series_prefix: string;
  format_template: string;
  valid_from: string;
  valid_to: string;
  branch_id?: number | null;
  record_type_id?: number | null;
  is_active?: boolean;
  category?: string;
  format_kind?: "GIB" | "SISTEM";
  is_gib_series?: boolean;
  enforce_date_order?: boolean;
  starting_number?: number;
};

export type NumberCheckResult = {
  series_id: number;
  code: string;
  name: string;
  year: number;
  used: Array<{
    sequence_no: number;
    formatted_no: string;
    document_date: string;
    status: string;
  }>;
  freed: Array<{ sequence_no: number; formatted_no: string }>;
  gaps: Array<{ sequence_no: number; formatted_no: string; reason: string }>;
  last_number: number;
  next_preview: string;
};

export const documentSeriesApi = {
  list: (category?: string) => {
    const qs = category ? `?category=${encodeURIComponent(category)}` : "";
    return api<{ items: DocumentSeriesItem[] }>(`/settings/document-series${qs}`);
  },

  create: (payload: DocumentSeriesPayload) =>
    api<DocumentSeriesItem>("/settings/document-series", {
      method: "POST",
      body: payload,
    }),

  update: (id: number, payload: Partial<DocumentSeriesPayload>) =>
    api<DocumentSeriesItem>(`/settings/document-series/${id}`, {
      method: "PUT",
      body: payload,
    }),

  remove: (id: number) =>
    api<void>(`/settings/document-series/${id}`, { method: "DELETE" }),

  lastNumber: (id: number, year?: number) => {
    const qs = year ? `?year=${year}` : "";
    return api<{
      last_number: number;
      last_formatted: string | null;
      next_preview: string;
      year: number;
    }>(`/settings/document-series/${id}/last-number${qs}`);
  },

  numberCheck: (id: number, year?: number) => {
    const qs = year ? `?year=${year}` : "";
    return api<NumberCheckResult>(`/settings/document-series/${id}/number-check${qs}`);
  },

  preview: (params: {
    document_type: string;
    branch_id: number;
    record_type_id: number;
    transaction_date: string;
  }) => {
    const qs = new URLSearchParams({
      document_type: params.document_type,
      branch_id: String(params.branch_id),
      record_type_id: String(params.record_type_id),
      transaction_date: params.transaction_date,
    });
    return api<{ fis_no: string; document_type: string }>(
      `/settings/document-series/preview?${qs.toString()}`
    );
  },
};

/** Kasa / Banka / Çek / Fiş / Stok document_type sabitleri */
export const DOC_TYPES = {
  kasa: {
    TAHSILAT: "KASA_TAHSILAT",
    ODEME: "KASA_ODEME",
    VIRMAN: "KASA_VIRMAN",
  },
  bank: {
    HAVALE_EFT: "BANKA_HAVALE",
    POS_TAHSILAT: "BANKA_POS_TAHSILAT",
    POS_BLOKE_COZUMU: "BANKA_POS_BLOKE",
    VIRMAN: "BANKA_VIRMAN",
    KUR_FARKI: "BANKA_KUR_FARKI",
    BANKA_MASRAFI: "BANKA_MASRAFI",
    CEK_TAHSIL_TEDIYE: "BANKA_CEK_TAHSIL",
  },
  fis: (voucherType: string) => {
    const t = voucherType === "CARI_ODEME" ? "ODM" : voucherType.toUpperCase();
    return `FIS_${t}`;
  },
  cek: (txnType: string) => {
    const map: Record<string, string> = {
      PORTFOY_GIRIS: "CEK_PORTFOY_GIRIS",
      CIRO: "CEK_CIRO",
      PORTFOY_TAHSIL: "CEK_PORTFOY_TAHSIL",
      IADE_KARSILIKSIZ: "CEK_IADE",
      BANKA_TAHSIL: "CEK_BANKA_TAHSIL",
      BANKA_TEMINATA: "CEK_BANKA_TEMINAT",
      BANKADAN_PORTFOY_IADE: "CEK_BANKADAN_IADE",
      BANKADAN_KARSILIKSIZ: "CEK_BANKADAN_KARS",
      CIRODAN_PORTFOYE_IADE: "CEK_CIRO_IADE",
      CEK_SENET_CIKIS: "CEK_CIKIS",
      MUSTERIDEN_PORTFOYE_IADE: "CEK_MUS_IADE",
      MUSTERIDE_ELDEN_TAHSIL: "CEK_MUS_TAHSIL",
    };
    return map[txnType] ?? `CEK_${txnType}`;
  },
  stok: {
    GIRIS: "STOK_GIRIS",
    CIKIS: "STOK_CIKIS",
    TRANSFER: "STOK_TRANSFER",
    SAYIM: "STOK_SAYIM",
    FIRE: "STOK_FIRE",
  },
} as const;

/** Panel id → kategori eşlemesi */
export const SERI_PANEL_CATEGORY: Record<string, string> = {
  "e-fatura-no": "FATURA",
  "e-irsaliye-no": "IRSALIYE",
  "siparis-no": "SIPARIS",
  "teklif-no": "TEKLIF",
  "kasa-fis-no": "KASA",
  "banka-fis-no": "BANKA",
  "cek-senet-fis-no": "CEK_SENET",
  "fis-dekont-fis-no": "FIS_DEKONT",
  "stok-fis-no": "STOK",
  "yevmiye-no": "YEVMIYE",
};

export type SeriDocTypeOption = { value: string; label: string };

/** Kategori bazlı belge türü seçenekleri (sol form select) */
export const SERI_DOC_TYPE_OPTIONS: Record<string, SeriDocTypeOption[]> = {
  FATURA: [
    { value: "FATURA_GIB", label: "e-Fatura (GIB format)" },
    { value: "FATURA_SIST", label: "Fatura (Sistem format)" },
    { value: "EARSIV_GIB", label: "e-Arşiv (GIB format)" },
  ],
  IRSALIYE: [
    { value: "IRSALIYE_GIB", label: "e-İrsaliye (GIB format)" },
    { value: "IRSALIYE_SIST", label: "İrsaliye (Sistem format)" },
  ],
  SIPARIS: [{ value: "SIPARIS", label: "Sipariş" }],
  TEKLIF: [{ value: "TEKLIF", label: "Teklif" }],
  KASA: [
    { value: "KASA_TAHSILAT", label: "Kasa Tahsilat" },
    { value: "KASA_ODEME", label: "Kasa Ödeme" },
    { value: "KASA_VIRMAN", label: "Kasa Virman" },
  ],
  BANKA: [
    { value: "BANKA_HAVALE", label: "Havale / EFT" },
    { value: "BANKA_POS_TAHSILAT", label: "POS Tahsilat" },
    { value: "BANKA_POS_BLOKE", label: "POS Bloke Çözümü" },
    { value: "BANKA_VIRMAN", label: "Banka Virman" },
    { value: "BANKA_KUR_FARKI", label: "Kur Farkı" },
    { value: "BANKA_MASRAFI", label: "Banka Masrafı" },
    { value: "BANKA_CEK_TAHSIL", label: "Çek Tahsil / Tediye" },
  ],
  CEK_SENET: [
    { value: "CEK_ALINAN", label: "Alınan Çek" },
    { value: "CEK_VERILEN", label: "Verilen Çek" },
    { value: "SENET_ALINAN", label: "Alınan Senet" },
    { value: "SENET_VERILEN", label: "Verilen Senet" },
  ],
  FIS_DEKONT: [
    { value: "FIS_CARI_TAHSILAT", label: "Cari Tahsilat" },
    { value: "FIS_ODM", label: "Cari Ödeme" },
    { value: "FIS_NAKIT", label: "Nakit" },
    { value: "FIS_ALACAK_DEKONTU", label: "Alacak Dekontu" },
    { value: "FIS_BORC_DEKONTU", label: "Borç Dekontu" },
    { value: "FIS_KK", label: "Kredi Kartı" },
    { value: "FIS_POS", label: "POS" },
    { value: "FIS_VIRMAN", label: "Virman" },
    { value: "FIS_ACILIS", label: "Açılış" },
    { value: "FIS_OZEL", label: "Özel" },
    { value: "FIS_KUR_FARKI", label: "Kur Farkı" },
  ],
  STOK: [
    { value: "STOK_GIRIS", label: "Stok Giriş" },
    { value: "STOK_CIKIS", label: "Stok Çıkış" },
    { value: "STOK_TRANSFER", label: "Transfer" },
    { value: "STOK_SAYIM", label: "Sayım" },
    { value: "STOK_FIRE", label: "Fire & Zaiyat" },
  ],
  YEVMIYE: [{ value: "YEVMIYE_MADDE", label: "Yevmiye Madde No (GIB)" }],
};

export function defaultDocTypeForCategory(category: string, formatKind: "GIB" | "SISTEM" = "SISTEM"): string {
  const opts = SERI_DOC_TYPE_OPTIONS[category];
  if (!opts?.length) return `${category}_SIST`;
  if (formatKind === "GIB") {
    const gib = opts.find((o) => o.value.includes("GIB") || o.label.includes("GIB"));
    if (gib) return gib.value;
  }
  const sist = opts.find((o) => o.value.includes("SIST") || !o.value.includes("GIB"));
  return sist?.value || opts[0].value;
}
