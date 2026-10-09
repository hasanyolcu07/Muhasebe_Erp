import type { ReactNode } from "react";
import { usePermissions, type PermissionAction } from "../hooks/usePermissions";

type Props = {
  module: string;
  action?: PermissionAction;
  fallback?: ReactNode;
  mode?: "hide" | "disable";
  children: ReactNode | ((allowed: boolean) => ReactNode);
};

/** Yetkiye göre içeriği gizler veya devre dışı bırakır */
export function PermissionGate({
  module,
  action = "view",
  fallback = null,
  mode = "hide",
  children,
}: Props) {
  const { can } = usePermissions();
  const allowed = can(module, action);

  if (typeof children === "function") {
    return <>{children(allowed)}</>;
  }

  if (!allowed) {
    if (mode === "disable") {
      return (
        <span style={{ opacity: 0.45, pointerEvents: "none" }} title="Yetkiniz yok">
          {children}
        </span>
      );
    }
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
