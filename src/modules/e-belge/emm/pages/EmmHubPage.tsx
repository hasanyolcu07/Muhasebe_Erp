import { useCallback, useEffect, useMemo, useState } from "react";
import { FormProvider, useFieldArray, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BranchRecordTypeFields } from "@/components/financial/BranchRecordTypeFields";
import { FinancialFormSync } from "@/components/financial/FinancialFormSync";
import { FormActionFooter } from "@/components/FormActionFooter";
import { useAppStore } from "@/store/appStore";
import {
  emmApi,
  type CariLookup,
  type EmmDetail,
  type EmmListItem,
  type StokLookup,
} from "../api/emmApi";
import { EmmListView } from "../components/EmmListView";
import {
  calcLineTotal,
  calcTotals,
  emptyEmmForm,
  emmFormSchema,
  type EmmFormValues,
} from "../schemas/emmSchema";

export function EmmHubPage() {
  const branchId = useAppStore((s) => s.branchId);
  const recordTypeId = useAppStore((s) => s.recordTypeId);
  const branches = useAppStore((s) => s.branches);
  const recordTypes = useAppStore((s) => s.recordTypes);
  const setDirty = useAppStore((s) => s.setDirty);

  const defaultBranch = branchId ?? branches[0]?.id ?? 1;
  const defaultRt = recordTypeId ?? recordTypes[0]?.id ?? 1;

  const [items, setItems] = useState<EmmListItem[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [detail, setDetail] = useState<EmmDetail | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cariList, setCariList] = useState<CariLookup[]>([]);
  const [stokList, setStokList] = useState<StokLookup[]>([]);
  const [previewNo, setPreviewNo] = useState<string>("");
  const [refreshKey, setRefreshKey] = useState(0);

  const methods = useForm<EmmFormValues>({
    resolver: zodResolver(emmFormSchema) as Resolver<EmmFormValues>,
    defaultValues: emptyEmmForm(defaultBranch, defaultRt),
    mode: "onBlur",
  });

  const { handleSubmit, reset, register, watch, setValue, control, formState } = methods;
  const { fields, append, remove } = useFieldArray({ control, name: "lines" });

  const formBranchId = watch("branch_id");
  const formRecordTypeId = watch("record_type_id");
  const receiptDate = watch("receipt_date");
  const watched = watch();
  const totals = useMemo(() => calcTotals(watched), [watched]);

  useEffect(() => {
    setDirty(formState.isDirty);
  }, [formState.isDirty, setDirty]);

  const loadLookups = useCallback(async () => {
    try {
      const bid = formBranchId && formBranchId > 0 ? formBranchId : undefined;
      const [cariRes, stokRes] = await Promise.all([
        emmApi.lookupCari({ branch_id: bid }),
        emmApi.lookupStok({ branch_id: bid }),
      ]);
      setCariList(cariRes.items ?? []);
      setStokList(stokRes.items ?? []);
    } catch {
      setCariList([]);
      setStokList([]);
    }
  }, [formBranchId]);

  const loadList = useCallback(async () => {
    setListLoading(true);
    try {
      const res = await emmApi.list({
        branch_id: formBranchId && formBranchId > 0 ? formBranchId : undefined,
        record_type_id: formRecordTypeId && formRecordTypeId > 0 ? formRecordTypeId : undefined,
        page_size: 30,
      });
      setItems(res.items ?? []);
    } catch {
      setItems([]);
    } finally {
      setListLoading(false);
    }
  }, [formBranchId, formRecordTypeId, refreshKey]);

  useEffect(() => {
    void loadLookups();
  }, [loadLookups]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    if (!formBranchId || !formRecordTypeId || !receiptDate || editId) return;
    emmApi
      .previewNo({
        branch_id: formBranchId,
        record_type_id: formRecordTypeId,
        transaction_date: receiptDate,
      })
      .then((r) => setPreviewNo(r.receipt_no || r.fis_no || ""))
      .catch(() => setPreviewNo(""));
  }, [formBranchId, formRecordTypeId, receiptDate, editId]);

  function resetNew() {
    setEditId(null);
    setDetail(null);
    setError(null);
    reset(emptyEmmForm(formBranchId ?? defaultBranch, formRecordTypeId ?? defaultRt));
    setDirty(false);
  }

  async function loadDetail(id: number) {
    try {
      const d = await emmApi.get(id);
      setEditId(id);
      setDetail(d);
      reset({
        branch_id: d.branch_id,
        record_type_id: d.record_type_id,
        account_id: d.account_id,
        receipt_date: d.receipt_date,
        receipt_no: d.receipt_no,
        description: d.description || "",
        stopaj_rate: Number(d.stopaj_rate || 0),
        tevkifat_rate: Number(d.tevkifat_rate || 0),
        lines: (d.lines || []).map((ln) => ({
          stock_id: ln.stock_id ?? null,
          description: ln.description || ln.stock_name || "",
          qty: Number(ln.qty),
          unit_id: ln.unit_id ?? null,
          unit_code: ln.unit_code || "KG",
          unit_price: Number(ln.unit_price),
        })),
      });
      setDirty(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Makbuz yüklenemedi");
    }
  }

  async function save(mode: "draft" | "approve") {
    setSaving(true);
    setError(null);
    try {
      const values = emmFormSchema.parse(watched);
      if (!values.account_id) throw new Error("Müstahsil (çiftçi) seçiniz");
      const payload = {
        ...values,
        receipt_no: values.receipt_no || null,
        description: values.description || null,
        lines: values.lines.map((ln) => ({
          ...ln,
          stock_id: ln.stock_id || null,
        })),
        save_mode: mode,
      };
      let saved: EmmDetail;
      if (editId) {
        saved = await emmApi.update(editId, payload);
      } else {
        saved = await emmApi.create(payload);
      }
      setDirty(false);
      setRefreshKey((k) => k + 1);
      await loadDetail(saved.id);
      window.alert(mode === "approve" ? "✔ e-MM onaylandı." : "✔ Taslak kaydedildi.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kayıt başarısız");
    } finally {
      setSaving(false);
    }
  }

  async function handleApprove() {
    if (!editId) {
      await save("approve");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await emmApi.approve(editId);
      window.alert(res.message || "Onaylandı");
      setRefreshKey((k) => k + 1);
      await loadDetail(editId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Onay başarısız");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateEmm() {
    if (!editId) {
      setError("Önce makbuzu kaydedin");
      return;
    }
    try {
      const res = await emmApi.createEmm(editId);
      window.alert(res.message);
      await loadDetail(editId);
      setRefreshKey((k) => k + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "e-MM oluşturma başarısız");
    }
  }

  async function handleSend() {
    if (!editId) return;
    try {
      const res = await emmApi.send(editId);
      window.alert(res.message);
      await loadDetail(editId);
      setRefreshKey((k) => k + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gönderim başarısız");
    }
  }

  async function handleQueryStatus() {
    if (!editId) return;
    try {
      const res = await emmApi.queryStatus(editId);
      window.alert(`GİB durumu: ${res.gib_status_label || res.gib_status}`);
      await loadDetail(editId);
      setRefreshKey((k) => k + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Durum sorgu başarısız");
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm("Bu makbuzu silmek istiyor musunuz?")) return;
    try {
      await emmApi.remove(id);
      if (editId === id) resetNew();
      setRefreshKey((k) => k + 1);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Silme başarısız");
    }
  }

  function onStockPick(index: number, stockId: number) {
    const st = stokList.find((s) => s.id === stockId);
    setValue(`lines.${index}.stock_id`, stockId || null, { shouldDirty: true });
    if (st) {
      setValue(`lines.${index}.description`, st.name, { shouldDirty: true });
      setValue(`lines.${index}.unit_id`, st.unit_id ?? null, { shouldDirty: true });
      setValue(`lines.${index}.unit_code`, st.unit_code || "KG", { shouldDirty: true });
      if (st.purchase_price != null) {
        setValue(`lines.${index}.unit_price`, Number(st.purchase_price), { shouldDirty: true });
      }
    }
  }

  const isApproved = detail?.status === "APPROVED";

  return (
    <FormProvider {...methods}>
      <FinancialFormSync syncFromTopbar />

      <div className="header-bar">
        <div className="header-breadcrumb">e-Dönüşüm / e-Belge İşlemleri / e-Müstahsil Makbuzu</div>
        <div className="header-btns">
          <BranchRecordTypeFields variant="header" />
          <button type="button" className="btn-cancel" onClick={resetNew}>
            ✖ Yeni Makbuz
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: 12 }}>
          {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 1fr) minmax(420px, 1.4fr)", gap: 16 }}>
        <div>
          <div
            style={{
              padding: "10px 14px",
              fontWeight: 700,
              border: "1px solid var(--border)",
              borderBottom: 0,
              borderRadius: "8px 8px 0 0",
              background: "#fff",
            }}
          >
            📋 Çiftçi Alımı — e-MM Listesi
          </div>
          <EmmListView
            items={items}
            loading={listLoading}
            selectedId={editId}
            onSelect={loadDetail}
            onDelete={handleDelete}
          />
        </div>

        <form
          onSubmit={handleSubmit(() => save("draft"))}
          className="card"
          style={{ padding: 16, alignSelf: "start" }}
        >
          <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 15 }}>
            {editId ? `Makbuz #${detail?.receipt_no || editId}` : "Yeni e-Müstahsil Makbuzu"}
            {detail?.gib_status_label && (
              <span style={{ marginLeft: 8, fontWeight: 500, fontSize: 12, color: "#166534" }}>
                GİB: {detail.gib_status_label}
              </span>
            )}
          </div>

          <div className="form-row" style={{ gridTemplateColumns: "110px 1fr" }}>
            <label>Makbuz No</label>
            <input
              type="text"
              className="form-control"
              placeholder={previewNo || "Otomatik"}
              disabled={!!isApproved}
              {...register("receipt_no")}
            />
          </div>
          <div className="form-row" style={{ gridTemplateColumns: "110px 1fr" }}>
            <label>Tarih</label>
            <input type="date" className="form-control" disabled={!!isApproved} {...register("receipt_date")} />
          </div>
          <div className="form-row" style={{ gridTemplateColumns: "110px 1fr" }}>
            <label>Müstahsil</label>
            <select
              className="form-control required"
              disabled={!!isApproved}
              {...register("account_id", { valueAsNumber: true })}
            >
              <option value={0}>— Çiftçi / müstahsil seç —</option>
              {cariList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} | {c.title}
                  {c.tax_number ? ` (${c.tax_number})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="form-row" style={{ gridTemplateColumns: "110px 1fr" }}>
            <label>Stopaj %</label>
            <input
              type="number"
              step="0.01"
              className="form-control"
              disabled={!!isApproved}
              {...register("stopaj_rate", { valueAsNumber: true })}
            />
          </div>
          <div className="form-row" style={{ gridTemplateColumns: "110px 1fr" }}>
            <label>Açıklama</label>
            <input type="text" className="form-control" disabled={!!isApproved} {...register("description")} />
          </div>

          {detail?.ettn && (
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10 }}>ETTN: {detail.ettn}</div>
          )}

          <div style={{ fontWeight: 700, margin: "12px 0 8px" }}>Kalemler (Ürün / Stok)</div>
          <table className="fatura-table" style={{ width: "100%", fontSize: 13 }}>
            <thead>
              <tr>
                <th>Stok</th>
                <th>Açıklama</th>
                <th>Miktar</th>
                <th>Birim</th>
                <th>Birim Fiyat</th>
                <th>Tutar</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {fields.map((field, idx) => {
                const ln = watched.lines?.[idx];
                const ltotal = calcLineTotal(ln?.qty ?? 0, ln?.unit_price ?? 0);
                return (
                  <tr key={field.id}>
                    <td>
                      <select
                        className="form-control"
                        disabled={!!isApproved}
                        value={ln?.stock_id ?? ""}
                        onChange={(e) => onStockPick(idx, Number(e.target.value) || 0)}
                      >
                        <option value="">—</option>
                        {stokList.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.code}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        className="form-control"
                        disabled={!!isApproved}
                        {...register(`lines.${idx}.description`)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.001"
                        className="form-control"
                        disabled={!!isApproved}
                        {...register(`lines.${idx}.qty`, { valueAsNumber: true })}
                      />
                    </td>
                    <td>
                      <input
                        className="form-control"
                        style={{ width: 64 }}
                        disabled={!!isApproved}
                        {...register(`lines.${idx}.unit_code`)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        className="form-control"
                        disabled={!!isApproved}
                        {...register(`lines.${idx}.unit_price`, { valueAsNumber: true })}
                      />
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 600 }}>{ltotal.toLocaleString("tr-TR")}</td>
                    <td>
                      {!isApproved && fields.length > 1 && (
                        <button type="button" className="btn-top" style={{ fontSize: 11 }} onClick={() => remove(idx)}>
                          ×
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!isApproved && (
            <button
              type="button"
              className="btn-top"
              style={{ marginTop: 8 }}
              onClick={() =>
                append({ stock_id: null, description: "", qty: 1, unit_code: "KG", unit_price: 0 })
              }
            >
              + Kalem Ekle
            </button>
          )}

          <div style={{ marginTop: 16, textAlign: "right", fontSize: 14 }}>
            <div>
              Matrah: <strong>{totals.subtotal.toLocaleString("tr-TR")} ₺</strong>
            </div>
            <div>
              Stopaj: <strong>{totals.stopaj_amount.toLocaleString("tr-TR")} ₺</strong>
            </div>
            <div style={{ fontSize: 16 }}>
              Net Ödenecek: <strong>{totals.grand_total.toLocaleString("tr-TR")} ₺</strong>
            </div>
            {detail?.yevmiye_fis_no && (
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                Yevmiye: {detail.yevmiye_fis_no}
              </div>
            )}
          </div>

          <FormActionFooter>
            <button type="button" className="btn-cancel" onClick={resetNew}>
              Vazgeç
            </button>
            {!isApproved && (
              <>
                <button type="button" className="btn-save" disabled={saving} onClick={() => save("draft")}>
                  💾 Kaydet
                </button>
                <button type="button" className="btn-save" disabled={saving} onClick={handleApprove}>
                  ✔ Onayla
                </button>
              </>
            )}
            {editId && (
              <>
                <button type="button" className="btn-top" onClick={handleCreateEmm}>
                  e-MM Oluştur
                </button>
                <button type="button" className="btn-top" onClick={handleSend}>
                  Gönder
                </button>
                <button type="button" className="btn-top" onClick={handleQueryStatus}>
                  Durum Sorgula
                </button>
                <button type="button" className="btn-top" onClick={() => emmApi.download(editId, "pdf")}>
                  PDF
                </button>
                <button type="button" className="btn-top" onClick={() => emmApi.download(editId, "ubl")}>
                  UBL
                </button>
              </>
            )}
          </FormActionFooter>
        </form>
      </div>
    </FormProvider>
  );
}
