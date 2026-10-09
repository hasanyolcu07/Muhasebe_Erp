import { ResizableDataTable, type ResizableColumn } from "@/components/ResizableDataTable";
import { formatMoney } from "../constants/invoiceTypes";
import type { FaturaLineValues } from "../schemas/faturaSchema";
import type { StokLookup, TaxRateLookup } from "../api/faturaApi";

type LineRow = FaturaLineValues & { _idx: number; _id: string };

type Props = {
  fields: Array<{ id: string }>;
  lines: FaturaLineValues[];
  stockList: StokLookup[];
  taxRates: TaxRateLookup[];
  onLineChange: (index: number, patch: Partial<FaturaLineValues>) => void;
  onRemove: (index: number) => void;
  onEditLine: (index: number) => void;
  editingLineIndex: number | null;
  vatIncluded: boolean;
};

function lineTotal(ln: FaturaLineValues, vatIncluded: boolean): number {
  const gross = ln.qty * ln.unit_price;
  const pcts = [ln.discount_pct, ln.discount_pct_2, ln.discount_pct_3];
  let remaining = gross;
  for (const pct of pcts) {
    if (pct > 0) {
      remaining -= remaining * (pct / 100);
    }
  }
  if (ln.discount_amount > 0) remaining -= ln.discount_amount;
  const sub = Math.max(remaining, 0);
  const rate = ln.tax_rate ?? 20;
  if (vatIncluded) return sub;
  return sub + sub * (rate / 100);
}

