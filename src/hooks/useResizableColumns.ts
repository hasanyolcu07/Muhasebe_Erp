import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_PREFIX = "tabia-table-widths:";

export type ColumnWidthConfig = {
  key: string;
  defaultWidth: number;
  minWidth?: number;
};

function loadWidths(tableKey: string, columns: ColumnWidthConfig[]): Record<string, number> {
  const defaults = Object.fromEntries(columns.map((c) => [c.key, c.defaultWidth]));
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${tableKey}`);
    if (!raw) return defaults;
    const saved = JSON.parse(raw) as Record<string, number>;
    return { ...defaults, ...saved };
  } catch {
    return defaults;
  }
}

function persistWidths(tableKey: string, widths: Record<string, number>) {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${tableKey}`, JSON.stringify(widths));
  } catch {
    /* ignore quota errors */
  }
}

export function useResizableColumns(tableKey: string, columns: ColumnWidthConfig[]) {
  const [widths, setWidths] = useState<Record<string, number>>(() => loadWidths(tableKey, columns));
  const dragRef = useRef<{ key: string; startX: number; startWidth: number } | null>(null);

  useEffect(() => {
    setWidths(loadWidths(tableKey, columns));
  }, [tableKey]);

  const getWidth = useCallback(
    (key: string) => widths[key] ?? columns.find((c) => c.key === key)?.defaultWidth ?? 120,
    [widths, columns]
  );

  const startResize = useCallback(
    (key: string, clientX: number) => {
      dragRef.current = { key, startX: clientX, startWidth: getWidth(key) };

      function onMove(e: MouseEvent) {
        if (!dragRef.current) return;
        const col = columns.find((c) => c.key === dragRef.current!.key);
        const min = col?.minWidth ?? 60;
        const delta = e.clientX - dragRef.current.startX;
        const next = Math.max(min, dragRef.current.startWidth + delta);
        setWidths((prev) => {
          const updated = { ...prev, [dragRef.current!.key]: next };
          persistWidths(tableKey, updated);
          return updated;
        });
      }

      function onUp() {
        dragRef.current = null;
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [columns, getWidth, tableKey]
  );

  return { widths, getWidth, startResize };
}
