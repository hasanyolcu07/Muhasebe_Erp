import { FormSlideOver } from "@/components/FormSlideOver";
import { CariFormView } from "@/modules/kart-tanimlari/cari/components/CariFormView";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (id: number) => void;
};

/** Side panel: create cari and return id for auto-select */
export function QuickAddCariPanel({ open, onClose, onCreated }: Props) {
  return (
    <FormSlideOver
      open={open}
      title="Yeni Cari Ekle"
      onClose={onClose}
      width="min(920px, 98vw)"
      skipDirtyGuard
    >
      <CariFormView
        accountId={null}
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
