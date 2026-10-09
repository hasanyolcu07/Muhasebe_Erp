import { useEffect, useState, type KeyboardEvent, type MouseEvent } from "react";
import type { HubCard } from "@/config/moduleHubConfig";
import { isQuickFavorite, toggleQuickFavorite, type QuickAccessItem } from "@/modules/dashboard/quickAccess";

type Props = {
  items: HubCard[];
  activeId: string;
  onChange: (id: string) => void;
  nested?: boolean;
  hubPath?: string;
  hubId?: string;
  groupId?: string;
};

function favoriteId(hubId: string, cardId: string) {
  return `${hubId}:${cardId}`;
}

function favoriteTo(hubPath: string, cardId: string, groupId?: string) {
  const qs = new URLSearchParams();
  if (groupId) qs.set("group", groupId);
  qs.set("section", cardId);
  return `/app/${hubPath}?${qs.toString()}`;
}

export function HubSectionCards({ items, activeId, onChange, nested, hubPath, hubId, groupId }: Props) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const fn = () => setTick((t) => t + 1);
    window.addEventListener("tabia-quick-access-changed", fn);
    return () => window.removeEventListener("tabia-quick-access-changed", fn);
  }, []);

  function onKey(e: KeyboardEvent, id: string) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onChange(id);
    }
  }

  function onStar(e: MouseEvent, card: HubCard) {
    e.stopPropagation();
    e.preventDefault();
    if (!hubPath || !hubId) return;
    const item: QuickAccessItem = {
      id: favoriteId(hubId, card.id),
      title: card.title,
      description: card.description,
      icon: card.icon,
      to: favoriteTo(hubPath, card.id, groupId),
      activeClass: (card.activeClass as QuickAccessItem["activeClass"]) || "active-blue",
    };
    const res = toggleQuickFavorite(item);
    if (!res.ok && res.message) window.alert(res.message);
  }

  return (
    <div className={`hub-section-row${nested ? " hub-section-row-nested" : ""}`}>
      {items.map((it) => {
        const active = it.id === activeId;
        const favId = hubId ? favoriteId(hubId, it.id) : "";
        const starred = hubId ? isQuickFavorite(favId) : false;
        return (
          <div
            key={it.id}
            className={`hub-section-card${active ? ` ${it.activeClass}` : ""}`}
            role="button"
            tabIndex={0}
            onClick={() => onChange(it.id)}
            onKeyDown={(e) => onKey(e, it.id)}
          >
            {hubPath && hubId ? (
              <button
                type="button"
                className={`hub-fav-star${starred ? " is-on" : ""}`}
                title={starred ? "Hızlı erişimden çıkar" : "Hızlı erişime ekle"}
                onClick={(e) => onStar(e, it)}
              >
                {starred ? "★" : "☆"}
              </button>
            ) : null}
            <span className="hub-section-icon">{it.icon}</span>
            <strong>{it.title}</strong>
            <span className="hub-section-desc">{it.description}</span>
          </div>
        );
      })}
    </div>
  );
}
