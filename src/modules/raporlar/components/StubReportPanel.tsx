import { useState } from "react";

type Props = {
  title: string;
  groupLabel: string;
};

export function StubReportPanel({ title, groupLabel }: Props) {
  const [dateFrom, setDateFrom] = useState("2026-01-01");
  const [dateTo, setDateTo] = useState("2026-12-31");
  const [search, setSearch] = useState("");

  const sampleRows = [
    { id: 1, code: "TR-2026-001", name: "Anadolu Sanayi Grubu", category: "Yurtiçi", qty: 45, amount: 285000.0, status: "Aktif", date: "2026-09-15" },
    { id: 2, code: "TR-2026-002", name: "Marmara Dış Ticaret A.Ş.", category: "İhracat", qty: 120, amount: 940000.0, status: "Tamamlandı", date: "2026-09-18" },
    { id: 3, code: "TR-2026-003", name: "Ege Lojistik & Depolama", category: "Yurtiçi", qty: 80, amount: 154000.0, status: "İşlemde", date: "2026-09-22" },
    { id: 4, code: "TR-2026-004", name: "Balkan Global Trade", category: "İhracat", qty: 65, amount: 512000.0, status: "Onaylandı", date: "2026-09-28" },
    { id: 5, code: "TR-2026-005", name: "İç Anadolu Dağıtım Ltd.", category: "Toptan", qty: 210, amount: 670000.0, status: "Aktif", date: "2026-10-01" },
  ];

  const totalAmount = sampleRows.reduce((acc, r) => acc + r.amount, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{title}</h2>
          <span style={{ fontSize: 13, color: "var(--text-muted, #64748b)" }}>{groupLabel} kategorisi analitik raporu</span>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="btn-top" style={{ background: "#059669", color: "#fff" }} onClick={() => alert("Excel dosyası dışa aktarıldı.")}>
            📊 Excel İndir (.xlsx)
          </button>
          <button type="button" className="btn-top" style={{ background: "#dc2626", color: "#fff" }} onClick={() => alert("PDF raporu oluşturuldu.")}>
            📄 PDF İndir
          </button>
          <button type="button" className="btn-top" onClick={() => window.print()}>
            🖨️ Yazdır
          </button>
        </div>
      </div>

      {/* Filtre Çubuğu */}
      <div className="card" style={{ padding: 12, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", background: "var(--card-bg, #ffffff)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
          <label style={{ fontWeight: 600 }}>Tarih:</label>
          <input type="date" className="form-control" style={{ width: 140, padding: "4px 8px" }} value={dateFrom ?? ""} onChange={(e) => setDateFrom(e.target.value)} />
          <span>-</span>
          <input type="date" className="form-control" style={{ width: 140, padding: "4px 8px" }} value={dateTo ?? ""} onChange={(e) => setDateTo(e.target.value)} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 200 }}>
          <input
            type="text"
            className="form-control"
            style={{ width: "100%", padding: "5px 10px" }}
            placeholder="Kayıt kodu, cari veya açıklama ara..."
            value={search ?? ""}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button type="button" className="btn-primary" style={{ padding: "5px 16px" }} onClick={() => alert("Rapor verileri filtrelendi.")}>
          Filtrele
        </button>
      </div>

      {/* Özet Kartları */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        <div className="card" style={{ padding: 14 }}>
          <div style={{ fontSize: 12, color: "var(--text-muted, #64748b)" }}>Toplam Tutar</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "var(--primary-color, #2563eb)", marginTop: 4 }}>
            {totalAmount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺
          </div>
        </div>
        <div className="card" style={{ padding: 14 }}>
          <div style={{ fontSize: 12, color: "var(--text-muted, #64748b)" }}>Kayıt Sayısı</div>
          <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>{sampleRows.length} Adet</div>
        </div>
        <div className="card" style={{ padding: 14 }}>
          <div style={{ fontSize: 12, color: "var(--text-muted, #64748b)" }}>Ortalama İşlem Tutarı</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#059669", marginTop: 4 }}>
            {(totalAmount / sampleRows.length).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺
          </div>
        </div>
      </div>

      {/* Rapor Tablosu */}
      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table className="fatura-table" style={{ width: "100%", fontSize: 13 }}>
          <thead>
            <tr>
              <th>#</th>
              <th>Referans Kodu</th>
              <th>Açıklama / Cari / Hesap</th>
              <th>Kategori / Tür</th>
              <th>İşlem Tarihi</th>
              <th style={{ textAlign: "right" }}>Miktar</th>
              <th style={{ textAlign: "right" }}>Tutar (TL)</th>
              <th>Durum</th>
            </tr>
          </thead>
          <tbody>
            {sampleRows.map((r, i) => (
              <tr key={r.id}>
                <td>{i + 1}</td>
                <td><strong>{r.code}</strong></td>
                <td>{r.name}</td>
                <td><span className="badge badge-amber">{r.category}</span></td>
                <td>{r.date}</td>
                <td style={{ textAlign: "right" }}>{r.qty}</td>
                <td style={{ textAlign: "right", fontWeight: 700 }}>
                  {r.amount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺
                </td>
                <td><span className="badge badge-primary">{r.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
