import type { CSSProperties, KeyboardEvent } from "react";

export type SectionSwitcherItem = {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  /** active-gider | active-gelir | active-amber | active-blue */
  activeClass: string;
};

type Props = {
  items: SectionSwitcherItem[];
  activeId: string;
  onChange: (id: string) => void;
  style?: CSSProperties;
  /** Alt kart satırı — daha küçük padding/font */
  nested?: boolean;
};

/** Gelir&Gider tarzı bölüm seçici kartlar */
export function SectionSwitcher({ items, activeId, onChange, style, nested }: Props) {
  function onKey(e: KeyboardEvent, id: string) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onChange(id);
    }
  }

  return (
    <div
      className={`gg-type-switcher${nested ? " ayar-sub-cards" : ""}`}
      style={style}
    >
      {items.map((it) => {
        const active = it.id === activeId;
        return (
          <div
            key={it.id}
            className={`gg-type-btn${nested ? " ayar-sub-card hub-card-child" : ""}${active ? ` ${it.activeClass}` : ""}`}
            role="button"
            tabIndex={0}
            onClick={() => onChange(it.id)}
            onKeyDown={(e) => onKey(e, it.id)}
          >
            <span>{it.icon}</span>
            <span>
              <strong>{it.title}</strong> ({it.subtitle})
            </span>
          </div>
        );
      })}
    </div>
  );
}
