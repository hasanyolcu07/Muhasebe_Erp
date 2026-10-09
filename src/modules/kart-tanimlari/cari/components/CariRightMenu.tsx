import { CARI_TABS, type CariTabId } from "../constants";

type Props = {
  activeTab: CariTabId;
  onSelect: (tab: CariTabId) => void;
};

export function CariRightMenu({ activeTab, onSelect }: Props) {
  return (
    <div className="cari-right-menu-card">
      <div className="cari-right-header">
        <span>📂 Cari Tanım Menüleri</span>
        <span className="badge badge-yellow" style={{ fontSize: 10 }}>
          14 BAŞLIK
        </span>
      </div>
      <ul className="cari-right-menu-list">
        {CARI_TABS.map((tab) => (
          <li
            key={tab.id}
            className={`cari-right-menu-item${activeTab === tab.id ? " active" : ""}`}
            style={tab.accent ? { color: tab.accent } : undefined}
            onClick={() => onSelect(tab.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && onSelect(tab.id)}
          >
            <span>
              {tab.icon} {tab.index}. {tab.label}
            </span>
            <span>›</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
