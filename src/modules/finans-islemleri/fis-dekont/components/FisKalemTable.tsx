import type { UseFieldArrayReturn, UseFormRegister, UseFormSetValue, UseFormWatch } from "react-hook-form";
import type { CariLookup } from "../api/fisDekontApi";
import type { FisDekontFormValues } from "../schemas/fisDekontSchema";
import { emptyLine } from "../schemas/fisDekontSchema";
import { useResizableColumns } from "@/hooks/useResizableColumns";

type Props = {
  fields: UseFieldArrayReturn<FisDekontFormValues, "lines">["fields"];
  append: UseFieldArrayReturn<FisDekontFormValues, "lines">["append"];
  remove: UseFieldArrayReturn<FisDekontFormValues, "lines">["remove"];
  register: UseFormRegister<FisDekontFormValues>;
  watch: UseFormWatch<FisDekontFormValues>;
  setValue: UseFormSetValue<FisDekontFormValues>;
  cariList: CariLookup[];
  showBankaKasaCol?: boolean;
};

const TABLE_KEY = "fis-dekont-kalemler";

function fmt(n: number) {
  return n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function FisKalemTable({
  fields,
  append,
  remove,
  register,
  watch,
  setValue,
  cariList,
  showBankaKasaCol = true,
}: Props) {
  const lines = watch("lines") ?? [];

  const totalDebit = lines.reduce((s, l) => s + Number(l?.debit || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + Number(l?.credit || 0), 0);
  const diff = totalCredit - totalDebit;

  const columnConfig = [
    { key: "cari", defaultWidth: 240, minWidth: 160 },
    ...(showBankaKasaCol ? [{ key: "banka", defaultWidth: 200, minWidth: 140 }] : []),
    { key: "desc", defaultWidth: 200, minWidth: 120 },
    { key: "debit", defaultWidth: 120, minWidth: 90 },
    { key: "credit", defaultWidth: 120, minWidth: 90 },
    { key: "plan", defaultWidth: 130, minWidth: 90 },
    { key: "actions", defaultWidth: 64, minWidth: 52 },
  ];

  const { getWidth, startResize } = useResizableColumns(TABLE_KEY, columnConfig);

  function onCariChange(idx: number, accountId: number) {
    const cari = cariList.find((c) => c.id === accountId);
    if (cari) {
      setValue(`lines.${idx}.counter_account_label`, `${cari.code} | ${cari.title}`, { shouldDirty: true });
    }
  }

  return (
    <>
      <div className="card fis-kalem-card" style={{ padding: 0, overflow: "hidden", marginBottom: 20 }}>
        <div className="fis-kalem-header">
          <span>📦 Fiş / Dekont Kalemleri &amp; Cari Hareket Satırları</span>
          <button type="button" className="btn-top fis-kalem-add-btn" onClick={() => append(emptyLine())}>
            + Yeni Kalem Satırı Ekle
          </button>
        </div>
        <div className="resizable-table-wrap fis-kalem-table-wrap">
          <div className="resizable-table-scroll">
            <table className="resizable-data-table fis-kalem-table">
              <colgroup>
                {columnConfig.map((col) => (
                  <col key={col.key} style={{ width: getWidth(col.key) }} />
                ))}
              </colgroup>
              <thead>
                <tr>
                  <th className="resizable-th">
                    <span className="resizable-th-label">Cari</span>
                    <span
                      className="col-resize-handle"
                      role="separator"
                      aria-orientation="vertical"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        startResize("cari", e.clientX);
                      }}
                    />
                  </th>
                  {showBankaKasaCol ? (
                    <th className="resizable-th">
                      <span className="resizable-th-label">Banka / Kasa</span>
                      <span
                        className="col-resize-handle"
                        role="separator"
                        aria-orientation="vertical"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          startResize("banka", e.clientX);
                        }}
                      />
                    </th>
                  ) : null}
                  <th className="resizable-th">
                    <span className="resizable-th-label">Not / Açıklama</span>
                    <span
                      className="col-resize-handle"
                      role="separator"
                      aria-orientation="vertical"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        startResize("desc", e.clientX);
                      }}
                    />
                  </th>
                  <th className="resizable-th" style={{ textAlign: "right" }}>
                    <span className="resizable-th-label">Borç (₺)</span>
                    <span
                      className="col-resize-handle"
                      role="separator"
                      aria-orientation="vertical"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        startResize("debit", e.clientX);
                      }}
                    />
                  </th>
                  <th className="resizable-th" style={{ textAlign: "right" }}>
                    <span className="resizable-th-label">Alacak (₺)</span>
                    <span
                      className="col-resize-handle"
                      role="separator"
                      aria-orientation="vertical"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        startResize("credit", e.clientX);
                      }}
                    />
                  </th>
                  <th className="resizable-th">
                    <span className="resizable-th-label">Ödeme Planı</span>
                    <span
                      className="col-resize-handle"
                      role="separator"
                      aria-orientation="vertical"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        startResize("plan", e.clientX);
                      }}
                    />
                  </th>
                  <th className="resizable-th">
                    <span className="resizable-th-label">Sil</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {fields.map((field, idx) => (
                  <tr key={field.id}>
                    <td>
                      <select
                        className="form-control fis-kalem-input"
                        {...register(`lines.${idx}.account_id`, { valueAsNumber: true })}
                        onChange={(e) => {
                          const v = e.target.value ? Number(e.target.value) : null;
                          setValue(`lines.${idx}.account_id`, v, { shouldDirty: true });
                          if (v) onCariChange(idx, v);
                        }}
                      >
                        <option value="">— Cari seç —</option>
                        {cariList.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.code} | {c.title}
                          </option>
                        ))}
                      </select>
                    </td>
                    {showBankaKasaCol ? (
                      <td>
                        <input className="form-control fis-kalem-input" {...register(`lines.${idx}.counter_account_label`)} />
                      </td>
                    ) : null}
                    <td>
                      <input className="form-control fis-kalem-input" {...register(`lines.${idx}.description`)} />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        className="form-control fis-kalem-input fis-borc"
                        style={{ textAlign: "right" }}
                        {...register(`lines.${idx}.debit`, { valueAsNumber: true })}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        className="form-control fis-kalem-input fis-alacak"
                        style={{ textAlign: "right", fontWeight: 700, color: "#10b981" }}
                        {...register(`lines.${idx}.credit`, { valueAsNumber: true })}
                      />
                    </td>
                    <td>
                      <input className="form-control fis-kalem-input" {...register(`lines.${idx}.payment_plan`)} />
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        type="button"
                        className="btn-top fis-kalem-delete-btn"
                        onClick={() => fields.length > 1 && remove(idx)}
                        disabled={fields.length <= 1}
                        title="Satırı sil"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="fis-kalem-totals">
        <strong>📊 Fiş / Dekont Toplamları</strong>
        <table>
          <tbody>
            <tr>
              <td style={{ textAlign: "left" }}>TL</td>
              <td>{fmt(totalDebit)} ₺</td>
              <td style={{ color: "#10b981" }}>{fmt(totalCredit)} ₺</td>
              <td>
                {fmt(Math.abs(diff))} ₺ {diff > 0 ? "(A)" : diff < 0 ? "(B)" : ""}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
