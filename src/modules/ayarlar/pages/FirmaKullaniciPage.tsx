import { useState } from "react";
import { useAppStore } from "@/store/appStore";
import { SectionSwitcher, type SectionSwitcherItem } from "../components/SectionSwitcher";
import { FirmaBilgileriPanel } from "../components/firma/FirmaBilgileriPanel";
import { KullaniciTanimlariPanel } from "../components/firma/KullaniciTanimlariPanel";
import { KullaniciRolPanel } from "../components/firma/KullaniciRolPanel";

type SectionId = "firma" | "kullanici" | "rol";

const SECTIONS: SectionSwitcherItem[] = [
  {
    id: "firma",
    icon: "🏢",
    title: "Firma Bilgileri",
    subtitle: "Genel / Varsayılanlar / E-Dönüşüm / Nace",
    activeClass: "active-blue",
  },
  {
    id: "kullanici",
    icon: "👤",
    title: "Kullanıcı Tanımları",
    subtitle: "Kullanıcı hesapları",
    activeClass: "active-gelir",
  },
  {
    id: "rol",
    icon: "🛡️",
    title: "Kullanıcı Rol Tanımları",
    subtitle: "Rol ve yetkiler",
    activeClass: "active-amber",
  },
];

export function FirmaKullaniciPage() {
  const guardNavigate = useAppStore((s) => s.guardNavigate);
  const [section, setSection] = useState<SectionId>("firma");

  function switchSection(id: string) {
    guardNavigate(() => setSection(id as SectionId));
  }

  return (
    <>
      <div className="header-bar">
        <div className="header-breadcrumb">Ayarlar / Firma & Kullanıcı Tanım</div>
        <div className="header-btns">
          {section === "firma" ? (
            <button type="button" className="btn-save">Kaydet</button>
          ) : null}
        </div>
      </div>

      <SectionSwitcher items={SECTIONS} activeId={section} onChange={switchSection} />

      {section === "firma" ? <FirmaBilgileriPanel /> : null}
      {section === "kullanici" ? <KullaniciTanimlariPanel /> : null}
      {section === "rol" ? <KullaniciRolPanel /> : null}
    </>
  );
}
