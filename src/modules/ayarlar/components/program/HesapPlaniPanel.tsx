import { useCallback, useEffect, useMemo, useState } from "react";
import { SidePanel } from "@/components/ui/side-panel";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { useAppStore } from "@/store/appStore";
import { raporApi, type CommonReportFilters, type ReportResponse } from "@/modules/raporlar/api/raporApi";
import {
  kodTanimlariApi,
  type CodeFieldSlot,
  type CodeMasterEntry,
} from "@/modules/kod-tanimlari/api/kodTanimlariApi";
import {
  sistemAyarlariApi,
  type CoaAccount,
  type CoaAccountLevel,
  type CoaAccountNature,
  type CoaAccountPayload,
  type CoaCodeSeparator,
  type CoaRateType,
} from "../../api/sistemAyarlariApi";
import { kasaBankaApi, type CurrencyLookup } from "@/modules/kart-tanimlari/kasa-banka/api/kasaBankaApi";
import {
  loadLocalCoaSettings,
  applyCoaColors,
} from "../tanimlar/HesapPlaniAyarlariPanel";

type ViewMode = "plan" | "genel-mizan" | "iki-tarih-mizan" | "muavin";
type PeriodMode = "range" | "month" | "year";
type FormMode = "add" | "edit";

type AccountForm = {
  code_separator: CoaCodeSeparator;
  code_depth: number;
  code: string;
  name: string;
  description: string;
  account_level: CoaAccountLevel;
  account_nature: CoaAccountNature;
  currency_code: string;
  rate_type: CoaRateType;
  use_fx_diff: boolean;
  special_code: string;
  special_code2: string;
  special_code3: string;
  group_code: string;
};

const emptyForm = (): AccountForm => ({
  code_separator: ".",
  code_depth: 4,
  code: "",
  name: "",
  description: "",
  account_level: "MUAVIN",
  account_nature: "BORC_ALACAK",
  currency_code: "TRY",
  rate_type: "ALIS",
  use_fx_diff: false,
  special_code: "",
  special_code2: "",
  special_code3: "",
  group_code: "",
});

const FALLBACK_CURRENCIES: CurrencyLookup[] = [
  { id: 1, code: "TRY", name: "Türk Lirası" },
  { id: 2, code: "USD", name: "ABD Doları" },
  { id: 3, code: "EUR", name: "Euro" },
  { id: 4, code: "GBP", name: "Sterlin" },
];

function normalizeRateType(v: string | null | undefined): CoaRateType {
  const u = (v || "").toUpperCase();
  if (u === "SATIS" || u === "EFEKTIF_ALIS" || u === "EFEKTIF_SATIS" || u === "ALIS") return u;
  return "ALIS";
}

