import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { getSidebarHubById, type HubCard } from "@/config/moduleHubConfig";
import { useAppStore } from "@/store/appStore";
import { HubSectionCards } from "../components/HubSectionCards";
import { HubContent } from "../components/HubContent";

type Props = {
  hubId: string;
};

function firstLeaf(sections: HubCard[]): { groupId?: string; sectionId: string; contentKey: string } {
  const first = sections[0];
  if (!first) return { sectionId: "", contentKey: "" };
  if (first.children?.length) {
    const child = first.children[0];
    return { groupId: first.id, sectionId: child.id, contentKey: child.contentKey || child.id };
  }
  return { sectionId: first.id, contentKey: first.contentKey || first.id };
}

export function ModuleHubPage({ hubId }: Props) {
  const hub = getSidebarHubById(hubId);
  const [searchParams, setSearchParams] = useSearchParams();
  const guardNavigate = useAppStore((s) => s.guardNavigate);

  const defaults = useMemo(() => (hub ? firstLeaf(hub.sections) : { sectionId: "", contentKey: "" }), [hub]);

  const hasGroups = Boolean(hub?.sections.some((s) => s.children?.length));
  const groupId = hasGroups ? searchParams.get("group") || defaults.groupId || "" : "";
  const sectionId = searchParams.get("section") || defaults.sectionId;

  const activeGroup = hub?.sections.find((s) => s.id === groupId) || hub?.sections[0];
  const leafCards = hasGroups ? activeGroup?.children || [] : hub?.sections || [];
  const activeLeaf =
    leafCards.find((c) => c.id === sectionId) || leafCards[0] || activeGroup;
  const contentKey = activeLeaf?.contentKey || defaults.contentKey;

  function setGroup(id: string) {
    const group = hub?.sections.find((s) => s.id === id);
    const firstChild = group?.children?.[0];
    guardNavigate(() => {
      const next = new URLSearchParams();
      next.set("group", id);
      if (firstChild) next.set("section", firstChild.id);
      setSearchParams(next);
    });
  }

  function setSection(id: string) {
    guardNavigate(() => {
      const next = new URLSearchParams(searchParams);
      if (hasGroups && groupId) next.set("group", groupId);
      next.set("section", id);
      setSearchParams(next);
    });
  }

  if (!hub) return null;

  return (
    <div className="module-hub-page">
      <div className="header-bar">
        <div className="header-breadcrumb">{hub.title}</div>
      </div>

      {hasGroups ? (
        <HubSectionCards
          items={hub.sections}
          activeId={activeGroup?.id || groupId}
          onChange={setGroup}
          hubPath={hub.path}
          hubId={hub.id}
        />
      ) : null}

      {leafCards.length > 0 ? (
        <HubSectionCards
          items={leafCards}
          activeId={activeLeaf?.id || sectionId}
          onChange={setSection}
          nested={hasGroups}
          hubPath={hub.path}
          hubId={hub.id}
          groupId={hasGroups ? activeGroup?.id || groupId : undefined}
        />
      ) : null}

      <div className="module-hub-content" key={contentKey}>
        <HubContent contentKey={contentKey} />
      </div>
    </div>
  );
}
