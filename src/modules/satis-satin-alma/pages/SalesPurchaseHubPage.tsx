import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAppStore } from "@/store/appStore";
import { DocumentHubSection, type HubModule } from "../components/DocumentHubSection";
import type { DocumentSide } from "../constants/documentContext";

type Props = {
  side: DocumentSide;
  breadcrumb: string;
};

export function SalesPurchaseHubPage({ side, breadcrumb }: Props) {
  const [searchParams, setSearchParams] = useSearchParams();
  const guardNavigate = useAppStore((s) => s.guardNavigate);
  const purchase = side === "purchase";
  const rawSection = searchParams.get("section");
  const section: HubModule = rawSection === "irsaliye" ? "irsaliye" : "fatura";
  const [refreshKey, setRefreshKey] = useState(0);

  const faturaTitle = side === "sales" ? "Satış Faturaları" : "Alış Faturaları";
  const irsaliyeTitle = side === "sales" ? "Satış İrsaliyeleri" : "Alış İrsaliyeleri";

  function switchSection(mod: HubModule) {
    guardNavigate(() => {
      setSearchParams({ section: mod });
    });
  }

  return (
    <>
      <div className="header-bar">
        <div className="header-breadcrumb">{breadcrumb}</div>
      </div>

      <div className="doc-hub-type-switcher">
        <div
          className={`doc-hub-type-btn${section === "fatura" ? (purchase ? " active-purchase-fatura" : " active-fatura") : ""}`}
          role="button"
          tabIndex={0}
          onClick={() => switchSection("fatura")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") switchSection("fatura");
          }}
        >
          <span>📄</span>
          <strong>{faturaTitle}</strong>
        </div>
        <div
          className={`doc-hub-type-btn${section === "irsaliye" ? " active-irsaliye" : ""}`}
          role="button"
          tabIndex={0}
          onClick={() => switchSection("irsaliye")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") switchSection("irsaliye");
          }}
        >
          <span>🚚</span>
          <strong>{irsaliyeTitle}</strong>
        </div>
      </div>

      <DocumentHubSection
        title={section === "fatura" ? faturaTitle : irsaliyeTitle}
        side={side}
        module={section}
        refreshKey={refreshKey}
        onRefresh={() => setRefreshKey((k) => k + 1)}
      />
    </>
  );
}
