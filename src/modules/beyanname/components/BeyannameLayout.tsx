import type { ReactNode } from "react";
import { RightVerticalMenu, type RightMenuItem } from "@/components/ui";

type Props = {
  items: RightMenuItem[];
  activeId: string;
  onChange: (id: string) => void;
  title?: string;
  children: ReactNode;
};

export function BeyannameLayout({ items, activeId, onChange, title, children }: Props) {
  return (
    <div style={{ display: "flex", gap: 16, alignItems: "flex-start", marginTop: 12 }}>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
      <RightVerticalMenu
        className="beyanname-right-vmenu"
        items={items}
        activeId={activeId}
        onChange={onChange}
        title={title}
      />
    </div>
  );
}
