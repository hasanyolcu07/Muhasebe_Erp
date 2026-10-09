import { cn } from "@/lib/utils";

export type RightMenuItem = {
  id: string;
  label: string;
  icon?: string;
  disabled?: boolean;
  /** Nesting depth for iç içe listeler (0 = root, 1 = 6.1, 2 = 6.7.1) */
  level?: number;
  /** Non-clickable group header */
  isGroup?: boolean;
};

type Props = {
  items: RightMenuItem[];
  activeId: string;
  onChange: (id: string) => void;
  title?: string;
  className?: string;
};

/**
 * Beyanname sağ dikey iç menü.
 * Aktif madde: sol border + bold + primary ton.
 * Nested: level 1/2 indent for 6.1 / 6.7.1 style sub-items.
 */
export function RightVerticalMenu({
  items,
  activeId,
  onChange,
  title = "Bölümler",
  className,
}: Props) {
  return (
    <nav className={cn("ui-right-vmenu", className)} aria-label={title}>
      <div className="ui-right-vmenu-title">{title}</div>
      <ul className="ui-right-vmenu-list">
        {items.map((item) => {
          const level = item.level ?? 0;
          const active = !item.isGroup && item.id === activeId;
          if (item.isGroup) {
            return (
              <li key={item.id} className={cn("ui-right-vmenu-group", level > 0 && `ui-right-vmenu-level-${level}`)}>
                <div className="ui-right-vmenu-group-label">{item.label}</div>
              </li>
            );
          }
          return (
            <li key={item.id} className={level > 0 ? `ui-right-vmenu-level-${level}` : undefined}>
              <button
                type="button"
                disabled={item.disabled}
                className={cn(
                  "ui-right-vmenu-item",
                  level > 0 && `ui-right-vmenu-item-nested`,
                  active && "ui-right-vmenu-item-active",
                )}
                aria-current={active ? "page" : undefined}
                onClick={() => onChange(item.id)}
              >
                {item.icon ? <span className="ui-right-vmenu-icon">{item.icon}</span> : null}
                <span>{item.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
