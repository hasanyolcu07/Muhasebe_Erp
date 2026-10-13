import { Navigate, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/appStore";
import { usePermissions, type PermissionAction } from "../hooks/usePermissions";

type Props = {
  children: React.ReactNode;
  module?: string;
  action?: PermissionAction;
  redirectToLogin?: boolean;
};

export function AccessDeniedScreen({
  module,
  action = "view",
}: {
  module?: string;
  action?: string;
}) {
  const navigate = useNavigate();
  const roleCode = useAuthStore((s) => s.roleCode);

  return (
    <div
      className="access-denied-container"
      style={{
        maxWidth: 580,
        margin: "60px auto",
        padding: "36px 32px",
        background: "#ffffff",
        borderRadius: 12,
        border: "1px solid #e2e8f0",
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05)",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          margin: "0 auto 20px",
          borderRadius: "50%",
          background: "#fee2e2",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 32,
        }}
      >
        🛡️
      </div>
      <h2
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: "#991b1b",
          marginBottom: 10,
        }}
      >
        403 — Yetkisiz Erişim
      </h2>
      <p style={{ color: "#475569", fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
        Bu sayfayı veya modülü görüntülemek için gerekli kullanıcı iznine sahip değilsiniz.
      </p>

      {module ? (
        <div
          style={{
            display: "inline-block",
            padding: "8px 16px",
            background: "#f8fafc",
            borderRadius: 8,
            border: "1px solid #e2e8f0",
            fontSize: 13,
            color: "#64748b",
            marginBottom: 24,
          }}
        >
          Gerekli Modül: <strong style={{ color: "#0f172a" }}>{module}</strong> · İşlem:{" "}
          <strong style={{ color: "#0f172a" }}>{action}</strong>
          {roleCode ? ` · Mevcut Rol: ${roleCode}` : ""}
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
        <button
          type="button"
          className="btn-primary"
          style={{ padding: "10px 20px", fontSize: 14 }}
          onClick={() => navigate("/app/dashboard")}
        >
          🏠 Ana Panele Dön
        </button>
        <button
          type="button"
          className="btn-secondary"
          style={{ padding: "10px 20px", fontSize: 14 }}
          onClick={() => window.history.back()}
        >
          ↩ Geri Git
        </button>
      </div>
    </div>
  );
}

/** JWT oturumu + isteğe bağlı modül/aksiyon yetkisi denetimi */
export function ProtectedRoute({ children, module, action = "view", redirectToLogin = true }: Props) {
  const token = useAuthStore((s) => s.accessToken);
  const { can } = usePermissions();

  if (!token) {
    if (redirectToLogin) {
      return <Navigate to="/login" replace />;
    }
    return <AccessDeniedScreen module={module} action={action} />;
  }

  if (module && !can(module, action)) {
    return <AccessDeniedScreen module={module} action={action} />;
  }

  return <>{children}</>;
}
