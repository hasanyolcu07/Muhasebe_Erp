import { FormSlideOver } from "@/components/FormSlideOver";
import { BankaFormView } from "@/modules/kart-tanimlari/kasa-banka/components/BankaFormView";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (id: number) => void;
};

/** Side panel: create banka definition and return id for auto-select */
export function QuickAddBankaPanel({ open, onClose, onCreated }: Props) {
  return (
    <FormSlideOver
      open={open}
      title="Yeni Banka Tanımla"
      onClose={onClose}
      width="min(620px, 96vw)"
      skipDirtyGuard
    >
      <BankaFormView
        bankaId={null}
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
