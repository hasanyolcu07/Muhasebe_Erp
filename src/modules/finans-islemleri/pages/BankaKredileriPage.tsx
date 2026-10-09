import { useEffect, useMemo, useRef, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { BranchRecordTypeFields } from "@/components/financial/BranchRecordTypeFields";
import { ChartOfAccountsPicker } from "@/components/ChartOfAccountsPicker";
import { FormActionFooter } from "@/components/FormActionFooter";
import { FormSlideOver } from "@/components/FormSlideOver";
import { CodeSelectFields, type CodeSelectValues } from "@/modules/ayarlar/components/CodeSelectFields";
import { bankaIslemleriApi, type BankaLookup } from "@/modules/finans-islemleri/banka/api/bankaIslemleriApi";
import { formatCoaDisplay } from "@/services/coaApi";
import { useAppStore } from "@/store/appStore";
import {
  bankaKredileriApi,
  CREDIT_TYPE_OPTIONS,
  DEFAULT_ACCOUNT_MAPS,
  type BankCreditListItem,
  type BankCreditPayload,
  type CalcType,
  type CreditAccountMap,
  type CreditInstallment,
  type CreditType,
  type SourceField,
  type WorkType,
} from "../banka-kredileri/api/bankaKredileriApi";

function addMonths(iso: string, months: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

function parseTurkishNumber(str: string | number | undefined | null): number {
  if (typeof str === "number") return str;
  if (!str) return 0;
  let s = String(str).trim().replace(/₺|TL|tl|\s/g, "");
  if (s.includes(",") && s.includes(".")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (s.includes(",")) {
    s = s.replace(",", ".");
  }
  const n = parseFloat(s.replace(/[^0-9.-]/g, ""));
  return isNaN(n) ? 0 : n;
}

function parseTurkishDate(str: string | undefined | null): string | null {
  if (!str) return null;
  const s = String(str).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (m) {
    const day = m[1].padStart(2, "0");
    const month = m[2].padStart(2, "0");
    const year = m[3];
    return `${year}-${month}-${day}`;
  }
  return null;
}

export function parseExcelInstallments(
  rawText: string,
  currentStart?: string | null
): CreditInstallment[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return [];

  const parsedLines = lines.map((line) => {
    if (line.includes("\t")) return line.split("\t");
    if (line.includes(";")) return line.split(";");
    return line.split(",");
  });

  let startIndex = 0;
  const firstLine = parsedLines[0].map((c) => c.toLowerCase().trim());
  const isHeader = firstLine.some((c) =>
    /taksit|vade|tutar|anapara|faiz|bsmv|kkdf|açıklama|aciklama|no|ödeme|odeme/i.test(c)
  );

  const colMap = {
    no: -1,
    vade: -1,
    tutar: -1,
    anapara: -1,
    faiz: -1,
    bsmv: -1,
    kkdf: -1,
    desc: -1,
  };

  if (isHeader) {
    startIndex = 1;
    firstLine.forEach((col, idx) => {
      if (/^no|taksit\s*no|sıra|sira/i.test(col)) colMap.no = idx;
      else if (/vade|tarih/i.test(col)) colMap.vade = idx;
      else if (/anapara/i.test(col)) colMap.anapara = idx;
      else if (/faiz/i.test(col)) colMap.faiz = idx;
      else if (/bsmv/i.test(col)) colMap.bsmv = idx;
      else if (/kkdf/i.test(col)) colMap.kkdf = idx;
      else if (/tutar|taksit|toplam|ödeme|odeme/i.test(col) && colMap.tutar === -1) colMap.tutar = idx;
      else if (/açıklama|aciklama|tanım|tanim/i.test(col)) colMap.desc = idx;
    });
  }

  const result: CreditInstallment[] = [];
  const defaultDate = currentStart || new Date().toISOString().slice(0, 10);

  for (let i = startIndex; i < parsedLines.length; i++) {
    const cols = parsedLines[i].map((c) => c.trim());
    if (cols.every((c) => !c)) continue;

    let no = i - startIndex + 1;
    let dueDate: string | null = null;
    let amount = 0;
    let principal = 0;
    let interest = 0;
    let bsmv = 0;
    let kkdf = 0;
    let desc = `Taksit ${no}`;

    if (isHeader && (colMap.vade !== -1 || colMap.anapara !== -1 || colMap.tutar !== -1)) {
      if (colMap.no !== -1 && cols[colMap.no]) {
        const parsedNo = parseInt(cols[colMap.no], 10);
        if (!isNaN(parsedNo)) no = parsedNo;
      }
      if (colMap.vade !== -1) dueDate = parseTurkishDate(cols[colMap.vade]);
      if (colMap.tutar !== -1) amount = parseTurkishNumber(cols[colMap.tutar]);
      if (colMap.anapara !== -1) principal = parseTurkishNumber(cols[colMap.anapara]);
      if (colMap.faiz !== -1) interest = parseTurkishNumber(cols[colMap.faiz]);
      if (colMap.bsmv !== -1) bsmv = parseTurkishNumber(cols[colMap.bsmv]);
      if (colMap.kkdf !== -1) kkdf = parseTurkishNumber(cols[colMap.kkdf]);
      if (colMap.desc !== -1 && cols[colMap.desc]) desc = cols[colMap.desc];
    } else {
      let cIdx = 0;
      const maybeNo = parseInt(cols[0], 10);
      const isFirstColNo =
        !isNaN(maybeNo) &&
        maybeNo > 0 &&
        maybeNo < 500 &&
        !cols[0].includes(".") &&
        !cols[0].includes("-") &&
        !cols[0].includes("/");

      if (isFirstColNo) {
        no = maybeNo;
        cIdx = 1;
      }

      const maybeDate = parseTurkishDate(cols[cIdx]);
      if (maybeDate) {
        dueDate = maybeDate;
        cIdx++;
      }

      const numCols = cols.slice(cIdx).map(parseTurkishNumber);
      if (numCols.length >= 5) {
        amount = numCols[0];
        principal = numCols[1];
        interest = numCols[2];
        bsmv = numCols[3];
        kkdf = numCols[4];
        if (cols[cIdx + 5]) desc = cols[cIdx + 5];
      } else if (numCols.length === 4) {
        principal = numCols[0];
        interest = numCols[1];
        bsmv = numCols[2];
        kkdf = numCols[3];
        amount = principal + interest + bsmv + kkdf;
      } else if (numCols.length >= 1) {
        amount = numCols[0];
        if (numCols[1]) principal = numCols[1];
        if (numCols[2]) interest = numCols[2];
      }
    }

    if (!dueDate) {
      dueDate = addMonths(defaultDate, no - 1);
    }

    if (amount === 0 && (principal > 0 || interest > 0)) {
      amount = principal + interest + bsmv + kkdf;
    }

    result.push({
      installment_no: no,
      due_date: dueDate,
      amount,
      principal,
      interest_amt: interest,
      bsmv,
      kkdf,
      movement_desc: desc,
      is_paid: false,
      paid_amount: 0,
    });
  }

  return result;
}

const SAMPLE_EXCEL_TEMPLATE = `Taksit No\tVade Tarihi\tTaksit Tutarı\tAnapara\tFaiz\tBSMV\tKKDF\tHareket Açıklama
1\t2026-04-15\t12500,00\t10000,00\t2000,00\t250,00\t250,00\t1. Taksit Ödemesi
2\t2026-05-15\t12500,00\t10200,00\t1800,00\t250,00\t250,00\t2. Taksit Ödemesi
3\t2026-06-15\t12500,00\t10400,00\t1600,00\t250,00\t250,00\t3. Taksit Ödemesi
4\t2026-07-15\t12500,00\t10600,00\t1400,00\t250,00\t250,00\t4. Taksit Ödemesi
5\t2026-08-15\t12500,00\t10800,00\t1200,00\t250,00\t250,00\t5. Taksit Ödemesi
6\t2026-09-15\t12500,00\t11000,00\t1000,00\t250,00\t250,00\t6. Taksit Ödemesi`;

function buildInstallments(
  count: number,
  startDate: string | null,
  existing?: CreditInstallment[]
): CreditInstallment[] {
  const start = startDate || new Date().toISOString().slice(0, 10);
  const byNo = new Map((existing ?? []).map((r) => [r.installment_no, r]));
  return Array.from({ length: Math.max(1, count) }, (_, i) => {
    const no = i + 1;
    const prev = byNo.get(no);
    return {
      installment_no: no,
      amount: prev?.amount ?? 0,
      due_date: prev?.due_date ?? addMonths(start, i),
      principal: prev?.principal ?? 0,
      interest_amt: prev?.interest_amt ?? 0,
      bsmv: prev?.bsmv ?? 0,
      kkdf: prev?.kkdf ?? 0,
      movement_desc: prev?.movement_desc ?? `Taksit ${no}`,
      is_paid: prev?.is_paid ?? false,
      paid_amount: prev?.paid_amount ?? 0,
    };
  });
}

function emptyForm(branchId: number, recordTypeId: number): BankCreditPayload {
  const today = new Date().toISOString().slice(0, 10);
  return {
    code: "",
    description: "",
    contract_no: "",
    credit_type: "ISLETME",
    branch_id: branchId,
    record_type_id: recordTypeId,
    project_code: "",
    cost_center_code: "",
    special_code: "",
    credit_coa_id: null,
    bank_account_id: null,
    receipt_date: today,
    close_date: null,
    payment_start_date: today,
    installment_count: 12,
    accounting_mode: "TAKSITLER",
    create_bank_slip: false,
    installments: buildInstallments(12, today),
    account_maps: DEFAULT_ACCOUNT_MAPS.map((m) => ({ ...m })),
  };
}

function money(n: number) {
  return n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function BankaKredileriPage() {
  const branchId = useAppStore((s) => s.branchId);
  const recordTypeId = useAppStore((s) => s.recordTypeId);
  const branches = useAppStore((s) => s.branches);
  const recordTypes = useAppStore((s) => s.recordTypes);
  const defaultBranch = branchId ?? branches[0]?.id ?? 1;
  const defaultRt = recordTypeId ?? recordTypes[0]?.id ?? 1;

  const [items, setItems] = useState<BankCreditListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [bankaList, setBankaList] = useState<BankaLookup[]>([]);
  const [coaLabel, setCoaLabel] = useState("");
  const [mapCoaLabels, setMapCoaLabels] = useState<Record<string, string>>({});
  const [excelModalOpen, setExcelModalOpen] = useState(false);
  const [excelText, setExcelText] = useState("");
  const [pasteNotice, setPasteNotice] = useState<string | null>(null);
  const isPastingRef = useRef(false);

  const methods = useForm<BankCreditPayload>({
    defaultValues: emptyForm(defaultBranch, defaultRt),
  });
  const { register, handleSubmit, reset, setValue, watch } = methods;

  const installmentCount = watch("installment_count");
  const paymentStart = watch("payment_start_date");
  const installments = watch("installments") ?? [];
  const accountMaps = watch("account_maps") ?? [];
  const creditCoaId = watch("credit_coa_id");
  const bankAccountId = watch("bank_account_id");

  function applyPastedInstallments(newRows: CreditInstallment[]) {
    if (!newRows.length) return;
    isPastingRef.current = true;
    setValue("installment_count", newRows.length, { shouldDirty: true });
    setValue("installments", newRows, { shouldDirty: true });
    if (newRows[0]?.due_date) {
      setValue("payment_start_date", newRows[0].due_date, { shouldDirty: true });
    }
    setPasteNotice(`✅ ${newRows.length} taksit satırı başarıyla aktarıldı.`);
    setTimeout(() => {
      isPastingRef.current = false;
      setPasteNotice(null);
    }, 4500);
  }

  function handleTablePaste(e: React.ClipboardEvent) {
    const text = e.clipboardData?.getData("text");
    if (!text) return;
    if (text.includes("\t") || text.includes("\n") || text.includes(";")) {
      const parsed = parseExcelInstallments(text, paymentStart);
      if (parsed.length > 0) {
        e.preventDefault();
        applyPastedInstallments(parsed);
      }
    }
  }

  function addInstallmentRow() {
    const nextNo = installments.length + 1;
    const lastDate = installments[installments.length - 1]?.due_date || paymentStart || new Date().toISOString().slice(0, 10);
    const newDueDate = addMonths(lastDate, 1);
    const newRow: CreditInstallment = {
      installment_no: nextNo,
      amount: 0,
      due_date: newDueDate,
      principal: 0,
      interest_amt: 0,
      bsmv: 0,
      kkdf: 0,
      movement_desc: `Taksit ${nextNo}`,
      is_paid: false,
      paid_amount: 0,
    };
    isPastingRef.current = true;
    const updated = [...installments, newRow];
    setValue("installment_count", updated.length, { shouldDirty: true });
    setValue("installments", updated, { shouldDirty: true });
    setTimeout(() => {
      isPastingRef.current = false;
    }, 50);
  }

  function removeInstallmentRow(idx: number) {
    if (installments.length <= 1) return;
    const filtered = installments.filter((_, i) => i !== idx).map((r, i) => ({
      ...r,
      installment_no: i + 1,
    }));
    isPastingRef.current = true;
    setValue("installment_count", filtered.length, { shouldDirty: true });
    setValue("installments", filtered, { shouldDirty: true });
    setTimeout(() => {
      isPastingRef.current = false;
    }, 50);
  }

  function clearAllInstallments() {
    isPastingRef.current = true;
    const single: CreditInstallment[] = [
      {
        installment_no: 1,
        amount: 0,
        due_date: paymentStart || new Date().toISOString().slice(0, 10),
        principal: 0,
        interest_amt: 0,
        bsmv: 0,
        kkdf: 0,
        movement_desc: "Taksit 1",
        is_paid: false,
        paid_amount: 0,
      },
    ];
    setValue("installment_count", 1, { shouldDirty: true });
    setValue("installments", single, { shouldDirty: true });
    setTimeout(() => {
      isPastingRef.current = false;
    }, 50);
  }

  function copySampleExcelTemplate() {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(SAMPLE_EXCEL_TEMPLATE);
      setPasteNotice("📋 Örnek Excel şablonu panoya kopyalandı! Excel'e yapıştırıp düzenleyebilirsiniz.");
      setTimeout(() => setPasteNotice(null), 4000);
    }
  }

  const summary = useMemo(() => {
    const payable = installments.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const paid = installments.reduce((s, r) => s + (Number(r.paid_amount) || 0), 0);
    const receipt = watch("receipt_date");
    let avg: number | null = null;
    const dues = installments.map((r) => r.due_date).filter(Boolean) as string[];
    if (dues.length && receipt) {
      const base = new Date(receipt + "T00:00:00").getTime();
      const days = dues.map((d) => (new Date(d + "T00:00:00").getTime() - base) / 86400000);
      avg = days.reduce((a, b) => a + b, 0) / days.length;
    }
    return { payable, paid, remaining: payable - paid, avg };
  }, [installments, watch]);

  async function load() {
    setLoading(true);
    try {
      const res = await bankaKredileriApi.list({ branch_id: branchId ?? undefined });
      setItems(res.items ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Liste alınamadı");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [branchId]);

  useEffect(() => {
    bankaIslemleriApi
      .lookupBanka({ branch_id: branchId ?? undefined })
      .then((res) => setBankaList(res.items ?? []))
      .catch(() => setBankaList([]));
  }, [branchId]);

  useEffect(() => {
    if (!formOpen || isPastingRef.current) return;
    const count = Number(installmentCount) || 1;
    const next = buildInstallments(count, paymentStart, installments);
    if (next.length !== installments.length) {
      setValue("installments", next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [installmentCount, paymentStart, formOpen]);

  async function openForm(id: number | null) {
    setSelectedId(id);
    setCoaLabel("");
    setMapCoaLabels({});
    if (id) {
      const d = await bankaKredileriApi.get(id);
      reset({
        code: d.code,
        description: d.description ?? "",
        contract_no: d.contract_no ?? "",
        credit_type: d.credit_type as CreditType,
        branch_id: d.branch_id,
        record_type_id: d.record_type_id,
        project_code: d.project_code ?? "",
        cost_center_code: d.cost_center_code ?? "",
        special_code: d.special_code ?? "",
        credit_coa_id: d.credit_coa_id,
        bank_account_id: d.bank_account_id,
        receipt_date: d.receipt_date ? String(d.receipt_date).slice(0, 10) : null,
        close_date: d.close_date ? String(d.close_date).slice(0, 10) : null,
        payment_start_date: d.payment_start_date
          ? String(d.payment_start_date).slice(0, 10)
          : null,
        installment_count: d.installment_count,
        accounting_mode: d.accounting_mode,
        create_bank_slip: d.create_bank_slip,
        installments: (d.installments ?? []).map((r) => ({
          ...r,
          amount: Number(r.amount) || 0,
          principal: Number(r.principal) || 0,
          interest_amt: Number(r.interest_amt) || 0,
          bsmv: Number(r.bsmv) || 0,
          kkdf: Number(r.kkdf) || 0,
          paid_amount: Number(r.paid_amount) || 0,
          due_date: r.due_date ? String(r.due_date).slice(0, 10) : null,
        })),
        account_maps:
          d.account_maps?.length > 0
            ? d.account_maps.map((m) => ({
                ...m,
                coa_id: m.coa_id ?? null,
              }))
            : DEFAULT_ACCOUNT_MAPS.map((m) => ({ ...m })),
      });
      if (d.credit_coa_code) setCoaLabel(`${d.credit_coa_code} — ${d.credit_coa_name ?? ""}`);
      const labels: Record<string, string> = {};
      for (const m of d.account_maps ?? []) {
        if (m.coa_code) labels[m.map_key] = `${m.coa_code} — ${m.coa_name ?? ""}`;
      }
      setMapCoaLabels(labels);
    } else {
      reset(emptyForm(defaultBranch, defaultRt));
    }
    setFormOpen(true);
  }

  function patchInstallment(idx: number, patch: Partial<CreditInstallment>) {
    const rows = [...installments];
    rows[idx] = { ...rows[idx], ...patch };
    if (patch.principal != null || patch.interest_amt != null || patch.bsmv != null || patch.kkdf != null) {
      const r = rows[idx];
      rows[idx] = {
        ...r,
        amount:
          (Number(r.principal) || 0) +
          (Number(r.interest_amt) || 0) +
          (Number(r.bsmv) || 0) +
          (Number(r.kkdf) || 0),
      };
    }
    setValue("installments", rows, { shouldDirty: true });
  }

  function patchMap(idx: number, patch: Partial<CreditAccountMap>) {
    const rows = [...accountMaps];
    rows[idx] = { ...rows[idx], ...patch };
    setValue("account_maps", rows, { shouldDirty: true });
  }

  async function onSave(values: BankCreditPayload) {
    setSaving(true);
    setError(null);
    try {
      const body: BankCreditPayload = {
        ...values,
        code: values.code.trim().toUpperCase(),
        description: values.description || null,
        contract_no: values.contract_no || null,
        project_code: values.project_code || null,
        cost_center_code: values.cost_center_code || null,
        special_code: values.special_code || null,
        installments: values.installments.map((r) => ({
          ...r,
          movement_desc: r.movement_desc || null,
        })),
      };
      if (selectedId) await bankaKredileriApi.update(selectedId, body);
      else await bankaKredileriApi.create(body);
      setFormOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kayıt hatası");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: number) {
    if (!window.confirm("Krediyi silmek istiyor musunuz?")) return;
    await bankaKredileriApi.remove(id);
    await load();
  }

  const codeValues: CodeSelectValues = {
    project_code: watch("project_code") ?? "",
    cost_center_code: watch("cost_center_code") ?? "",
    special_code: watch("special_code") ?? "",
  };

  return (
    <>
      <div className="header-bar">
        <div className="header-breadcrumb">Finans / Banka Kredileri</div>
        <div className="header-btns">
          <button type="button" className="btn-save" onClick={() => void openForm(null)}>
            + Yeni Kredi
          </button>
        </div>
      </div>

      {error && !formOpen ? <div className="alert alert-error">{error}</div> : null}

      <div className="fis-box">
        {loading ? (
          <p>Yükleniyor…</p>
        ) : (
          <table className="data-table" style={{ width: "100%", fontSize: 13 }}>
            <thead>
              <tr>
                <th>Kod</th>
                <th>Açıklama</th>
                <th>Tür</th>
                <th>Taksit</th>
                <th>Ödenecek</th>
                <th>Kalan</th>
                <th>Yevmiye</th>
                <th style={{ textAlign: "right" }}>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", color: "#94a3b8", padding: 20 }}>
                    Kayıt yok
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <code>{row.code}</code>
                    </td>
                    <td>{row.description || "—"}</td>
                    <td>{CREDIT_TYPE_OPTIONS.find((o) => o.value === row.credit_type)?.label ?? row.credit_type}</td>
                    <td>{row.installment_count}</td>
                    <td>{money(Number(row.total_payable))}</td>
                    <td>{money(Number(row.remaining))}</td>
                    <td>{row.yevmiye_fis_no || "—"}</td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ fontSize: 11, marginRight: 4 }}
                        onClick={() => void openForm(row.id)}
                      >
                        Değiştir
                      </button>
                      <button
                        type="button"
                        className="btn-cancel"
                        style={{ fontSize: 11 }}
                        onClick={() => void onDelete(row.id)}
                      >
                        Sil
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      <FormSlideOver
        open={formOpen}
        title={selectedId ? "Kredi Düzenle" : "Yeni Banka Kredisi"}
        onClose={() => setFormOpen(false)}
        width="min(960px, 98vw)"
      >
        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSave)}>
            {error ? <div className="alert alert-error">{error}</div> : null}

            <div className="ayar-form-card" style={{ marginBottom: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0 12px" }}>
                <div className="form-row">
                  <label>Kredi Kodu</label>
                  <input
                    className="form-control"
                    disabled={!!selectedId}
                    maxLength={32}
                    {...register("code", { required: true })}
                  />
                </div>
                <div className="form-row">
                  <label>Sözleşme No</label>
                  <input className="form-control" {...register("contract_no")} />
                </div>
                <div className="form-row">
                  <label>Kredi Türü</label>
                  <select className="form-control" {...register("credit_type")}>
                    {CREDIT_TYPE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <label>Açıklama</label>
                <input className="form-control" {...register("description")} />
              </div>
              <BranchRecordTypeFields variant="form-row" />
              <CodeSelectFields
                entityType="BANK"
                showGroupSpecial
                showProject
                showCostCenter
                values={codeValues}
                onChange={(p) => {
                  if (p.project_code !== undefined) setValue("project_code", p.project_code || "");
                  if (p.cost_center_code !== undefined)
                    setValue("cost_center_code", p.cost_center_code || "");
                  if (p.special_code !== undefined) setValue("special_code", p.special_code || "");
                }}
              />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="form-row">
                  <label>Kredi Muhasebe Hesabı</label>
                  <ChartOfAccountsPicker
                    value={creditCoaId}
                    displayLabel={coaLabel}
                    onChange={(id, item) => {
                      setValue("credit_coa_id", id, { shouldDirty: true });
                      setCoaLabel(item ? formatCoaDisplay(item) : "");
                    }}
                    initialSearch="300"
                  />
                </div>
                <div className="form-row">
                  <label>Kredi Banka Hesabı</label>
                  <select
                    className="form-control"
                    value={bankAccountId ?? ""}
                    onChange={(e) =>
                      setValue("bank_account_id", e.target.value ? Number(e.target.value) : null, {
                        shouldDirty: true,
                      })
                    }
                  >
                    <option value="">— Seçin —</option>
                    {bankaList.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.code} — {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
                <div className="form-row">
                  <label>Alınış Tarihi</label>
                  <input type="date" className="form-control" {...register("receipt_date")} />
                </div>
                <div className="form-row">
                  <label>Kapanış Tarihi</label>
                  <input type="date" className="form-control" {...register("close_date")} />
                </div>
                <div className="form-row">
                  <label>Ödeme Başlangıç</label>
                  <input type="date" className="form-control" {...register("payment_start_date")} />
                </div>
                <div className="form-row">
                  <label>Taksit Sayısı</label>
                  <input
                    type="number"
                    min={1}
                    max={360}
                    className="form-control"
                    {...register("installment_count", { valueAsNumber: true })}
                  />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="form-row">
                  <label>Muhasebeleştirme şekli</label>
                  <select className="form-control" {...register("accounting_mode")}>
                    <option value="TAKSITLER">Taksitler</option>
                    <option value="TOPLAM">Toplam</option>
                  </select>
                </div>
                <div className="form-row">
                  <label>Banka Fişi oluştur</label>
                  <select
                    className="form-control"
                    value={watch("create_bank_slip") ? "1" : "0"}
                    onChange={(e) =>
                      setValue("create_bank_slip", e.target.value === "1", { shouldDirty: true })
                    }
                  >
                    <option value="0">Hayır</option>
                    <option value="1">Evet</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="ayar-form-card" style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#1e293b" }}>
                    📋 Kredi Taksitleri (Excel Uyumlu Veri Girişi)
                  </h4>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                    Excel'den kopyaladığınız taksitleri doğrudan tabloya (Ctrl+V) yapıştırabilir veya toplu yapıştırma sihirbazını kullanabilirsiniz.
                  </div>
                </div>

                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ fontSize: 12, padding: "5px 11px", display: "inline-flex", alignItems: "center", gap: 4 }}
                    onClick={() => {
                      setExcelText("");
                      setExcelModalOpen(true);
                    }}
                  >
                    📋 Excel'den Toplu Yapıştır
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ fontSize: 12, padding: "5px 11px" }}
                    onClick={copySampleExcelTemplate}
                    title="Excel'e yapıştırıp veri doldurmak için hazır şablonu kopyalar"
                  >
                    📥 Örnek Şablon Kopyala
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ fontSize: 12, padding: "5px 11px" }}
                    onClick={addInstallmentRow}
                  >
                    ➕ Satır Ekle
                  </button>
                  <button
                    type="button"
                    className="btn-cancel"
                    style={{ fontSize: 12, padding: "5px 9px" }}
                    onClick={clearAllInstallments}
                    title="Tablodaki taksitleri sıfırlar"
                  >
                    🗑️ Temizle
                  </button>
                </div>
              </div>

              {pasteNotice && (
                <div
                  style={{
                    background: "#ecfdf5",
                    border: "1px solid #6ee7b7",
                    borderRadius: 8,
                    padding: "8px 12px",
                    marginBottom: 10,
                    fontSize: 12,
                    color: "#065f46",
                    fontWeight: 600,
                  }}
                >
                  {pasteNotice}
                </div>
              )}

              <div
                style={{
                  overflowX: "auto",
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  background: "#fff",
                }}
                onPaste={handleTablePaste}
                tabIndex={0}
                title="Excel'den kopyaladığınız verileri buraya yapıştırmak için Ctrl+V tuşlarına basabilirsiniz."
              >
                <table className="data-table" style={{ width: "100%", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: "#f8fafc" }}>
                      <th style={{ width: 45, textAlign: "center" }}>No</th>
                      <th style={{ minWidth: 105 }}>Toplam Taksit</th>
                      <th style={{ minWidth: 135 }}>Vade Tarihi</th>
                      <th style={{ minWidth: 95 }}>Anapara</th>
                      <th style={{ minWidth: 90 }}>Faiz</th>
                      <th style={{ minWidth: 80 }}>BSMV</th>
                      <th style={{ minWidth: 80 }}>KKDF</th>
                      <th style={{ minWidth: 140 }}>Hareket Açıklama</th>
                      <th style={{ width: 45, textAlign: "center" }}>İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {installments.map((row, idx) => (
                      <tr key={row.installment_no}>
                        <td style={{ textAlign: "center", fontWeight: 700, color: "#64748b" }}>
                          {row.installment_no}
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.01"
                            className="form-control"
                            style={{ width: "100%", fontWeight: 700, color: "#0f172a" }}
                            value={row.amount ?? 0}
                            onChange={(e) =>
                              patchInstallment(idx, { amount: Number(e.target.value) || 0 })
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="date"
                            className="form-control"
                            style={{ width: "100%" }}
                            value={row.due_date ?? ""}
                            onChange={(e) =>
                              patchInstallment(idx, { due_date: e.target.value || null })
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.01"
                            className="form-control"
                            style={{ width: "100%" }}
                            value={row.principal ?? 0}
                            onChange={(e) =>
                              patchInstallment(idx, { principal: Number(e.target.value) || 0 })
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.01"
                            className="form-control"
                            style={{ width: "100%" }}
                            value={row.interest_amt ?? 0}
                            onChange={(e) =>
                              patchInstallment(idx, { interest_amt: Number(e.target.value) || 0 })
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.01"
                            className="form-control"
                            style={{ width: "100%" }}
                            value={row.bsmv ?? 0}
                            onChange={(e) =>
                              patchInstallment(idx, { bsmv: Number(e.target.value) || 0 })
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.01"
                            className="form-control"
                            style={{ width: "100%" }}
                            value={row.kkdf ?? 0}
                            onChange={(e) =>
                              patchInstallment(idx, { kkdf: Number(e.target.value) || 0 })
                            }
                          />
                        </td>
                        <td>
                          <input
                            className="form-control"
                            style={{ width: "100%" }}
                            value={row.movement_desc ?? ""}
                            onChange={(e) =>
                              patchInstallment(idx, { movement_desc: e.target.value })
                            }
                          />
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <button
                            type="button"
                            className="btn-cancel"
                            style={{ padding: "2px 6px", fontSize: 11 }}
                            title="Bu satırı sil"
                            onClick={() => removeInstallmentRow(idx)}
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: 10,
                  marginTop: 12,
                }}
              >
                {[
                  { label: "Toplam Ödenecek", value: summary.payable, color: "#0f172a" },
                  { label: "Ödenen Tutar", value: summary.paid, color: "#16a34a" },
                  { label: "Kalan Borç", value: summary.remaining, color: "#dc2626" },
                  {
                    label: "Ortalama Vade (gün)",
                    value: summary.avg != null ? Math.round(summary.avg) : null,
                    color: "#2563eb",
                  },
                ].map((s) => (
                  <div
                    key={s.label}
                    style={{
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: 10,
                      padding: "10px 12px",
                    }}
                  >
                    <div style={{ fontSize: 11, color: "#64748b" }}>{s.label}</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: s.color }}>
                      {s.value == null
                        ? "—"
                        : typeof s.value === "number" && s.label.includes("gün")
                        ? `${s.value} gün`
                        : money(Number(s.value))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* EXCEL'DEN TOPLU YAPIŞTIR MODAL */}
            {excelModalOpen && (
              <div
                style={{
                  position: "fixed",
                  inset: 0,
                  backgroundColor: "rgba(15, 23, 42, 0.6)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 9999,
                  padding: 16,
                }}
                onClick={() => setExcelModalOpen(false)}
              >
                <div
                  style={{
                    background: "#fff",
                    borderRadius: 12,
                    maxWidth: 720,
                    width: "100%",
                    maxHeight: "90vh",
                    overflowY: "auto",
                    padding: 20,
                    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#1e293b" }}>
                      📊 Excel'den Kredi Taksitlerini Kopyala &amp; Yapıştır
                    </h3>
                    <button
                      type="button"
                      className="btn-cancel"
                      style={{ padding: "4px 8px" }}
                      onClick={() => setExcelModalOpen(false)}
                    >
                      ✕ Kapat
                    </button>
                  </div>

                  <p style={{ margin: "0 0 10px", fontSize: 12, color: "#475569" }}>
                    Banka ödeme planı veya Excel çalışma sayfanızdaki taksit sütunlarını kopyalayıp (Ctrl+C), aşağıdaki alana yapıştırın (Ctrl+V).
                    Sistem sütunları (No, Vade, Tutar, Anapara, Faiz, BSMV, KKDF) otomatik ayrıştıracaktır.
                  </p>

                  <textarea
                    className="form-control"
                    rows={8}
                    style={{
                      width: "100%",
                      fontFamily: "monospace",
                      fontSize: 12,
                      whiteSpace: "pre",
                      lineHeight: 1.5,
                      marginBottom: 12,
                    }}
                    placeholder={`Örnek Format (Tab ile ayrılmış sütunlar):\n1\t2026-04-15\t12500,00\t10000,00\t2000,00\t250,00\t250,00\t1. Taksit\n2\t2026-05-15\t12500,00\t10200,00\t1800,00\t250,00\t250,00\t2. Taksit`}
                    value={excelText}
                    onChange={(e) => setExcelText(e.target.value)}
                    autoFocus
                  />

                  {/* Parse Preview */}
                  {(() => {
                    const parsed = parseExcelInstallments(excelText, paymentStart);
                    const totalTutar = parsed.reduce((s, r) => s + r.amount, 0);
                    const totalAna = parsed.reduce((s, r) => s + r.principal, 0);
                    const totalFaiz = parsed.reduce((s, r) => s + r.interest_amt, 0);

                    return (
                      <div>
                        <div
                          style={{
                            background: parsed.length ? "#eff6ff" : "#f8fafc",
                            border: "1px solid",
                            borderColor: parsed.length ? "#bfdbfe" : "#e2e8f0",
                            borderRadius: 8,
                            padding: "10px 12px",
                            marginBottom: 14,
                            fontSize: 12,
                          }}
                        >
                          <div style={{ fontWeight: 700, color: parsed.length ? "#1e40af" : "#64748b" }}>
                            🔍 Önizleme Durumu: {parsed.length} Taksit Satırı Algılandı
                          </div>
                          {parsed.length > 0 && (
                            <div style={{ marginTop: 6, display: "flex", gap: 16, flexWrap: "wrap", color: "#1e3a8a" }}>
                              <span>Toplam Tutar: <strong>₺{money(totalTutar)}</strong></span>
                              <span>Toplam Anapara: <strong>₺{money(totalAna)}</strong></span>
                              <span>Toplam Faiz: <strong>₺{money(totalFaiz)}</strong></span>
                              <span>İlk Vade: <strong>{parsed[0]?.due_date}</strong></span>
                              <span>Son Vade: <strong>{parsed[parsed.length - 1]?.due_date}</strong></span>
                            </div>
                          )}
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ fontSize: 12 }}
                            onClick={() => setExcelText(SAMPLE_EXCEL_TEMPLATE)}
                          >
                            📝 Örnek Veri Doldur
                          </button>

                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              type="button"
                              className="btn-cancel"
                              onClick={() => setExcelModalOpen(false)}
                            >
                              Vazgeç
                            </button>
                            <button
                              type="button"
                              className="btn-save"
                              disabled={parsed.length === 0}
                              onClick={() => {
                                applyPastedInstallments(parsed);
                                setExcelModalOpen(false);
                              }}
                            >
                              ✓ Taksit Tablosuna Aktar ({parsed.length} Satır)
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            <div className="ayar-form-card" style={{ marginBottom: 14 }}>
              <h4 style={{ margin: "0 0 10px", fontSize: 14 }}>Muhasebe Hesap Kaydı</h4>
              <table className="data-table" style={{ width: "100%", fontSize: 12 }}>
                <thead>
                  <tr>
                    <th>Hesap</th>
                    <th>COA</th>
                    <th>Çalışma</th>
                    <th>Kaynak</th>
                    <th>Hesaplama</th>
                  </tr>
                </thead>
                <tbody>
                  {accountMaps.map((row, idx) => (
                    <tr key={row.map_key}>
                      <td style={{ whiteSpace: "nowrap" }}>{row.label}</td>
                      <td style={{ minWidth: 180 }}>
                        <ChartOfAccountsPicker
                          value={row.coa_id}
                          displayLabel={mapCoaLabels[row.map_key] ?? ""}
                          hideActions
                          onChange={(id, item) => {
                            patchMap(idx, { coa_id: id });
                            setMapCoaLabels((prev) => ({
                              ...prev,
                              [row.map_key]: item ? formatCoaDisplay(item) : "",
                            }));
                          }}
                        />
                      </td>
                      <td>
                        <select
                          className="form-control"
                          value={row.work_type ?? "BORC"}
                          onChange={(e) =>
                            patchMap(idx, { work_type: e.target.value as WorkType })
                          }
                        >
                          <option value="BORC">Borç</option>
                          <option value="ALACAK">Alacak</option>
                        </select>
                      </td>
                      <td>
                        <select
                          className="form-control"
                          value={row.source_field ?? "ANAPARA"}
                          onChange={(e) =>
                            patchMap(idx, { source_field: e.target.value as SourceField })
                          }
                        >
                          <option value="ANAPARA">Anapara</option>
                          <option value="FAIZ">Faiz</option>
                          <option value="BSMV">BSMV</option>
                          <option value="KKDF">KKDF</option>
                        </select>
                      </td>
                      <td>
                        <select
                          className="form-control"
                          value={row.calc_type ?? "TOPLAM"}
                          onChange={(e) =>
                            patchMap(idx, { calc_type: e.target.value as CalcType })
                          }
                        >
                          <option value="TOPLAM">Toplam</option>
                          <option value="TAKSITLER">Taksitler</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <FormActionFooter>
              <button type="button" className="btn-cancel" disabled={saving} onClick={() => setFormOpen(false)}>
                Vazgeç
              </button>
              <button type="submit" className="btn-save" disabled={saving}>
                {saving ? "Kaydediliyor…" : "Kaydet"}
              </button>
            </FormActionFooter>
          </form>
        </FormProvider>
      </FormSlideOver>
    </>
  );
}
