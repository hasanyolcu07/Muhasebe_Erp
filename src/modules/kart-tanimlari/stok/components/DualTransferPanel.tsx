import { useMemo, useState } from "react";
import type { LookupItem } from "../api/stokApi";

type AssignedItem = {
  key: string;
  label: string;
  badge?: string;
  fields: { name: string; label: string; type?: string; value: string | number; readOnly?: boolean }[];
};

type Props = {
  leftTitle: string;
  rightTitle: string;
  leftItems: LookupItem[];
  assigned: AssignedItem[];
  transferLabel?: string;
  transferColor?: string;
  leftHeaderBg?: string;
  rightHeaderBg?: string;
  onTransfer: (selectedIds: number[]) => void;
  onRemove: (key: string) => void;
  onFieldChange: (key: string, fieldName: string, value: string | number) => void;
  leftSearchPlaceholder?: string;
  assignedGridClass?: string;
};

export function DualTransferPanel({
  leftTitle,
  rightTitle,
  leftItems,
  assigned,
  transferLabel = "👉 AKTAR (Ekle)",
  transferColor,
  leftHeaderBg,
  rightHeaderBg,
  onTransfer,
  onRemove,
  onFieldChange,
  leftSearchPlaceholder = "Ara...",
  assignedGridClass = "assigned-grid",
}: Props) {
  const [search, setSearch] = useState("");
  const [checked, setChecked] = useState<Set<number>>(new Set());

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return leftItems;
    return leftItems.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        (i.code ?? "").toLowerCase().includes(q)
    );
  }, [leftItems, search]);

  const assignedIds = useMemo(
    () => new Set(assigned.map((a) => a.key)),
    [assigned]
  );

  const available = filtered.filter((i) => !assignedIds.has(String(i.id)));

  function toggle(id: number) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleTransfer() {
    if (checked.size === 0) return;
    onTransfer(Array.from(checked));
    setChecked(new Set());
  }

  return (
    <div className="dual-transfer-layout">
      <div className="dual-box">
        <div className="dual-box-header" style={leftHeaderBg ? { background: leftHeaderBg } : undefined}>
          <span>⬅️ {leftTitle}</span>
          <span className="badge badge-yellow">{available.length} Kayıt</span>
        </div>
        <div className="dual-box-search">
          <input
            type="text"
            className="form-control"
            placeholder={leftSearchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="dual-box-content">
          {available.map((item) => (
            <div key={item.id} className="dual-item">
              <div className="dual-item-left">
                <input
                  type="checkbox"
                  checked={checked.has(item.id)}
                  onChange={() => toggle(item.id)}
                />
                <span>{item.name}</span>
              </div>
              <span className="badge badge-blue">{item.extra ?? item.code ?? "—"}</span>
            </div>
          ))}
          {available.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: 13, padding: 8 }}>Kayıt yok</p>
          ) : null}
        </div>
      </div>

      <div className="dual-transfer-actions">
        <button
          type="button"
          className="btn-transfer to-right"
          style={transferColor ? { background: transferColor } : undefined}
          onClick={handleTransfer}
        >
          {transferLabel}
        </button>
      </div>

      <div className="dual-box">
        <div
          className="dual-box-header right-side"
          style={rightHeaderBg ? { background: rightHeaderBg } : undefined}
        >
          <span>👉 {rightTitle}</span>
          <span className="badge badge-green">{assigned.length} Atanmış</span>
        </div>
        <div className="dual-box-content">
          {assigned.map((card) => (
            <div key={card.key} className="assigned-card">
              <div className="assigned-card-header">
                <span>{card.label}</span>
                <button
                  type="button"
                  className="btn-top"
                  style={{
                    background: "#fee2e2",
                    color: "#b91c1c",
                    border: "none",
                    padding: "4px 8px",
                    fontSize: 11,
                  }}
                  onClick={() => onRemove(card.key)}
                >
                  🗑️ Çıkar
                </button>
              </div>
              <div className={assignedGridClass}>
                {card.fields.map((f) => (
                  <div key={f.name} className="assigned-field">
                    <label>{f.label}</label>
                    <input
                      type={f.type ?? "text"}
                      value={f.value ?? ""}
                      readOnly={f.readOnly}
                      disabled={f.readOnly}
                      onChange={(e) =>
                        onFieldChange(
                          card.key,
                          f.name,
                          f.type === "number" ? Number(e.target.value) : e.target.value
                        )
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
          {assigned.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: 13, padding: 8 }}>
              Sol listeden seçip aktarın
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
