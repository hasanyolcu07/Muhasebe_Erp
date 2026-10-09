import { useState } from "react";
import { NavLink, useLocation, useSearchParams } from "react-router-dom";
import { useAuthStore } from "../store/appStore";
import { LEAF_TO_HUB, SIDEBAR_HUBS, type SidebarHub } from "../config/moduleHubConfig";

type Props = {
  collapsed?: boolean;
  onNavigate?: () => void;
};

type SubNavItem = {
  id: string;
  label: string;
  to: string;
};

function parseHubLabel(raw: string) {
  const parts = raw.split(" ");
  const icon = parts[0] || "📄";
  const text = parts.slice(1).join(" ") || raw;
  return { icon, text };
}

function hubActive(hub: SidebarHub, pathname: string): boolean {
  const relative = pathname.replace(/^\/app\/?/, "").replace(/\/$/, "");
  if (relative === hub.path || relative.startsWith(`${hub.path}/`)) return true;
  if (hub.direct && (relative === hub.path || relative.startsWith(`${hub.path}/`))) return true;
  const mapped = LEAF_TO_HUB[relative];
  if (mapped && mapped.hubPath === hub.path) return true;
  const leafKey = Object.keys(LEAF_TO_HUB).find(
    (k) => relative === k || relative.startsWith(`${k}/`) || relative.startsWith(`${k}?`)
  );
  if (leafKey && LEAF_TO_HUB[leafKey].hubPath === hub.path) return true;
  return false;
}

function flattenSubNav(hub: SidebarHub): SubNavItem[] {
  const out: SubNavItem[] = [];
  for (const sec of hub.sections) {
    if (sec.children?.length) {
      for (const child of sec.children) {
        const qs = new URLSearchParams({ group: sec.id, section: child.id });
        out.push({
          id: child.id,
          label: child.title,
          to: `/app/${hub.path}?${qs.toString()}`,
        });
      }
    } else {
      const qs = new URLSearchParams({ section: sec.id });
      out.push({
        id: sec.id,
        label: sec.title,
        to: `/app/${hub.path}?${qs.toString()}`,
      });
    }
  }
  return out;
}