export function FaturaLineTable({
  fields,
  lines,
  stockList,
  taxRates,
  onLineChange,
  onRemove,
  onEditLine,
  editingLineIndex,
  vatIncluded,
}: Props) {
  const rows: LineRow[] = fields.map((field, idx) => ({
    ...(lines[idx] ?? lines[0]),
    _idx: idx,
    _id: field.id,
  }));

  function isEditable(idx: number): boolean {
    return editingLineIndex === idx;
  }

  const columns: ResizableColumn<LineRow>[] = [
    {
      key: "stock",
      header: "Stok Kodu",
      width: 140,
      minWidth: 100,
      render: (row) => (
        <select
          className="form-control"
          value={row.stock_id ?? ""}
          disabled={!isEditable(row._idx)}
          onChange={(e) => {
            const sid = e.target.value ? Number(e.target.value) : null;
            const st = stockList.find((s) => s.id === sid);
            onLineChange(row._idx, {
              stock_id: sid,
              description: st ? `${st.code} — ${st.name}` : row.description,
              unit_id: st?.unit_id ?? row.unit_id,
              unit_price: st?.sale_price ?? row.unit_price,
              tax_rate_id: st?.tax_rate_id ?? row.tax_rate_id,
              istisna_code: st?.default_istisna_code ?? "",
              tevkifat_code: st?.default_tevkifat_code ?? "",
              override_istisna: false,
              override_tevkifat: false,
            });
          }}
        >
          <option value="">— Stok —</option>
          {stockList.map((s) => (
            <option key={s.id} value={s.id}>
              {s.code}
            </option>
          ))}
        </select>
      ),
    },
    {
      key: "description",
      header: "Ürün / Açıklama",
      width: 220,
      minWidth: 120,
      render: (row) => {
        const selectedStock = stockList.find((s) => s.id === row.stock_id);
        return (
          <input
            type="text"
            className="form-control"
            value={row.description ?? selectedStock?.name ?? ""}
            disabled={!isEditable(row._idx)}
            onChange={(e) => onLineChange(row._idx, { description: e.target.value })}
          />
        );
      },
    },
    {
      key: "qty",
      header: "Miktar",
      width: 90,
      minWidth: 70,
      align: "right",
      render: (row) => (
        <input
          type="number"
          className="form-control item-qty"
          min={0.0001}
          step="any"
          value={row.qty ?? 1}
          disabled={!isEditable(row._idx)}
          onChange={(e) => onLineChange(row._idx, { qty: Number(e.target.value) })}
        />
      ),
    },
    {
      key: "unit_price",
      header: "Birim Fiyat",
      width: 100,
      minWidth: 80,
      align: "right",
      render: (row) => (
        <input
          type="number"
          className="form-control item-price"
          min={0}
          step="any"
          value={row.unit_price ?? 0}
          disabled={!isEditable(row._idx)}
          onChange={(e) => onLineChange(row._idx, { unit_price: Number(e.target.value) })}
        />
      ),
    },
    {
      key: "discount_pct",
      header: "İsk.%1",
      width: 72,
      minWidth: 56,
      align: "right",
      render: (row) => (
        <input
          type="number"
          className="form-control item-disc"
          min={0}
          max={100}
          value={row.discount_pct ?? 0}
          disabled={!isEditable(row._idx)}
          onChange={(e) => onLineChange(row._idx, { discount_pct: Number(e.target.value) })}
        />
      ),
    },
    {
      key: "discount_pct_2",
      header: "İsk.%2",
      width: 72,
      minWidth: 56,
      align: "right",
      render: (row) => (
        <input
          type="number"
          className="form-control item-disc"
          min={0}
          max={100}
          value={row.discount_pct_2 ?? 0}
          disabled={!isEditable(row._idx)}
          onChange={(e) => onLineChange(row._idx, { discount_pct_2: Number(e.target.value) })}
        />
      ),
    },
    {
      key: "discount_pct_3",
      header: "İsk.%3",
      width: 72,
      minWidth: 56,
      align: "right",
      render: (row) => (
        <input
          type="number"
          className="form-control item-disc"
          min={0}
          max={100}
          value={row.discount_pct_3 ?? 0}
          disabled={!isEditable(row._idx)}
          onChange={(e) => onLineChange(row._idx, { discount_pct_3: Number(e.target.value) })}
        />
      ),
    },
    {
      key: "tax_rate",
      header: "KDV %",
      width: 80,
      minWidth: 60,
      align: "right",
      render: (row) => (
        <select
          className="form-control item-kdv"
          value={row.tax_rate_id ?? ""}
          disabled={!isEditable(row._idx)}
          onChange={(e) => {
            const tid = e.target.value ? Number(e.target.value) : null;
            const tr = taxRates.find((t) => t.id === tid);
            onLineChange(row._idx, {
              tax_rate_id: tid,
              tax_rate: tr ? Number(tr.rate) : row.tax_rate,
            });
          }}
        >
          {taxRates.map((tr) => (
            <option key={tr.id} value={tr.id}>
              %{tr.rate}
            </option>
          ))}
          {!row.tax_rate_id && <option value="">%{row.tax_rate}</option>}
        </select>
      ),
    },
    {
      key: "istisna",
      header: "İstisna",
      width: 90,
      minWidth: 70,
      render: (row) => (
        <input
          type="text"
          className="form-control"
          value={row.istisna_code ?? ""}
          disabled={!isEditable(row._idx)}
          onChange={(e) =>
            onLineChange(row._idx, {
              istisna_code: e.target.value,
              override_istisna: true,
            })
          }
        />
      ),
    },
    {
      key: "tevkifat",
      header: "Tevkifat",
      width: 90,
      minWidth: 70,
      render: (row) => (
        <input
          type="text"
          className="form-control"
          value={row.tevkifat_code ?? ""}
          disabled={!isEditable(row._idx)}
          onChange={(e) =>
            onLineChange(row._idx, {
              tevkifat_code: e.target.value,
              override_tevkifat: true,
            })
          }
        />
      ),
    },
    {
      key: "line_total",
      header: "Satır Toplamı",
      width: 130,
      minWidth: 100,
      align: "right",
      render: (row) => (
        <span style={{ fontWeight: 800, color: "#1e3a8a" }}>{formatMoney(lineTotal(row, vatIncluded))}</span>
      ),
    },
    {
      key: "actions",
      header: "İşlem",
      width: 100,
      minWidth: 80,
      align: "center",
      render: (row) => (
        <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
          {!isEditable(row._idx) && (
            <button
              type="button"
              className="btn-top blue"
              style={{ padding: "4px 8px", fontSize: 11 }}
              onClick={() => onEditLine(row._idx)}
            >
              Değiştir
            </button>
          )}
          <button
            type="button"
            className="btn-top"
            style={{ background: "#fee2e2", color: "#b91c1c", border: "none", padding: "4px 8px" }}
            onClick={() => onRemove(row._idx)}
            disabled={fields.length <= 1}
          >
            🗑️
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="fatura-items-card">
      <div className="fatura-items-toolbar">
        <span>📦 Fatura Kalemleri</span>
        <span className="badge badge-yellow">{fields.length} Kalem</span>
      </div>
      <ResizableDataTable
        tableKey="fatura-line-table"
        columns={columns}
        data={rows}
        rowKey={(row) => row._id}
        tableClassName="fatura-table resizable-data-table"
        rowClassName={(row) =>
          isEditable(row._idx) ? "line-row-editing" : editingLineIndex !== null ? "line-row-locked" : ""
        }
        emptyMessage="Henüz kalem eklenmedi."
      />
    </div>
  );
}
