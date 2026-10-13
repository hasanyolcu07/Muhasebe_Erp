import { z } from "zod";

export type GelirGiderType = "GIDER" | "GELIR";
export type GelirGiderTab = "temel" | "musteri";

export const GIDER_GROUPS = ["Genel Yönetim", "Pazarlama", "Lojistik"] as const;
export const GELIR_GROUPS = ["Satış Gelirleri", "Hizmet Gelirleri", "Diğer Gelirler"] as const;
export const VAT_OPTIONS = [
  { value: 20, label: "%20 (Genel KDV)" },
  { value: 10, label: "%10 (Gıda/Hizmet)" },
  { value: 1, label: "%1" },
  { value: 0, label: "%0" },
] as const;

export const cardLinkSchema = z.object({
  account_id: z.number().int().min(1, "Cari seçimi zorunlu"),
  link_code: z.string().min(1, "Bağlantı kodu zorunlu").max(32),
  description: z.string().max(255).optional().nullable(),
  share_percent: z.coerce.number().min(0).max(100).default(100),
  vat_rate: z.coerce.number().min(0).max(100).nullable().optional(),
});

export const gelirGiderFormSchema = z.object({
  branch_id: z.number().int().min(1),
  record_type_id: z.number().int().min(1),
  code: z.string().min(1, "Kart kodu zorunlu").max(32),
  name: z.string().min(1, "Kart adı zorunlu").max(150),
  card_type: z.enum(["GELIR", "GIDER"]),
  coa_id: z.number().int().nullable().optional(),
  default_vat_rate: z.coerce.number().min(0).max(100).default(20),
  card_group: z.string().max(80).optional().nullable(),
  branch_ratio: z.coerce.number().min(0).max(100).nullable().optional(),
  is_passive: z.boolean().default(false),
  links: z.array(cardLinkSchema).default([]),
});

export type GelirGiderFormValues = z.infer<typeof gelirGiderFormSchema>;
export type CardLinkFormValues = z.infer<typeof cardLinkSchema>;

export function emptyGelirGiderForm(
  branchId: number,
  recordTypeId: number,
  cardType: GelirGiderType
): GelirGiderFormValues {
  return {
    branch_id: branchId,
    record_type_id: recordTypeId,
    code: "",
    name: "",
    card_type: cardType,
    coa_id: null,
    default_vat_rate: 20,
    card_group: cardType === "GIDER" ? GIDER_GROUPS[0] : GELIR_GROUPS[0],
    branch_ratio: 100,
    is_passive: false,
    links: [],
  };
}

export function detailToForm(d: Record<string, unknown>): GelirGiderFormValues {
  const linksRaw = (d.links as Record<string, unknown>[]) || [];
  return {
    branch_id: Number(d.branch_id),
    record_type_id: Number(d.record_type_id),
    code: String(d.code ?? ""),
    name: String(d.name ?? ""),
    card_type: (d.card_type as GelirGiderType) ?? "GIDER",
    coa_id: d.coa_id != null ? Number(d.coa_id) : null,
    default_vat_rate: Number(d.default_vat_rate ?? 20),
    card_group: d.card_group != null ? String(d.card_group) : null,
    branch_ratio: d.branch_ratio != null ? Number(d.branch_ratio) : null,
    is_passive: Boolean(d.is_passive),
    links: linksRaw.map((l) => ({
      account_id: Number(l.account_id),
      link_code: String(l.link_code ?? ""),
      description: l.description != null ? String(l.description) : "",
      share_percent: Number(l.share_percent ?? 100),
      vat_rate: l.vat_rate != null ? Number(l.vat_rate) : null,
    })),
  };
}
