import { useEffect } from "react";
import { useBlocker } from "react-router-dom";
import { useAppStore } from "../store/appStore";

const DIRTY_MSG =
  "⚠️ Form üzerinde kaydedilmemiş değişiklikleriniz (isDirty) bulunmaktadır! Vazgeçerseniz bu değişiklikler kaybolacak. Devam etmek istiyor musunuz?";

/** beforeunload + React Router navigation guard when form is dirty */
export function useDirtyGuard() {
  const isDirty = useAppStore((s) => s.isDirty);
  const setDirty = useAppStore((s) => s.setDirty);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  const blocker = useBlocker(isDirty);

  useEffect(() => {
    if (blocker.state !== "blocked") return;
    const ok = window.confirm(DIRTY_MSG);
    if (ok) {
      setDirty(false);
      blocker.proceed?.();
    } else {
      blocker.reset?.();
    }
  }, [blocker, setDirty]);
}

export { DIRTY_MSG };
