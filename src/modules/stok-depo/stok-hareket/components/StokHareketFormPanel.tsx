import { useCallback, useEffect, useMemo, useState } from "react";
import { FormProvider, useFieldArray, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BranchRecordTypeFields } from "@/components/financial/BranchRecordTypeFields";
import { FisNoPreviewField } from "@/components/financial/FisNoPreviewField";
import { FinancialFormSync } from "@/components/financial/FinancialFormSync";
import { FormActionFooter } from "@/components/FormActionFooter";
import { useAppStore } from "@/store/appStore";
import { stokDepoApi, type LotLookup, type SerialLookup } from "../../api/stokDepoApi";
import {
  MOVEMENT_TYPE_PILLS,
  REASON_OPTIONS,
  STOK_DOC_TYPES,
  type MovementType,
} from "../constants/movementTypes";
import {
  stokHareketApi,
  type StockLookup,
  type UnitLookup,
  type WarehouseLookup,
} from "../api/stokHareketApi";
import {
  emptyStokHareketForm,
  stokHareketFormSchema,
  type StokHareketFormValues,
} from "../schemas/stokHareketSchema";

type Props = {
  open: boolean;
  initialType?: MovementType;
  filterWarehouseId?: number | null;
  onClose: () => void;
  onSaved: () => void;
};

