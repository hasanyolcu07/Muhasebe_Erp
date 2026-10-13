import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cekSenetApi, type PortfoyLookup } from "@/modules/finans-islemleri/cek-senet/api/cekSenetApi";

export type CheckBondPick = PortfoyLookup & {
  account_title?: string | null;
};

type Props = {
  value: number | null;
  direction: "GELEN" | "GIDEN";
  branchId?: number | null;
  onChange: (item: CheckBondPick | null) => void;
  disabled?: boolean;
  placeholder?: string;
};

function formatDue(d: string | null | undefined): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("tr-TR");
  } catch {
    return d;
  }
}

export function CheckBondPicker({
  value,
  direction,
  branchId,
  onChange,
  disabled = false,
  placeholder = "Tahsil/tediye için çek seç…",
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<CheckBondPick[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highlight, setHighlight] = useState(0);
  const [selectedLabel, setSelectedLabel] = useState("");
  const activeRowRef = useRef<HTMLTableRowElement>(null);

  const loadItems = useCallback(async (q: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await cekSenetApi.lookupForCollection({
        direction,
        branch_id: branchId ?? undefined,
        q: q || undefined,
      });
      const safeItems = Array.isArray(res?.items) ? res.items : [];
      setItems(safeItems);
      setHighlight(0);
    } catch (err: any) {
      setError(err?.message || "Çek/senet kayıtları yüklenirken hata oluştu.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [direction, branchId]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => loadItems(query), 220);
    return () => clearTimeout(t);
  }, [open, query, loadItems]);

  useEffect(() => {
    if (!value) {
      setSelectedLabel("");
      return;
    }
    const found = items.find((i) => i.id === value);
    if (found) {
      setSelectedLabel(`${found.document_no || "—"} | ${formatDue(found.due_date)} | ${found.account_label ?? ""}`);
    }
  }, [value, items]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  // Klavye gezintisinde aktif satırı görünür alana kaydır
  useEffect(() => {
    if (open && activeRowRef.current) {
      activeRowRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [highlight, open]);

  function openModal() {
    if (disabled) return;
    setQuery("");
    setOpen(true);
  }

  function selectItem(item: CheckBondPick) {
    onChange(item);
    setSelectedLabel(
      `${item.document_no || "—"} | ${formatDue(item.due_date)} | ${item.account_label ?? ""}`
    );
    setOpen(false);
  }

  function clearSelection() {
    onChange(null);
    setSelectedLabel("");
  }

  return (
    <>
      <div className="coa-picker-field">
        <input
          type="text"
          className="form-control coa-picker-display"
          readOnly
          value={selectedLabel}
          placeholder={placeholder}
          onClick={openModal}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              openModal();
            }
          }}
          disabled={disabled}
          role="combobox"
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-label="Çek ve senet seçici"
        />
        <div className="coa-picker-actions">
          <button
            type="button"
            className="btn-top blue"
            onClick={openModal}
            disabled={disabled}
            aria-label="Çek veya senet seç"
          >
            Seç
          </button>
          {value ? (
            <button
              type="button"
              className="btn-top"
              onClick={clearSelection}
              disabled={disabled}
              title="Seçimi Temizle"
              aria-label="Seçimi Temizle"
            >
              Temizle
            </button>
          ) : null}
        </div>
      </div>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              className="modal-overlay show"
              role="dialog"
              aria-modal="true"
              aria-label="Çek veya senet seç"
              style={{ zIndex: 99999 }}
              onClick={(e) => {
                if (e.target === e.currentTarget) setOpen(false);
              }}
            >
              <div className="modal-content" style={{ width: 720, maxHeight: "80vh", display: "flex", flexDirection: "column" }}>
                <div className="modal-header">
                  <span>📄 Çek / Senet Seç ({direction === "GELEN" ? "Tahsilat" : "Tediye"})</span>
                  <button type="button" className="btn-top" onClick={() => setOpen(false)} aria-label="Kapat">
                    ✖
                  </button>
                </div>
                <div className="modal-body" style={{ overflow: "auto" }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Seri/no veya cari ara…"
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
                      }
                    }}
                    autoFocus
                    style={{ marginBottom: 12 }}
                    aria-label="Çek ve senet arama"
                  />
                  {loading ? (
                    <p style={{ color: "#64748b", padding: 8 }}>Çek ve senet kayıtları yükleniyor…</p>
                  ) : error ? (
                    <div style={{ padding: 8, color: "#dc2626" }}>
                      <p style={{ margin: 0 }}>⚠️ {error}</p>
                      <button
                        type="button"
                        className="btn-top"
                        style={{ marginTop: 6 }}
                        onClick={() => loadItems(query)}
                      >
                        Tekrar Dene
                      </button>
                    </div>
                  ) : items.length === 0 ? (
                    <p style={{ color: "#64748b", padding: 8 }}>
                      {query.trim()
                        ? "Aramaya uygun çek/senet bulunamadı."
                        : "Portföyde işlem için bekleyen uygun çek/senet bulunamadı."}
                    </p>
                  ) : (
                    <table className="data-table" style={{ width: "100%", fontSize: 13 }}>
                      <thead>
                        <tr>
                          <th>Seri/No</th>
                          <th>Vade</th>
                          <th>Cari</th>
                          <th>Tutar</th>
                          <th>Durum</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, idx) => (
                          <tr
                            key={item.id}
                            ref={idx === highlight ? activeRowRef : null}
                            style={{
                              backgroundColor: idx === highlight ? "#eff6ff" : undefined,
                              cursor: "pointer",
                            }}
                            onClick={() => selectItem(item)}
                            onMouseEnter={() => setHighlight(idx)}
                          >
                            <td><strong>{item.document_no || "—"}</strong></td>
                            <td>{formatDue(item.due_date)}</td>
                            <td>{item.account_label ?? "—"}</td>
                            <td>{Number(item.amount || 0).toLocaleString("tr-TR")} ₺</td>
                            <td>
                              <span style={{ fontSize: 11, padding: "2px 6px", borderRadius: 4, background: "#f1f5f9" }}>
                                {item.status_label || item.status}
                              </span>
                            </td>
                            <td>
                              <button
                                type="button"
                                className="btn-top blue"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  selectItem(item);
                                }}
                              >
                                Seç
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
                <div className="modal-footer" style={{ display: "flex", justifyContent: "flex-end" }}>
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
