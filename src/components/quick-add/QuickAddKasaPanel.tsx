import { FormSlideOver } from "@/components/FormSlideOver";
import { KasaFormView } from "@/modules/kart-tanimlari/kasa-banka/components/KasaFormView";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Called after successful create — parent should refresh lookup and select this id */
  onCreated: (id: number) => void;
};

/** Side panel: create kasa definition and return id for auto-select */
export function QuickAddKasaPanel({ open, onClose, onCreated }: Props) {
  return (
    <FormSlideOver
      open={open}
      title="Yeni Kasa Tanımla"
      onClose={onClose}
      width="min(560px, 96vw)"
      skipDirtyGuard
    >
      <KasaFormView
        kasaId={null}
        trackDirty={false}
        saveLabel="Kaydet & Seç"
        onCancel={onClose}
        onSaved={(id) => {
          onCreated(id);
          onClose();
        }}
      />
    </FormSlideOver>
  );
}