export function StokHareketFormPanel({
  open,
  initialType = "GIRIS",
  filterWarehouseId,
  onClose,
  onSaved,
}: Props) {
  const branchId = useAppStore((s) => s.branchId);
  const recordTypeId = useAppStore((s) => s.recordTypeId);
  const branches = useAppStore((s) => s.branches);
  const recordTypes = useAppStore((s) => s.recordTypes);
  const setDirty = useAppStore((s) => s.setDirty);
  const guardNavigate = useAppStore((s) => s.guardNavigate);

  const defaultBranch = branchId ?? branches[0]?.id ?? 1;
  const defaultRt = recordTypeId ?? recordTypes[0]?.id ?? 1;
  const defaultPill = MOVEMENT_TYPE_PILLS.find((p) => p.type === initialType);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warehouses, setWarehouses] = useState<WarehouseLookup[]>([]);
  const [stocks, setStocks] = useState<StockLookup[]>([]);
  const [units, setUnits] = useState<UnitLookup[]>([]);
  const [lots, setLots] = useState<LotLookup[]>([]);
  const [serials, setSerials] = useState<SerialLookup[]>([]);
  const [requireLotTransfer, setRequireLotTransfer] = useState(false);
  const [requireSerialTransfer, setRequireSerialTransfer] = useState(false);

  const methods = useForm<StokHareketFormValues>({
    resolver: zodResolver(stokHareketFormSchema) as Resolver<StokHareketFormValues>,
    defaultValues: emptyStokHareketForm(
      defaultBranch,
      defaultRt,
      initialType,
      defaultPill?.defaultReason ?? "ALIS"
    ),
    mode: "onBlur",
  });

  const { handleSubmit, reset, register, watch, setValue, control, formState } = methods;
  const { fields, append, remove } = useFieldArray({ control, name: "lines" });
  const movementType = watch("movement_type") as MovementType;
  const formBranchId = watch("branch_id");
  const formRecordTypeId = watch("record_type_id");
  const movementDate = watch("movement_date");
  const warehouseId = watch("warehouse_id");
  const watchedLines = watch("lines");
  const reasons = REASON_OPTIONS[movementType] ?? [];

  useEffect(() => {
    setDirty(open && formState.isDirty);
  }, [formState.isDirty, open, setDirty]);

  useEffect(() => {
    if (!open) {
      setDirty(false);
      return;
    }
    const pill = MOVEMENT_TYPE_PILLS.find((p) => p.type === initialType);
    reset(
      emptyStokHareketForm(defaultBranch, defaultRt, initialType, pill?.defaultReason ?? "DIGER")
    );
    if (filterWarehouseId) {
      setValue("warehouse_id", filterWarehouseId);
    }
  }, [open, initialType, defaultBranch, defaultRt, filterWarehouseId, reset, setValue, setDirty]);

  const loadLookups = useCallback(async () => {
    try {
      const [wh, st, un, settings] = await Promise.all([
        stokHareketApi.lookupWarehouses({ branch_id: formBranchId ?? undefined }),
        stokHareketApi.lookupStocks({ branch_id: formBranchId ?? undefined }),
        stokHareketApi.lookupUnits(),
        stokDepoApi.getSettings().catch(() => ({
          require_lot_on_transfer: false,
          require_serial_on_transfer: false,
        })),
      ]);
      setWarehouses(wh.items ?? []);
      setStocks(st.items ?? []);
      setUnits(un.items ?? []);
      setRequireLotTransfer(Boolean(settings.require_lot_on_transfer));
      setRequireSerialTransfer(Boolean(settings.require_serial_on_transfer));
      const preferred = filterWarehouseId ?? wh.items?.[0]?.id;
      if (preferred) {
        setValue("warehouse_id", preferred, { shouldValidate: true });
      }
    } catch {
      /* optional on first paint */
    }
  }, [formBranchId, filterWarehouseId, setValue]);

  useEffect(() => {
    if (open) void loadLookups();
  }, [open, loadLookups]);

  useEffect(() => {
    if (!open || !warehouses.length) return;
    const current = watch("warehouse_id");
    if (!current || current === 0) {
      setValue("warehouse_id", filterWarehouseId ?? warehouses[0].id, { shouldValidate: true });
    }
  }, [open, warehouses, filterWarehouseId, setValue, watch]);

  useEffect(() => {
    const opts = REASON_OPTIONS[movementType] ?? [];
    if (opts.length && !opts.some((o) => o.value === watch("movement_reason"))) {
      setValue("movement_reason", opts[0].value, { shouldValidate: true });
    }
  }, [movementType, setValue, watch]);

  const stockIdsKey = useMemo(
    () => (watchedLines ?? []).map((l) => l.stock_id).join(","),
    [watchedLines]
  );

  useEffect(() => {
    if (!open || !warehouseId) {
      setLots([]);
      setSerials([]);
      return;
    }
    const stockIds = (watchedLines ?? []).map((l) => l.stock_id).filter((id) => id > 0);
    if (!stockIds.length) {
      setLots([]);
      setSerials([]);
      return;
    }
    void (async () => {
      try {
        const lotLists = await Promise.all(
          stockIds.map((sid) =>
            stokDepoApi.listLots({ stock_id: sid, warehouse_id: warehouseId })
          )
        );
        setLots(lotLists.flat());
        const serialLists = await Promise.all(
          stockIds.map((sid) =>
            stokDepoApi.listSerials({
              stock_id: sid,
              warehouse_id: warehouseId,
              status: "AVAILABLE",
            })
          )
        );
        setSerials(serialLists.flat());
      } catch {
        setLots([]);
        setSerials([]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, warehouseId, stockIdsKey]);

  const title =
    MOVEMENT_TYPE_PILLS.find((p) => p.type === movementType)?.label ?? "Stok Hareket";

  function lineNeedsLot(stockId: number): boolean {
    const st = stocks.find((s) => s.id === stockId);
    return Boolean(st?.track_lot) || (movementType === "TRANSFER" && requireLotTransfer);
  }

  function lineNeedsSerial(stockId: number): boolean {
    const st = stocks.find((s) => s.id === stockId);
    return Boolean(st?.track_serial) || (movementType === "TRANSFER" && requireSerialTransfer);
  }

  const showLotCol = useMemo(() => {
    if (requireLotTransfer && movementType === "TRANSFER") return true;
    return stocks.some((s) => s.track_lot);
  }, [stocks, requireLotTransfer, movementType]);

  const showSerialCol = useMemo(() => {
    if (requireSerialTransfer && movementType === "TRANSFER") return true;
    return stocks.some((s) => s.track_serial);
  }, [stocks, requireSerialTransfer, movementType]);

  const onSubmit = async (values: StokHareketFormValues) => {
    setSaving(true);
    setError(null);
    try {
      for (let i = 0; i < values.lines.length; i++) {
        const ln = values.lines[i];
        if (lineNeedsLot(ln.stock_id) && !ln.lot_id) {
          throw new Error(`Satır ${i + 1}: Lot seçimi zorunludur`);
        }
        if (lineNeedsSerial(ln.stock_id)) {
          if (!ln.serial_ids?.length) {
            throw new Error(`Satır ${i + 1}: Seri numarası seçimi zorunludur`);
          }
          if (ln.serial_ids.length !== Math.round(ln.quantity)) {
            throw new Error(`Satır ${i + 1}: Seri adedi miktara eşit olmalıdır`);
          }
        }
      }
      await stokHareketApi.create({
        branch_id: values.branch_id,
        record_type_id: values.record_type_id,
        warehouse_id: values.warehouse_id,
        to_warehouse_id: values.movement_type === "TRANSFER" ? values.to_warehouse_id : null,
        movement_date: values.movement_date,
        movement_type: values.movement_type,
        movement_reason: values.movement_reason,
        description: values.description || null,
        ref_doc_no: values.ref_doc_no || null,
        ref_doc_type: values.ref_doc_type || null,
        as_draft: false,
        lines: values.lines.map((ln) => ({
          stock_id: ln.stock_id,
          quantity: ln.quantity,
          unit_id: ln.unit_id || null,
          unit_cost: ln.unit_cost,
          description: ln.description || null,
          lot_id: ln.lot_id || null,
          serial_ids: ln.serial_ids ?? [],
        })),
      });
      setDirty(false);
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kayıt başarısız");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    guardNavigate(() => {
      setDirty(false);
      onClose();
    });
  };

  if (!open) return null;

  return (
    <FormProvider {...methods}>
      <FinancialFormSync />
      <div id="stokHareketEntryPanel" className="accordion-panel">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 14,
            borderBottom: "2px solid #cbd5e1",
            paddingBottom: 8,
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 800, color: "#1e3a8a" }}>
            📦 {title} Kayıt Paneli
          </span>
          <button
            type="button"
            className="btn-top"
            style={{ background: "#fee2e2", color: "#b91c1c", border: "none", fontWeight: 800 }}
            onClick={handleClose}
          >
            Kapat ✖
          </button>
        </div>

        {error ? (
          <div className="alert alert-error" style={{ marginBottom: 12 }}>
            {error}
          </div>
        ) : null}

        {movementType === "TRANSFER" && (requireLotTransfer || requireSerialTransfer) ? (
          <div
            className="alert"
            style={{
              marginBottom: 12,
              background: "#fff7ed",
              border: "1px solid #fdba74",
              color: "#9a3412",
              fontSize: 13,
            }}
          >
            Transfer parametresi:{" "}
            {requireLotTransfer ? "Lot zorunlu" : null}
            {requireLotTransfer && requireSerialTransfer ? " · " : null}
            {requireSerialTransfer ? "Seri zorunlu" : null}
          </div>
        ) : null}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 14,
            marginBottom: 14,
          }}
        >
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#334155", display: "block", marginBottom: 4 }}>
              Tarih
            </label>
            <input type="date" className="form-control required" {...register("movement_date")} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#334155", display: "block", marginBottom: 4 }}>
              Hareket Nedeni
            </label>
            <select className="form-control required" style={{ fontWeight: 700 }} {...register("movement_reason")}>
              {reasons.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <FisNoPreviewField
            documentType={STOK_DOC_TYPES[movementType]}
            branchId={formBranchId}
            recordTypeId={formRecordTypeId}
            transactionDate={movementDate}
          />
          <BranchRecordTypeFields variant="form-row" />
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#334155", display: "block", marginBottom: 4 }}>
              Depo {movementType === "TRANSFER" ? "(Kaynak)" : ""}
            </label>
            <select
              className="form-control required"
              style={{ fontWeight: 700, color: "#1e3a8a" }}
              {...register("warehouse_id", { valueAsNumber: true })}
            >
              <option value={0}>Depo seçin</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.code} | {w.name}
                </option>
              ))}
            </select>
          </div>
          {movementType === "TRANSFER" ? (
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: "#334155", display: "block", marginBottom: 4 }}>
                Hedef Depo
              </label>
              <select
                className="form-control required"
                style={{ fontWeight: 700, color: "#b91c1c" }}
                {...register("to_warehouse_id", {
                  setValueAs: (v) => (v === "" || v === "0" ? null : Number(v)),
                })}
              >
                <option value="">Hedef depo seçin</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.code} | {w.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#334155", display: "block", marginBottom: 4 }}>
              Belge Ref. No
            </label>
            <input
              className="form-control"
              placeholder="Fatura / irsaliye / üretim no"
              {...register("ref_doc_no")}
            />
          </div>
          <div style={{ gridColumn: movementType === "TRANSFER" ? "span 1" : "span 2" }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#334155", display: "block", marginBottom: 4 }}>
              Açıklama
            </label>
            <input className="form-control" {...register("description")} />
          </div>
        </div>

        <div style={{ marginBottom: 10, fontWeight: 800, color: "#334155", fontSize: 13 }}>Satırlar</div>
        <div style={{ overflowX: "auto", marginBottom: 12 }}>
          <table className="data-table" style={{ minWidth: showLotCol || showSerialCol ? 980 : 720 }}>
            <thead>
              <tr>
                <th style={{ width: 40 }}>#</th>
                <th>Stok</th>
                <th style={{ width: 100 }}>Miktar</th>
                <th style={{ width: 90 }}>Birim</th>
                <th style={{ width: 120 }}>Birim Maliyet</th>
                {showLotCol ? <th style={{ width: 160 }}>Lot</th> : null}
                {showSerialCol ? <th style={{ width: 180 }}>Seri</th> : null}
                <th style={{ width: 70 }} />
              </tr>
            </thead>
            <tbody>
              {fields.map((field, idx) => {
                const stockId = watchedLines?.[idx]?.stock_id ?? 0;
                const lineLots = lots.filter((l) => l.stock_id === stockId);
                const lineSerials = serials.filter((s) => s.stock_id === stockId);
                const selectedSerials = watchedLines?.[idx]?.serial_ids ?? [];
                return (
                  <tr key={field.id}>
                    <td>{idx + 1}</td>
                    <td>
                      <select
                        className="form-control required"
                        style={{ fontWeight: 600 }}
                        {...register(`lines.${idx}.stock_id`, {
                          valueAsNumber: true,
                          onChange: (e) => {
                            const sid = Number(e.target.value);
                            const st = stocks.find((s) => s.id === sid);
                            if (st?.unit_id) {
                              setValue(`lines.${idx}.unit_id`, st.unit_id);
                            }
                            if (st?.purchase_price != null && movementType === "GIRIS") {
                              setValue(`lines.${idx}.unit_cost`, Number(st.purchase_price));
                            }
                            setValue(`lines.${idx}.lot_id`, null);
                            setValue(`lines.${idx}.serial_ids`, []);
                          },
                        })}
                      >
                        <option value={0}>Stok seçin</option>
                        {stocks.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.code} | {s.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.0001"
                        className="form-control required"
                        style={{ textAlign: "right", fontWeight: 700 }}
                        {...register(`lines.${idx}.quantity`, { valueAsNumber: true })}
                      />
                    </td>
                    <td>
                      <select
                        className="form-control"
                        {...register(`lines.${idx}.unit_id`, {
                          setValueAs: (v) => (v === "" || v === "0" ? null : Number(v)),
                        })}
                      >
                        <option value="">—</option>
                        {units.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.code}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        className="form-control"
                        style={{ textAlign: "right", fontWeight: 700 }}
                        {...register(`lines.${idx}.unit_cost`, { valueAsNumber: true })}
                      />
                    </td>
                    {showLotCol ? (
                      <td>
                        <select
                          className={`form-control${lineNeedsLot(stockId) ? " required" : ""}`}
                          {...register(`lines.${idx}.lot_id`, {
                            setValueAs: (v) => (v === "" || v === "0" ? null : Number(v)),
                          })}
                        >
                          <option value="">
                            {lineNeedsLot(stockId) ? "Lot seçin *" : "Lot (opsiyonel)"}
                          </option>
                          {lineLots.map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.lot_no}
                              {l.lot_name ? ` — ${l.lot_name}` : ""} ({l.qty})
                            </option>
                          ))}
                        </select>
                      </td>
                    ) : null}
                    {showSerialCol ? (
                      <td>
                        <select
                          multiple
                          className={`form-control${lineNeedsSerial(stockId) ? " required" : ""}`}
                          style={{ minHeight: 72 }}
                          value={selectedSerials.map(String)}
                          onChange={(e) => {
                            const ids = Array.from(e.target.selectedOptions).map((o) => Number(o.value));
                            setValue(`lines.${idx}.serial_ids`, ids, { shouldDirty: true });
                          }}
                        >
                          {lineSerials.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.serial_no}
                            </option>
                          ))}
                        </select>
                        {lineNeedsSerial(stockId) ? (
                          <div style={{ fontSize: 11, color: "#b45309", marginTop: 2 }}>
                            Miktar kadar seri seçin
                          </div>
                        ) : null}
                      </td>
                    ) : null}
                    <td>
                      {fields.length > 1 ? (
                        <button type="button" className="pill-btn delete" onClick={() => remove(idx)}>
                          Sil
                        </button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <button
          type="button"
          className="btn-top"
          style={{ marginBottom: 12 }}
          onClick={() =>
            append({
              stock_id: 0,
              quantity: 1,
              unit_id: null,
              unit_cost: 0,
              description: "",
              lot_id: null,
              serial_ids: [],
            })
          }
        >
          ➕ Satır Ekle
        </button>

        <FormActionFooter sticky={false}>
          <button type="button" className="btn-cancel" onClick={handleClose} disabled={saving}>
            Vazgeç
          </button>
          <button
            type="button"
            className="btn-top blue"
            disabled={saving}
            onClick={handleSubmit(onSubmit)}
          >
            {saving ? "Kaydediliyor…" : "💾 Kaydet"}
          </button>
        </FormActionFooter>
      </div>
    </FormProvider>
  );
}
