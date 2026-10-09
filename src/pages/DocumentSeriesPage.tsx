import { useEffect, useState } from "react";
import { documentSeriesApi, type DocumentSeriesItem } from "@/services/documentSeriesApi";
import { StatusBadge } from "@/components/ui";

/** Ayarlar / Tanımlar — Fiş No serileri (tüm kategoriler özeti). */
export function DocumentSeriesPage() {
  const [items, setItems] = useState<DocumentSeriesItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    documentSeriesApi
      .list()
      .then((res) => setItems(res.items ?? []))
      .catch((e) => setError(e instanceof Error ? e.message : "Liste alınamadı"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div className="header-bar">
        <div className="header-breadcrumb">Ayarlar / Program Ayarları / Fiş No Serileri</div>
      </div>

      <div className="fis-box" style={{ marginBottom: 16 }}>
        <div className="fis-box-title">
          <span>🔢 Belge Serisi Tanımları</span>
          <span className="badge badge-blue">Gap-fill · GIB kilit</span>
        </div>
        <p style={{ fontSize: 13, color: "#475569", margin: "0 0 12px" }}>
          Yönetim: <strong>Ayarlar → Program Ayarları</strong> altında ilgili seri panelleri
          (E-Fatura, E-İrsaliye, Sipariş, Teklif…). Silinen belge numaraları bir sonraki kayıtta
          yeniden kullanılır.
        </p>
        {error ? (
          <div className="alert alert-error">{error}</div>
        ) : loading ? (
          <p>Yükleniyor…</p>
        ) : (
          <table className="data-table" style={{ width: "100%", fontSize: 13 }}>
            <thead>
              <tr>
                <th>Kod</th>
                <th>Ad</th>
                <th>Kategori</th>
                <th>Format</th>
                <th>Son No</th>
                <th>Aktif</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id}>
                  <td>{row.code}</td>
                  <td>{row.name}</td>
                  <td>{row.category || "—"}</td>
                  <td>
                    <StatusBadge
                      status={row.format_kind === "GIB" ? "gib_hazir" : "aktif"}
                      label={row.format_kind || "SISTEM"}
                    />
                  </td>
                  <td style={{ fontFamily: "ui-monospace, monospace" }}>
                    {row.last_formatted || "—"}
                  </td>
                  <td>
                    <StatusBadge status={row.is_active ? "aktif" : "pasif"} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
