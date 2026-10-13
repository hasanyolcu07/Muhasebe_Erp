import type { ReactNode } from "react";
import { useResizableColumns, type ColumnWidthConfig } from "@/hooks/useResizableColumns";

export type ResizableColumn<T> = {
  key: string;
  header: ReactNode;
  width?: number;
  minWidth?: number;
  align?: "left" | "right" | "center";
  render: (row: T) => ReactNode;
};

type Props<T> = {
  tableKey: string;
  columns: ResizableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string | number;
  tableClassName?: string;
  rowClassName?: (row: T) => string | undefined;
  emptyMessage?: string;
  loading?: boolean;
  loadingMessage?: string;
  wrapperClassName?: string;
};

export function ResizableDataTable<T>({
  tableKey,
  columns,
  data,
  rowKey,
  tableClassName = "resizable-data-table",
  rowClassName,
  emptyMessage = "Kayıt bulunamadı.",
  loading = false,
  loadingMessage = "Yükleniyor…",
  wrapperClassName = "",
}: Props<T>) {
  const widthConfig: ColumnWidthConfig[] = columns.map((c) => ({
    key: c.key,
    defaultWidth: c.width ?? 120,
    minWidth: c.minWidth ?? 60,
  }));

  const { getWidth, startResize } = useResizableColumns(tableKey, widthConfig);

  if (loading) {
    return <div className="card">{loadingMessage}</div>;
  }

  return (
    <div className={`resizable-table-wrap ${wrapperClassName}`.trim()}>
      <div className="resizable-table-scroll">
        <table className={tableClassName}>
          <colgroup>
            {columns.map((col) => (
              <col key={col.key} style={{ width: getWidth(col.key) }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{ textAlign: col.align ?? "left", width: getWidth(col.key) }}
                  className="resizable-th"
                >
                  <span className="resizable-th-label">{col.header}</span>
                  <span
                    className="col-resize-handle"
                    role="separator"
                    aria-orientation="vertical"
                    aria-label={`${String(col.header)} sütun genişliği`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      startResize(col.key, e.clientX);
                    }}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="resizable-table-empty">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr key={rowKey(row)} className={rowClassName?.(row)}>
                  {columns.map((col) => (
                    <td key={col.key} style={{ textAlign: col.align ?? "left" }}>
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
