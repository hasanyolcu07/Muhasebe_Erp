import { useState } from "react";
import { BankaFormView } from "../kasa-banka/components/BankaFormView";
import { BankaListView } from "../kasa-banka/components/BankaListView";
import { KasaFormView } from "../kasa-banka/components/KasaFormView";
import { KasaListView } from "../kasa-banka/components/KasaListView";
import type { KasaBankaTab } from "../kasa-banka/schemas/kasaBankaSchema";
import { FormSlideOver } from "@/components/FormSlideOver";
import { useAppStore } from "@/store/appStore";

export function KasaBankaKartlariPage() {
  const guardNavigate = useAppStore((s) => s.guardNavigate);
  const [activeTab, setActiveTab] = useState<KasaBankaTab>("kasa");
  const [formOpen, setFormOpen] = useState(false);
  const [selectedKasaId, setSelectedKasaId] = useState<number | null>(null);
  const [selectedBankaId, setSelectedBankaId] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  function switchTab(tab: KasaBankaTab) {
    guardNavigate(() => {
      setActiveTab(tab);
      setFormOpen(false);
      setSelectedKasaId(null);
      setSelectedBankaId(null);
    });
  }

  function openKasaForm(id: number | null) {
    guardNavigate(() => {
      setSelectedKasaId(id);
      setFormOpen(true);
    });
  }

  function openBankaForm(id: number | null) {
    guardNavigate(() => {
      setSelectedBankaId(id);
      setFormOpen(true);
    });
  }

  function closeForm() {
    setFormOpen(false);
    setSelectedKasaId(null);
    setSelectedBankaId(null);
  }

  function onKasaSaved(id: number) {
    setSelectedKasaId(id);
    setRefreshKey((k) => k + 1);
  }

  function onBankaSaved(id: number) {
    setSelectedBankaId(id);
    setRefreshKey((k) => k + 1);
  }

  const formTitle =
    activeTab === "kasa"
      ? selectedKasaId
        ? `Kasa Kartı Düzenle — #${selectedKasaId}`
        : "Yeni Kasa Kartı Tanımla"
      : selectedBankaId
        ? `Banka Kartı Düzenle — #${selectedBankaId}`
        : "Yeni Banka Kartı Tanımla";

  return (
    <>
      <div className="header-bar">
        <div className="header-breadcrumb">Kartlar / Kasa & Banka</div>
        <div className="header-btns">
          <button
            type="button"
            className="btn-save"
            onClick={() =>
              guardNavigate(() => (activeTab === "kasa" ? openKasaForm(null) : openBankaForm(null)))
            }
          >
            + {activeTab === "kasa" ? "Kasa Kartı Tanımla" : "Banka Kartı Tanımla"}
          </button>
        </div>
      </div>

      <div className="kb-type-switcher">
        <div
          className={`kb-type-btn${activeTab === "kasa" ? " active-kasa" : ""}`}
          role="tab"
          aria-selected={activeTab === "kasa"}
          tabIndex={0}
          onClick={() => switchTab("kasa")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") switchTab("kasa");
          }}
        >
          <span>💵</span>
          <strong>Kasa Kartı Tanımlama</strong>
        </div>
        <div
          className={`kb-type-btn${activeTab === "banka" ? " active-banka" : ""}`}
          role="tab"
          aria-selected={activeTab === "banka"}
          tabIndex={0}
          onClick={() => switchTab("banka")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") switchTab("banka");
          }}
        >
          <span>🏦</span>
          <strong>Banka Kartı Tanımlama</strong>
        </div>
      </div>

      <div className="kasa-form-card">
        {activeTab === "kasa" ? (
          <KasaListView onOpen={openKasaForm} refreshKey={refreshKey} />
        ) : (
          <BankaListView onOpen={openBankaForm} refreshKey={refreshKey} />
        )}
      </div>

      <FormSlideOver open={formOpen} title={formTitle} onClose={closeForm}>
        {activeTab === "kasa" ? (
          <KasaFormView kasaId={selectedKasaId} onCancel={closeForm} onSaved={onKasaSaved} />
        ) : (
          <BankaFormView bankaId={selectedBankaId} onCancel={closeForm} onSaved={onBankaSaved} />
        )}
      </FormSlideOver>
    </>
  );
}
