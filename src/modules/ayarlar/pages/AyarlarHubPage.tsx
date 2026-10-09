import { useState } from "react";
import { useAppStore } from "@/store/appStore";
import type { AyarlarHubKind, AyarlarPanel } from "../config/ayarlarHubConfig";
import {
  AYARLAR_HUB_META,
  AYARLAR_HUB_PANELS,
  findAyarlarPanel,
  findAyarlarParent,
} from "../config/ayarlarHubConfig";
import { SectionSwitcher } from "../components/SectionSwitcher";
import { GenericDefinitionPanel } from "../components/GenericDefinitionPanel";
import { GibTanimlariPanel } from "../components/sistem/GibTanimlariPanel";
import { BackupPanel } from "../components/sistem/BackupPanel";
import { DilTemaGuvenlikPanel } from "../components/sistem/DilTemaGuvenlikPanel";
import { BildirimTanimlariPanel } from "../components/sistem/BildirimTanimlariPanel";
import { LisansPanel } from "../components/sistem/LisansPanel";
import { HesapPlaniPanel } from "../components/program/HesapPlaniPanel";
import { EtiketEkBilgiPanel } from "../components/program/EtiketEkBilgiPanel";
import { MuhasebeKodBaglantilariPanel } from "../components/program/MuhasebeKodBaglantilariPanel";
import { CodeDefinitionsPage } from "./CodeDefinitionsPage";
import { SeriNoTanimPanel } from "../components/program/SeriNoTanimPanel";
import { SERI_PANEL_CATEGORY } from "@/services/documentSeriesApi";
import { StokBirimleriPanel } from "@/modules/kart-tanimlari";
import { SubeTanimlariPanel } from "../components/tanimlar/SubeTanimlariPanel";
import { CariTipTanimlariPanel } from "../components/tanimlar/CariTipTanimlariPanel";
import { KayitTipTanimlariPanel } from "../components/tanimlar/KayitTipTanimlariPanel";
import { HesapPlaniAyarlariPanel } from "../components/tanimlar/HesapPlaniAyarlariPanel";
import { MakinaTipTanimlariPanel } from "../components/tanimlar/MakinaTipTanimlariPanel";
import { DepoTanimlariPanel } from "../components/tanimlar/DepoTanimlariPanel";

type Props = {
  hub: AyarlarHubKind;
};

function isSeriPanel(id: string): boolean {
  return id in SERI_PANEL_CATEGORY;
}

function toSwitcherItems(list: AyarlarPanel[]) {
  return list.map((p) => ({
    id: p.id,
    icon: p.icon,
    title: p.title,
    subtitle: p.subtitle,
    activeClass: p.activeClass,
  }));
}

/** Ayarlar alt menü hub — Gelir&Gider tarzı bölüm seçici + form alt yapı */
export function AyarlarHubPage({ hub }: Props) {
  const guardNavigate = useAppStore((s) => s.guardNavigate);
  const meta = AYARLAR_HUB_META[hub];
  const panels = AYARLAR_HUB_PANELS[hub];
  const [activeId, setActiveId] = useState(panels[0]?.id ?? "");

  const parent = findAyarlarParent(panels, activeId);
  const childPanels = parent?.children;
  const showChildren = Boolean(childPanels?.length);
  const active =
    (showChildren
      ? childPanels!.find((c) => c.id === activeId) ?? childPanels![0]
      : findAyarlarPanel(panels, activeId)) ?? panels[0];
  const topActiveId = parent?.id ?? active?.id ?? "";

  function switchTop(id: string) {
    guardNavigate(() => {
      const top = panels.find((p) => p.id === id);
      if (top?.children?.length) {
        setActiveId(top.children[0].id);
        return;
      }
      setActiveId(id);
    });
  }

  function switchChild(id: string) {
    guardNavigate(() => setActiveId(id));
  }

  return (
    <>
      <div className="header-bar">
        <div className="header-breadcrumb">{meta.breadcrumb}</div>
      </div>

      <SectionSwitcher
        items={toSwitcherItems(panels)}
        activeId={topActiveId}
        onChange={switchTop}
        style={panels.length > 4 ? { flexWrap: "wrap" } : undefined}
      />

      {showChildren && childPanels ? (
        <SectionSwitcher
          nested
          items={toSwitcherItems(childPanels)}
          activeId={active?.id ?? ""}
          onChange={switchChild}
          style={{ flexWrap: "wrap" }}
        />
      ) : null}

      {active?.id === "veritabani-yedekleme" ? <BackupPanel /> : null}
      {active?.id === "dil-tema-guvenlik" ? <DilTemaGuvenlikPanel /> : null}
      {active?.id === "bildirim" ? <BildirimTanimlariPanel /> : null}
      {active?.id === "gib" ? <GibTanimlariPanel panel={active} /> : null}
      {active?.id === "hesap-plani" ? <HesapPlaniPanel /> : null}
      {active?.id === "etiket-ek-bilgi" ? <EtiketEkBilgiPanel /> : null}
      {active?.id === "muhasebelestirme-kod" ? <MuhasebeKodBaglantilariPanel /> : null}
      {active?.id === "hesap-plani-ayarlari" ? <HesapPlaniAyarlariPanel /> : null}
      {active?.id === "kod-tanimlari" ? <CodeDefinitionsPage /> : null}
      {active?.id === "stok-birim" ? (
        <StokBirimleriPanel
          embedded
          title={active.title}
          description={active.description}
        />
      ) : null}
      {active?.id === "lisans" ? <LisansPanel /> : null}
      {active?.id === "sube" ? <SubeTanimlariPanel /> : null}
      {active?.id === "cari-tip" ? <CariTipTanimlariPanel /> : null}
      {active?.id === "kayit-tip" ? <KayitTipTanimlariPanel /> : null}
      {active?.id === "makina-tip" ? <MakinaTipTanimlariPanel /> : null}
      {active?.id === "depo-tanim" ? <DepoTanimlariPanel /> : null}
      {active && isSeriPanel(active.id) ? <SeriNoTanimPanel panel={active} /> : null}
      {active &&
      active.id !== "etiket-ek-bilgi" &&
      active.id !== "muhasebelestirme-kod" &&
      active.id !== "kod-tanimlari" &&
      active.id !== "stok-birim" &&
      active.id !== "lisans" &&
      active.id !== "sube" &&
      active.id !== "cari-tip" &&
      active.id !== "kayit-tip" &&
      active.id !== "makina-tip" &&
      active.id !== "depo-tanim" &&
      active.id !== "veritabani-yedekleme" &&
      active.id !== "dil-tema-guvenlik" &&
      active.id !== "bildirim" &&
      active.id !== "gib" &&
      active.id !== "hesap-plani" &&
      active.id !== "hesap-plani-ayarlari" &&
      active.id !== "numara-tanimlari" &&
      !isSeriPanel(active.id) &&
      !active.children?.length ? (
        <GenericDefinitionPanel panel={active} />
      ) : null}
    </>
  );
}
