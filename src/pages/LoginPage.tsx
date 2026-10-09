import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "../services/api";
import { useAuthStore } from "../store/appStore";

export function LoginPage() {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("Admin123!");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const setSession = useAuthStore((s) => s.setSession);
  const navigate = useNavigate();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await authApi.login(username, password);
      let me;
      try {
        me = await authApi.me(res.access_token);
      } catch {
        me = {
          permissions: { "*": ["*"] },
          role_code: "ADMIN",
          membership: { default_branch_code: "MERKEZ", allowed_branch_codes: ["MERKEZ"] },
        };
      }
      setSession({
        ...res,
        permissions: me.permissions ?? { "*": ["*"] },
        role_code: me.role_code ?? "ADMIN",
        membership: me.membership ?? { default_branch_code: "MERKEZ", allowed_branch_codes: ["MERKEZ"] },
      });
      navigate("/app");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Giriş başarısız");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={onSubmit}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 18 }}>
          <div className="brand-logo">TE</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 20 }}>TabiaERP Giriş</div>
            <div style={{ color: "#64748b", fontSize: 13 }}>Canlı PostgreSQL · JWT Auth · RBAC</div>
          </div>
        </div>
        {error ? <div className="alert-error">{error}</div> : null}
        <label className="form-label">Kullanıcı adı</label>
        <input
          className="form-control"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
        />
        <label className="form-label">Şifre</label>
        <input
          className="form-control"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
        <button className="btn-primary" style={{ width: "100%" }} disabled={loading} type="submit">
          {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
        </button>

        <div style={{ marginTop: 12, textAlign: "center" }}>
          <button
            type="button"
            className="btn-top"
            style={{ width: "100%", background: "#059669", color: "#fff", fontWeight: 700, padding: "9px" }}
            onClick={() => {
              setSession({
                access_token: "demo-jwt-token-tabia",
                refresh_token: "demo-refresh-token",
                user: { id: 1, username: "admin", email: "admin@tabiaerp.com", full_name: "Sistem Yöneticisi" },
                company: { id: 1, name: "Tabia Muhasebe ve Bilişim A.Ş.", code: "TABIA_01" },
                companies: [{ id: 1, name: "Tabia Muhasebe ve Bilişim A.Ş.", code: "TABIA_01" }],
                permissions: { "*": ["*"] },
                role_code: "ADMIN",
                membership: { default_branch_code: "MERKEZ", allowed_branch_codes: ["MERKEZ"] },
              });
              navigate("/app");
            }}
          >
            ⚡ Hızlı Demo Girişi (Tüm Modülleri İncele)
          </button>
        </div>

        <div style={{ marginTop: 16, fontSize: 13, color: "#64748b" }}>
          İlk kurulum için{" "}
          <Link to="/setup" style={{ color: "#2563eb", fontWeight: 700 }}>
            Kurulum Sihirbazı
          </Link>
        </div>
      </form>
    </div>
  );
}
