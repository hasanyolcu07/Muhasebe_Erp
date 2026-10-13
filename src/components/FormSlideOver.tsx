import type { ReactNode } from "react";
import { useAppStore } from "@/store/appStore";

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  width?: string;
  /** Quick-add overlays: do not ask about parent form dirty state */
  skipDirtyGuard?: boolean;
};

/** Liste üzerinde kayan form paneli (modal/slide-over) */
export function FormSlideOver({
  open,
  title,
  onClose,
  children,
  width = "min(760px, 96vw)",
  skipDirtyGuard = false,
}: Props) {
  const guardNavigate = useAppStore((s) => s.guardNavigate);

  if (!open) return null;

  function handleClose() {
    if (skipDirtyGuard) onClose();
    else guardNavigate(onClose);
  }

  return (
    <>
      <div className="slide-over-backdrop" onClick={handleClose} aria-hidden="true" />
      <div className="slide-over-panel" style={{ width }} role="dialog" aria-modal="true" aria-label={title}>
        <div className="slide-over-header">
          <h2>{title}</h2>
          <button type="button" className="btn-cancel" onClick={handleClose}>
            ✖ Kapat
          </button>
        </div>
        <div className="slide-over-body">{children}</div>
      </div>
    </>
  );
}
