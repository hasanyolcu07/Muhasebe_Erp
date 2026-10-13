import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { useAppStore } from "@/store/appStore";
import {
  raporApi,
  type CommonReportFilters,
  type LookupItem,
  type ReportColumn,
  type ReportResponse,
} from "../api/raporApi";
import type { ReportItem } from "../config/reportMenu";
import { ReportFilterBar, type ReportFilterValues } from "./ReportFilterBar";
import { toDecimal, roundMoney } from "@/lib/financialMath";

type Props = {
  report: ReportItem;
  groupLabel: string;
  apiGroup: string;
};

function yearStart(): string {
  return format(new Date(new Date().getFullYear(), 0, 1), "yyyy-MM-dd");
}

function today(): string {
  return format(new Date(), "yyyy-MM-dd");
}

function defaultFilters(branchId?: number | null, recordTypeId?: number | null): ReportFilterValues {
  return {
    branch_id: branchId != null ? String(branchId) : "",
    record_type_id: recordTypeId != null ? String(recordTypeId) : "",
    period_mode: "range",
    date_from: yearStart(),
    date_to: today(),
    year: String(new Date().getFullYear()),
    month: String(new Date().getMonth() + 1),
    cash_account_id: "",
    bank_account_id: "",
    due_days: "",
    due_days_custom: "",
    q: "",
  };
}

function cellValue(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "Evet" : "Hayır";
  if (typeof v === "number") {
    return Number.isInteger(v)
      ? String(v)
      : v.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  }
  return String(v);
}

function isNumericColumn(key: string): boolean {
  const k = key.toLowerCase();
  return (
    k.includes("tutar") ||
    k.includes("amount") ||
    k.includes("debit") ||
    k.includes("credit") ||
    k.includes("borc") ||
    k.includes("alacak") ||
    k.includes("bakiye") ||
    k.includes("balance") ||
    k.includes("qty") ||
    k.includes("miktar") ||
    k.includes("cost") ||
    k.includes("price") ||
    k.includes("fiyat") ||
    k.includes("total") ||
    k.includes("subtotal") ||
    k.includes("tax") ||
    k.includes("kdv")
  );
}

