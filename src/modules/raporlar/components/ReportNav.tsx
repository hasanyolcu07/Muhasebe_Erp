import { useEffect, useState } from "react";
import type { ReportGroup, ReportGroupId, ReportItem } from "../config/reportMenu";
import { REPORT_GROUPS, groupHasImplemented } from "../config/reportMenu";

type Props = {
  activeGroup: ReportGroupId;
  activeReportId: string;
  onSelect: (groupId: ReportGroupId, reportId: string) => void;
};

export function ReportNav({ activeGroup, activeReportId, onSelect }: Props) {
  const [expanded, setExpanded] = useState<Set<ReportGroupId>>(() => new Set([activeGroup]));

  useEffect(() => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.add(activeGroup);
      return next;
    });
  }, [activeGroup]);

  const toggleGroup = (groupId: ReportGroupId) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  return (
    <aside className="reports-nav-panel" aria-label="Rapor kategorileri">
      {REPORT_GROUPS.map((group: ReportGroup) => {
        const active = groupHasImplemented(group);
        const isOpen = expanded.has(group.id);
        return (
          <div key={group.id} className={`reports-nav-group${isOpen ? " expanded" : " collapsed"}`}>
            <div
              className={`reports-nav-group-title${activeGroup === group.id ? " active" : ""}`}
            >
              <button
                type="button"
                className="reports-nav-toggle"
                aria-expanded={isOpen}
                aria-label={`${group.label} menüsünü ${isOpen ? "daralt" : "genişlet"}`}
                onClick={() => toggleGroup(group.id)}
              >
                <span className="reports-nav-chevron">{isOpen ? "▾" : "▸"}</span>
              </button>
              <span
                className="reports-nav-group-label"
                role="button"
                tabIndex={0}
                onClick={() => {
                  if (!isOpen) toggleGroup(group.id);
                  onSelect(group.id, group.items[0]?.id ?? "");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    if (!isOpen) toggleGroup(group.id);
                    onSelect(group.id, group.items[0]?.id ?? "");
                  }
                }}
              >
                {group.label}
              </span>
              {active ? (
                <span className="reports-nav-badge">AKTİF</span>
              ) : (
                <span className="reports-nav-badge muted">YAKINDA</span>
              )}
            </div>
            {isOpen ? (
              <ul className="reports-nav-list">
                {group.items.map((item: ReportItem) => {
                  const selected = activeGroup === group.id && activeReportId === item.id;
                  return (
                    <li
                      key={item.id}
                      className={`reports-nav-item${selected ? " active" : ""}${
                        item.implemented ? "" : " stub"
                      }`}
                      role="button"
                      tabIndex={0}
                      onClick={() => onSelect(group.id, item.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") onSelect(group.id, item.id);
                      }}
                    >
                      <span>{item.label}</span>
                      {!item.implemented ? <span className="reports-soon">Yakında</span> : null}
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        );
      })}
    </aside>
  );
}
