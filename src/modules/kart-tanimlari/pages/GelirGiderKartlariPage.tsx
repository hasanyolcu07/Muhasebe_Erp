import { useState } from "react";
import { GelirGiderFormView } from "../gelir-gider/components/GelirGiderFormView";
import { GelirGiderListView } from "../gelir-gider/components/GelirGiderListView";
import type { GelirGiderType } from "../gelir-gider/schemas/gelirGiderSchema";
import { FormSlideOver } from "@/components/FormSlideOver";
import { useAppStore } from "@/store/appStore";

export function GelirGiderKartlariPage() {
  const guardNavigate = useAppStore((s) => s.guardNavigate);
  const [cardType, setCardType] = useState<GelirGiderType>("GIDER");
  const [formOpen, setFormOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  function switchType(type: GelirGiderType) {
    guardNavigate(() => {
      setCardType(type);
      setFormOpen(false);
      setSelectedId(null);
    });
  }

  function openForm(id: number | null) {
    guardNavigate(() => {
      setSelectedId(id);
      setFormOpen(true);
    });
  }

  function closeForm() {
    setFormOpen(false);
    setSelectedId(null);
  }

  function onSaved(id: number) {
    setSelectedId(id);
    setRefreshKey((k) => k + 1);
  }

  const typeLabel = cardType === "GIDER" ? "Gider" : "Gelir";
  const formTitle = selectedId
    ? `${typeLabel} Kartı Düzenle — #${selectedId}`
    : `Yeni ${typeLabel} Kartı`;

  return (
    <>
      <div className="header-bar">
        <div className="header-breadcrumb">Kartlar / Gelirler & Giderler</div>
        <div className="header-btns">
          <button type="button" className="btn-save" onClick={() => guardNavigate(() => openForm(null))}>
            + Yeni {typeLabel} Kartı
          </button>
        </div>
      </div>

      <div className="gg-type-switcher">
        <div
          className={`gg-type-btn${cardType === "GIDER" ? " active-gider" : ""}`}
          role="button"
          tabIndex={0}
          onClick={() => switchType("GIDER")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") switchType("GIDER");
          }}
        >
          <span>📉</span>
          <strong>Gider Kartı Tanımlama</strong> (İşletme Masraf Kalemleri)
        </div>
        <div
          className={`gg-type-btn${cardType === "GELIR" ? " active-gelir" : ""}`}
          role="button"
          tabIndex={0}
          onClick={() => switchType("GELIR")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") switchType("GELIR");
          }}
        >
          <span>📈</span>
          <strong>Gelir Kartı Tanımlama</strong> (Satış ve Yan Gelir Kalemleri)
        </div>
      </div>

      <div className="gg-form-card">
        <GelirGiderListView cardType={cardType} onOpen={openForm} refreshKey={refreshKey} />
      </div>

      <FormSlideOver open={formOpen} title={formTitle} onClose={closeForm}>
        <GelirGiderFormView
          cardId={selectedId}
          cardType={cardType}
          onCancel={closeForm}
          onSaved={onSaved}
        />
      </FormSlideOver>
    </>
  );
}
