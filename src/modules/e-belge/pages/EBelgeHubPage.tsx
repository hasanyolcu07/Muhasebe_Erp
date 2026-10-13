import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAppStore } from "@/store/appStore";
import { usePermissions } from "@/hooks/usePermissions";
import { EmmHubPage } from "../emm/pages/EmmHubPage";
import { IncomingDocumentsSection, OutgoingDocumentsSection } from "../components/DocumentsSection";
import { ebelgeApi, type EBelgeEnvironmentResponse } from "../api/ebelgeApi";

type HubSection = "giden" | "gelen" | "emm";

function parseSection(raw: string | null): HubSection {
  if (raw === "gelen" || raw === "incoming") return "gelen";
  if (raw === "emm" || raw === "e-mm") return "emm";
  return "giden";
}

const TABS: { id: HubSection; label: string; icon: string; activeClass: string }[] = [
  { id: "giden", label: "Giden Belgeler", icon: "📑", activeClass: "active-fatura" },
  { id: "gelen", label: "Gelen Belgeler", icon: "📥", activeClass: "active-irsaliye" },
  { id: "emm", label: "e-MM", icon: "🌾", activeClass: "active-irsaliye" },
];

export function EBelgeHubPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const guardNavigate = useAppStore((s) => s.guardNavigate);
  const { roleCode, isSuperAdmin } = usePermissions();
  const section = parseSection(searchParams.get("section"));
  const [env, setEnv] = useState<EBelgeEnvironmentResponse | null>(null);
  const [envBusy, setEnvBusy] = useState(false);
  const [envError, setEnvError] = useState<string | null>(null);

  const isAdmin =
    isSuperAdmin || ["ADMIN", "SUPERADMIN", "SYSTEM_ADMIN"].includes((roleCode || "").toUpperCase());

  const loadEnv = useCallback(async () => {
    try {
      const data = await ebelgeApi.getEnvironment();
      setEnv(data);
      setEnvError(null);
    } catch (e) {
      setEnvError(e instanceof Error ? e.message : "Ortam bilgisi alınamadı");
    }
  }, []);

  useEffect(() => {
    void loadEnv();
  }, [loadEnv]);

  async function toggleEnvironment() {
    if (!env || !isAdmin || envBusy) return;
    const next = env.env_mode === "test" ? "live" : "test";
    const confirmMsg =
      next === "live"
        ? "Canlı (LIVE) ortama geçilsin mi? Gerçek GİB gönderimleri bu moda bağlıdır."
        : "Test ortamına dönülsün mü?";
    if (!window.confirm(confirmMsg)) return;
    setEnvBusy(true);
    try {
      const data = await ebelgeApi.setEnvironment(next);
      setEnv(data);
      setEnvError(null);
    } catch (e) {
      setEnvError(e instanceof Error ? e.message : "Ortam değiştirilemedi");
    } finally {
      setEnvBusy(false);
    }
  }

  function switchSection(mod: HubSection) {
    guardNavigate(() => {
      setSearchParams({ section: mod });
    });
  }

  const envMode = env?.env_mode ?? "test";
  const envBadgeClass = envMode === "live" ? "badge badge-green ebelge-env-badge" : "badge badge-orange ebelge-env-badge";

  return (
    <>
      {section !== "emm" && (
        <div className="header-bar ebelge-hub-header">
          <div className="header-breadcrumb">e-Dönüşüm › e-Belge İşlemleri</div>
          <div className="ebelge-env-switch">
            <span className={envBadgeClass} title={env?.gib_base_url || undefined}>
              {envMode === "live" ? "Canlı" : "Test"}
            </span>
            {isAdmin && (
              <button
                type="button"
                className="pill-btn ebelge-env-toggle"
                disabled={envBusy || !env}
                onClick={() => void toggleEnvironment()}
              >
                {envBusy ? "…" : envMode === "live" ? "Test’e geç" : "Canlı’ya geç"}
              </button>
            )}
            {envError && <span className="ebelge-env-error">{envError}</span>}
          </div>
        </div>
      )}

      <div className="doc-hub-type-switcher">
        {TABS.map((tab) => (
          <div
            key={tab.id}
            className={`doc-hub-type-btn${section === tab.id ? ` ${tab.activeClass}` : ""}`}
            role="button"
            tabIndex={0}
            onClick={() => switchSection(tab.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") switchSection(tab.id);
            }}
          >
            <span>{tab.icon}</span>
            <strong>{tab.label}</strong>
          </div>
        ))}
      </div>

      {section === "giden" && <OutgoingDocumentsSection />}
      {section === "gelen" && <IncomingDocumentsSection />}
      {section === "emm" && <EmmHubPage />}
    </>
  );
}
