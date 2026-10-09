import { SIDEBAR_HUBS, type HubCard } from "@/config/moduleHubConfig";

export type PermissionItem = {
  key: string;
  label: string;
};

export type PermissionSection = {
  id: string;
  title: string;
  items: PermissionItem[];
};

function leafItems(hubId: string, cards: HubCard[], parentTitle?: string): PermissionItem[] {
  const out: PermissionItem[] = [];
  for (const card of cards) {
    if (card.children?.length) {
      out.push(...leafItems(hubId, card.children, card.title));
      continue;
    }
    const key = card.contentKey || `${hubId}:${card.id}`;
    const label = parentTitle ? `${parentTitle} › ${card.title}` : card.title;
    out.push({ key, label });
  }
  return out;
}

/** Ana menü + alt menü yetki listesi (moduleHubConfig / sidebar hubs). */
export function buildPermissionSections(): PermissionSection[] {
  return SIDEBAR_HUBS.map((hub) => {
    if (hub.direct || hub.sections.length === 0) {
      return {
        id: hub.id,
        title: hub.label.replace(/^[^\wğüşıöçĞÜŞİÖÇ]+/i, "").trim() || hub.title,
        items: [{ key: hub.module || hub.id, label: hub.title }],
      };
    }
    return {
      id: hub.id,
      title: hub.label.replace(/^[^\p{L}\p{N}]+/u, "").trim() || hub.title,
      items: leafItems(hub.id, hub.sections),
    };
  });
}

export function allPermissionKeys(sections: PermissionSection[] = buildPermissionSections()): string[] {
  return sections.flatMap((s) => s.items.map((i) => i.key));
}
