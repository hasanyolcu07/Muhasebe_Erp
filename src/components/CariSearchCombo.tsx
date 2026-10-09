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
  const [highlight, setHighlight] = useState(0);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selected = allItems.find((c) => c.id === accountId) ?? results.find((c) => c.id === accountId);

  const runSearch = useCallback(
    async (q: string) => {
      setLoading(true);
      try {
        const items = await onSearch(q);
        setResults(items);
        if (!q.trim()) setAllItems(items);
        setHighlight(0);
      } catch {
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

  function pick(item: CariLookupItem) {
    onAccountChange(item.id, item);
    setQuery("");
    setOpen(false);
    setAllItems((prev) => (prev.some((p) => p.id === item.id) ? prev : [item, ...prev]));
  }

  async function handleCariCreated(id: number) {
    const items = await onSearch("");
    setAllItems(items);
    setResults(items);
    const found = items.find((c) => c.id === id);
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
          <label>Cari Ara</label>
        </div>
        <div className="cari-search-input-wrap">
          <input
            type="text"
            className="form-control"
            placeholder="Kod, ünvan veya VKN..."
            value={query}
            disabled={disabled}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (!open || list.length === 0) return;
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setHighlight((h) => Math.min(h + 1, list.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setHighlight((h) => Math.max(h - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                pick(list[highlight]);
              } else if (e.key === "Escape") {
                setOpen(false);
              }
            }}
            autoComplete="off"
          />
          {open && list.length > 0 && (
            <ul className="cari-search-dropdown" role="listbox">
              {list.map((c, idx) => (
                <li
                  key={c.id}
                  role="option"
                  aria-selected={idx === highlight}
                  className={idx === highlight ? "active" : ""}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(c);
                  }}
                  onMouseEnter={() => setHighlight(idx)}
                >
                  <strong>{c.code}</strong> {c.title}
                  {c.tax_number ? <span className="cari-search-vkn">VKN {c.tax_number}</span> : null}
                </li>
              ))}
            </ul>
          )}
          {open && !loading && query.trim() && list.length === 0 && (
            <div className="cari-search-empty">Sonuç bulunamadı</div>
          )}
        </div>
      </div>

      <div>
        <div className="field-label-row">
          <label>Cari Seç *</label>
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
          className="form-control required"
          value={accountId || 0}
          disabled={disabled}
          onChange={(e) => {
            const id = Number(e.target.value);
            const found = allItems.find((c) => c.id === id) ?? results.find((c) => c.id === id);
            onAccountChange(id, found);
          }}
        >
          <option value={0}>— Cari seç —</option>
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
