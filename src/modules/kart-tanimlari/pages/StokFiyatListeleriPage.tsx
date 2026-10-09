import { useState } from "react";
import { FormSlideOver } from "@/components/FormSlideOver";
import { FiyatListesiFormView } from "../stok/components/FiyatListesiFormView";
import { FiyatListesiListView } from "../stok/components/FiyatListesiListView";
import { StokFormView } from "../stok/components/StokFormView";
import { StokListView } from "../stok/components/StokListView";
import type { StokMainMode } from "../stok/constants";
import { useAppStore } from "@/store/appStore";

type ViewMode = "hub" | "stok-form" | "fiyat-form";

export function StokFiyatListeleriPage() {
  const guardNavigate = useAppStore((s) => s.guardNavigate);
  const [mainMode, setMainMode] = useState<StokMainMode>("stok");
  const [viewMode, setViewMode] = useState<ViewMode>("hub");
  const [selectedStokId, setSelectedStokId] = useState<number | null>(null);
  const [selectedFiyatId, setSelectedFiyatId] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  function switchMode(mode: StokMainMode) {
    guardNavigate(() => {
      setMainMode(mode);
      setViewMode("hub");
      setSelectedStokId(null);
      setSelectedFiyatId(null);
    });
  }

  function openStokForm(id: number | null) {
    setSelectedStokId(id);
    setSelectedFiyatId(null);
    setViewMode("stok-form");
  }

  function openFiyatForm(id: number | null) {
    setSelectedFiyatId(id);
    setSelectedStokId(null);
    setViewMode("fiyat-form");
  }

  function backToHub() {
    setViewMode("hub");
    setSelectedStokId(null);
    setSelectedFiyatId(null);
  }

  function onStokSaved(_id: number) {
    setRefreshKey((k) => k + 1);
    backToHub();
  }

  function onFiyatSaved(_id: number) {
    setRefreshKey((k) => k + 1);
    backToHub();
  }

  return (
    <>
      <div className="header-bar">
        <div className="header-breadcrumb">Kartlar / Stoklar & Fiyat Listeleri</div>
      </div>

      <div className="stok-type-switcher">
        <div
          className={`stok-type-btn${mainMode === "stok" ? " active-stok" : ""}`}
          onClick={() => switchMode("stok")}
          role="button"
          tabIndex={0}
        >
          <span>📦</span>
          <strong>Stok Kartı Tanımı</strong> (Çoklu Tedarikçi Atama & Depo Lot Yönetimi)
        </div>
        <div
          className={`stok-type-btn${mainMode === "fiyat" ? " active-fiyat" : ""}`}
          onClick={() => switchMode("fiyat")}
          role="button"
          tabIndex={0}
        >
          <span>💲</span>
          <strong>Fiyat Liste Tanımı</strong> (Tedarikçi/Grup İskontoları & Kullanıcı Yetkileri)
        </div>
      </div>

      {mainMode === "stok" ? (
        <StokListView onOpen={openStokForm} refreshKey={refreshKey} />
      ) : (
        <FiyatListesiListView onOpen={openFiyatForm} refreshKey={refreshKey} />
      )}

      <FormSlideOver
        open={viewMode === "stok-form"}
        title={selectedStokId ? "Stok Kartı Düzenle" : "Yeni Stok Kartı"}
        onClose={backToHub}
        width="min(860px, 96vw)"
      >
        {viewMode === "stok-form" ? (
          <StokFormView stockId={selectedStokId} onCancel={backToHub} onSaved={onStokSaved} />
        ) : null}
      </FormSlideOver>

      <FormSlideOver
        open={viewMode === "fiyat-form"}
        title={selectedFiyatId ? "Fiyat Listesi Düzenle" : "Yeni Fiyat Listesi"}
        onClose={backToHub}
        width="min(860px, 96vw)"
      >
        {viewMode === "fiyat-form" ? (
          <FiyatListesiFormView
            priceListId={selectedFiyatId}
            onCancel={backToHub}
            onSaved={onFiyatSaved}
          />
        ) : null}
      </FormSlideOver>
    </>
  );
}
