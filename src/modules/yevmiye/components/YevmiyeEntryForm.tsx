import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import {
  ChartOfAccountsPicker,
  type ChartOfAccountsPickerHandle,
} from "@/components/ChartOfAccountsPicker";
import { api } from "@/services/api";
import { kodTanimlariApi, type CodeMasterEntry } from "@/modules/kod-tanimlari/api/kodTanimlariApi";
import { useAppStore } from "@/store/appStore";
import { yevmiyeApi } from "../api/yevmiyeApi";

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  /** Düzenleme: mevcut fiş id — ekle formuyla aynı ekran */
  voucherId?: number | null;
};

type CurrencyCode = "TRY" | "USD" | "EUR" | "GBP";

type LookupOption = { code: string; name: string };

type EntryRow = {
  line_no: number;
  coa_id: number | null;
  coa_code: string;
  coa_name: string;
  description: string;
  belge_no: string;
  debit: string;
  credit: string;
  fx_debit: string;
  fx_credit: string;
  currency: CurrencyCode;
  cost_center: string;
  cost_center_name: string;
  project_code: string;
  project_name: string;
  special_code: string;
  special_code2: string;
  qty: string;
  index_val: string;
  invoice_no: string;
  party_title: string;
  tax_no: string;
  national_id: string;
};

type ColKey =
  | "rowNo"
  | "hesapKodu"
  | "adi"
  | "aciklama"
  | "belgeNo"
  | "borc"
  | "alacak"
  | "dovizliBorc"
  | "dovizliAlacak"
  | "doviz"
  | "masrafMerkezi"
  | "masrafMerkeziAd"
  | "projeKodu"
  | "projeAciklama"
  | "ozelKod"
  | "ozelKod2"
  | "miktar"
  | "endeks"
  | "faturaNo"
  | "chUnvan"
  | "vergiNo"
  | "tcKimlik";

const COLS_LS_KEY = "tabia.yevmiye.cols.v1";
const WIDTHS_LS_KEY = "tabia.yevmiye.colWidths.v1";

const FX_RATES: Record<CurrencyCode, number> = {
  TRY: 1,
  USD: 34,
  EUR: 37,
  GBP: 43,
};

const VOUCHER_TYPES = [
  "Açılış Fişi",
  "Tahsil Fişi",
  "Tediye Fişi",
  "Mahsup Fişi",
  "Kur Farkı Fişi",
  "Özel Fiş",
  "Kapanış Fişi",
  "Enflasyon Muhasebe Fişi",
  "TFRS Düzeltme Fişi",
] as const;

const COL_DEFS: Array<{ key: ColKey; label: string; alwaysOn?: boolean; optional?: boolean }> = [
  { key: "rowNo", label: "No", alwaysOn: true },
  { key: "hesapKodu", label: "Hesap Kodu" },
  { key: "adi", label: "Adı" },
  { key: "aciklama", label: "Açıklama" },
  { key: "belgeNo", label: "Belge No" },
  { key: "borc", label: "Borç" },
  { key: "alacak", label: "Alacak" },
  { key: "dovizliBorc", label: "Dövizli Borç", optional: true },
  { key: "dovizliAlacak", label: "Dövizli Alacak", optional: true },
  { key: "doviz", label: "Döviz", optional: true },
  { key: "masrafMerkezi", label: "Masraf Merkezi", optional: true },
  { key: "masrafMerkeziAd", label: "Masraf Merkezi Ad", optional: true },
  { key: "projeKodu", label: "Proje Kodu", optional: true },
  { key: "projeAciklama", label: "Proje Açıklama", optional: true },
  { key: "ozelKod", label: "Özel Kod", optional: true },
  { key: "ozelKod2", label: "Özel Kod 2", optional: true },
  { key: "miktar", label: "Miktar", optional: true },
  { key: "endeks", label: "Endeks", optional: true },
  { key: "faturaNo", label: "Fatura No", optional: true },
  { key: "chUnvan", label: "C/H Ünvan", optional: true },
  { key: "vergiNo", label: "Vergi No", optional: true },
  { key: "tcKimlik", label: "TC Kimlik", optional: true },
];

