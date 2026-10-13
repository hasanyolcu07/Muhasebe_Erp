import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="card" style={{ padding: 24, maxWidth: 560 }}>
      <h2 style={{ marginTop: 0 }}>Sayfa bulunamadı</h2>
      <p>Bu adres menüde yok. Eski bir bağlantıysa sol menüden ilgili bölüme gidin.</p>
      <Link to="/app/dashboard">Panele dön</Link>
    </div>
  );
}
