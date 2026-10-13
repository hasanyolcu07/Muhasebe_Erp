import { useCallback, useEffect, useRef, useState } from "react";
import { QuickAddCariPanel } from "@/components/quick-add/QuickAddCariPanel";
import { QuickAddTrigger } from "@/components/quick-add/QuickAddTrigger";

export type CariLookupItem = {
  id: number;
  code: string;
  title: string;
  tax_number?: string | null;
  email?: string | null;
  is_efatura?: boolean;
};

type Props = {
  accountId: number;
  onAccountChange: (id: number, item?: CariLookupItem) => void;
  onSearch: (query: string) => Promise<CariLookupItem[]>;
  branchId?: number | null;
  disabled?: boolean;
  /** Show "Yeni Cari Ekle" next to select (default true) */
  enableQuickAdd?: boolean;
};

function formatCariLabel(c: CariLookupItem): string {
  const vkn = c.tax_number ? ` · VKN ${c.tax_number}` : "";
  return `${c.code} | ${c.title}${vkn}`;
}

export function CariSearchCombo({
  accountId,
  onAccountChange,
  onSearch,
  disabled,
  enableQuickAdd = true,
}: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CariLookupItem[]>([]);
  const [allItems, setAllItems] = useState<CariLookupItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highlight, setHighlight] = useState(0);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLLIElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selected = allItems.find((c) => c.id === accountId) ?? results.find((c) => c.id === accountId);

  const runSearch = useCallback(
    async (q: string) => {
      setLoading(true);
      setError(null);
      try {
        const items = await onSearch(q);
        const safeItems = Array.isArray(items) ? items : [];
        setResults(safeItems);
        if (!q.trim()) setAllItems(safeItems);
        setHighlight(0);
      } catch (err: any) {
        setError(err?.message || "Cari listesi yüklenirken hata oluştu.");
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [onSearch]
  );

  useEffect(() => {
    runSearch("");
  }, [runSearch]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runSearch(query);
    }, 220);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, runSearch]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // Aktif öğeyi klavye geziniminde otomatik olarak görünür alana kaydır
  useEffect(() => {
    if (open && activeItemRef.current) {
      activeItemRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [highlight, open]);

  function pick(item: CariLookupItem) {
    onAccountChange(item.id, item);
    setQuery("");
    setOpen(false);
    setAllItems((prev) => (prev.some((p) => p.id === item.id) ? prev : [item, ...prev]));
  }

  async function handleCariCreated(id: number) {
    const items = await onSearch("");
    const safeItems = Array.isArray(items) ? items : [];
    setAllItems(safeItems);
    setResults(safeItems);
    const found = safeItems.find((c) => c.id === id);
    if (found) {
      pick(found);
    } else {
      onAccountChange(id, { id, code: String(id), title: "Yeni cari" });
    }
  }

  const list = query.trim() ? results : allItems;

  return (
    <div className="cari-search-combo" ref={wrapRef}>
      <div style={{ marginBottom: 8 }}>
        <div className="field-label-row">
          <label id="cari-search-label">Cari Ara</label>
        </div>
        <div className="cari-search-input-wrap">
          <input
            type="text"
            className="form-control"
            placeholder="Kod, ünvan veya VKN ile ara..."
            value={query}
            disabled={disabled}
            aria-labelledby="cari-search-label"
            aria-autocomplete="list"
            aria-expanded={open}
            aria-haspopup="listbox"
            aria-controls="cari-search-listbox"
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => {
              setOpen(true);
              if (allItems.length === 0 && !loading) {
                runSearch(query);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                if (!open) {
                  setOpen(true);
                  return;
                }
                if (list.length > 0) {
                  setHighlight((h) => Math.min(h + 1, list.length - 1));
                }
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                if (open && list.length > 0) {
                  setHighlight((h) => Math.max(h - 1, 0));
                }
              } else if (e.key === "Enter") {
                // Form submit'inin istemeden tetiklenmesini kesinlikle engelle
                e.preventDefault();
                e.stopPropagation();
                if (open && list.length > 0 && list[highlight]) {
                  pick(list[highlight]);
                }
              } else if (e.key === "Escape") {
                e.preventDefault();
                setOpen(false);
              } else if (e.key === "Tab") {
                setOpen(false);
              }
            }}
            autoComplete="off"
          />

          {query ? (
            <button
              type="button"
              className="cari-search-clear-btn"
              title="Aramayı Temizle"
              aria-label="Aramayı Temizle"
              onClick={() => {
                setQuery("");
                setOpen(true);
              }}
              style={{
                position: "absolute",
                right: 8,
                top: "50%",
                transform: "translateY(-50%)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "#94a3b8",
                fontSize: 14,
                padding: "2px 6px",
              }}
            >
              ✕
            </button>
          ) : null}

          {open && (
            <div
              className="cari-search-dropdown-container"
              style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                left: 0,
                right: 0,
                zIndex: 1050,
                background: "#fff",
                border: "1px solid #cbd5e1",
                borderRadius: 8,
                boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
                maxHeight: 260,
                overflowY: "auto",
              }}
            >
              {loading ? (
                <div style={{ padding: "12px 14px", color: "#64748b", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                  <span>Cari hesaplar aranıyor…</span>
                </div>
              ) : error ? (
                <div style={{ padding: "12px 14px", color: "#dc2626", fontSize: 13 }}>
                  <p style={{ margin: 0 }}>⚠️ {error}</p>
                  <button
                    type="button"
                    className="btn-top"
                    style={{ marginTop: 6, fontSize: 11, padding: "2px 8px" }}
                    onClick={() => runSearch(query)}
                  >
                    Tekrar Dene
                  </button>
                </div>
              ) : list.length > 0 ? (
                <ul
                  id="cari-search-listbox"
                  className="cari-search-dropdown"
                  role="listbox"
                  style={{ listStyle: "none", margin: 0, padding: "4px 0" }}
                >
                  {list.map((c, idx) => (
                    <li
                      key={c.id}
                      id={`cari-option-${c.id}`}
                      ref={idx === highlight ? activeItemRef : null}
                      role="option"
                      aria-selected={idx === highlight}
                      className={idx === highlight ? "active" : ""}
                      style={{
                        padding: "8px 12px",
                        cursor: "pointer",
                        fontSize: 13,
                        backgroundColor: idx === highlight ? "#eff6ff" : "transparent",
                        borderBottom: "1px solid #f1f5f9",
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        pick(c);
                      }}
                      onMouseEnter={() => setHighlight(idx)}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <strong style={{ color: "#1e40af", marginRight: 6 }}>{c.code}</strong>
                          <span style={{ color: "#0f172a" }}>{c.title}</span>
                        </div>
                        {c.is_efatura ? (
                          <span
                            style={{
                              fontSize: 10,
                              background: "#dcfce7",
                              color: "#166534",
                              padding: "2px 6px",
                              borderRadius: 4,
                              fontWeight: 600,
                            }}
                          >
                            e-Fatura
                          </span>
                        ) : null}
                      </div>
                      {c.tax_number ? (
                        <span className="cari-search-vkn" style={{ fontSize: 11, color: "#64748b", marginTop: 2, display: "block" }}>
                          VKN/TCKN: {c.tax_number}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="cari-search-empty" style={{ padding: "12px 14px", color: "#64748b", fontSize: 13 }}>
                  {query.trim() ? "Aramaya uygun cari bulunamadı." : "Kayıtlı cari hesap bulunamadı."}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div>
        <div className="field-label-row">
          <label htmlFor="cari-select-fallback">Cari Seç *</label>
          {enableQuickAdd ? (
            <QuickAddTrigger
              placement="inline"
              label="Yeni Cari Ekle"
              disabled={disabled}
              onClick={() => setQuickAddOpen(true)}
            />
          ) : null}
        </div>
        <select
          id="cari-select-fallback"
          className="form-control required"
          value={accountId || 0}
          disabled={disabled}
          onChange={(e) => {
            const id = Number(e.target.value);
            const found = allItems.find((c) => c.id === id) ?? results.find((c) => c.id === id);
            onAccountChange(id, found);
          }}
        >
          <option value={0}>— Cari seçiniz —</option>
          {(selected && !allItems.some((c) => c.id === selected.id) ? [selected, ...allItems] : allItems).map(
            (c) => (
              <option key={c.id} value={c.id}>
                {formatCariLabel(c)}
              </option>
            )
          )}
        </select>
      </div>

      {enableQuickAdd ? (
        <QuickAddCariPanel
          open={quickAddOpen}
          onClose={() => setQuickAddOpen(false)}
          onCreated={(id) => void handleCariCreated(id)}
        />
      ) : null}
    </div>
  );
}
