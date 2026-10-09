import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from "react";
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
      searchHint = "Kod veya hesap adı ara (120, 320, 770…)",
      initialSearch = "",
      hideActions = false,
    },
    ref
  ) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState(initialSearch);
    const [items, setItems] = useState<CoaLookup[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedLabel, setSelectedLabel] = useState(displayLabel ?? "");

    useEffect(() => {
      if (displayLabel != null) setSelectedLabel(displayLabel);
    }, [displayLabel]);

    const loadItems = useCallback(async (q: string) => {
      setLoading(true);
      try {
        const rows = await lookupChartOfAccounts(q || undefined, 80);
        setItems(rows);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }, []);

    useEffect(() => {
      if (!open) return;
      const t = setTimeout(() => loadItems(query), 250);
      return () => clearTimeout(t);
    }, [open, query, loadItems]);

    function openModal() {
      if (disabled) return;
      setQuery(initialSearch);
      setOpen(true);
    }

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
              >
                📒 Seç
              </button>
            </div>
          ) : null}
        </div>

        {open ? (
          <div
            className="modal-overlay show coa-picker-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Hesap planı seç"
          >
            <div className="modal-content coa-picker-content">
              <div className="modal-header">
                <span>📒 Hesap Planı Seç</span>
                <button
                  type="button"
                  className="btn-top"
                  style={{ background: "transparent", color: "#fff" }}
                  onClick={() => setOpen(false)}
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
                  autoFocus
                />
                <div className="coa-picker-list">
                  {loading ? (
                    <p className="text-muted" style={{ padding: 12 }}>
                      Aranıyor…
                    </p>
                  ) : items.length === 0 ? (
                    <p className="text-muted" style={{ padding: 12 }}>
                      Sonuç bulunamadı.
                    </p>
                  ) : (
                    items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`coa-picker-item${value === item.id ? " selected" : ""}`}
                        onClick={() => selectItem(item)}
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
          </div>
        ) : null}
      </>
    );
  }
);
