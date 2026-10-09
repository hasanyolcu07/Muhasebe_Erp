import { ResizableDataTable, type ResizableColumn } from "@/components/ResizableDataTable";
import type { FieldArrayWithId } from "react-hook-form";
import { formatMoney } from "@/modules/satis-satin-alma/fatura/constants/invoiceTypes";
import type { IrsaliyeLineValues } from "../schemas/irsaliyeSchema";
import { irsaliyeLineTotal } from "../schemas/irsaliyeSchema";
import type { StokLookup } from "../api/irsaliyeApi";

type TaxRateLookup = { id: number; name?: string; rate: number };

type LineRow = IrsaliyeLineValues & { _idx: number; _id: string };

type Props = {
  fields: FieldArrayWithId[];
  lines: IrsaliyeLineValues[];
  stockList: StokLookup[];
  taxRates?: TaxRateLookup[];
  onLineChange: (idx: number, patch: Partial<IrsaliyeLineValues>) => void;
  onRemove: (idx: number) => void;
  onEditLine: (index: number) => void;
  editingLineIndex: number | null;
};

export function LineTable({
  fields,
  lines,
  stockList,
  taxRates = [],
  onLineChange,
  onRemove,
  onEditLine,
  editingLineIndex,
}: Props) {
  const rows: LineRow[] = fields.map((field, idx) => ({
    ...(lines[idx] ?? {}),
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
              description: st ? `${st.code} — ${st.name}` : row.description ?? "",
              unit_id: st?.unit_id ?? row.unit_id ?? null,
              unit_price: st?.sale_price ?? row.unit_price ?? 0,
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
        const stock = stockList.find((s) => s.id === row.stock_id);
        return (
          <input
            type="text"
            className="form-control"
            value={row.description ?? ""}
            disabled={!isEditable(row._idx)}
            onChange={(e) => onLineChange(row._idx, { description: e.target.value })}
            placeholder={stock?.name ?? "Açıklama"}
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
      key: "unit",
      header: "Birim",
      width: 72,
      minWidth: 56,
      render: (row) => {
        const stock = stockList.find((s) => s.id === row.stock_id);
        return stock?.unit_code ?? "—";
      },
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
      header: "İsk.%",
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
      key: "tax_rate",
      header: "KDV %",
      width: 80,
      minWidth: 60,
      align: "right",
      render: (row) =>
        taxRates.length > 0 ? (
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
            {!row.tax_rate_id && <option value="">%{row.tax_rate ?? 20}</option>}
          </select>
        ) : (
          <input
            type="number"
            className="form-control item-kdv"
            min={0}
            value={row.tax_rate ?? 20}
            disabled={!isEditable(row._idx)}
            onChange={(e) => onLineChange(row._idx, { tax_rate: Number(e.target.value) })}
          />
        ),
    },
    {
      key: "line_total",
      header: "Satır Toplamı",
      width: 120,
      minWidth: 90,
      align: "right",
      render: (row) => (
        <span style={{ fontWeight: 800, color: "#1e3a8a" }}>{formatMoney(irsaliyeLineTotal(row))}</span>
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
      <div className="fatura-items-toolbar" style={{ background: "#0369a1" }}>
        <span style={{ fontSize: 14, fontWeight: 700 }}>📦 İrsaliye Kalemleri &amp; Sevk Miktarları</span>
        <span className="badge badge-yellow">{fields.length} Kalem</span>
      </div>
      <ResizableDataTable
        tableKey="irsaliye-line-table"
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