function subItemActive(item: SubNavItem, pathname: string, searchParams: URLSearchParams): boolean {
  const relative = pathname.replace(/^\/app\/?/, "").replace(/\/$/, "");
  const hubPath = item.to.replace(/^\/app\//, "").split("?")[0];
  if (relative !== hubPath && !relative.startsWith(`${hubPath}/`)) return false;
  const itemQs = new URLSearchParams(item.to.split("?")[1] || "");
  const group = itemQs.get("group");
  const section = itemQs.get("section");
  if (group && searchParams.get("group") !== group) return false;
  if (section && searchParams.get("section") !== section) return false;
  if (!section) return false;
  return searchParams.get("section") === section;
}

function HubBlock({
  hub,
  collapsed,
  onNavigate,
}: {
  hub: SidebarHub;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const hasPerm = useAuthStore((s) => s.hasPerm);
  const allowed = !hub.module || hasPerm(hub.module, "view") || hasPerm("*", "view");
  const active = hubActive(hub, location.pathname);
  const subItems = !hub.direct && hub.sections.length ? flattenSubNav(hub) : [];
  const { icon, text } = parseHubLabel(hub.label);

  const [collapsedByUser, setCollapsedByUser] = useState<boolean | null>(null);

  // When active changes or on initial render, if user hasn't explicitly toggled, default to open if active
  const isOpen = !collapsed && (collapsedByUser !== null ? !collapsedByUser : active);

  const handleHeaderClick = (e: React.MouseEvent) => {
    if (subItems.length > 0) {
      if (active) {
        // If already active and clicked again: toggle open/close!
        e.preventDefault();
        setCollapsedByUser((prev) => (prev === null ? true : !prev));
      } else {
        // Navigating to new hub: ensure open
        setCollapsedByUser(false);
      }
    }
    onNavigate?.();
  };

  if (!allowed) {
    return (
      <span
        className="nav-item nav-hub"
        style={{ opacity: 0.45, cursor: "not-allowed", justifyContent: collapsed ? "center" : undefined }}
        title="Yetkiniz yok"
      >
        <span className="hub-icon" style={{ fontSize: 18, minWidth: 24, textAlign: "center" }}>{icon}</span>
        {!collapsed && <span className="label" style={{ marginLeft: 8 }}>{text}</span>}
      </span>
    );
  }

  return (
    <div className={`nav-hub-block${isOpen ? " is-open" : ""}`}>
      <NavLink
        to={`/app/${hub.path}`}
        className={`nav-item nav-hub${active ? " active" : ""}`}
        title={`${hub.title} (${hub.label})`}
        onClick={handleHeaderClick}
        style={collapsed ? { justifyContent: "center", padding: "10px 0" } : { display: "flex", alignItems: "center", justifyContent: "space-between" }}
      >
        <div style={{ display: "flex", alignItems: "center", minWidth: 0, overflow: "hidden" }}>
          <span className="hub-icon" style={{ fontSize: 18, minWidth: 24, textAlign: "center" }}>{icon}</span>
          {!collapsed && <span className="label" style={{ marginLeft: 8 }}>{text}</span>}
        </div>
        {!collapsed && subItems.length > 0 && (
          <span
            className="hub-toggle-chevron"
            style={{
              fontSize: 10,
              color: active ? "#bfdbfe" : "#94a3b8",
              marginRight: 6,
              transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
              transition: "transform 0.2s ease",
            }}
          >
            ▶
          </span>
        )}
      </NavLink>
      {isOpen && subItems.length > 0 ? (
        <div className="nav-hub-children" aria-label={`${hub.title} alt menü`}>
          {subItems.map((item) => {
            const subActive = subItemActive(item, location.pathname, searchParams);
            return (
              <NavLink
                key={item.id}
                to={item.to}
                className={`nav-item nav-subitem${subActive ? " active" : ""}`}
                onClick={() => onNavigate?.()}
              >
                <span className="label">{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function Sidebar({ collapsed, onNavigate }: Props) {
  const user = useAuthStore((s) => s.user);
  const company = useAuthStore((s) => s.company);
  const roleCode = useAuthStore((s) => s.roleCode);

  const fullName = String(user?.full_name || user?.username || "Sistem Yöneticisi");
  const email = String(user?.email || "admin@tabiaerp.com");
  const initials =
    fullName
      .split(" ")
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "SY";

  return (
    <aside className={`sidebar${collapsed ? " is-collapsed" : ""}`}>
      <div className="sidebar-brand" style={collapsed ? { justifyContent: "center", padding: "16px 8px" } : undefined}>
        <div className="brand-logo" title="TabiaERP">TE</div>
        {!collapsed && (
          <div className="brand-text">
            <span>TabiaERP</span>
            <span>V.1.2 · FAZ 3</span>
          </div>
        )}
      </div>
      <div className="sidebar-scroll">
        <nav className="nav-group" aria-label="Ana modüller">
          {SIDEBAR_HUBS.map((hub) => (
            <HubBlock key={hub.id} hub={hub} collapsed={collapsed} onNavigate={onNavigate} />
          ))}
        </nav>
      </div>

      {/* Alt Bilgi: Lisans ve Kullanıcı Detayı */}
      <div className="sidebar-footer">
        {!collapsed && (
          <div className="sidebar-license-card" title="Lisans Durumu ve Detayları">
            <div className="license-header">
              <span className="license-badge">
                <span className="license-dot" />
                Aktif Lisans
              </span>
              <span className="license-tier">Kurumsal ERP</span>
            </div>
            <div className="license-body">
              <div className="license-row">
                <span className="license-label">Lisans No:</span>
                <span className="license-val">TB-2024-8842</span>
              </div>
              <div className="license-row">
                <span className="license-label">Bitiş Tarihi:</span>
                <span className="license-val highlight">31.12.2026 (454 Gün)</span>
              </div>
              <div className="license-row">
                <span className="license-label">Firma:</span>
                <span className="license-val truncate" title={String(company?.name || "")}>
                  {String(company?.name || "Tabia Bilişim A.Ş.")}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Kullanıcı Bilgisi Kartı */}
        <div className="sidebar-user-card" title={collapsed ? `${fullName} (${email})` : undefined} style={collapsed ? { justifyContent: "center", padding: "10px 4px" } : undefined}>
          <div className="sidebar-user-avatar">{initials}</div>
          {!collapsed && (
            <div className="sidebar-user-info">
              <div className="sidebar-user-name" title={fullName}>
                {fullName}
              </div>
              <div className="sidebar-user-role">
                <span className="role-tag">{roleCode || "ADMIN"}</span>
                <span className="sidebar-user-email truncate" title={email}>
                  {email}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

export type { NavItem } from "../config/navConfig";
