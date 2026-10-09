import { z } from "zod";
import type { MovementType } from "../constants/movementTypes";

const lineSchema = z.object({
  stock_id: z.coerce.number().int().positive("Stok seçimi zorunludur"),
  quantity: z.coerce.number().positive("Miktar sıfırdan büyük olmalıdır"),
  unit_id: z.number().nullable().optional(),
  unit_cost: z.coerce.number().min(0, "Birim maliyet negatif olamaz"),
  description: z.string().optional(),
  lot_id: z.number().nullable().optional(),
  serial_ids: z.array(z.number()).default([]),
});

export const stokHareketFormSchema = z
  .object({
    branch_id: z.number({ message: "Şube zorunludur" }),
    record_type_id: z.number({ message: "Kayıt türü zorunludur" }),
    movement_type: z.enum(["GIRIS", "CIKIS", "TRANSFER", "SAYIM", "FIRE"]),
    movement_reason: z.string().min(1, "Hareket nedeni zorunludur"),
    movement_date: z.string().min(1, "Tarih zorunludur"),
    warehouse_id: z.coerce.number().int().positive("Depo seçimi zorunludur"),
    to_warehouse_id: z.number().nullable().optional(),
    description: z.string().optional(),
    ref_doc_no: z.string().optional(),
    ref_doc_type: z.string().optional(),
    as_draft: z.boolean().optional(),
    lines: z.array(lineSchema).min(1, "En az bir satır zorunludur"),
  })
  .superRefine((data, ctx) => {
    if (data.movement_type === "TRANSFER") {
      if (!data.to_warehouse_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Transfer işleminde hedef depo zorunludur",
          path: ["to_warehouse_id"],
        });
      } else if (data.to_warehouse_id === data.warehouse_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Kaynak ve hedef depo aynı olamaz",
          path: ["to_warehouse_id"],
        });
      }
    }
  });

export type StokHareketFormValues = z.infer<typeof stokHareketFormSchema>;

export function emptyStokHareketForm(
  branchId: number,
  recordTypeId: number,
  movementType: MovementType = "GIRIS",
  defaultReason = "ALIS"
): StokHareketFormValues {
  const today = new Date().toISOString().slice(0, 10);
  return {
    branch_id: branchId,
    record_type_id: recordTypeId,
    movement_type: movementType,
    movement_reason: defaultReason,
    movement_date: today,
    warehouse_id: 0,
    to_warehouse_id: null,
    description: "",
    ref_doc_no: "",
    ref_doc_type: "",
    as_draft: false,
    lines: [
      {
        stock_id: 0,
        quantity: 1,
        unit_id: null,
        unit_cost: 0,
        description: "",
        lot_id: null,
        serial_ids: [],
      },
    ],
  };
}
