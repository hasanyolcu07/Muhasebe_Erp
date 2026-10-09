import type { ReactNode } from "react";
import { useResizableColumns, type ColumnWidthConfig } from "@/hooks/useResizableColumns";
import { cn } from "@/lib/utils";

export type DataTableColumn<T> = {
  key: string;
  header: ReactNode;
  width?: number;
  minWidth?: number;
  align?: "left" | "right" | "center";
  render: (row: T) => ReactNode;
};

type Props<T> = {
  tableKey: string;
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string | number;
  /** Sticky başlık — varsayılan açık */
  stickyHeader?: boolean;
  /** Zebra satırlar */
  zebra?: boolean;
  loading?: boolean;
  emptyMessage?: string;
  loadingMessage?: string;
  className?: string;
  onRowClick?: (row: T) => void;
  onRowMouseEnter?: (row: T) => void;
  onRowMouseLeave?: (row: T) => void;
  selectedRowKey?: string | number | null;
  getRowClassName?: (row: T) => string | undefined;
};

export function DataTable<T>({
  tableKey,
  columns,
  data,
  rowKey,
  stickyHeader = true,
  zebra = false,
  loading = false,
  emptyMessage = "Kayıt bulunamadı.",
  loadingMessage = "Yükleniyor…",
  className,
  onRowClick,
  onRowMouseEnter,
  onRowMouseLeave,
  selectedRowKey,
  getRowClassName,
}: Props<T>) {
  const widthConfig: ColumnWidthConfig[] = columns.map((c) => ({
    key: c.key,
    defaultWidth: c.width ?? 120,
    minWidth: c.minWidth ?? 60,
  }));

  const { getWidth, startResize } = useResizableColumns(tableKey, widthConfig);

  if (loading) {
    return (
      <div className="ui-data-table-loading" role="status">
        {loadingMessage}
      </div>
    );
  }

  return (
    <div className={cn("ui-data-table-wrap", className)}>
      <div className="ui-data-table-scroll">
        <table className={cn("ui-data-table", stickyHeader && "ui-data-table-sticky", zebra && "ui-data-table-zebra")}>
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
                  className="ui-data-table-th"
                >
                  <span className="ui-data-table-th-label">{col.header}</span>
                  <span
                    className="ui-col-resize-handle"
                    role="separator"
                    aria-orientation="vertical"
                    aria-label={`${String(col.header)} sütun genişliği`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
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
                <td colSpan={columns.length} className="ui-data-table-empty">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row) => {
                const key = rowKey(row);
                const selected = selectedRowKey != null && selectedRowKey === key;
                return (
                  <tr
                    key={key}
                    className={cn(
                      onRowClick && "ui-data-table-row-clickable",
                      selected && "ui-data-table-row-selected",
                      getRowClassName?.(row)
                    )}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    onMouseEnter={onRowMouseEnter ? () => onRowMouseEnter(row) : undefined}
                    onMouseLeave={onRowMouseLeave ? () => onRowMouseLeave(row) : undefined}
                  >
                    {columns.map((col) => (
                      <td key={col.key} style={{ textAlign: col.align ?? "left" }}>
                        {col.render(row)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
