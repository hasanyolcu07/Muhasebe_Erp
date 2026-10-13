import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { PersonelKartlarView } from "../components/PersonelKartlarView";
import { IseGirisCikisView } from "../components/IseGirisCikisView";
import { PuantajView } from "../components/PuantajView";
import { IzinDevamsizlikView } from "../components/IzinDevamsizlikView";
import { BordroHesaplamaView } from "../components/BordroHesaplamaView";
import { BordroListesiView } from "../components/BordroListesiView";
import { SgkBildirimView } from "../components/SgkBildirimView";
import { PersonelRaporlarView } from "../components/PersonelRaporlarView";
import { PersonelParametrelerView } from "../components/PersonelParametrelerView";

type TabId =
  | "kartlar"
  | "ise-giris-cikis"
  | "puantaj"
  | "izin-devamsizlik"
  | "bordro-hesaplama"
  | "bordro-listesi"
  | "sgk-bildirim"
  | "personel-raporlar"
  | "personel-parametreleri";

const TABS: Array<{ id: TabId; label: string; icon: string }> = [
  { id: "kartlar", label: "Personel Kartları", icon: "👥" },
  { id: "ise-giris-cikis", label: "İşe Giriş / Çıkış", icon: "🚪" },
  { id: "puantaj", label: "Puantaj Girişi", icon: "⏱️" },
  { id: "izin-devamsizlik", label: "İzin & Devamsızlık", icon: "🏖️" },
  { id: "bordro-hesaplama", label: "Bordro Hesaplama", icon: "🧮" },
  { id: "bordro-listesi", label: "Bordro Listesi & Pusula", icon: "📑" },
  { id: "sgk-bildirim", label: "SGK Bildirimi (4A)", icon: "🏛️" },
  { id: "personel-raporlar", label: "Personel Raporları", icon: "📊" },
  { id: "personel-parametreleri", label: "Mevzuat Parametreleri", icon: "⚙️" },
];

export function PersonelHubPage({ defaultTab }: { defaultTab?: TabId }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const qSection = searchParams.get("section") as TabId | null;
  const [activeTab, setActiveTab] = useState<TabId>(defaultTab || qSection || "kartlar");

  useEffect(() => {
    if (qSection && qSection !== activeTab) {
      setActiveTab(qSection);
    }
  }, [qSection]);

  const switchTab = (tab: TabId) => {
    setActiveTab(tab);
    const next = new URLSearchParams(searchParams);
    next.set("section", tab);
    setSearchParams(next);
  };

  return (
    <div className="personel-hub-page" style={{ padding: 16 }}>
      <div className="header-bar" style={{ marginBottom: 16 }}>
        <div className="header-breadcrumb" style={{ fontSize: 18, fontWeight: 700 }}>
          👥 Personel, Puantaj, Bordro ve SGK İşlemleri
        </div>
      </div>

      {/* Üst Sekmeler */}
      <div
        className="nav-tabs"
        style={{
          display: "flex",
          gap: 6,
          borderBottom: "1px solid #cbd5e1",
          marginBottom: 16,
          overflowX: "auto",
        }}
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`btn-tab ${activeTab === t.id ? "active" : ""}`}
            style={{
              padding: "8px 14px",
              border: "none",
              borderBottom: activeTab === t.id ? "2px solid #2563eb" : "2px solid transparent",
              background: activeTab === t.id ? "rgba(37, 99, 235, 0.05)" : "transparent",
              color: activeTab === t.id ? "#1d4ed8" : "var(--text)",
              fontWeight: activeTab === t.id ? 700 : 500,
              cursor: "pointer",
              whiteSpace: "nowrap",
              fontSize: 13,
            }}
            onClick={() => switchTab(t.id)}
          >
            <span style={{ marginRight: 6 }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Aktif Sekme İçeriği */}
      <div className="tab-content">
        {activeTab === "kartlar" && <PersonelKartlarView />}
        {activeTab === "ise-giris-cikis" && <IseGirisCikisView />}
        {activeTab === "puantaj" && <PuantajView />}
        {activeTab === "izin-devamsizlik" && <IzinDevamsizlikView />}
        {activeTab === "bordro-hesaplama" && <BordroHesaplamaView />}
        {activeTab === "bordro-listesi" && <BordroListesiView />}
        {activeTab === "sgk-bildirim" && <SgkBildirimView />}
        {activeTab === "personel-raporlar" && <PersonelRaporlarView />}
        {activeTab === "personel-parametreleri" && <PersonelParametrelerView />}
      </div>
    </div>
  );
}
