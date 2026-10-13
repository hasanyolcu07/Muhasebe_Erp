import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { formatCoaDisplay, lookupChartOfAccounts, type CoaLookup } from "@/services/coaApi";

type Props = {
  value: number | null;
  onChange: (id: number | null, item?: CoaLookup | null) => void;
  displayLabel?: string | null;
  disabled?: boolean;
  placeholder?: string;
  id?: string;
  searchHint?: string;
  /** İlk yüklemede filtre öneki (örn. 100, 770) */
  initialSearch?: string;
  /** true: Seç/✖ butonlarını gizle; yalnızca tıklanabilir input */
  hideActions?: boolean;
};

export type ChartOfAccountsPickerHandle = {
  open: () => void;
};

export const ChartOfAccountsPicker = forwardRef<ChartOfAccountsPickerHandle, Props>(
  function ChartOfAccountsPicker(
    {
      value,
      onChange,
      displayLabel,
      disabled = false,
      placeholder = "Hesap planından seç…",
      id,
      searchHint = "Kod veya hesap adı ara (100, 120, 320, 770…)",
      initialSearch = "",
      hideActions = false,
    },
    ref
  ) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState(initialSearch);
    const [items, setItems] = useState<CoaLookup[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [highlight, setHighlight] = useState(0);
    const [selectedLabel, setSelectedLabel] = useState(displayLabel ?? "");
    const activeItemRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
      if (displayLabel != null) setSelectedLabel(displayLabel);
    }, [displayLabel]);

    const loadItems = useCallback(async (q: string) => {
      setLoading(true);
      setError(null);
      try {
        const rows = await lookupChartOfAccounts(q || undefined, 100);
        const safeRows = Array.isArray(rows) ? rows : [];
        setItems(safeRows);
        setHighlight(0);
      } catch (err: any) {
        setError(err?.message || "Hesap planı yüklenirken bir sorun oluştu.");
        setItems([]);
      } finally {
        setLoading(false);
      }
    }, []);

    useEffect(() => {
      if (!open) return;
      const t = setTimeout(() => loadItems(query), 220);
      return () => clearTimeout(t);
    }, [open, query, loadItems]);

    // Klavye ile gezinirken aktif öğeyi görünür alana kaydır
    useEffect(() => {
      if (open && activeItemRef.current) {
        activeItemRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }, [highlight, open]);

    function openModal() {
      if (disabled) return;
      setQuery(initialSearch);
      setOpen(true);
    }

    useEffect(() => {
      if (!open) return;
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") setOpen(false);
      };
      window.addEventListener("keydown", onKeyDown);
      return () => window.removeEventListener("keydown", onKeyDown);
    }, [open]);

    useImperativeHandle(ref, () => ({ open: openModal }), [disabled, initialSearch]);

    function selectItem(item: CoaLookup) {
      onChange(item.id, item);
      setSelectedLabel(formatCoaDisplay(item));
      setOpen(false);
    }

    function clearSelection() {
      onChange(null, null);
      setSelectedLabel("");
    }

    const shown = selectedLabel || (value ? `#${value}` : "");

    return (
      <>
        <div className={`coa-picker-field${hideActions ? " hide-actions" : ""}`} id={id}>
          <input
            type="text"
            className="form-control coa-picker-display"
            readOnly
            value={shown}
            placeholder={placeholder}
            disabled={disabled}
            onClick={openModal}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openModal();
              }
            }}
            role="combobox"
            aria-expanded={open}
            aria-haspopup="dialog"
            aria-label="Hesap planı seçici"
          />
          {!hideActions ? (
            <div className="coa-picker-actions">
              {value ? (
                <button
                  type="button"
                  className="btn-top"
                  style={{ fontSize: 11, padding: "4px 8px" }}
                  onClick={clearSelection}
                  disabled={disabled}
                  title="Seçimi Temizle"
                  aria-label="Seçimi Temizle"
                >
                  ✖
                </button>
              ) : null}
              <button
                type="button"
                className="btn-top blue"
                style={{ fontSize: 11, padding: "4px 10px" }}
                onClick={openModal}
                disabled={disabled}
                aria-label="Hesap Planından Seç"
              >
                📒 Seç
              </button>
            </div>
          ) : null}
        </div>

        {open && typeof document !== "undefined"
          ? createPortal(
              <div
                className="modal-overlay show coa-picker-modal"
                role="dialog"
                aria-modal="true"
                aria-label="Hesap planı seç"
                style={{ zIndex: 99999 }}
                onClick={(e) => {
                  if (e.target === e.currentTarget) setOpen(false);
                }}
              >
                <div className="modal-content coa-picker-content">
                  <div className="modal-header">
                    <span>📒 Hesap Planı Seç</span>
                    <button
                      type="button"
                      className="btn-top"
                      style={{ background: "transparent", color: "#fff" }}
                      onClick={() => setOpen(false)}
                      aria-label="Kapat"
                    >
                      ✖
                    </button>
                  </div>
                  <div className="modal-body">
                    <input
                      type="text"
                      className="form-control"
                      placeholder={searchHint}
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (items.length === 0) return;
                        if (e.key === "ArrowDown") {
                          e.preventDefault();
                          setHighlight((h) => Math.min(h + 1, items.length - 1));
                        } else if (e.key === "ArrowUp") {
                          e.preventDefault();
                          setHighlight((h) => Math.max(h - 1, 0));
                        } else if (e.key === "Enter") {
                          e.preventDefault();
                          if (items[highlight]) selectItem(items[highlight]);
                        } else if (e.key === "Escape") {
                          e.preventDefault();
                          setOpen(false);
                        }
                      }}
                      autoFocus
                      aria-label="Hesap arama kutusu"
                    />
                    <div className="coa-picker-list" role="listbox">
                      {loading ? (
                        <p className="text-muted" style={{ padding: 12 }}>
                          Aranıyor…
                        </p>
                      ) : error ? (
                        <div style={{ padding: 12, color: "#dc2626" }}>
                          <p style={{ margin: 0 }}>⚠️ {error}</p>
                          <button
                            type="button"
                            className="btn-top"
                            style={{ marginTop: 6, fontSize: 11 }}
                            onClick={() => loadItems(query)}
                          >
                            Tekrar Dene
                          </button>
                        </div>
                      ) : items.length === 0 ? (
                        <p className="text-muted" style={{ padding: 12 }}>
                          Sonuç bulunamadı.
                        </p>
                      ) : (
                        items.map((item, idx) => (
                          <button
                            key={item.id}
                            ref={idx === highlight ? activeItemRef : null}
                            type="button"
                            role="option"
                            aria-selected={idx === highlight || value === item.id}
                            className={`coa-picker-item${value === item.id ? " selected" : ""}${idx === highlight ? " active-nav" : ""}`}
                            style={{
                              backgroundColor: idx === highlight ? "#eff6ff" : undefined,
                            }}
                            onClick={() => selectItem(item)}
                            onMouseEnter={() => setHighlight(idx)}
                          >
                            <strong>{item.code}</strong>
                            <span>{item.name}</span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn-cancel" onClick={() => setOpen(false)}>
                      Kapat
                    </button>
                  </div>
                </div>
              </div>,
              document.body
            )
          : null}
      </>
    );
  }
);