function yearStart() {
  return `${new Date().getFullYear()}-01-01`;
}
function today() {
  return new Date().toISOString().slice(0, 10);
}
function money(v: number | string | undefined | null) {
  return Number(v ?? 0).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** GİB tarzı otomatik format: Kullanıcı nasıl yazarsa yazsın (ör. 1000101001), tanımlı ayrışım ve kırılıma göre (ör. 100.01.01.001) otomatik dönüştürür. */
export function formatCoaTypedCode(raw: string, sep: CoaCodeSeparator, depth: number): string {
  const clean = raw.replace(/[^0-9A-Za-z]/g, "").toUpperCase();
  if (!clean) return "";

  // Sınıf (1), Alt Sınıf (2), Ana Hesap (3)
  if (clean.length <= 3) return clean;

  const maxDepth = Math.max(2, Math.min(5, depth));
  const segments: string[] = [clean.slice(0, 3)];
  let rest = clean.slice(3);

  while (rest.length > 0 && segments.length < maxDepth) {
    const remainingSlots = maxDepth - segments.length;
    if (remainingSlots === 1) {
      // Son kırılım kalan tüm karakterleri alır (ör. 001)
      segments.push(rest);
      rest = "";
      break;
    }
    // Ara kırılımlar 2 hane alır (ör. 01)
    const take = Math.min(2, rest.length);
    segments.push(rest.slice(0, take));
    rest = rest.slice(take);
  }

  return segments.join(sep);
}

function inferAccountLevel(row: CoaAccount, all: CoaAccount[]): CoaAccountLevel {
  const stored = row.account_level?.toUpperCase();
  if (
    stored === "SINIF" ||
    stored === "ALT_SINIF" ||
    stored === "ANA" ||
    stored === "GRUP" ||
    stored === "MUAVIN"
  ) {
    return stored;
  }
  const code = row.code ?? "";
  if (/^[1-9]$/.test(code)) return "SINIF";
  if (/^[1-9]\d$/.test(code)) return "ALT_SINIF";
  if (/^[1-9]\d{2}$/.test(code)) return "ANA";
  if (!row.parent_id || code.length <= 3) return "ANA";
  const hasChildren = all.some((a) => a.parent_id === row.id);
  if (hasChildren && !row.is_postable) return "GRUP";
  if (row.is_postable) return "MUAVIN";
  return "GRUP";
}

function rowLevelClass(row: CoaAccount, all: CoaAccount[]): string {
  const level = inferAccountLevel(row, all);
  if (level === "SINIF") return "hesap-plani-row-sinif";
  if (level === "ALT_SINIF") return "hesap-plani-row-alt-sinif";
  if (level === "ANA") return "hesap-plani-row-ana";
  if (level === "GRUP") return "hesap-plani-row-grup";
  return "hesap-plani-row-muavin";
}

function normalizeSep(v: string | null | undefined): CoaCodeSeparator {
  return v === "-" ? "-" : ".";
}

function normalizeDepth(v: number | null | undefined): number {
  const n = Number(v ?? 4);
  return n === 2 || n === 3 || n === 4 || n === 5 ? n : 4;
}

function accountToForm(row: CoaAccount, all: CoaAccount[]): AccountForm {
  const nature = row.account_nature?.toUpperCase();
  return {
    code_separator: normalizeSep(row.code_separator),
    code_depth: normalizeDepth(row.code_depth),
    code: row.code,
    name: row.name,
    description: row.description ?? "",
    account_level: inferAccountLevel(row, all),
    account_nature:
      nature === "BORC" || nature === "ALACAK" || nature === "BORC_ALACAK"
        ? nature
        : "BORC_ALACAK",
    currency_code: (row.currency_code || "TRY").toUpperCase(),
    rate_type: normalizeRateType(row.rate_type),
    use_fx_diff: Boolean(row.use_fx_diff),
    special_code: row.special_code ?? "",
    special_code2: row.special_code2 ?? "",
    special_code3: row.special_code3 ?? "",
    group_code: row.group_code ?? "",
  };
}

function printHtml(title: string, headers: string[], rows: string[][]) {
  const w = window.open("", "_blank", "noopener,noreferrer,width=960,height=720");
  if (!w) return;
  const thead = headers.map((h) => `<th>${h}</th>`).join("");
  const body = rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("");
  w.document.write(`<!doctype html><html><head><title>${title}</title>
    <style>
      body{font-family:Segoe UI,Arial,sans-serif;padding:16px;color:#0f172a}
      h1{font-size:16px;margin:0 0 12px}
      table{width:100%;border-collapse:collapse;font-size:12px}
      th,td{border:1px solid #cbd5e1;padding:6px 8px;text-align:left}
      th{background:#f1f5f9}
      td.num{text-align:right;font-variant-numeric:tabular-nums}
    </style></head><body>
    <h1>${title}</h1>
    <table><thead><tr>${thead}</tr></thead><tbody>${body}</tbody></table>
    <script>window.onload=()=>{window.print();}</script>
    </body></html>`);
  w.document.close();
}

function downloadCsv(filename: string, headers: string[], rows: string[][]) {
  const esc = (s: string) => `"${String(s).replace(/"/g, '""')}"`;
  const lines = [headers.map(esc).join(";"), ...rows.map((r) => r.map(esc).join(";"))];
  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function buildPayload(
  form: AccountForm,
  mode: FormMode,
  context: CoaAccount | null,
  selectedId: number | null,
): CoaAccountPayload {
  const isPostable = form.account_level === "MUAVIN";
  const base: CoaAccountPayload = {
    code: form.code.trim(),
    name: form.name.trim(),
    description: form.description.trim() || null,
    account_level: form.account_level,
    account_nature: form.account_nature,
    use_fx_diff: form.use_fx_diff,
    special_code: form.special_code.trim() || null,
    special_code2: form.special_code2.trim() || null,
    special_code3: form.special_code3.trim() || null,
    group_code: form.group_code.trim() || null,
    code_separator: form.code_separator,
    code_depth: form.code_depth,
    currency_code: form.currency_code.trim() || "TRY",
    rate_type: form.rate_type,
    is_postable: isPostable,
  };
  if (mode === "edit") {
    return { ...base, parent_id: context?.parent_id ?? null };
  }
  return {
    ...base,
    parent_id: context?.id ?? null,
    insert_after_id: selectedId,
  };
}

function CodeSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: CodeMasterEntry[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="form-row compact">
      <label>{label}</label>
      <select className="form-control" value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
        <option value="">—</option>
        {options.map((o) => (
          <option key={o.id} value={o.code}>
            {o.code} — {o.name}
          </option>
        ))}
      </select>
    </div>
  );
}

export function HesapPlaniPanel() {
  const branchId = useAppStore((s) => s.branchId);
  const recordTypeId = useAppStore((s) => s.recordTypeId);

  const [accounts, setAccounts] = useState<CoaAccount[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  const [view, setView] = useState<ViewMode>("plan");
  const [periodMode, setPeriodMode] = useState<PeriodMode>("year");
  const [dateFrom, setDateFrom] = useState(yearStart());
  const [dateTo, setDateTo] = useState(today());
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [periodOpen, setPeriodOpen] = useState<"genel-mizan" | "iki-tarih-mizan" | null>(null);

  const [report, setReport] = useState<ReportResponse | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [exporting, setExporting] = useState<"xlsx" | "pdf" | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>("add");
  const [form, setForm] = useState<AccountForm>(emptyForm());
  const [saving, setSaving] = useState(false);

  const [specialOptions, setSpecialOptions] = useState<CodeMasterEntry[]>([]);
  const [groupOptions, setGroupOptions] = useState<CodeMasterEntry[]>([]);
  const [specialSlots, setSpecialSlots] = useState<CodeFieldSlot[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyLookup[]>(FALLBACK_CURRENCIES);

  const selected = useMemo(
    () => accounts.find((a) => a.id === selectedId) ?? null,
    [accounts, selectedId]
  );

  const loadPlan = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await sistemAyarlariApi.listHesapPlani({
        q: q.trim() || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        branch_id: branchId ?? undefined,
        record_type_id: recordTypeId ?? undefined,
      });
      setAccounts(res.items ?? []);
    } catch (e) {
      setAccounts([]);
      setError(e instanceof Error ? e.message : "Liste alınamadı");
    } finally {
      setLoading(false);
    }
  }, [q, dateFrom, dateTo, branchId, recordTypeId]);

  useEffect(() => {
    void loadPlan();
  }, [loadPlan]);

  useEffect(() => {
    let cancelled = false;
    async function loadLookups() {
      try {
        const cur = await kasaBankaApi.lookupCurrencies();
        if (!cancelled && (cur.items ?? []).length) {
          setCurrencies(cur.items);
        }
      } catch {
        if (!cancelled) setCurrencies(FALLBACK_CURRENCIES);
      }

      try {
        const res = await kodTanimlariApi.listSlots("COA");
        const slots = (res.items ?? []).filter((s) => s.is_active);
        if (!slots.length) {
          if (!cancelled) {
            setSpecialSlots([]);
            setSpecialOptions([]);
            setGroupOptions([]);
          }
          return;
        }
        const specials = slots
          .filter((s) => s.field_kind === "SPECIAL")
          .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
        const groups = slots
          .filter((s) => s.field_kind === "GROUP")
          .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);

        const entryLists = await Promise.all(
          [...specials, ...groups].map((s) =>
            kodTanimlariApi.listEntries(s.id).catch(() => ({ items: [] as CodeMasterEntry[] }))
          )
        );
        const bySlot = new Map<number, CodeMasterEntry[]>();
        [...specials, ...groups].forEach((s, i) => {
          bySlot.set(
            s.id,
            (entryLists[i]?.items ?? []).filter((e) => e.is_active)
          );
        });

        const allSpecial = specials.flatMap((s) => bySlot.get(s.id) ?? []);
        const allGroup = groups.flatMap((s) => bySlot.get(s.id) ?? []);
        if (!cancelled) {
          setSpecialSlots(specials);
          setSpecialOptions(allSpecial);
          setGroupOptions(allGroup);
        }
      } catch {
        if (!cancelled) {
          setSpecialSlots([]);
          setSpecialOptions([]);
          setGroupOptions([]);
        }
      }
    }
    void loadLookups();
    return () => {
      cancelled = true;
    };
  }, []);

  const specialSelectPools = useMemo((): [CodeMasterEntry[], CodeMasterEntry[], CodeMasterEntry[]] => {
    if (specialSlots.length >= 3) {
      return [
        specialOptions.filter((e) => e.slot_id === specialSlots[0].id),
        specialOptions.filter((e) => e.slot_id === specialSlots[1].id),
        specialOptions.filter((e) => e.slot_id === specialSlots[2].id),
      ];
    }
    if (specialSlots.length === 1) {
      const pool = specialOptions.filter((e) => e.slot_id === specialSlots[0].id);
      return [pool, pool, pool];
    }
    if (specialSlots.length === 2) {
      const a = specialOptions.filter((e) => e.slot_id === specialSlots[0].id);
      const b = specialOptions.filter((e) => e.slot_id === specialSlots[1].id);
      return [a, b, b];
    }
    return [[], [], []];
  }, [specialSlots, specialOptions]);

  async function deleteSelected() {
    if (!selectedId || !selected) return;
    if (!window.confirm(`${selected.code} — ${selected.name}\n\nBu hesap silinsin mi?`)) return;
    try {
      await sistemAyarlariApi.deleteHesapPlani(selectedId);
      setSelectedId(null);
      await loadPlan();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Silinemedi");
    }
  }

  async function seedTdhp() {
    const force = accounts.length > 0 && window.confirm(
      "Hesap planında kayıt var. Eksik TDHP hesaplarını eklemek için devam edilsin mi?\n(Mevcut kodlar korunur)"
    );
    if (accounts.length > 0 && !force) return;
    try {
      const res = await sistemAyarlariApi.seedTdhp(false);
      window.alert(
        res.skipped
          ? `Mevcut plan korundu (${(res as { existing?: number }).existing ?? "—"} hesap).`
          : `TDHP yüklendi: ${res.seeded} hesap eklendi.`
      );
      await loadPlan();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "TDHP yüklenemedi");
    }
  }

  async function onExcelFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      // CSV basit parse (xlsx için kullanıcı CSV kaydedebilir; xlsx desteği sonraki adım)
      const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      if (lines.length < 2) {
        window.alert("Excel/CSV boş veya tek satır");
        return;
      }
      const sep = lines[0].includes(";") ? ";" : ",";
      const headers = lines[0].split(sep).map((h) => h.replace(/^"|"$/g, "").trim());
      const rows: Record<string, string>[] = [];
      for (const line of lines.slice(1)) {
        const cols = line.split(sep).map((c) => c.replace(/^"|"$/g, "").trim());
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => {
          obj[h] = cols[i] ?? "";
        });
        rows.push(obj);
      }
      const res = await sistemAyarlariApi.importHesapPlaniExcel(rows);
      window.alert(`İçe aktarım: ${res.created} yeni, ${res.updated} güncelleme. Ayrışım=${res.separator} Kırılım=${res.depth}`);
      await loadPlan();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Excel yükleme başarısız (CSV olarak kaydedip deneyin)");
    }
  }

  function buildFilters(extra?: { account_id?: number }): CommonReportFilters {
    return {
      branch_id: branchId ?? undefined,
      record_type_id: recordTypeId ?? undefined,
      period_mode: periodMode,
      date_from: dateFrom,
      date_to: dateTo,
      year: Number(year) || undefined,
      month: Number(month) || undefined,
      account_id: extra?.account_id,
      limit: 2000,
    };
  }

  async function runReport(mode: Exclude<ViewMode, "plan">, accountId?: number) {
    setView(mode);
    setReportLoading(true);
    setError(null);
    try {
      const res = await raporApi.getReport("muhasebe", mode, buildFilters({ account_id: accountId }));
      setReport(res);
    } catch (e) {
      setReport(null);
      setError(e instanceof Error ? e.message : "Rapor alınamadı");
    } finally {
      setReportLoading(false);
    }
  }

  function openMizanDialog(kind: "genel-mizan" | "iki-tarih-mizan") {
    setPeriodMode(kind === "iki-tarih-mizan" ? "range" : "year");
    setPeriodOpen(kind);
  }

  async function confirmMizan() {
    if (!periodOpen) return;
    const kind = periodOpen;
    setPeriodOpen(null);
    await runReport(kind);
  }

  useEffect(() => {
    const s = loadLocalCoaSettings();
    applyCoaColors(s);

    const onSettingsChange = (e: Event) => {
      const updated = (e as CustomEvent).detail || loadLocalCoaSettings();
      applyCoaColors(updated);
    };

    window.addEventListener("tabia:coa-settings-changed", onSettingsChange);
    return () => {
      window.removeEventListener("tabia:coa-settings-changed", onSettingsChange);
    };
  }, []);

  function openMuavin(row: CoaAccount) {
    setSelectedId(row.id);
    void runReport("muavin", row.id);
  }

  function openAddUnderSelected() {
    const coaSettings = loadLocalCoaSettings();
    const activeSep = coaSettings.code_separator;
    const activeDepth = coaSettings.code_depth;

    if (!selected) {
      setForm({
        ...emptyForm(),
        code_separator: activeSep,
        code_depth: activeDepth,
      });
    } else {
      const sep = activeSep;
      const depth = activeDepth;
      const prefix = selected.code.endsWith(sep) ? selected.code : `${selected.code}${sep}`;
      setForm({
        ...emptyForm(),
        code_separator: sep,
        code_depth: depth,
        code: prefix,
        account_level: "MUAVIN",
        currency_code: (selected.currency_code || "TRY").toUpperCase(),
        rate_type: normalizeRateType(selected.rate_type),
        use_fx_diff: Boolean(selected.use_fx_diff),
      });
    }
    setFormMode("add");
    setFormOpen(true);
  }

  function openEditSelected() {
    if (!selected) {
      window.alert("Düzenlemek için listeden bir hesap seçin.");
      return;
    }
    setForm(accountToForm(selected, accounts));
    setFormMode("edit");
    setFormOpen(true);
  }

  function onCodeChange(raw: string) {
    setForm((f) => ({
      ...f,
      code: formatCoaTypedCode(raw, f.code_separator, f.code_depth),
    }));
  }

  function onSeparatorChange(sep: CoaCodeSeparator) {
    setForm((f) => ({
      ...f,
      code_separator: sep,
      code: formatCoaTypedCode(f.code, sep, f.code_depth),
    }));
  }

  function onDepthChange(depth: number) {
    setForm((f) => ({
      ...f,
      code_depth: depth,
      code: formatCoaTypedCode(f.code, f.code_separator, depth),
    }));
  }

  async function saveAccount() {
    if (!form.code.trim() || !form.name.trim()) {
      window.alert("Kod ve ad zorunlu");
      return;
    }
    if (form.account_level === "SINIF" && !/^[1-9]$/.test(form.code.trim())) {
      window.alert("Sınıf hesabı kodu yalnızca 1–9 arası tek hane olabilir");
      return;
    }
    if (form.account_level === "ALT_SINIF" && !/^[1-9]\d$/.test(form.code.trim())) {
      window.alert("Alt sınıf hesabı kodu 10, 11, … formatında (2 hane) olmalıdır");
      return;
    }
    if (form.account_level === "ANA" && !/^[1-9]\d{2}$/.test(form.code.trim())) {
      window.alert("Ana hesap kodu 100–799 arası 3 haneli olmalıdır");
      return;
    }
    setSaving(true);
    try {
      const payload = buildPayload(form, formMode, selected, selectedId);
      if (formMode === "edit" && selectedId) {
        await sistemAyarlariApi.updateHesapPlani(selectedId, payload);
      } else {
        await sistemAyarlariApi.createHesapPlani(payload);
      }
      setFormOpen(false);
      await loadPlan();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Kayıt başarısız");
    } finally {
      setSaving(false);
    }
  }

  async function exportReport(fmt: "xlsx" | "pdf") {
    if (view === "plan") return;
    setExporting(fmt);
    try {
      await raporApi.exportReport("muhasebe", view, fmt, buildFilters({ account_id: selectedId ?? undefined }));
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Dışa aktarım başarısız");
    } finally {
      setExporting(null);
    }
  }

  function exportPlan(kind: "excel" | "pdf" | "print") {
    const headers = ["Kod", "Ad"];
    const rows = accounts.map((a) => [a.code, a.name]);
    if (kind === "excel") {
      downloadCsv("hesap_plani.csv", headers, rows);
      return;
    }
    printHtml("Hesap Planı", headers, rows);
  }

  function exportCurrentView(kind: "excel" | "pdf" | "print") {
    if (view === "plan") {
      exportPlan(kind);
      return;
    }
    if (kind === "excel") {
      void exportReport("xlsx");
      return;
    }
    if (kind === "pdf") {
      void exportReport("pdf");
      return;
    }
    if (!report) return;
    const cols = report.meta.columns ?? [];
    const headers = cols.map((c) => c.label);
    const rows = (report.rows ?? []).map((r) =>
      cols.map((c) => {
        const v = r[c.key];
        if (typeof v === "number") return money(v);
        return v == null ? "" : String(v);
      })
    );
    printHtml(report.meta.title, headers, rows);
  }

  const planColumns: DataTableColumn<CoaAccount>[] = [
    {
      key: "code",
      header: "Kod",
      width: 120,
      minWidth: 80,
      render: (row) => (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <code>{row.code}</code>
          {(hoveredId === row.id || selectedId === row.id) && (
            <button
              type="button"
              className="btn-top"
              style={{ fontSize: 11, padding: "2px 8px" }}
              onClick={(e) => {
                e.stopPropagation();
                openMuavin(row);
              }}
            >
              Muavin Dökümü
            </button>
          )}
        </div>
      ),
    },
    { key: "name", header: "Ad", width: 280, minWidth: 140, render: (row) => row.name },
    {
      key: "debit",
      header: "Borç",
      width: 120,
      minWidth: 90,
      align: "right",
      render: (row) => money(row.debit),
    },
    {
      key: "credit",
      header: "Alacak",
      width: 120,
      minWidth: 90,
      align: "right",
      render: (row) => money(row.credit),
    },
    {
      key: "balance",
      header: "Bakiye",
      width: 120,
      minWidth: 90,
      align: "right",
      render: (row) => money(row.balance),
    },
  ];

  const reportColumns: DataTableColumn<Record<string, unknown>>[] = useMemo(() => {
    if (!report?.meta.columns) return [];
    return report.meta.columns.map((c) => ({
      key: c.key,
      header: c.label,
      width: c.key.includes("name") || c.key.includes("description") ? 220 : 120,
      align: ["debit", "credit", "balance", "amount"].includes(c.key) ? ("right" as const) : ("left" as const),
      render: (row: Record<string, unknown>) => {
        const v = row[c.key];
        if (typeof v === "number") return money(v);
        return v == null ? "—" : String(v);
      },
    }));
  }, [report]);

  const formTitle =
    formMode === "edit" && selected
      ? `Hesap Değiştir — ${selected.code}`
      : selected
        ? `Hesap Ekle — ${selected.code} altına`
        : "Yeni Hesap";

  return (
    <div>
      <div className="ayar-form-card" style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>📒 Hesap Planı</h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="btn-top blue" onClick={() => openMizanDialog("genel-mizan")}>
              Genel Mizan
            </button>
            <button type="button" className="btn-top" onClick={() => openMizanDialog("iki-tarih-mizan")}>
              İki Tarih Arası Mizan
            </button>
            <button
              type="button"
              className="btn-top"
              disabled={!selectedId}
              onClick={openEditSelected}
            >
              Değiştir
            </button>
            <button
              type="button"
              className="btn-top"
              style={{ color: "#b91c1c" }}
              disabled={!selectedId}
              onClick={() => void deleteSelected()}
            >
              Sil
            </button>
            <button type="button" className="btn-top green" onClick={openAddUnderSelected}>
              + Ekle
            </button>
            <button type="button" className="btn-top" onClick={() => void seedTdhp()}>
              TDHP Yükle
            </button>
            <label className="btn-top" style={{ cursor: "pointer", margin: 0 }}>
              Excel Yükle
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                style={{ display: "none" }}
                onChange={(e) => void onExcelFile(e)}
              />
            </label>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          <input
            className="form-control"
            style={{ minWidth: 200, flex: 1 }}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Kod / ad ara"
          />
          <button type="button" className="btn-top" onClick={() => { setView("plan"); void loadPlan(); }}>
            Listeyi Yenile
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          <span style={{ fontSize: 12, color: "#64748b", alignSelf: "center" }}>Çıktı:</span>
          <button type="button" className="btn-secondary" style={{ fontSize: 12 }} onClick={() => exportCurrentView("excel")} disabled={!!exporting}>
            {exporting === "xlsx" ? "Excel…" : "📥 Excel"}
          </button>
          <button type="button" className="btn-secondary" style={{ fontSize: 12 }} onClick={() => exportCurrentView("pdf")} disabled={!!exporting}>
            {exporting === "pdf" ? "PDF…" : "📄 PDF"}
          </button>
          <button type="button" className="btn-secondary" style={{ fontSize: 12 }} onClick={() => exportCurrentView("print")}>
            🖨 Yazıcı
          </button>
          {view !== "plan" && (
            <button type="button" className="btn-secondary" style={{ fontSize: 12 }} onClick={() => setView("plan")}>
              ← Hesap Planı
            </button>
          )}
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: 8 }}>{error}</div>}

        {view === "plan" ? (
          <DataTable
            tableKey="hesap-plani-tanim"
            columns={planColumns}
            data={accounts}
            rowKey={(r) => r.id}
            zebra
            loading={loading}
            selectedRowKey={selectedId}
            getRowClassName={(row) => rowLevelClass(row, accounts)}
            onRowClick={(row) => setSelectedId(row.id)}
            onRowMouseEnter={(row) => setHoveredId(row.id)}
            onRowMouseLeave={() => setHoveredId(null)}
            emptyMessage="Hesap bulunamadı."
          />
        ) : (
          <div>
            <h4 style={{ margin: "0 0 8px", fontSize: 14 }}>
              {view === "genel-mizan" && "Genel Mizan"}
              {view === "iki-tarih-mizan" && "İki Tarih Arası Mizan"}
              {view === "muavin" && `Muavin — ${selected?.code ?? ""} ${selected?.name ?? ""}`}
            </h4>
            <DataTable
              tableKey={`hesap-plani-${view}`}
              columns={reportColumns}
              data={(report?.rows ?? []).map((r, i) => ({ ...r, __i: i }))}
              rowKey={(r) => Number(r.__i)}
              zebra
              loading={reportLoading}
              emptyMessage="Kayıt yok."
            />
          </div>
        )}
      </div>

      {periodOpen && (
        <div className="modal-overlay show" role="dialog" aria-modal="true">
          <div className="modal-card" style={{ maxWidth: 440, width: "92%" }}>
            <h3 style={{ marginTop: 0 }}>
              {periodOpen === "genel-mizan" ? "Genel Mizan" : "İki Tarih Arası Mizan"} — Dönem
            </h3>
            <div className="form-row compact">
              <label>Dönem Tipi</label>
              <select className="form-control" value={periodMode} onChange={(e) => setPeriodMode(e.target.value as PeriodMode)}>
                <option value="range">Tarih aralığı</option>
                <option value="month">Ay</option>
                <option value="year">Yıl</option>
              </select>
            </div>
            {periodMode === "range" && (
              <div className="gg-grid-2col">
                <div className="form-row compact">
                  <label>Başlangıç</label>
                  <input type="date" className="form-control" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                </div>
                <div className="form-row compact">
                  <label>Bitiş</label>
                  <input type="date" className="form-control" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                </div>
              </div>
            )}
            {periodMode === "month" && (
              <div className="gg-grid-2col">
                <div className="form-row compact">
                  <label>Yıl</label>
                  <input type="number" className="form-control" value={year} onChange={(e) => setYear(e.target.value)} />
                </div>
                <div className="form-row compact">
                  <label>Ay</label>
                  <input type="number" min={1} max={12} className="form-control" value={month} onChange={(e) => setMonth(e.target.value)} />
                </div>
              </div>
            )}
            {periodMode === "year" && (
              <div className="form-row compact">
                <label>Yıl</label>
                <input type="number" className="form-control" value={year} onChange={(e) => setYear(e.target.value)} />
              </div>
            )}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
              <button type="button" className="btn-secondary" onClick={() => setPeriodOpen(null)}>Vazgeç</button>
              <button type="button" className="btn-save" onClick={() => void confirmMizan()}>Çalıştır</button>
            </div>
          </div>
        </div>
      )}

      <SidePanel
        open={formOpen}
        title={formTitle}
        onClose={() => setFormOpen(false)}
        size="md"
        footer={
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" className="btn-secondary" onClick={() => setFormOpen(false)}>Vazgeç</button>
            <button type="button" className="btn-save" disabled={saving} onClick={() => void saveAccount()}>
              {saving ? "Kaydediliyor…" : "Kaydet"}
            </button>
          </div>
        }
      >
        <div className="form-row compact">
          <label>Hesap Tipi</label>
          <select
            className="form-control"
            value={form.account_level ?? "MUAVIN"}
            onChange={(e) =>
              setForm((f) => ({ ...f, account_level: e.target.value as CoaAccountLevel }))
            }
          >
            <option value="SINIF">Sınıf (1)</option>
            <option value="ALT_SINIF">Alt Sınıf (10)</option>
            <option value="ANA">Ana (100)</option>
            <option value="GRUP">Grup</option>
            <option value="MUAVIN">Muavin (detay)</option>
          </select>
        </div>

        <p className="muted" style={{ fontSize: 12, margin: "0 0 10px" }}>
          Ayrışım / kırılım ayarları: <strong>Tanımlar → Hesap Planı Ayarları</strong>
        </p>

        <div className="form-row compact">
          <label>Hesap Kodu</label>
          <input
            className="form-control"
            style={{ width: "100%", minWidth: 280, fontFamily: "ui-monospace, Consolas, monospace", fontSize: 15 }}
            value={form.code ?? ""}
            onChange={(e) => onCodeChange(e.target.value)}
            placeholder="Örn. 100.01.01.001"
          />
        </div>

        <div className="form-row compact">
          <label>Hesap Adı</label>
          <input
            className="form-control"
            style={{ width: "100%", minWidth: 280 }}
            value={form.name ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </div>

        <div className="form-row compact">
          <label>Açıklama</label>
          <input
            className="form-control"
            value={form.description ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </div>

        <div className="form-row compact">
          <label>Hesap Türü</label>
          <select
            className="form-control"
            value={form.account_nature ?? "BORC_ALACAK"}
            onChange={(e) =>
              setForm((f) => ({ ...f, account_nature: e.target.value as CoaAccountNature }))
            }
          >
            <option value="BORC">Borç</option>
            <option value="ALACAK">Alacak</option>
            <option value="BORC_ALACAK">Borç+Alacak</option>
          </select>
        </div>

        <div className="form-row compact">
          <label>Döviz tipi</label>
          <select
            className="form-control"
            value={form.currency_code ?? "TRY"}
            onChange={(e) => setForm((f) => ({ ...f, currency_code: e.target.value }))}
          >
            {currencies.map((c) => (
              <option key={c.id} value={c.code}>
                {c.code} — {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-row compact">
          <label>Kur tipi</label>
          <select
            className="form-control"
            value={form.rate_type ?? "ALIS"}
            onChange={(e) => setForm((f) => ({ ...f, rate_type: e.target.value as CoaRateType }))}
          >
            <option value="ALIS">Alış</option>
            <option value="SATIS">Satış</option>
            <option value="EFEKTIF_ALIS">Efektif Alış</option>
            <option value="EFEKTIF_SATIS">Efektif Satış</option>
          </select>
        </div>

        <div className="form-row compact">
          <label>Kur farkı kullanım</label>
          <select
            className="form-control"
            value={form.use_fx_diff ? "1" : "0"}
            onChange={(e) => setForm((f) => ({ ...f, use_fx_diff: e.target.value === "1" }))}
          >
            <option value="0">Hayır</option>
            <option value="1">Evet</option>
          </select>
        </div>

        <div className="gg-grid-2col">
          <CodeSelect
            label="Özel Kod"
            value={form.special_code}
            options={specialSelectPools[0]}
            onChange={(v) => setForm((f) => ({ ...f, special_code: v }))}
          />
          <CodeSelect
            label="Özel Kod2"
            value={form.special_code2}
            options={specialSelectPools[1]}
            onChange={(v) => setForm((f) => ({ ...f, special_code2: v }))}
          />
          <CodeSelect
            label="Özel Kod3"
            value={form.special_code3}
            options={specialSelectPools[2]}
            onChange={(v) => setForm((f) => ({ ...f, special_code3: v }))}
          />
          <CodeSelect
            label="Grup Kodu"
            value={form.group_code}
            options={groupOptions}
            onChange={(v) => setForm((f) => ({ ...f, group_code: v }))}
          />
        </div>
        <p style={{ fontSize: 12, color: "#64748b" }}>
          {formMode === "edit"
            ? "Seçili hesabın bilgileri güncellenir. Yalnızca Muavin (detay) hesaplara fiş kaydı yapılabilir."
            : selected
              ? "Seçili hesabın altına eklenir; kod önek + ayrışım ile gelir, sonraki segmenti siz yazın."
              : "Yeni hesap eklenir. Sınıf/Ana/Grup kayda kapalıdır; Muavin postable’dır."}
        </p>
      </SidePanel>
    </div>
  );
}
