import type { ReactNode } from "react";
import { useFinancialFormDefaults } from "@/hooks/useFinancialFormDefaults";

/** FormProvider içinde topbar → form senkronu (children wrapper). */
export function FinancialFormSync({
  isEdit = false,
  syncFromTopbar = true,
  children,
}: {
  isEdit?: boolean;
  syncFromTopbar?: boolean;
  children?: ReactNode;
}) {
  useFinancialFormDefaults({ isEdit, syncFromTopbar });
  return <>{children}</>;
}
