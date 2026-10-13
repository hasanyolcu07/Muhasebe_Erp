import { useSearchParams } from "react-router-dom";
import { useAppStore } from "@/store/appStore";
import { BabsSection } from "../babs/components/BabsSection";
import { BeyannameLayout } from "../components/BeyannameLayout";
import { HUB_TABS, SECTION_MENU_ITEMS, type HubTabId } from "../config/beyannameMenus";
import { Kdv1Section } from "../kdv/components/Kdv1Section";
import { Kdv2Section } from "../kdv/components/Kdv2Section";
import { Muhtasar1003ASection } from "../muhtasar/components/Muhtasar1003ASection";
import { Muhtasar1003BSection } from "../muhtasar/components/Muhtasar1003BSection";
import { GeciciVergiSection } from "../vergi/components/GeciciVergiSection";
import { KurumlarVergiSection } from "../vergi/components/KurumlarVergiSection";
import { GelirVergiSection } from "../vergi/components/GelirVergiSection";
import { DamgaSection } from "../diger/components/DamgaSection";
import { PosetSection } from "../diger/components/PosetSection";
import { KesinMizanSection } from "../diger/components/KesinMizanSection";
import { KdvTevkifatSection } from "../diger/components/KdvTevkifatSection";
import { KdvIadeSection } from "../kdv/components/KdvIadeSection";
import { useState } from "react";

function parseSection(raw: string | null): HubTabId {
  if (!raw) return "babs";
  if (raw === "kdv") return "kdv1";
  if (raw === "muhtasar" || raw === "muhtasar_sgk") return "muhtasar_1003a";
  const ok = HUB_TABS.some((t) => t.id === raw);
  return ok ? (raw as HubTabId) : "babs";
}

export function BeyannameHubPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const guardNavigate = useAppStore((s) => s.guardNavigate);
  /** İç sekme: `tab` — dış hub `section=beyanname` ile çakışmasın */
  const section = parseSection(searchParams.get("tab") ?? searchParams.get("beyTab"));
  const [babsMenu, setBabsMenu] = useState("prepare");

  function switchSection(mod: HubTabId) {
    guardNavigate(() => {
      const next = new URLSearchParams(searchParams);
      next.set("tab", mod);
      next.delete("beyTab");
      setSearchParams(next, { replace: true });
    });
  }

  return (
    <>
      <div className="header-bar">
        <div className="header-breadcrumb">Resmi Muhasebe › Beyannameler</div>
      </div>

      <div className="doc-hub-type-switcher">
        {HUB_TABS.map((tab) => (
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

      {section === "babs" ? (
        <BeyannameLayout
          items={SECTION_MENU_ITEMS.babs}
          activeId={babsMenu}
          onChange={setBabsMenu}
          title="Ba-Bs"
        >
          <BabsSection />
        </BeyannameLayout>
      ) : section === "kdv1" ? (
        <Kdv1Section />
      ) : section === "kdv2" ? (
        <Kdv2Section />
      ) : section === "muhtasar_1003a" ? (
        <Muhtasar1003ASection />
      ) : section === "muhtasar_1003b" ? (
        <Muhtasar1003BSection />
      ) : section === "gecici" ? (
        <GeciciVergiSection />
      ) : section === "kurumlar" ? (
        <KurumlarVergiSection />
      ) : section === "gelir" ? (
        <GelirVergiSection />
      ) : section === "damga" ? (
        <DamgaSection />
      ) : section === "poset" ? (
        <PosetSection />
      ) : section === "kesin_mizan" ? (
        <KesinMizanSection />
      ) : section === "kdv_tevkifat" ? (
        <KdvTevkifatSection />
      ) : section === "kdv_iade" ? (
        <KdvIadeSection />
      ) : null}
    </>
  );
}
