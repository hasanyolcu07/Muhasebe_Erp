import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "bg-slate-100 text-slate-700",
        primary: "bg-blue-100 text-blue-700",
        success: "bg-emerald-100 text-emerald-700",
        warning: "bg-amber-100 text-amber-800",
        danger: "bg-red-100 text-red-700",
        muted: "bg-slate-100 text-slate-500",
        info: "bg-sky-100 text-sky-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

/** Belge / kayıt durum rozetleri */
export type StatusTone =
  | "taslak"
  | "gib_hazir"
  | "gonderildi"
  | "onaylandi"
  | "aktif"
  | "pasif"
  | "iptal"
  | "red";

const STATUS_MAP: Record<
  StatusTone,
  { label: string; variant: NonNullable<VariantProps<typeof badgeVariants>["variant"]> }
> = {
  taslak: { label: "Taslak", variant: "muted" },
  gib_hazir: { label: "GIB Hazır", variant: "warning" },
  gonderildi: { label: "Gönderildi", variant: "info" },
  onaylandi: { label: "Onaylandı", variant: "success" },
  aktif: { label: "Aktif", variant: "success" },
  pasif: { label: "Pasif", variant: "muted" },
  iptal: { label: "İptal", variant: "danger" },
  red: { label: "Red", variant: "danger" },
};

export type StatusBadgeProps = Omit<BadgeProps, "variant" | "children"> & {
  status: StatusTone | string;
  label?: string;
};

function normalizeStatus(raw: string): StatusTone | null {
  const s = raw.trim().toUpperCase().replace(/\s+/g, "_");
  if (["TASLAK", "DRAFT", "OPEN"].includes(s)) return "taslak";
  if (["GIB_HAZIR", "HAZIR", "BEKLEMEDE", "READY"].includes(s)) return "gib_hazir";
  if (["GONDERILDI", "SENT", "GIB_GONDERILDI"].includes(s)) return "gonderildi";
  if (["ONAYLANDI", "APPROVED", "GIB_ONAYLANDI"].includes(s)) return "onaylandi";
  if (["AKTIF", "ACTIVE"].includes(s)) return "aktif";
  if (["PASIF", "PASSIVE", "INACTIVE"].includes(s)) return "pasif";
  if (["IPTAL", "CANCELLED", "CANCELED"].includes(s)) return "iptal";
  if (["RED", "REJECTED"].includes(s)) return "red";
  if (s in STATUS_MAP) return s.toLowerCase() as StatusTone;
  return null;
}

function StatusBadge({ status, label, className, ...props }: StatusBadgeProps) {
  const tone = normalizeStatus(String(status));
  const meta = tone ? STATUS_MAP[tone] : { label: label ?? String(status), variant: "default" as const };
  return (
    <Badge variant={meta.variant} className={className} {...props}>
      {label ?? meta.label}
    </Badge>
  );
}

export { Badge, StatusBadge, badgeVariants };