const DEFAULT_COL_WIDTHS: Partial<Record<ColKey, number>> = {
  rowNo: 48,
  hesapKodu: 140,
  adi: 160,
  aciklama: 180,
  belgeNo: 100,
  borc: 100,
  alacak: 100,
  dovizliBorc: 100,
  dovizliAlacak: 100,
  doviz: 72,
  masrafMerkezi: 120,
  masrafMerkeziAd: 140,
  projeKodu: 110,
  projeAciklama: 140,
  ozelKod: 100,
  ozelKod2: 100,
  miktar: 80,
  endeks: 80,
  faturaNo: 100,
  chUnvan: 140,
  vergiNo: 100,
  tcKimlik: 110,
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function emptyRow(lineNo: number): EntryRow {
  return {
    line_no: lineNo,
    coa_id: null,
    coa_code: "",
    coa_name: "",
    description: "",
    belge_no: "",
    debit: "",
    credit: "",
    fx_debit: "",
    fx_credit: "",
    currency: "TRY",
    cost_center: "",
    cost_center_name: "",
    project_code: "",
    project_name: "",
    special_code: "",
    special_code2: "",
    qty: "",
    index_val: "",
    invoice_no: "",
    party_title: "",
    tax_no: "",
    national_id: "",
  };
}

function initialCols(): Record<ColKey, boolean> {
  const vis = {} as Record<ColKey, boolean>;
  for (const c of COL_DEFS) {
    vis[c.key] = c.alwaysOn ? true : !c.optional;
  }
  return vis;
}

function loadColsFromStorage(): Record<ColKey, boolean> {
  const base = initialCols();
  try {
    const raw = localStorage.getItem(COLS_LS_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<Record<ColKey, boolean>>;
    for (const c of COL_DEFS) {
      if (c.alwaysOn) {
        base[c.key] = true;
      } else if (typeof parsed[c.key] === "boolean") {
        base[c.key] = parsed[c.key]!;
      }
    }
  } catch {
    /* ignore */
  }
  return base;
}

function loadWidthsFromStorage(): Partial<Record<ColKey, number>> {
  try {
    const raw = localStorage.getItem(WIDTHS_LS_KEY);
    if (!raw) return { ...DEFAULT_COL_WIDTHS };
    const parsed = JSON.parse(raw) as Partial<Record<ColKey, number>>;
    return { ...DEFAULT_COL_WIDTHS, ...parsed };
  } catch {
    return { ...DEFAULT_COL_WIDTHS };
  }
}

function num(v: string): number {
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function fmt(n: number): string {
  return n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function round2(n: number): string {
  return (Math.round(n * 100) / 100).toFixed(2);
}

function asLookupList(raw: unknown): LookupOption[] {
  if (!raw || typeof raw !== "object") return [];
  const obj = raw as { items?: unknown[]; data?: unknown[] };
  const arr = Array.isArray(raw) ? raw : Array.isArray(obj.items) ? obj.items : Array.isArray(obj.data) ? obj.data : [];
  const out: LookupOption[] = [];
  for (const row of arr) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const code = String(r.code ?? r.cost_center_code ?? r.project_code ?? r.id ?? "").trim();
    if (!code) continue;
    const name = String(r.name ?? r.title ?? r.description ?? r.cost_center_name ?? "").trim();
    out.push({ code, name: name || code });
  }
  return out;
}

export function YevmiyeEntryForm({ open, onClose, onSaved, voucherId = null }: Props) {
  const branchId = useAppStore((s) => s.branchId);
  const recordTypeId = useAppStore((s) => s.recordTypeId);
  const branches = useAppStore((s) => s.branches);
  const isEdit = voucherId != null;

  const [voucherDate, setVoucherDate] = useState(todayIso);
  const [editDate, setEditDate] = useState(todayIso);
  const [documentNo, setDocumentNo] = useState("");
  const [voucherType, setVoucherType] = useState<string>("Mahsup Fişi");
  const [specialCode, setSpecialCode] = useState("");
  const [projectCode, setProjectCode] = useState("");
  const [formBranchId, setFormBranchId] = useState<number | "">(branchId ?? "");
  const [description, setDescription] = useState("");
  const [cols, setCols] = useState<Record<ColKey, boolean>>(loadColsFromStorage);
  const [colWidths, setColWidths] = useState<Partial<Record<ColKey, number>>>(loadWidthsFromStorage);
  const [rows, setRows] = useState<EntryRow[]>(() =>
    Array.from({ length: 8 }, (_, i) => emptyRow(i + 1))
  );
  const [saving, setSaving] = useState(false);
  const [focusedRow, setFocusedRow] = useState(0);

  const [specialOptions, setSpecialOptions] = useState<CodeMasterEntry[]>([]);
  const [projectOptions, setProjectOptions] = useState<LookupOption[]>([]);
  const [costCenterOptions, setCostCenterOptions] = useState<LookupOption[]>([]);

  const coaRefs = useRef<Array<ChartOfAccountsPickerHandle | null>>([]);
  const sharedCoaRef = useRef<ChartOfAccountsPickerHandle | null>(null);
  const [coaEditIndex, setCoaEditIndex] = useState(0);

  useEffect(() => {
    if (!open) return;
    setFormBranchId(branchId ?? "");
    if (!voucherId) {
      setVoucherDate(todayIso());
      setEditDate(todayIso());
      setDocumentNo("");
      setDescription("");
      setSpecialCode("");
      setProjectCode("");
      setRows(Array.from({ length: 8 }, (_, i) => emptyRow(i + 1)));
    }
  }, [open, branchId, voucherId]);

  useEffect(() => {
    if (!open || !voucherId) return;
    let cancelled = false;
    (async () => {
      try {
        const v = await yevmiyeApi.getVoucher(voucherId);
        if (cancelled) return;
        setVoucherDate(String(v.voucher_date).slice(0, 10));
        setEditDate(todayIso());
        setDocumentNo(String((v as { document_no?: string }).document_no ?? ""));
        setDescription(v.description ?? "");
        setSpecialCode(String((v as { special_code?: string }).special_code ?? ""));
        setProjectCode(String((v as { project_code?: string }).project_code ?? ""));
        const rawBid = (v as { branch_id?: number | string }).branch_id;
        setFormBranchId(typeof rawBid === "number" ? rawBid : rawBid ? Number(rawBid) : (branchId ?? ""));
        setVoucherType(String((v as { voucher_type?: string }).voucher_type ?? "Mahsup Fişi"));
        const lines = (v.lines ?? []) as Array<Record<string, unknown>>;
        if (lines.length) {
          setRows(
            lines.map((ln, i) => ({
              ...emptyRow(i + 1),
              coa_id: (ln.coa_id as number) ?? null,
              coa_code: String(ln.coa_code ?? ""),
              coa_name: String(ln.coa_name ?? ""),
              description: String(ln.description ?? ""),
              debit: String(ln.debit ?? ""),
              credit: String(ln.credit ?? ""),
              currency: (String(ln.currency_code ?? "TRY") as CurrencyCode) || "TRY",
              fx_debit: String(ln.fx_debit ?? ""),
              fx_credit: String(ln.fx_credit ?? ""),
              cost_center: String(ln.cost_center ?? ""),
              project_code: String(ln.project_code ?? ""),
              special_code: String(ln.special_code ?? ""),
            }))
          );
        }
      } catch (e) {
        window.alert(e instanceof Error ? e.message : "Fiş yüklenemedi");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, voucherId, branchId]);

  useEffect(() => {
    try {
      localStorage.setItem(COLS_LS_KEY, JSON.stringify(cols));
    } catch {
      /* ignore */
    }
  }, [cols]);

  useEffect(() => {
    try {
      localStorage.setItem(WIDTHS_LS_KEY, JSON.stringify(colWidths));
    } catch {
      /* ignore */
    }
  }, [colWidths]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function loadLookups() {
      try {
        const slotSets = await Promise.allSettled([
          kodTanimlariApi.listSlots("ACCOUNT"),
          kodTanimlariApi.listSlots("STOCK"),
          kodTanimlariApi.listSlots(),
        ]);
        const slotMap = new Map<number, { field_kind: string }>();
        for (const res of slotSets) {
          if (res.status !== "fulfilled") continue;
          for (const s of res.value.items ?? []) {
            slotMap.set(s.id, s);
          }
        }
        const specialSlots = [...slotMap.entries()].filter(([, s]) => s.field_kind === "SPECIAL");
        const entryLists = await Promise.all(
          specialSlots.map(([id]) => kodTanimlariApi.listEntries(id).catch(() => ({ items: [] as CodeMasterEntry[] })))
        );
        const merged = new Map<string, CodeMasterEntry>();
        for (const list of entryLists) {
          for (const e of list.items ?? []) {
            if (!e.is_active) continue;
            merged.set(e.code, e);
          }
        }
        if (!cancelled) setSpecialOptions([...merged.values()].sort((a, b) => a.code.localeCompare(b.code, "tr")));
      } catch {
        if (!cancelled) setSpecialOptions([]);
      }

      try {
        const cc = await api<unknown>("/maliyet/merkezler");
        if (!cancelled) setCostCenterOptions(asLookupList(cc));
      } catch {
        if (!cancelled) setCostCenterOptions([]);
      }

      try {
        const projects = await api<unknown>("/sistem/project-codes");
        if (!cancelled) setProjectOptions(asLookupList(projects));
      } catch {
        if (!cancelled) setProjectOptions([]);
      }
    }

    void loadLookups();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const totals = useMemo(() => {
    let tlDebit = 0;
    let tlCredit = 0;
    let fxDebit = 0;
    let fxCredit = 0;
    let hasFx = false;
    for (const r of rows) {
      tlDebit += num(r.debit);
      tlCredit += num(r.credit);
      if (r.currency !== "TRY") {
        hasFx = true;
        fxDebit += num(r.fx_debit);
        fxCredit += num(r.fx_credit);
      }
    }
    return {
      tlDebit,
      tlCredit,
      tlDiff: tlDebit - tlCredit,
      fxDebit,
      fxCredit,
      fxDiff: fxDebit - fxCredit,
      hasFx,
    };
  }, [rows]);

  const startResize = useCallback((key: ColKey, e: ReactMouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startW = colWidths[key] ?? DEFAULT_COL_WIDTHS[key] ?? 100;

    function onMove(ev: globalThis.MouseEvent) {
      const next = Math.max(48, startW + (ev.clientX - startX));
      setColWidths((prev) => ({ ...prev, [key]: next }));
    }
    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [colWidths]);

  if (!open) return null;

  function toggleCol(key: ColKey) {
    if (key === "rowNo") return;
    setCols((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function updateRow(index: number, patch: Partial<EntryRow>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function applyFxDebit(index: number, fxValue: string) {
    setRows((prev) => {
      const next = prev.map((r) => ({ ...r }));
      const row = next[index];
      row.fx_debit = fxValue;
      if (row.currency !== "TRY" && fxValue !== "") {
        row.debit = round2(num(fxValue) * FX_RATES[row.currency]);
      }
      const mirror = next[index + 1];
      if (mirror && fxValue !== "" && mirror.fx_credit === "") {
        mirror.fx_credit = fxValue;
        if (mirror.currency !== "TRY") {
          mirror.credit = round2(num(fxValue) * FX_RATES[mirror.currency]);
        }
      }
      return next;
    });
  }

  function applyFxCredit(index: number, fxValue: string) {
    setRows((prev) => {
      const next = prev.map((r) => ({ ...r }));
      const row = next[index];
      row.fx_credit = fxValue;
      if (row.currency !== "TRY" && fxValue !== "") {
        row.credit = round2(num(fxValue) * FX_RATES[row.currency]);
      }
      return next;
    });
  }

  function applyCurrency(index: number, currency: CurrencyCode) {
    setRows((prev) => {
      const next = prev.map((r) => ({ ...r }));
      const row = next[index];
      const prevCur = row.currency;
      row.currency = currency;
      if (currency !== "TRY") {
        const rate = FX_RATES[currency];
        if (num(row.debit) > 0 && row.fx_debit === "") {
          row.fx_debit = round2(num(row.debit) / rate);
        }
        if (num(row.credit) > 0 && row.fx_credit === "") {
          row.fx_credit = round2(num(row.credit) / rate);
        }
        if (num(row.fx_debit) > 0) {
          row.debit = round2(num(row.fx_debit) * rate);
        }
        if (num(row.fx_credit) > 0) {
          row.credit = round2(num(row.fx_credit) * rate);
        }
      } else if (prevCur !== "TRY") {
        row.fx_debit = "";
        row.fx_credit = "";
      }
      return next;
    });
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow(prev.length + 1)]);
  }

  function equalizeBalance() {
    const diff = Math.round((totals.tlDebit - totals.tlCredit) * 100) / 100;
    if (Math.abs(diff) < 0.009) {
      window.alert("Fiş zaten dengededir (Fark: 0,00 ₺).");
      return;
    }
    setRows((prev) => {
      const next = [...prev];
      const last = next[next.length - 1];
      if (last && num(last.debit) === 0 && num(last.credit) === 0) {
        if (diff > 0) {
          last.credit = String(diff);
          last.debit = "";
        } else {
          last.debit = String(Math.abs(diff));
          last.credit = "";
        }
      } else {
        const newRow = emptyRow(next.length + 1);
        if (diff > 0) {
          newRow.credit = String(diff);
        } else {
          newRow.debit = String(Math.abs(diff));
        }
        next.push(newRow);
      }
      return next;
    });
  }

  const [excelModalOpen, setExcelModalOpen] = useState(false);
  const [excelPasteText, setExcelPasteText] = useState("");
  const [templateModalOpen, setTemplateModalOpen] = useState(false);

  function handleProcessExcelPaste() {
    if (!excelPasteText.trim()) return;
    const lines = excelPasteText.trim().split(/\r?\n/);
    const pastedRows: EntryRow[] = [];
    lines.forEach((line, idx) => {
      const parts = line.split(/\t|,|;/).map((s) => s.trim());
      if (parts.length === 0 || !parts[0]) return;
      // Col formats: [Hesap Kodu, Açıklama, Borç, Alacak] or similar
      const code = parts[0] || "";
      const desc = parts[1] || "";
      const dVal = parts[2] ? parts[2].replace(/\./g, "").replace(",", ".") : "";
      const cVal = parts[3] ? parts[3].replace(/\./g, "").replace(",", ".") : "";
      const r = emptyRow(rows.length + idx + 1);
      r.coa_code = code;
      r.description = desc || description;
      r.debit = !isNaN(Number(dVal)) && Number(dVal) > 0 ? String(dVal) : "";
      r.credit = !isNaN(Number(cVal)) && Number(cVal) > 0 ? String(cVal) : "";
      pastedRows.push(r);
    });

    if (pastedRows.length > 0) {
      setRows((prev) => {
        // filter out completely blank row if it's the only one
        const base = prev.filter((r) => r.coa_code || num(r.debit) > 0 || num(r.credit) > 0);
        return [...base, ...pastedRows].map((r, i) => ({ ...r, line_no: i + 1 }));
      });
      setExcelModalOpen(false);
      setExcelPasteText("");
    }
  }

  function applyVoucherTemplate(tId: string) {
    if (tId === "tahsilat") {
      setVoucherType("Tahsil");
      setRows([
        { ...emptyRow(1), coa_code: "100.01", coa_name: "Merkez TL Kasası", description: "Müşteri Tahsilatı", debit: "15000", credit: "" },
        { ...emptyRow(2), coa_code: "120.01", coa_name: "Alıcılar Cari Hesabı", description: "Cari Hesap Tahsilatı", debit: "", credit: "15000" },
      ]);
    } else if (tId === "tediye") {
      setVoucherType("Tediye");
      setRows([
        { ...emptyRow(1), coa_code: "320.01", coa_name: "Satıcılar Cari Hesabı", description: "Tedarikçi Ödemesi", debit: "25000", credit: "" },
        { ...emptyRow(2), coa_code: "102.01", coa_name: "Ticari Vadesiz TL Hesabı", description: "Banka Havalesi İle Tediye", debit: "", credit: "25000" },
      ]);
    } else if (tId === "alis_fatura") {
      setVoucherType("Mahsup");
      setRows([
        { ...emptyRow(1), coa_code: "153.01", coa_name: "Ticari Mallar %20", description: "Mal Alış Faturası", debit: "50000", credit: "" },
        { ...emptyRow(2), coa_code: "191.01", coa_name: "İndirilecek KDV %20", description: "Fatura KDV Tutarı", debit: "10000", credit: "" },
        { ...emptyRow(3), coa_code: "320.01", coa_name: "Satıcılar", description: "Fatura Toplamı", debit: "", credit: "60000" },
      ]);
    } else if (tId === "satis_fatura") {
      setVoucherType("Mahsup");
      setRows([
        { ...emptyRow(1), coa_code: "120.01", coa_name: "Alıcılar", description: "Satış Faturası Toplamı", debit: "120000", credit: "" },
        { ...emptyRow(2), coa_code: "600.01", coa_name: "Yurtiçi Satışlar %20", description: "Ürün Satış Bedeli", debit: "", credit: "100000" },
        { ...emptyRow(3), coa_code: "391.01", coa_name: "Hesaplanan KDV %20", description: "Satış KDV Tutarı", debit: "", credit: "20000" },
      ]);
    } else if (tId === "ucret") {
      setVoucherType("Mahsup");
      setRows([
        { ...emptyRow(1), coa_code: "770.01", coa_name: "Brüt Personel Ücret Gideri", description: "Aylık Personel Ücret Tahakkuku", debit: "85000", credit: "" },
        { ...emptyRow(2), coa_code: "335.01", coa_name: "Personele Borçlar (Net)", description: "Personele Ödenecek Net Ücret", debit: "", credit: "62000" },
        { ...emptyRow(3), coa_code: "360.01", coa_name: "Ödenecek Gelir & Damga Vergisi", description: "Vergi Tevkifatı", debit: "", credit: "8000" },
        { ...emptyRow(4), coa_code: "361.01", coa_name: "Ödenecek SGK Primleri", description: "SGK İşçi & İşveren Payı", debit: "", credit: "15000" },
      ]);
    } else if (tId === "amortisman") {
      setVoucherType("Mahsup");
      setRows([
        { ...emptyRow(1), coa_code: "770.05", coa_name: "Amortisman Giderleri", description: "Dönemsel Sabit Kıymet Amortisman Payı", debit: "12500", credit: "" },
        { ...emptyRow(2), coa_code: "257.01", coa_name: "Birikmiş Amortismanlar (-)", description: "Maddi Duran Varlık Amortismanı", debit: "", credit: "12500" },
      ]);
    }
    setTemplateModalOpen(false);
  }

  useEffect(() => {
    function handleGlobalKeyDown(e: globalThis.KeyboardEvent) {
      if (e.key === "F2") {
        e.preventDefault();
        void handleSave();
      } else if (e.key === "F4" || e.key === "Insert") {
        e.preventDefault();
        addRow();
      } else if (e.key === "F7") {
        e.preventDefault();
        equalizeBalance();
      } else if (e.key === "Escape" && !excelModalOpen && !templateModalOpen) {
        // Esc closes form
      }
    }
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [totals, rows, formBranchId, recordTypeId, excelModalOpen, templateModalOpen]);

  function openCoaForRow(index: number) {
    setFocusedRow(index);
    setCoaEditIndex(index);
    const rowPicker = coaRefs.current[index];
    if (rowPicker) {
      rowPicker.open();
      return;
    }
    requestAnimationFrame(() => sharedCoaRef.current?.open());
  }

  function onGridKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "F3") {
      e.preventDefault();
      openCoaForRow(focusedRow);
    }
  }

  async function handleSave() {
    const selectedBranch = formBranchId === "" ? branchId : Number(formBranchId);
    if (!selectedBranch || !recordTypeId) {
      window.alert("Şube ve kayıt türü seçili olmalıdır.");
      return;
    }

    const filled = rows.filter((r) => r.coa_id != null && (num(r.debit) > 0 || num(r.credit) > 0));
    if (filled.length === 0) {
      window.alert("En az bir hesap satırı giriniz.");
      return;
    }

    let allowUnbalanced = false;
    if (Math.abs(totals.tlDiff) > 0.009) {
      const ok = window.confirm("Fark veren fiş. Yine de taslak olarak kaydedilsin mi?");
      if (!ok) return;
      allowUnbalanced = true;
    }

    setSaving(true);
    try {
      const payload = {
        voucher_date: voucherDate,
        edit_date: editDate,
        document_no: documentNo || null,
        voucher_type: voucherType,
        special_code: specialCode || null,
        project_code: projectCode || null,
        branch_id: selectedBranch,
        record_type_id: recordTypeId,
        description,
        allow_unbalanced: allowUnbalanced,
        lines: filled.map((r, i) => ({
          line_no: i + 1,
          coa_id: r.coa_id,
          debit: num(r.debit),
          credit: num(r.credit),
          description: r.description || null,
          currency_code: r.currency,
          fx_debit: r.currency !== "TRY" ? num(r.fx_debit) : null,
          fx_credit: r.currency !== "TRY" ? num(r.fx_credit) : null,
          cost_center: r.cost_center || null,
          cost_center_name: r.cost_center_name || null,
          project_code: r.project_code || null,
          project_name: r.project_name || null,
          special_code: r.special_code || null,
          special_code2: r.special_code2 || null,
          qty: r.qty !== "" ? num(r.qty) : null,
          index_val: r.index_val !== "" ? num(r.index_val) : null,
          invoice_no: r.invoice_no || null,
          party_title: r.party_title || null,
          tax_no: r.tax_no || null,
          national_id: r.national_id || null,
        })),
      };
      if (isEdit && voucherId) {
        await yevmiyeApi.updateVoucher(voucherId, {
          ...payload,
          correction_note: "Yevmiye fişi düzenleme",
        });
      } else {
        await yevmiyeApi.createManual(payload);
      }
      onSaved();
      onClose();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Kayıt başarısız");
    } finally {
      setSaving(false);
    }
  }

  const visible = (key: ColKey) => cols[key];
  const thStyle = (key: ColKey) => ({
    minWidth: colWidths[key] ?? DEFAULT_COL_WIDTHS[key] ?? 80,
    width: colWidths[key] ?? DEFAULT_COL_WIDTHS[key],
  });

  function ResizableTh({ colKey, children }: { colKey: ColKey; children: ReactNode }) {
    return (
      <th style={thStyle(colKey)} className="yev-th-resizable">
        {children}
        <span
          className="yev-th-resize-handle"
          onMouseDown={(e) => startResize(colKey, e)}
          title="Sütun genişliği"
        />
      </th>
    );
  }

  function applyCostCenter(index: number, code: string) {
    const opt = costCenterOptions.find((o) => o.code === code);
    updateRow(index, {
      cost_center: code,
      cost_center_name: opt?.name ?? "",
    });
  }

  function applyProject(index: number, code: string) {
    const opt = projectOptions.find((o) => o.code === code);
    updateRow(index, {
      project_code: code,
      project_name: opt?.name ?? (code ? rows[index]?.project_name ?? "" : ""),
    });
  }

  return (
    <div className="yev-entry-card" style={{ border: "1px solid #cbd5e1", borderRadius: 10, boxShadow: "0 4px 12px rgba(15, 23, 42, 0.08)" }}>
      {/* 1. PROFESYONEL ERP KOMUT ŞERİDİ (RIBBON BAR) */}
      <div
        className="yev-erp-ribbon"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "10px 16px",
          background: "#0f172a",
          borderRadius: "9px 9px 0 0",
          color: "#fff",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginRight: 8 }}>
            <span style={{ fontSize: 16 }}>📑</span>
            <span style={{ fontWeight: 800, fontSize: 14, color: "#f8fafc" }}>
              {voucherId ? `Yevmiye Fişi Düzenle (#${voucherId})` : "Yeni Yevmiye Fişi Girişi"}
            </span>
          </div>

          <button
            type="button"
            className="btn-primary"
            style={{
              fontSize: 12,
              fontWeight: 700,
              padding: "5px 12px",
              background: "#16a34a",
              borderColor: "#15803d",
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
            }}
            disabled={saving}
            onClick={() => void handleSave()}
            title="Fişi Kaydet (F2)"
          >
            <span>💾</span> Kaydet (F2)
          </button>

          <button
            type="button"
            className="btn-secondary"
            style={{
              fontSize: 12,
              fontWeight: 700,
              padding: "5px 12px",
              background: "#1e293b",
              color: "#f8fafc",
              border: "1px solid #334155",
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
            }}
            onClick={addRow}
            title="Yeni Satır Ekle (F4 / Ins)"
          >
            <span>➕</span> Satır Ekle (F4)
          </button>

          <button
            type="button"
            className="btn-secondary"
            style={{
              fontSize: 12,
              fontWeight: 700,
              padding: "5px 12px",
              background: "#1e293b",
              color: "#38bdf8",
              border: "1px solid #0284c7",
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
            }}
            onClick={equalizeBalance}
            title="Borç/Alacak Farkını Kapat & Eşitle (F7)"
          >
            <span>⚖️</span> Bakiye Eşitle (F7)
          </button>

          <button
            type="button"
            className="btn-secondary"
            style={{
              fontSize: 12,
              fontWeight: 700,
              padding: "5px 12px",
              background: "#1e293b",
              color: "#a7f3d0",
              border: "1px solid #059669",
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
            }}
            onClick={() => setExcelModalOpen(true)}
            title="Excel'den kopyalanan satırları yapıştır"
          >
            <span>📋</span> Excel'den Yapıştır
          </button>

          <button
            type="button"
            className="btn-secondary"
            style={{
              fontSize: 12,
              fontWeight: 700,
              padding: "5px 12px",
              background: "#1e293b",
              color: "#fde047",
              border: "1px solid #ca8a04",
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
            }}
            onClick={() => setTemplateModalOpen(true)}
            title="Hazır Muhasebe Fiş Şablonu Yükle"
          >
            <span>📑</span> Şablon Fiş
          </button>

          <button
            type="button"
            className="btn-secondary"
            style={{
              fontSize: 12,
              fontWeight: 700,
              padding: "5px 12px",
              background: "#1e293b",
              color: "#e2e8f0",
              border: "1px solid #334155",
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
            }}
            onClick={() => window.print()}
            title="Yevmiye Fiş Dökümü / Yazdır"
          >
            <span>🖨️</span> Yazdır
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Fiş Denge Göstergesi */}
          <div
            style={{
              padding: "4px 12px",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 800,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: Math.abs(totals.tlDiff) < 0.009 ? "rgba(22, 163, 74, 0.25)" : "rgba(220, 38, 38, 0.25)",
              color: Math.abs(totals.tlDiff) < 0.009 ? "#4ade80" : "#f87171",
              border: Math.abs(totals.tlDiff) < 0.009 ? "1px solid #16a34a" : "1px solid #dc2626",
            }}
          >
            <span>{Math.abs(totals.tlDiff) < 0.009 ? "✔ DENGEDE" : "⚠️ DENGESİZ"}</span>
            <span style={{ fontSize: 11, opacity: 0.9 }}>
              (Fark: {fmt(totals.tlDiff)} ₺)
            </span>
          </div>

          <button
            type="button"
            className="btn-secondary"
            style={{
              padding: "4px 8px",
              fontSize: 12,
              color: "#cbd5e1",
              background: "#334155",
              border: "none",
              cursor: "pointer",
            }}
            onClick={onClose}
            title="Fişten Çık / Vazgeç"
          >
            ✕ Kapat
          </button>
        </div>
      </div>

      {/* EXCEL KOPYALA / YAPIŞTIR MODALI */}
      {excelModalOpen && (
        <div className="modal-overlay show" style={{ display: "flex", zIndex: 1100 }}>
          <div className="modal-card" style={{ maxWidth: 640, width: "95%", background: "#fff", padding: 20, borderRadius: 10 }}>
            <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 800 }}>
              📋 Excel'den Yevmiye Satırları Yapıştır
            </h3>
            <p style={{ margin: "0 0 12px", fontSize: 12, color: "#64748b" }}>
              Excel tablonuzdaki sütunları kopyalayıp aşağıdaki alana yapıştırın.<br />
              Önerilen sütun sırası: <strong>Hesap Kodu | Açıklama | Borç Tutarı | Alacak Tutarı</strong>
            </p>
            <textarea
              className="form-control"
              rows={8}
              placeholder={`100.01\tKasa Tahsilatı\t15000\t0\n120.01\tCari Ödeme\t0\t15000`}
              value={excelPasteText}
              onChange={(e) => setExcelPasteText(e.target.value)}
              style={{ width: "100%", fontFamily: "monospace", fontSize: 12, marginBottom: 12 }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button type="button" className="btn-secondary" onClick={() => setExcelModalOpen(false)}>
                Vazgeç
              </button>
              <button type="button" className="btn-primary" onClick={handleProcessExcelPaste}>
                ✔ Satırları Fişe Aktar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ŞABLON FİŞ SEÇİM MODALI */}
      {templateModalOpen && (
        <div className="modal-overlay show" style={{ display: "flex", zIndex: 1100 }}>
          <div className="modal-card" style={{ maxWidth: 580, width: "95%", background: "#fff", padding: 20, borderRadius: 10 }}>
            <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 800 }}>
              📑 Hazır Muhasebe Fiş Şablonu Seç
            </h3>
            <p style={{ margin: "0 0 14px", fontSize: 12, color: "#64748b" }}>
              Sık kullanılan standart VUK yevmiye kaydını seçerek satırları otomatik doldurun:
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
              {[
                { id: "tahsilat", title: "Kasa Tahsilat Fişi", desc: "100 Kasa (B) / 120 Alıcılar (A)", icon: "💵" },
                { id: "tediye", title: "Banka Tediye Fişi", desc: "320 Satıcılar (B) / 102 Banka (A)", icon: "🏦" },
                { id: "alis_fatura", title: "Mal Alış Faturası Mahsubu", desc: "153 Ticari Mallar + 191 İnd.KDV (B) / 320 Satıcılar (A)", icon: "📦" },
                { id: "satis_fatura", title: "Yurtiçi Satış Faturası Mahsubu", desc: "120 Alıcılar (B) / 600 Satış + 391 Hes.KDV (A)", icon: "🏷️" },
                { id: "ucret", title: "Aylık Personel Ücret Bordro Tahakkuku", desc: "770 Personel Gideri (B) / 335 + 360 + 361 (A)", icon: "👥" },
                { id: "amortisman", title: "Dönemsel Sabit Kıymet Amortismanı", desc: "770 Amortisman Gideri (B) / 257 Birikmiş Amortisman (A)", icon: "⚙️" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 14px",
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                    background: "#f8fafc",
                    textAlign: "left",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                  onClick={() => applyVoucherTemplate(item.id)}
                >
                  <span style={{ fontSize: 20 }}>{item.icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}>{item.title}</div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>{item.desc}</div>
                  </div>
                </button>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button type="button" className="btn-secondary" onClick={() => setTemplateModalOpen(false)}>
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="yev-header-grid" style={{ padding: "14px 16px" }}>
        <div className="yev-field">
          <label>Tarih</label>
          <input
            type="date"
            className="form-control"
            value={voucherDate}
            onChange={(e) => setVoucherDate(e.target.value)}
          />
        </div>
        <div className="yev-field">
          <label>Düzenleme Tarihi</label>
          <input
            type="date"
            className="form-control"
            value={editDate}
            onChange={(e) => setEditDate(e.target.value)}
          />
        </div>
        <div className="yev-field">
          <label>Yev.No</label>
          <input className="form-control" readOnly placeholder="Otomatik" value="" />
        </div>
        <div className="yev-field">
          <label>Belge No</label>
          <input
            className="form-control"
            value={documentNo}
            onChange={(e) => setDocumentNo(e.target.value)}
            placeholder="Manuel belge no"
          />
        </div>
        <div className="yev-field">
          <label>Fiş Türü</label>
          <select
            className="form-control"
            value={voucherType}
            onChange={(e) => setVoucherType(e.target.value)}
          >
            {VOUCHER_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="yev-field">
          <label>Özel Kod</label>
          <select
            className="form-control"
            value={specialCode}
            onChange={(e) => setSpecialCode(e.target.value)}
          >
            <option value="">Seçiniz</option>
            {specialOptions.map((o) => (
              <option key={o.id} value={o.code}>
                {o.code} — {o.name}
              </option>
            ))}
          </select>
        </div>
        <div className="yev-field">
          <label>Proje Kodu</label>
          <select
            className="form-control"
            value={projectCode}
            onChange={(e) => setProjectCode(e.target.value)}
          >
            <option value="">Seçiniz</option>
            {projectOptions.map((o) => (
              <option key={o.code} value={o.code}>
                {o.code} — {o.name}
              </option>
            ))}
          </select>
          {projectOptions.length === 0 ? (
            <span className="yev-field-hint muted">Proje listesi tanımlı değil</span>
          ) : null}
        </div>
        <div className="yev-field">
          <label>Şube</label>
          <select
            className="form-control"
            value={formBranchId === "" ? "" : String(formBranchId)}
            onChange={(e) =>
              setFormBranchId(e.target.value === "" ? "" : Number(e.target.value))
            }
          >
            <option value="">Seçiniz</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.code} — {b.name}
              </option>
            ))}
          </select>
        </div>
        <div className="yev-field yev-field-wide">
          <label>Genel Açıklama</label>
          <input
            className="form-control"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </div>

      <div className="yev-col-picker">
        {COL_DEFS.map((c) => (
          <label key={c.key} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <input
              type="checkbox"
              checked={cols[c.key]}
              disabled={c.alwaysOn}
              onChange={() => toggleCol(c.key)}
            />
            {c.label}
          </label>
        ))}
      </div>

      <p className="muted" style={{ fontSize: 11, margin: "0 0 8px" }}>
        F3: hesap seç. Dövizli satırda döviz borç girildiğinde bir sonraki boş satırın döviz alacağı
        aynalanır (kur: USD {FX_RATES.USD}, EUR {FX_RATES.EUR}, GBP {FX_RATES.GBP}).
      </p>

      <div className="yev-entry-grid-wrap" tabIndex={0} onKeyDown={onGridKeyDown}>
        <table className="yev-entry-grid">
          <thead>
            <tr>
              {visible("rowNo") && <ResizableTh colKey="rowNo">No</ResizableTh>}
              {visible("hesapKodu") && <ResizableTh colKey="hesapKodu">Hesap Kodu</ResizableTh>}
              {visible("adi") && <ResizableTh colKey="adi">Adı</ResizableTh>}
              {visible("aciklama") && <ResizableTh colKey="aciklama">Açıklama</ResizableTh>}
              {visible("belgeNo") && <ResizableTh colKey="belgeNo">Belge No</ResizableTh>}
              {visible("borc") && <ResizableTh colKey="borc">Borç</ResizableTh>}
              {visible("alacak") && <ResizableTh colKey="alacak">Alacak</ResizableTh>}
              {visible("dovizliBorc") && <ResizableTh colKey="dovizliBorc">Dövizli Borç</ResizableTh>}
              {visible("dovizliAlacak") && (
                <ResizableTh colKey="dovizliAlacak">Dövizli Alacak</ResizableTh>
              )}
              {visible("doviz") && <ResizableTh colKey="doviz">Döviz</ResizableTh>}
              {visible("masrafMerkezi") && (
                <ResizableTh colKey="masrafMerkezi">Masraf Merkezi</ResizableTh>
              )}
              {visible("masrafMerkeziAd") && (
                <ResizableTh colKey="masrafMerkeziAd">Masraf Merkezi Ad</ResizableTh>
              )}
              {visible("projeKodu") && <ResizableTh colKey="projeKodu">Proje Kodu</ResizableTh>}
              {visible("projeAciklama") && (
                <ResizableTh colKey="projeAciklama">Proje Açıklama</ResizableTh>
              )}
              {visible("ozelKod") && <ResizableTh colKey="ozelKod">Özel Kod</ResizableTh>}
              {visible("ozelKod2") && <ResizableTh colKey="ozelKod2">Özel Kod 2</ResizableTh>}
              {visible("miktar") && <ResizableTh colKey="miktar">Miktar</ResizableTh>}
              {visible("endeks") && <ResizableTh colKey="endeks">Endeks</ResizableTh>}
              {visible("faturaNo") && <ResizableTh colKey="faturaNo">Fatura No</ResizableTh>}
              {visible("chUnvan") && <ResizableTh colKey="chUnvan">C/H Ünvan</ResizableTh>}
              {visible("vergiNo") && <ResizableTh colKey="vergiNo">Vergi No</ResizableTh>}
              {visible("tcKimlik") && <ResizableTh colKey="tcKimlik">TC Kimlik</ResizableTh>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={row.line_no}
                className={focusedRow === index ? "yev-row-focused" : undefined}
                onFocusCapture={() => setFocusedRow(index)}
                onClick={() => setFocusedRow(index)}
              >
                {visible("rowNo") && <td style={thStyle("rowNo")}>{row.line_no}</td>}
                {visible("hesapKodu") && (
                  <td style={thStyle("hesapKodu")}>
                    <ChartOfAccountsPicker
                      ref={(h) => {
                        coaRefs.current[index] = h;
                      }}
                      value={row.coa_id}
                      displayLabel={row.coa_code || null}
                      placeholder="Hesap seç"
                      hideActions
                      onChange={(id, item) =>
                        updateRow(index, {
                          coa_id: id,
                          coa_code: item?.code ?? "",
                          coa_name: item?.name ?? "",
                        })
                      }
                    />
                  </td>
                )}
                {visible("adi") && (
                  <td style={thStyle("adi")}>
                    <input
                      readOnly
                      value={row.coa_name ?? ""}
                      placeholder="Hesap seç"
                      className="yev-coa-name-trigger"
                      onClick={() => openCoaForRow(index)}
                    />
                  </td>
                )}
                {visible("aciklama") && (
                  <td style={thStyle("aciklama")}>
                    <input
                      value={row.description ?? ""}
                      onChange={(e) => updateRow(index, { description: e.target.value })}
                    />
                  </td>
                )}
                {visible("belgeNo") && (
                  <td style={thStyle("belgeNo")}>
                    <input
                      value={row.belge_no ?? ""}
                      onChange={(e) => updateRow(index, { belge_no: e.target.value })}
                    />
                  </td>
                )}
                {visible("borc") && (
                  <td style={thStyle("borc")}>
                    <input
                      type="number"
                      step="0.01"
                      value={row.debit ?? 0}
                      onChange={(e) => updateRow(index, { debit: e.target.value })}
                    />
                  </td>
                )}
                {visible("alacak") && (
                  <td style={thStyle("alacak")}>
                    <input
                      type="number"
                      step="0.01"
                      value={row.credit ?? 0}
                      onChange={(e) => updateRow(index, { credit: e.target.value })}
                    />
                  </td>
                )}
                {visible("dovizliBorc") && (
                  <td style={thStyle("dovizliBorc")}>
                    <input
                      type="number"
                      step="0.01"
                      value={row.fx_debit ?? 0}
                      onChange={(e) => applyFxDebit(index, e.target.value)}
                    />
                  </td>
                )}
                {visible("dovizliAlacak") && (
                  <td style={thStyle("dovizliAlacak")}>
                    <input
                      type="number"
                      step="0.01"
                      value={row.fx_credit ?? 0}
                      onChange={(e) => applyFxCredit(index, e.target.value)}
                    />
                  </td>
                )}
                {visible("doviz") && (
                  <td style={thStyle("doviz")}>
                    <select
                      value={row.currency ?? "TRY"}
                      onChange={(e) => applyCurrency(index, e.target.value as CurrencyCode)}
                    >
                      <option value="TRY">TRY</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                    </select>
                  </td>
                )}
                {visible("masrafMerkezi") && (
                  <td style={thStyle("masrafMerkezi")}>
                    <select
                      value={row.cost_center ?? ""}
                      onChange={(e) => applyCostCenter(index, e.target.value)}
                    >
                      <option value="">Seçiniz</option>
                      {costCenterOptions.map((o) => (
                        <option key={o.code} value={o.code}>
                          {o.code}
                        </option>
                      ))}
                    </select>
                  </td>
                )}
                {visible("masrafMerkeziAd") && (
                  <td style={thStyle("masrafMerkeziAd")}>
                    <input readOnly value={row.cost_center_name ?? ""} placeholder="—" />
                  </td>
                )}
                {visible("projeKodu") && (
                  <td style={thStyle("projeKodu")}>
                    {projectOptions.length > 0 ? (
                      <select
                        value={row.project_code ?? ""}
                        onChange={(e) => applyProject(index, e.target.value)}
                      >
                        <option value="">Seçiniz</option>
                        {projectOptions.map((o) => (
                          <option key={o.code} value={o.code}>
                            {o.code}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        value={row.project_code ?? ""}
                        onChange={(e) => updateRow(index, { project_code: e.target.value })}
                        placeholder="Kod"
                      />
                    )}
                  </td>
                )}
                {visible("projeAciklama") && (
                  <td style={thStyle("projeAciklama")}>
                    <input
                      value={row.project_name ?? ""}
                      onChange={(e) => updateRow(index, { project_name: e.target.value })}
                    />
                  </td>
                )}
                {visible("ozelKod") && (
                  <td style={thStyle("ozelKod")}>
                    {specialOptions.length > 0 ? (
                      <select
                        value={row.special_code ?? ""}
                        onChange={(e) => updateRow(index, { special_code: e.target.value })}
                      >
                        <option value="">Seçiniz</option>
                        {specialOptions.map((o) => (
                          <option key={o.id} value={o.code}>
                            {o.code}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        value={row.special_code ?? ""}
                        onChange={(e) => updateRow(index, { special_code: e.target.value })}
                      />
                    )}
                  </td>
                )}
                {visible("ozelKod2") && (
                  <td style={thStyle("ozelKod2")}>
                    <input
                      value={row.special_code2 ?? ""}
                      onChange={(e) => updateRow(index, { special_code2: e.target.value })}
                    />
                  </td>
                )}
                {visible("miktar") && (
                  <td style={thStyle("miktar")}>
                    <input
                      type="number"
                      step="0.01"
                      value={row.qty ?? 0}
                      onChange={(e) => updateRow(index, { qty: e.target.value })}
                    />
                  </td>
                )}
                {visible("endeks") && (
                  <td style={thStyle("endeks")}>
                    <input
                      type="number"
                      step="0.01"
                      value={row.index_val ?? 0}
                      onChange={(e) => updateRow(index, { index_val: e.target.value })}
                    />
                  </td>
                )}
                {visible("faturaNo") && (
                  <td style={thStyle("faturaNo")}>
                    <input
                      value={row.invoice_no ?? ""}
                      onChange={(e) => updateRow(index, { invoice_no: e.target.value })}
                    />
                  </td>
                )}
                {visible("chUnvan") && (
                  <td style={thStyle("chUnvan")}>
                    <input
                      value={row.party_title ?? ""}
                      onChange={(e) => updateRow(index, { party_title: e.target.value })}
                    />
                  </td>
                )}
                {visible("vergiNo") && (
                  <td style={thStyle("vergiNo")}>
                    <input
                      value={row.tax_no ?? ""}
                      onChange={(e) => updateRow(index, { tax_no: e.target.value })}
                    />
                  </td>
                )}
                {visible("tcKimlik") && (
                  <td style={thStyle("tcKimlik")}>
                    <input
                      value={row.national_id ?? ""}
                      onChange={(e) => updateRow(index, { national_id: e.target.value })}
                    />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="yev-totals-frames">
        <div className="yev-totals-frame">
          <div className="yev-totals-frame-title">TL</div>
          <div className="yev-total-box">
            <span className="yev-total-label">TL Borç</span>
            <strong>{fmt(totals.tlDebit)}</strong>
          </div>
          <div className="yev-total-box">
            <span className="yev-total-label">TL Alacak</span>
            <strong>{fmt(totals.tlCredit)}</strong>
          </div>
          <div className={`yev-total-box${Math.abs(totals.tlDiff) > 0.009 ? " warn" : ""}`}>
            <span className="yev-total-label">TL Fark</span>
            <strong>{fmt(totals.tlDiff)}</strong>
          </div>
        </div>
        {totals.hasFx ? (
          <div className="yev-totals-frame">
            <div className="yev-totals-frame-title">Döviz</div>
            <div className="yev-total-box">
              <span className="yev-total-label">Döviz Borç</span>
              <strong>{fmt(totals.fxDebit)}</strong>
            </div>
            <div className="yev-total-box">
              <span className="yev-total-label">Döviz Alacak</span>
              <strong>{fmt(totals.fxCredit)}</strong>
            </div>
            <div className={`yev-total-box${Math.abs(totals.fxDiff) > 0.009 ? " warn" : ""}`}>
              <span className="yev-total-label">Döviz Fark</span>
              <strong>{fmt(totals.fxDiff)}</strong>
            </div>
          </div>
        ) : null}
      </div>

      <div className="yev-coa-shared" aria-hidden={!cols.hesapKodu}>
        <ChartOfAccountsPicker
          ref={sharedCoaRef}
          value={rows[coaEditIndex]?.coa_id ?? null}
          displayLabel={rows[coaEditIndex]?.coa_code || null}
          placeholder="Hesap seç"
          hideActions
          onChange={(id, item) =>
            updateRow(coaEditIndex, {
              coa_id: id,
              coa_code: item?.code ?? "",
              coa_name: item?.name ?? "",
            })
          }
        />
      </div>

      <div className="page-footer-actions">
        <button type="button" className="btn-add" onClick={addRow}>
          + Satır
        </button>
        <button type="button" className="btn-save" disabled={saving} onClick={() => void handleSave()}>
          {saving ? "Kaydediliyor…" : "Kaydet"}
        </button>
        <button type="button" className="btn-cancel" onClick={onClose} disabled={saving}>
          Vazgeç
        </button>
      </div>
    </div>
  );
}
