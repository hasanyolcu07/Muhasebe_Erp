import { useState } from "react";
import { FormSlideOver } from "@/components/FormSlideOver";
import { CariFormView } from "../cari/components/CariFormView";
import { CariListView } from "../cari/components/CariListView";

type ViewMode = "list" | "create" | "edit";

export function CariKartlarPage() {
  const [mode, setMode] = useState<ViewMode>("list");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  function openForm(id: number | null) {
    setSelectedId(id);
    setMode(id === null ? "create" : "edit");
  }

  function backToList() {
    setMode("list");
    setSelectedId(null);
  }

  function onSaved(id: number) {
    setRefreshKey((k) => k + 1);
    if (mode === "create") {
      setMode("list");
      setSelectedId(null);
    } else {
      setSelectedId(id);
    }
  }

  return (
    <>
      {mode === "create" ? (
        <div className="yev-entry-card">
          <CariFormView accountId={null} onCancel={backToList} onSaved={onSaved} />
        </div>
      ) : null}

      <CariListView onOpen={openForm} refreshKey={refreshKey} />

      <FormSlideOver
        open={mode === "edit"}
        title={selectedId ? `Cari Düzenle — #${selectedId}` : "Cari Düzenle"}
        onClose={backToList}
        width="min(980px, 96vw)"
      >
        {mode === "edit" ? (
          <CariFormView accountId={selectedId} onCancel={backToList} onSaved={onSaved} />
        ) : null}
      </FormSlideOver>
    </>
  );
}
