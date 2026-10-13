import { FormEvent, useEffect, useState } from "react";
import { api } from "../services/api";

type SessionRow = { id: string; createdAt: string; expiresAt: string; ipAdresi?: string | null; userAgent?: string | null };

export function AccountSecurityPage() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [secret, setSecret] = useState("");
  const [sessions, setSessions] = useState<SessionRow[]>([]);

  async function loadSessions() {
    const res = await api<{ items: SessionRow[] }>("/auth/sessions");
    setSessions(res.items || []);
  }

  useEffect(() => {
    loadSessions().catch((err) => setError(err instanceof Error ? err.message : "Oturumlar okunamadı"));
  }, []);

  async function onPassword(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      await api("/auth/password", { method: "POST", body: { current_password: currentPassword, new_password: newPassword } });
      setMessage("Şifre güncellendi. Yeniden giriş yapın.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Şifre güncellenemedi");
    }
  }

  async function startTotp() {
    setError("");
    const res = await api<{ secret: string; otpauth_url: string }>("/auth/2fa/setup", { method: "POST" });
    setSecret(`${res.secret}\n${res.otpauth_url}`);
  }

  async function enableTotp(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api("/auth/2fa/enable", { method: "POST", body: { otp } });
      setMessage("İki adımlı doğrulama açıldı.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kod doğrulanamadı");
    }
  }

  return (
    <div className="card" style={{ maxWidth: 720, display: "grid", gap: 16 }}>
      <h2>Hesap güvenliği</h2>
      {message ? <div className="alert-ok">{message}</div> : null}
      {error ? <div className="alert-error">{error}</div> : null}
      <form onSubmit={onPassword} style={{ display: "grid", gap: 8 }}>
        <strong>Şifre değiştir</strong>
        <input className="form-control" type="password" placeholder="Mevcut şifre" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
        <input className="form-control" type="password" placeholder="Yeni şifre (10+, büyük, küçük, rakam, özel)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        <button className="btn-primary" type="submit">Şifreyi güncelle</button>
      </form>
      <form onSubmit={enableTotp} style={{ display: "grid", gap: 8 }}>
        <strong>İki adımlı doğrulama</strong>
        <button className="btn-secondary" type="button" onClick={() => startTotp().catch((err) => setError(err.message))}>
          Kurulumu başlat
        </button>
        {secret ? <pre style={{ whiteSpace: "pre-wrap" }}>{secret}</pre> : null}
        <input className="form-control" placeholder="6 haneli kod" value={otp} onChange={(e) => setOtp(e.target.value)} />
        <button className="btn-primary" type="submit">Doğrulamayı aç</button>
      </form>
      <div>
        <strong>Açık oturumlar</strong>
        <ul>
          {sessions.map((s) => (
            <li key={s.id}>
              {new Date(s.createdAt).toLocaleString("tr-TR")} · {s.ipAdresi || "ip yok"}
              <button
                type="button"
                className="btn-secondary"
                style={{ marginLeft: 8 }}
                onClick={() => api(`/auth/sessions/${s.id}`, { method: "DELETE" }).then(loadSessions)}
              >
                Kapat
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
