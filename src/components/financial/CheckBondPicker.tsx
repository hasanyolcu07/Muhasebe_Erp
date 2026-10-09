import { useCallback, useEffect, useState } from "react";
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
  const [selectedLabel, setSelectedLabel] = useState("");

  const loadItems = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const res = await cekSenetApi.lookupForCollection({
        direction,
        branch_id: branchId ?? undefined,
        q: q || undefined,
      });
      setItems(res.items ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [direction, branchId]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => loadItems(query), 250);
    return () => clearTimeout(t);
  }, [open, query, loadItems]);

  useEffect(() => {
    if (!value) {
      setSelectedLabel("");
      return;
    }
    const found = items.find((i) => i.id === value);
    if (found) {
      setSelectedLabel(`${found.document_no} | ${formatDue(found.due_date)} | ${found.account_label ?? ""}`);
    }
  }, [value, items]);

  function openModal() {
    if (disabled) return;
    setQuery("");
    setOpen(true);
  }

  function selectItem(item: CheckBondPick) {
    onChange(item);
    setSelectedLabel(
      `${item.document_no} | ${formatDue(item.due_date)} | ${item.account_label ?? ""}`
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
          disabled={disabled}
        />
        <div className="coa-picker-actions">
          <button type="button" className="btn-top blue" onClick={openModal} disabled={disabled}>
            Seç
          </button>
          {value ? (
            <button type="button" className="btn-top" onClick={clearSelection} disabled={disabled}>
              Temizle
            </button>
          ) : null}
        </div>
      </div>

      {open ? (
        <div className="modal-overlay show" role="dialog" aria-modal="true">
          <div className="modal-content" style={{ width: 720, maxHeight: "80vh", display: "flex", flexDirection: "column" }}>
            <div className="modal-header">
              <span>📄 Çek / Senet Seç ({direction === "GELEN" ? "Tahsilat" : "Tediye"})</span>
              <button type="button" className="btn-top" onClick={() => setOpen(false)}>
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
                autoFocus
                style={{ marginBottom: 12 }}
              />
              {loading ? (
                <p style={{ color: "#64748b" }}>Yükleniyor…</p>
              ) : items.length === 0 ? (
                <p style={{ color: "#64748b" }}>Uygun çek/senet bulunamadı.</p>
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
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td>{item.document_no}</td>
                        <td>{formatDue(item.due_date)}</td>
                        <td>{item.account_label ?? "—"}</td>
                        <td>{Number(item.amount).toLocaleString("tr-TR")} ₺</td>
                        <td>{item.status_label}</td>
                        <td>
                          <button type="button" className="btn-top blue" onClick={() => selectItem(item)}>
                            Seç
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
