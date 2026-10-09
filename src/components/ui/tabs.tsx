import { cn } from "@/lib/utils";

export type TabItem = {
  id: string;
  label: string;
  icon?: string;
  disabled?: boolean;
};

type TabsProps = {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  /** underline | pill */
  variant?: "underline" | "pill";
  className?: string;
};

export function Tabs({ items, activeId, onChange, variant = "underline", className }: TabsProps) {
  return (
    <div
      className={cn("ui-tabs", variant === "pill" && "ui-tabs-pill", className)}
      role="tablist"
    >
      {items.map((item) => {
        const active = item.id === activeId;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={item.disabled}
            className={cn("ui-tab", active && "ui-tab-active")}
            onClick={() => onChange(item.id)}
          >
            {item.icon ? <span aria-hidden>{item.icon}</span> : null}
            <strong>{item.label}</strong>
          </button>
        );
      })}
    </div>
  );
}
