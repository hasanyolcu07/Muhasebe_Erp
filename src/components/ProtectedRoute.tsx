import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/appStore";
import { usePermissions, type PermissionAction } from "../hooks/usePermissions";

type Props = {
  children: React.ReactNode;
  module?: string;
  action?: PermissionAction;
};

/** JWT oturumu + isteğe bağlı modül/aksiyon yetkisi */
export function ProtectedRoute({ children, module, action = "view" }: Props) {
  const token = useAuthStore((s) => s.accessToken);
  const { can } = usePermissions();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (module && !can(module, action)) {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
}
