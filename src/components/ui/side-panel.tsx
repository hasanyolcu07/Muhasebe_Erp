import type { ReactNode } from "react";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

export type SidePanelSize = "sm" | "md" | "lg";

const SIZE_WIDTH: Record<SidePanelSize, string> = {
  sm: "480px",
  md: "560px",
  lg: "640px",
};

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** 480 | 560 | 640 — varsayılan md (560px) */
  size?: SidePanelSize;
  footer?: ReactNode;
  className?: string;
};

/** Sağdan kayarak açılan panel (480–640px) */
export function SidePanel({
  open,
  title,
  onClose,
  children,
  size = "md",
  footer,
  className,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div className="ui-side-panel-backdrop" onClick={onClose} aria-hidden="true" />
      <aside
        className={cn("ui-side-panel", className)}
        style={{ width: `min(${SIZE_WIDTH[size]}, 96vw)` }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className="ui-side-panel-header">
          <h2>{title}</h2>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            ✖ Kapat
          </Button>
        </header>
        <div className="ui-side-panel-body">{children}</div>
        {footer ? <footer className="ui-side-panel-footer">{footer}</footer> : null}
      </aside>
    </>
  );
}
