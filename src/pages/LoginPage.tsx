import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "../services/api";
import { useAuthStore } from "../store/appStore";

type Tokenish = {
  access_token?: string;
  otp_required?: boolean;
  challenge?: string;
  user?: Record<string, unknown>;
  company?: Record<string, unknown> | null;
  companies?: Array<Record<string, unknown>>;
  permissions?: Record<string, string[]>;
  role_code?: string;
  refresh_token?: string;
};

export function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [challenge, setChallenge] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const setSession = useAuthStore((s) => s.setSession);
  const navigate = useNavigate();

  function openSession(res: Tokenish, me: {
    user?: Record<string, unknown>;
    company?: Record<string, unknown> | null;
    companies?: Array<Record<string, unknown>>;
    permissions?: Record<string, string[]>;
    role_code?: string;
    membership?: {
      default_branch_code?: string | null;
      allowed_branch_codes?: string[] | null;
      amount_limit?: number | null;
    };
  }) {
    if (!res.access_token || !res.refresh_token) {
      throw new Error("Giriş yanıtında geçerli erişim tokenı bulunamadı.");
    }
    const safePermissions = me.permissions && typeof me.permissions === "object" ? me.permissions : {};
    setSession({
      access_token: res.access_token,
      refresh_token: res.refresh_token,
      user: me.user ?? res.user ?? {},
      company: me.company ?? res.company ?? null,
      companies: me.companies ?? res.companies ?? [],
      permissions: safePermissions,
      role_code: me.role_code || res.role_code || "",
      membership: me.membership ?? { default_branch_code: null, allowed_branch_codes: null },
    });
    navigate("/app");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const cleanUser = username.trim();
    if (!cleanUser || !password) {
      setError("Lütfen kullanıcı adı ve şifrenizi girin.");
      return;
    }
    setLoading(true);
    try {
      if (challenge) {
        const res = (await authApi.loginOtp(challenge, otp)) as Tokenish;
        const me = await authApi.me(res.access_token);
        openSession(res, me);
        return;
      }
      const res = (await authApi.login(cleanUser, password)) as Tokenish;
      if (res.otp_required && res.challenge) {
        setChallenge(res.challenge);
        setError("İki adımlı doğrulama kodunu girin.");
        return;
      }
      const me = await authApi.me(res.access_token);
      openSession(res, me);
    } catch (err) {
      useAuthStore.getState().clear();
      setError(err instanceof Error ? err.message : "Giriş başarısız.");
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
          placeholder="Kullanıcı adınızı girin"
        />
        <label className="form-label">Şifre</label>
        <input
          className="form-control"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          placeholder="••••••••"
        />
        {challenge ? (
          <>
            <label className="form-label">Doğrulama kodu</label>
            <input className="form-control" value={otp} onChange={(e) => setOtp(e.target.value)} inputMode="numeric" autoComplete="one-time-code" />
          </>
        ) : null}
        <button className="btn-primary" style={{ width: "100%", marginTop: 12 }} disabled={loading} type="submit">
          {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
        </button>

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
