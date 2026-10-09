import { useLocation, useSearchParams } from "react-router-dom";
import { useAppStore } from "@/store/appStore";
import { EdefterSection } from "../edefter/components/EdefterSection";
import { YevmiyeListPanel } from "../components/YevmiyeListPanel";
import { MissingYevmiyePanel } from "../components/MissingYevmiyePanel";
import { MaddeNumaralamaPanel } from "../components/MaddeNumaralamaPanel";
import { SuggestionsPanel } from "../components/SuggestionsPanel";
import { OcrPanel } from "../components/OcrPanel";
import { ResmiReportsPanel } from "../components/ResmiReportsPanel";
import { YearEndOperationsPanel } from "../components/YearEndOperationsPanel";

type HubSection =
  | "fisler"
  | "olusmayan"
  | "madde"
  | "oneriler"
  | "ocr"
  | "raporlar"
  | "yil-sonu"
  | "edefter"
  | "yevmiye";

const SECTIONS: { id: HubSection; label: string }[] = [
  { id: "fisler", label: "Yevmiye Fişleri" },
  { id: "olusmayan", label: "Oluşmayanlar" },
  { id: "madde", label: "Madde Numaralama" },
  { id: "oneriler", label: "Öneriler" },
  { id: "ocr", label: "AI OCR" },
  { id: "raporlar", label: "Mizan / Mali Tablolar" },
  { id: "yil-sonu", label: "Yıl Sonu" },
  { id: "edefter", label: "e-Defter" },
];

function parseTab(raw: string | null, pathname: string): HubSection {
  if (raw === "yevmiye") return "fisler";
  if (raw && SECTIONS.some((s) => s.id === raw)) return raw as HubSection;
  if (pathname.includes("/edefter")) return "edefter";
  return "fisler";
}

/**
 * İç sekmeler `tab` query kullanır — dış hub `section` ile çakışmasın.
 * embeddedSection verilirse yalnızca o bölüm (sekmeler gizli).
 */
export function YevmiyeDefterHubPage({
  embeddedSection,
  showTabs = !embeddedSection,
}: {
  embeddedSection?: HubSection;
  showTabs?: boolean;
}) {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const guardNavigate = useAppStore((s) => s.guardNavigate);
  const tabRaw = searchParams.get("tab") ?? searchParams.get("yevTab");
  const section = embeddedSection ?? parseTab(tabRaw, location.pathname);

  function switchSection(mod: HubSection) {
    guardNavigate(() => {
      const next = new URLSearchParams(searchParams);
      next.set("tab", mod);
      next.delete("yevTab");
      setSearchParams(next, { replace: true });
    });
  }

  return (
    <>
      {showTabs && (
        <div className="header-bar">
          <div className="header-breadcrumb">Muhasebe › Yevmiye Fişleri</div>
        </div>
      )}

      {showTabs && (
        <nav className="hub-tabs" aria-label="Yevmiye bölümleri">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`hub-tab${section === s.id ? " active" : ""}`}
              onClick={() => switchSection(s.id)}
            >
              {s.label}
            </button>
          ))}
        </nav>
      )}

      {(section === "fisler" || section === "yevmiye") && <YevmiyeListPanel />}
      {section === "olusmayan" && <MissingYevmiyePanel />}
      {section === "madde" && <MaddeNumaralamaPanel />}
      {section === "oneriler" && <SuggestionsPanel />}
      {section === "ocr" && <OcrPanel />}
      {section === "raporlar" && <ResmiReportsPanel />}
      {section === "yil-sonu" && <YearEndOperationsPanel />}
      {section === "edefter" && <EdefterSection />}
    </>
  );
}
