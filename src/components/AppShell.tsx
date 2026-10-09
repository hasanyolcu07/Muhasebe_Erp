import { useEffect, useState, type ReactNode } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { useAppStore, useAuthStore } from "../store/appStore";
import { useDirtyGuard } from "../hooks/useDirtyGuard";
import { authApi, tenantApi } from "../services/api";
import { findNavItemByLocation } from "../config/navConfig";

type Props = {
  footer?: ReactNode;
};

export function AppShell({ footer }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const accessToken = useAuthStore((s) => s.accessToken);
  const clear = useAuthStore((s) => s.clear);
  const setSession = useAuthStore((s) => s.setSession);
  const setPageTitle = useAppStore((s) => s.setPageTitle);
  const setTenantLists = useAppStore((s) => s.setTenantLists);
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);
  const toggleSidebarCollapsed = useAppStore((s) => s.toggleSidebarCollapsed);
  const location = useLocation();

  useDirtyGuard();

  function handleToggleSidebar() {
    if (window.innerWidth >= 768) {
      toggleSidebarCollapsed();
    } else {
      setSidebarOpen((v) => !v);
    }
  }

  useEffect(() => {
    const item = findNavItemByLocation(location.pathname);
    setPageTitle(item?.title || "Ana Panel");
  }, [location.pathname, setPageTitle]);

  useEffect(() => {
    if (!accessToken) return;
    (async () => {
      try {
        const me = await authApi.me(accessToken);
        setSession({
          access_token: accessToken,
          refresh_token: useAuthStore.getState().refreshToken || "",
          user: me.user,
          company: me.company,
          companies: me.companies,
          permissions: me.permissions,
          role_code: me.role_code,
          membership: me.membership,
        });
        const ctx = (await tenantApi.context(accessToken)) as {
          branches: Array<{ id: number; code: string; name: string }>;
          record_types: Array<{
            id: number;
            code: string;
            name: string;
            muhasebelessin_mi?: boolean;
            raporda_gorunsun_mu?: boolean;
          }>;
        };
        setTenantLists(ctx.branches || [], ctx.record_types || []);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [accessToken, setSession, setTenantLists]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  async function onLogout() {
    try {
      if (accessToken) await authApi.logout(accessToken);
    } catch {
      /* ignore */
    }
    clear();
    window.location.href = "/login";
  }

  return (
    <div className={`app-shell ${sidebarOpen ? "sidebar-open" : ""} ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <div
        className="sidebar-overlay"
        role="presentation"
        onClick={() => setSidebarOpen(false)}
        aria-hidden={!sidebarOpen}
      />
      <Sidebar collapsed={sidebarCollapsed} onNavigate={() => setSidebarOpen(false)} />
      <div className="main-wrapper">
        <Topbar onLogout={onLogout} onToggleSidebar={handleToggleSidebar} />
        <main className="content-area">
          <Outlet />
          {footer}
        </main>
      </div>
    </div>
  );
}
