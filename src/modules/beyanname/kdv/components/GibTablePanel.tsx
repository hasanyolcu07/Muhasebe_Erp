import { Fragment, useMemo, useState } from "react";
import {
  AccountSelectField,
  type AccountSelectValue,
} from "../../components/AccountSelectField";
import type { GibColumn, GibTableDef } from "../config/kdv1Tables";

type CellValue = string | number | AccountSelectValue | undefined;
type RowState = Record<string, CellValue>;

function emptyCell(col: GibColumn): string | number | AccountSelectValue {
  if (col.type === "account") return { mode: "account" };
  if (col.type === "select" && col.options?.[0]) return col.options[0].value;
  return "";
}

function makeEmptyRow(
  cols: GibColumn[],
  seed?: Record<string, string | number>,
): RowState {
  const row: RowState = {};
  for (const col of cols) {
    if (seed && seed[col.key] !== undefined) {
      row[col.key] = seed[col.key];
    } else {
      row[col.key] = emptyCell(col);
    }
  }
  return row;
}

function CellInput({
  col,
  value,
  onChange,
}: {
  col: GibColumn;
  value: CellValue;
  onChange: (next: string | number | AccountSelectValue) => void;
}) {
  if (col.type === "select") {
    return (
      <select
        disabled={col.readOnly}
        style={{ width: col.width ?? "100%", minWidth: 100 }}
        value={String(value ?? "")}
        onChange={(e) => onChange(e.target.value)}
      >
        {(col.options ?? []).map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }

  if (col.type === "number") {
    return (
      <input
        type="number"
        step="0.01"
        readOnly={col.readOnly}
        disabled={col.readOnly}
        style={{ width: col.width ?? "100%", minWidth: 100, textAlign: "right" }}
        value={value === undefined || value === null ? "" : String(value)}
        onChange={(e) =>
          onChange(e.target.value === "" ? "" : Number(e.target.value))
        }
      />
    );
  }

  return (
    <input
      type="text"
      readOnly={col.readOnly}
      disabled={col.readOnly}
      style={{ width: col.width ?? "100%", minWidth: 120 }}
      value={value === undefined || value === null ? "" : String(value)}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function FormField({
  col,
  value,
  onChange,
}: {
  col: GibColumn;
  value: CellValue;
  onChange: (next: string | number | AccountSelectValue) => void;
}) {
  if (col.type === "account") {
    return (
      <AccountSelectField
        label={col.label}
        value={(value as AccountSelectValue) ?? { mode: "account" }}
        onChange={onChange}
        disabled={col.readOnly}
      />
    );
  }

  return (
    <label
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        fontSize: 12,
        fontWeight: col.readOnly ? 700 : 500,
      }}
    >
      {col.label}
      <CellInput col={col} value={value} onChange={onChange} />
    </label>
  );
}

export function GibTablePanel({ def }: { def: GibTableDef }) {
  const formFields = def.fields ?? [];
  const gridCols = useMemo(() => def.columns ?? [], [def.columns]);

  const isReadOnlyGrid = useMemo(() => {
    if (!gridCols.length) return false;
    if (def.seedRows?.length) {
      // Seed alone does not lock — only when every column is readOnly (reference lists)
      return gridCols.every((c) => c.readOnly);
    }
    return gridCols.every((c) => c.readOnly) && !def.rateRows?.length;
  }, [def.seedRows, def.rateRows, gridCols]);

  const canAddRemove = def.kind === "grid" && !isReadOnlyGrid && !def.rateRows?.length && !def.seedRows?.length;

  const [formValues, setFormValues] = useState<RowState>(() => makeEmptyRow(formFields));
  const [rows, setRows] = useState<RowState[]>(() => {
    if (def.kind !== "grid") return [];
    if (def.rateRows?.length) {
      return def.rateRows.map((rr) => {
        const row = makeEmptyRow(gridCols);
        if (gridCols.some((c) => c.key === "oran")) row.oran = rr.label;
        return row;
      });
    }
    if (def.seedRows?.length) {
      return def.seedRows.map((seed) => makeEmptyRow(gridCols, seed));
    }
    const n = def.defaultRows ?? 3;
    return Array.from({ length: n }, () => makeEmptyRow(gridCols));
  });
  const [expandedAccountRow, setExpandedAccountRow] = useState<number | null>(null);

  function setFormField(key: string, next: string | number | AccountSelectValue) {
    setFormValues((prev) => {
      const nextState = { ...prev, [key]: next };
      if (def.id === "t4") {
        const keys = [
          "onceki_devreden",
          "bu_donem_indirilecek",
          "mal_iadeleri",
          "yolcu_duzeltme",
          "bavul_duzeltme",
        ];
        const sum = keys.reduce((acc, k) => acc + Number(nextState[k] || 0), 0);
        nextState.toplam_indirim = Number.isFinite(sum) ? Number(sum.toFixed(2)) : 0;
      }
      return nextState;
    });
  }

  function setCell(rowIdx: number, key: string, next: string | number | AccountSelectValue) {
    setRows((prev) => prev.map((r, i) => (i === rowIdx ? { ...r, [key]: next } : r)));
  }

  function addRow() {
    setRows((prev) => [...prev, makeEmptyRow(gridCols)]);
  }

  function removeRow(idx: number) {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)));
    setExpandedAccountRow(null);
  }

  const accountCols = gridCols.filter((c) => c.type === "account");

  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>{def.title}</h3>
      {def.description ? (
        <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 12 }}>
          {def.description}
        </p>
      ) : (
        <div style={{ marginBottom: 10 }} />
      )}

      {(def.kind === "form" || def.kind === "summary") && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 12,
          }}
        >
          {formFields.map((col) => (
            <div
              key={col.key}
              style={{
                gridColumn:
                  col.type === "text" && /aciklama|adres|not/i.test(col.key)
                    ? "1 / -1"
                    : undefined,
              }}
            >
              <FormField
                col={col}
                value={formValues[col.key]}
                onChange={(next) => setFormField(col.key, next)}
              />
            </div>
          ))}
        </div>
      )}

      {def.kind === "grid" && (
        <>
          <div style={{ overflowX: "auto" }}>
            <table className="data-table" style={{ width: "100%", fontSize: 13 }}>
              <thead>
                <tr>
                  {gridCols.map((col) => (
                    <th key={col.key} style={col.width ? { minWidth: col.width } : undefined}>
                      {col.label}
                    </th>
                  ))}
                  {canAddRemove && <th style={{ width: 72 }}>İşlem</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <Fragment key={idx}>
                    <tr>
                      {gridCols.map((col) => {
                        if (col.type === "account") {
                          const acc =
                            (row[col.key] as AccountSelectValue | undefined) ?? {
                              mode: "account" as const,
                            };
                          const label =
                            acc.account_code || acc.account_name
                              ? `${acc.account_code ?? ""} ${acc.account_name ?? ""}`.trim()
                              : "Hesap seç";
                          return (
                            <td key={col.key}>
                              <button
                                type="button"
                                className="btn btn-sm"
                                onClick={() =>
                                  setExpandedAccountRow((cur) => (cur === idx ? null : idx))
                                }
                              >
                                {label}
                              </button>
                            </td>
                          );
                        }
                        return (
                          <td key={col.key}>
                            <CellInput
                              col={col}
                              value={row[col.key]}
                              onChange={(next) => setCell(idx, col.key, next)}
                            />
                          </td>
                        );
                      })}
                      {canAddRemove && (
                        <td>
                          <button
                            type="button"
                            className="btn btn-sm"
                            disabled={rows.length <= 1}
                            onClick={() => removeRow(idx)}
                          >
                            Sil
                          </button>
                        </td>
                      )}
                    </tr>
                    {expandedAccountRow === idx && accountCols.length > 0 && (
                      <tr>
                        <td colSpan={gridCols.length + (canAddRemove ? 1 : 0)}>
                          {accountCols.map((col) => (
                            <AccountSelectField
                              key={col.key}
                              label={`${col.label} — Satır ${idx + 1}`}
                              value={
                                (row[col.key] as AccountSelectValue | undefined) ?? {
                                  mode: "account",
                                }
                              }
                              onChange={(v) => setCell(idx, col.key, v)}
                            />
                          ))}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
          {canAddRemove && (
            <div style={{ marginTop: 10 }}>
              <button type="button" className="btn btn-sm btn-primary" onClick={addRow}>
                + Satır Ekle
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