export function GenericReportPanel({ report, groupLabel, apiGroup }: Props) {
  const storeBranchId = useAppStore((s) => s.branchId);
  const storeRecordTypeId = useAppStore((s) => s.recordTypeId);

  const [filters, setFilters] = useState<ReportFilterValues>(() =>
    defaultFilters(storeBranchId, storeRecordTypeId)
  );
  const [branches, setBranches] = useState<LookupItem[]>([]);
  const [recordTypes, setRecordTypes] = useState<LookupItem[]>([]);
  const [cashAccounts, setCashAccounts] = useState<LookupItem[]>([]);
  const [bankAccounts, setBankAccounts] = useState<LookupItem[]>([]);
  const [data, setData] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<"xlsx" | "pdf" | null>(null);
  const [exportNotice, setExportNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Sıralama & Sayfalama state'i
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);

  // FAZ 7: Drill-Down Muavin Hareketi State'i
  const [drillAccount, setDrillAccount] = useState<{ code: string; name: string } | null>(null);
  const [drillLines, setDrillLines] = useState<any[]>([]);
  const [drillLoading, setDrillLoading] = useState(false);

  const openDrillDown = useCallback(
    async (code: string, name: string) => {
      if (!code || apiGroup !== "muhasebe") return;
      setDrillAccount({ code, name });
      setDrillLoading(true);
      try {
        const res = await raporApi.getReport("muhasebe", "muavin", {
          q: code,
          date_from: filters.date_from,
          date_to: filters.date_to,
        });
        setDrillLines(res.rows || []);
      } catch {
        setDrillLines([]);
      } finally {
        setDrillLoading(false);
      }
    },
    [apiGroup, filters.date_from, filters.date_to]
  );

  const showCash = !!report.filters?.cashPicker;
  const showBank = !!report.filters?.bankPicker;
  const showDue = !!report.filters?.dueDays;
  const showMali = !!report.filters?.maliCompare;

  useEffect(() => {
    setFilters(defaultFilters(storeBranchId, storeRecordTypeId));
    setData(null);
    setError(null);
    setExportNotice(null);
    setCurrentPage(1);
    setSortKey(null);
  }, [report.id, storeBranchId, storeRecordTypeId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [b, r] = await Promise.all([
          raporApi.lookupsBranches(),
          raporApi.lookupsRecordTypes(),
        ]);
        if (!cancelled) {
          setBranches(b.items ?? []);
          setRecordTypes(r.items ?? []);
        }
      } catch {
        if (!cancelled) {
          setBranches([]);
          setRecordTypes([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!showCash && !showBank) return;
    let cancelled = false;
    const bid = filters.branch_id ? Number(filters.branch_id) : undefined;
    const rid = filters.record_type_id ? Number(filters.record_type_id) : undefined;
    (async () => {
      try {
        const tasks: Promise<void>[] = [];
        if (showCash) {
          tasks.push(
            raporApi.lookupsCashAccounts(bid, rid).then((res) => {
              if (!cancelled) setCashAccounts(res.items ?? []);
            })
          );
        }
        if (showBank) {
          tasks.push(
            raporApi.lookupsBankAccounts(bid, rid).then((res) => {
              if (!cancelled) setBankAccounts(res.items ?? []);
            })
          );
        }
        await Promise.all(tasks);
      } catch {
        if (!cancelled) {
          if (showCash) setCashAccounts([]);
          if (showBank) setBankAccounts([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showCash, showBank, filters.branch_id, filters.record_type_id]);

  const buildApiFilters = useCallback((): CommonReportFilters => {
    const f: CommonReportFilters = {
      branch_id: filters.branch_id ? Number(filters.branch_id) : undefined,
      record_type_id: filters.record_type_id ? Number(filters.record_type_id) : undefined,
      period_mode: filters.period_mode,
      q: filters.q.trim() || undefined,
      limit: 1000,
    };
    if (filters.period_mode === "range") {
      f.date_from = filters.date_from || undefined;
      f.date_to = filters.date_to || undefined;
    } else {
      f.year = filters.year ? Number(filters.year) : undefined;
      if (
        filters.period_mode === "month" ||
        filters.period_mode === "month_compare_3" ||
        filters.period_mode === "year_month_compare"
      ) {
        f.month = filters.month ? Number(filters.month) : undefined;
      }
    }
    if (showCash && filters.cash_account_id) f.cash_account_id = Number(filters.cash_account_id);
    if (showBank && filters.bank_account_id) f.bank_account_id = Number(filters.bank_account_id);
    if (showDue) {
      const days = filters.due_days_custom || filters.due_days;
      if (days) f.due_days = Number(days);
      f.date_from = filters.date_from || undefined;
      f.date_to = filters.date_to || undefined;
    }
    return f;
  }, [filters, showBank, showCash, showDue]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setExportNotice(null);
    try {
      const res = await raporApi.getReport(apiGroup, report.id, buildApiFilters());
      setData(res);
      setCurrentPage(1);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : "Rapor yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [apiGroup, buildApiFilters, report.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const columns: ReportColumn[] = useMemo(() => data?.meta?.columns ?? [], [data]);
  const rawRows = useMemo(() => data?.rows ?? [], [data]);

  // Sıralanmış satırlar
  const sortedRows = useMemo(() => {
    if (!sortKey) return rawRows;
    return [...rawRows].sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;
      if (typeof valA === "number" && typeof valB === "number") {
        return sortOrder === "asc" ? valA - valB : valB - valA;
      }
      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      return sortOrder === "asc" ? strA.localeCompare(strB, "tr") : strB.localeCompare(strA, "tr");
    });
  }, [rawRows, sortKey, sortOrder]);

  // Sayfalanmış satırlar
  const totalRowsCount = sortedRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRowsCount / pageSize));
  const displayedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, currentPage, pageSize]);

  // Toplamlar satırı (Tüm filtrelenmiş kayıtlar üzerinden Decimal ile hesaplanır)
  const columnTotals = useMemo(() => {
    const totals: Record<string, number | null> = {};
    for (const c of columns) {
      if (isNumericColumn(c.key)) {
        let sum = toDecimal(0);
        let hasNumber = false;
        for (const row of rawRows) {
          const v = row[c.key];
          if (typeof v === "number" && !isNaN(v)) {
            sum = sum.plus(toDecimal(v));
            hasNumber = true;
          }
        }
        totals[c.key] = hasNumber ? roundMoney(sum).toNumber() : null;
      } else {
        totals[c.key] = null;
      }
    }
    return totals;
  }, [columns, rawRows]);

  function handleSort(key: string) {
    if (sortKey === key) {
      if (sortOrder === "asc") setSortOrder("desc");
      else {
        setSortKey(null);
        setSortOrder("asc");
      }
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  }

  async function onExport(fmt: "xlsx" | "pdf") {
    setExporting(fmt);
    setExportNotice(null);
    try {
      await raporApi.exportReport(apiGroup, report.id, fmt, buildApiFilters());
      setExportNotice({
        type: "success",
        text: `✔ ${report.label} (${fmt.toUpperCase()}) başarıyla indirildi.`,
      });
    } catch (e) {
      setExportNotice({
        type: "error",
        text: e instanceof Error ? e.message : "Dışa aktarım başarısız",
      });
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="reports-content-panel">
      <div className="reports-content-header">
        <div>
          <div className="reports-content-kicker">{groupLabel}</div>
          {report.filters?.groupHeader ? (
            <div className="reports-group-header">{report.filters.groupHeader}</div>
          ) : null}
          <h2>{report.label}</h2>
        </div>
        <div className="reports-export-btns">
          <button
            type="button"
            className="btn-top"
            disabled={!!exporting || loading}
            onClick={() => void onExport("xlsx")}
            title="Excel formatında indir"
          >
            {exporting === "xlsx" ? "Hazırlanıyor…" : "📊 Excel İndir"}
          </button>
          <button
            type="button"
            className="btn-top"
            disabled={!!exporting || loading}
            onClick={() => void onExport("pdf")}
            title="PDF formatında indir"
          >
            {exporting === "pdf" ? "Hazırlanıyor…" : "📄 PDF İndir"}
          </button>
        </div>
      </div>

      {exportNotice ? (
        <div
          className={exportNotice.type === "success" ? "alert-success" : "alert-error"}
          style={{
            padding: "10px 14px",
            marginBottom: 12,
            borderRadius: 6,
            fontSize: 13,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{exportNotice.text}</span>
          <button
            type="button"
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14 }}
            onClick={() => setExportNotice(null)}
          >
            ✕
          </button>
        </div>
      ) : null}

      <ReportFilterBar
        values={filters}
        onChange={(patch) => setFilters((prev) => ({ ...prev, ...patch }))}
        onSubmit={() => void load()}
        loading={loading}
        branches={branches}
        recordTypes={recordTypes}
        cashAccounts={cashAccounts}
        bankAccounts={bankAccounts}
        showCashPicker={showCash}
        showBankPicker={showBank}
        showDueDays={showDue}
        showMaliCompare={showMali}
      />

      {data?.meta?.period_labels?.length ? (
        <div className="reports-period-labels" style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <span>Dönem: {data.meta.period_labels.join(" · ")}</span>
          {data.meta.standard_version ? (
            <span style={{ fontSize: 11, background: "#f1f5f9", padding: "1px 6px", borderRadius: 4, fontWeight: 600 }}>
              Mevzuat: {data.meta.standard_version}
            </span>
          ) : null}
          {data.meta.data_source ? (
            <span style={{ fontSize: 11, color: "#64748b" }}>
              Kaynak: {data.meta.data_source}
            </span>
          ) : null}
        </div>
      ) : null}

      {/* FAZ 7: Bilanço / Mizan Denge Denetimi ve Hata Bildirimi */}
      {data?.meta?.is_balanced === false ? (
        <div
          style={{
            padding: "12px 16px",
            background: "#fef2f2",
            border: "2px solid #ef4444",
            borderRadius: 8,
            color: "#991b1b",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span style={{ fontSize: 24 }}>⚠️</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14 }}>DİKKAT: BİLANÇO / MİZAN DENGESİZLİĞİ TESPİT EDİLDİ!</div>
            <div style={{ fontSize: 13, marginTop: 2 }}>
              Aktif ile Pasif veya Borç ile Alacak hareketleri arasında{" "}
              <strong>
                {typeof data.meta.imbalance_amount === "number"
                  ? `${data.meta.imbalance_amount.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`
                  : "belirsiz"}
              </strong>{" "}
              fark mevcuttur. Rapor doğruluğu için lütfen dengesiz yevmiye fişlerini ve dönem sonu kapanış kayıtlarını kontrol ediniz.
            </div>
          </div>
        </div>
      ) : null}

      {error ? (
        <div
          className="reports-error"
          style={{
            padding: 16,
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 8,
            color: "#991b1b",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>⚠️ {error}</span>
          <button type="button" className="btn-secondary" onClick={() => void load()}>
            Tekrar Dene
          </button>
        </div>
      ) : null}

      {data?.meta?.kpi_cards?.length ? (
        <div className="kpi-grid reports-kpi-grid" style={{ marginBottom: 16 }}>
          {data.meta.kpi_cards.map((card) => (
            <div key={card.key} className="kpi-card">
              <div className="kpi-label">{card.label}</div>
              <div className="kpi-value">
                {card.format === "money" && typeof card.value === "number"
                  ? `${card.value.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`
                  : cellValue(card.value)}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="reports-table-wrap">
        <div
          className="reports-meta-line"
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
        >
          <span>
            {loading
              ? "⏳ Rapor verileri taranıyor…"
              : data
              ? `Toplam ${totalRowsCount} kayıt bulundu`
              : "—"}
          </span>

          {totalRowsCount > 0 ? (
            <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12 }}>
              <label>Sayfa Başı:</label>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                style={{ padding: "2px 6px", borderRadius: 4, border: "1px solid #cbd5e1" }}
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={500}>500</option>
              </select>
            </div>
          ) : null}
        </div>

        <table className="resizable-data-table reports-table">
          <thead>
            <tr>
              {columns.map((c) => {
                const isSorted = sortKey === c.key;
                const isNumeric = isNumericColumn(c.key);
                return (
                  <th
                    key={c.key}
                    onClick={() => handleSort(c.key)}
                    style={{
                      cursor: "pointer",
                      textAlign: isNumeric ? "right" : "left",
                      userSelect: "none",
                    }}
                    title={`${c.label} sıralamak için tıklayın`}
                  >
                    <span>{c.label}</span>
                    <span style={{ marginLeft: 6, fontSize: 10, color: isSorted ? "#2563eb" : "#94a3b8" }}>
                      {isSorted ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                    </span>
                  </th>
                );
              })}
              {!columns.length ? <th>Kolon bilgisi yok</th> : null}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={Math.max(columns.length, 1)} style={{ textAlign: "center", padding: 32 }}>
                  <div style={{ fontSize: 14, color: "#64748b" }}>⏳ Rapor hazırlanıyor, lütfen bekleyin…</div>
                </td>
              </tr>
            ) : null}

            {!loading && data && totalRowsCount === 0 ? (
              <tr>
                <td colSpan={Math.max(columns.length, 1)} style={{ textAlign: "center", padding: 32 }}>
                  <div style={{ fontSize: 14, color: "#64748b" }}>
                    🔍 Belirtilen filtrelere uygun kaynak kayıt bulunamadı.
                  </div>
                </td>
              </tr>
            ) : null}

            {!loading &&
              displayedRows.map((row, idx) => (
                <tr key={idx}>
                  {columns.map((c) => {
                    const isNumeric = isNumericColumn(c.key);
                    const val = row[c.key];
                    const isCodeCell = c.key === "code" && Boolean(row.code) && apiGroup === "muhasebe";
                    return (
                      <td
                        key={c.key}
                        style={{
                          textAlign: isNumeric ? "right" : "left",
                          fontWeight: c.key.includes("total") || c.key.includes("tutar") ? 600 : 400,
                          cursor: isCodeCell ? "pointer" : undefined,
                          color: isCodeCell ? "#2563eb" : undefined,
                          textDecoration: isCodeCell ? "underline" : undefined,
                        }}
                        onClick={() => {
                          if (isCodeCell && row.code) {
                            void openDrillDown(String(row.code), String(row.name || row.title || ""));
                          }
                        }}
                        title={isCodeCell ? "Bu hesaba ait yevmiye hareketlerini (muavin) incelemek için tıklayın" : undefined}
                      >
                        {cellValue(val)}
                      </td>
                    );
                  })}
                </tr>
              ))}
          </tbody>

          {/* FAZ 7: Alt Toplamlar Satırı (Kaynak verilerin tam mutabakat toplamı) */}
          {!loading && totalRowsCount > 0 && Object.values(columnTotals).some((v) => v !== null) ? (
            <tfoot>
              <tr style={{ background: "#f8fafc", fontWeight: 700, borderTop: "2px solid #cbd5e1" }}>
                {columns.map((c, idx) => {
                  if (idx === 0) {
                    return (
                      <td key={c.key} style={{ fontWeight: 800 }}>
                        GENEL TOPLAM ({totalRowsCount} Kayıt)
                      </td>
                    );
                  }
                  const tot = columnTotals[c.key];
                  return (
                    <td
                      key={c.key}
                      style={{
                        textAlign: isNumericColumn(c.key) ? "right" : "left",
                        color: tot !== null ? "#0f172a" : undefined,
                      }}
                    >
                      {tot !== null ? cellValue(tot) : "—"}
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          ) : null}
        </table>

        {/* Sayfalama Kontrolleri */}
        {!loading && totalPages > 1 ? (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px 8px",
              fontSize: 13,
              borderTop: "1px solid #e2e8f0",
            }}
          >
            <div>
              Sayfa {currentPage} / {totalPages}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                type="button"
                className="btn-secondary"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                ◀ Önceki
              </button>
              <button
                type="button"
                className="btn-secondary"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                Sonraki ▶
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* FAZ 7: Drill-Down Modal — Hesap Bazlı Muavin Fiş Hareketleri */}
      {drillAccount && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 16,
          }}
          onClick={() => setDrillAccount(null)}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: 900,
              maxHeight: "85vh",
              display: "flex",
              flexDirection: "column",
              background: "#ffffff",
              borderRadius: 8,
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
              padding: 20,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                borderBottom: "1px solid #e2e8f0",
                paddingBottom: 12,
                marginBottom: 16,
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 18 }}>🔍</span>
                  <h3 style={{ margin: 0, fontSize: 16, color: "#0f172a" }}>
                    Hesap Detay ve Muavin İncelemesi: {drillAccount.code}
                  </h3>
                </div>
                <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                  {drillAccount.name || "Seçilen Hesap"} · Kaynak Yevmiye Fişleri ve Mutabakat Dökümü
                </div>
              </div>
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: "4px 10px", fontSize: 13 }}
                onClick={() => setDrillAccount(null)}
              >
                Kapat ✕
              </button>
            </div>

            <div style={{ overflowY: "auto", flex: 1 }}>
              {drillLoading ? (
                <div style={{ textAlign: "center", padding: 32, color: "#64748b" }}>
                  ⏳ Muavin yevmiye hareketleri taranıyor…
                </div>
              ) : drillLines.length === 0 ? (
                <div style={{ textAlign: "center", padding: 32, color: "#64748b" }}>
                  Bu hesap için belirtilen filtrelerde yevmiye kaydı bulunamadı.
                </div>
              ) : (
                <table className="resizable-data-table reports-table" style={{ fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th>Tarih</th>
                      <th>Fiş No</th>
                      <th>Karşı Hesap</th>
                      <th>Açıklama</th>
                      <th style={{ textAlign: "right" }}>Borç (₺)</th>
                      <th style={{ textAlign: "right" }}>Alacak (₺)</th>
                      <th style={{ textAlign: "right" }}>Yürüyen Bakiye</th>
                      <th>Durum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drillLines.map((ln, i) => (
                      <tr key={i}>
                        <td>{ln.voucher_date}</td>
                        <td style={{ fontWeight: 600 }}>{ln.voucher_no}</td>
                        <td>{ln.counter_account || "—"}</td>
                        <td>{ln.description}</td>
                        <td style={{ textAlign: "right", color: ln.debit ? "#0f172a" : "#94a3b8" }}>
                          {ln.debit ? ln.debit.toLocaleString("tr-TR", { minimumFractionDigits: 2 }) : "—"}
                        </td>
                        <td style={{ textAlign: "right", color: ln.credit ? "#0f172a" : "#94a3b8" }}>
                          {ln.credit ? ln.credit.toLocaleString("tr-TR", { minimumFractionDigits: 2 }) : "—"}
                        </td>
                        <td style={{ textAlign: "right", fontWeight: 700 }}>
                          {ln.running_balance?.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ({ln.balance_type})
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: 10,
                              padding: "2px 6px",
                              borderRadius: 4,
                              background: ln.status === "POSTED" ? "#dcfce7" : "#fef9c3",
                              color: ln.status === "POSTED" ? "#166534" : "#854d0e",
                              fontWeight: 700,
                            }}
                          >
                            {ln.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div
              style={{
                marginTop: 16,
                borderTop: "1px solid #e2e8f0",
                paddingTop: 12,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: 12,
                color: "#64748b",
              }}
            >
              <span>✅ Kayıt Mutabakatı: Gösterilen satırlar doğrudan genel yevmiye defterine bağlıdır.</span>
              <button
                type="button"
                className="btn-primary"
                onClick={() => setDrillAccount(null)}
              >
                Tamam
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
