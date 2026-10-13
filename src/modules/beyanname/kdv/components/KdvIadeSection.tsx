import { useState } from "react";
import { BeyannameLayout } from "../../components/BeyannameLayout";

const KDV_IADE_MENU = [
  { id: "indirilecek", label: "İndirilecek KDV Listesi" },
  { id: "gcb", label: "Satış Fatura ve GÇB Listesi" },
  { id: "yuklenilen", label: "Yüklenilen KDV Listesi" },
  { id: "export", label: "GİB KDVİRA Excel İndir" },
];

export function KdvIadeSection() {
  const [activeMenu, setActiveMenu] = useState("indirilecek");

  return (
    <BeyannameLayout
      items={KDV_IADE_MENU}
      activeId={activeMenu}
      onChange={setActiveMenu}
      title="KDV İadesi Listeleri (GİB KDVİRA)"
    >
      <div className="card" style={{ padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
          <div>
            <h4 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700 }}>
              {activeMenu === "indirilecek"
                ? "📑 İndirilecek KDV Listesi (KDV İadesi)"
                : activeMenu === "gcb"
                  ? "🚢 Satış Fatura ve Gümrük Çıkış Beyannamesi (GÇB) Listesi"
                  : activeMenu === "yuklenilen"
                    ? "⚖️ Yüklenilen KDV Hesap Tablosu"
                    : "📤 GİB KDVİRA Standart Excel / XML Dışa Aktar"}
            </h4>
            <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted, #64748b)" }}>
              Gelir İdaresi Başkanlığı KDV İade Talebi sistemi (KDVİRA) standart formatında otomatik veri listesi.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="btn-top"
              style={{ background: "#059669", color: "#fff" }}
              onClick={() => alert("Faturalardan KDV İadesi listesi otomatik güncellendi.")}
            >
              🔄 Faturalardan Çek
            </button>
            <button
              type="button"
              className="btn-top"
              style={{ background: "#2563eb", color: "#fff" }}
              onClick={() => alert("GİB KDVİRA formatına uygun Excel dosyası indirildi.")}
            >
              📥 Excel İndir (.xlsx)
            </button>
          </div>
        </div>

        {activeMenu === "indirilecek" ? (
          <div style={{ overflowX: "auto" }}>
            <table className="fatura-table" style={{ width: "100%", fontSize: 12 }}>
              <thead>
                <tr>
                  <th>Sıra</th>
                  <th>Alış Fatura Tarihi</th>
                  <th>Fatura Seri/Sıra No</th>
                  <th>Satıcı VKN/TCKN</th>
                  <th>Satıcı Adı / Ünvanı</th>
                  <th>Mal / Hizmet Cinsi</th>
                  <th>Miktar</th>
                  <th style={{ textAlign: "right" }}>KDV Hariç Tutar</th>
                  <th>KDV %</th>
                  <th style={{ textAlign: "right" }}>KDV Tutarı</th>
                  <th style={{ textAlign: "right" }}>İadeye Konu KDV</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>1</td>
                  <td>04.09.2026</td>
                  <td>GIB2026000000412</td>
                  <td>1234567890</td>
                  <td>Anadolu Hammadde Sanayi A.Ş.</td>
                  <td>Sanayi Hammaddesi (Tip-A)</td>
                  <td>500 KG</td>
                  <td style={{ textAlign: "right" }}>150.000,00 ₺</td>
                  <td>%20</td>
                  <td style={{ textAlign: "right" }}>30.000,00 ₺</td>
                  <td style={{ textAlign: "right", fontWeight: 700, color: "#059669" }}>30.000,00 ₺</td>
                </tr>
                <tr>
                  <td>2</td>
                  <td>12.09.2026</td>
                  <td>GIB2026000000889</td>
                  <td>9876543210</td>
                  <td>Ege Ambalaj ve Lojistik Ltd.</td>
                  <td>İhracat Koli ve Paletleri</td>
                  <td>1.200 Adet</td>
                  <td style={{ textAlign: "right" }}>45.000,00 ₺</td>
                  <td>%20</td>
                  <td style={{ textAlign: "right" }}>9.000,00 ₺</td>
                  <td style={{ textAlign: "right", fontWeight: 700, color: "#059669" }}>9.000,00 ₺</td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : activeMenu === "gcb" ? (
          <div style={{ overflowX: "auto" }}>
            <table className="fatura-table" style={{ width: "100%", fontSize: 12 }}>
              <thead>
                <tr>
                  <th>Sıra</th>
                  <th>GÇB Tescil No</th>
                  <th>GÇB Tescil Tarihi</th>
                  <th>Fiili İhraç Tarihi</th>
                  <th>Gümrük Kapısı</th>
                  <th>Satış Fatura No</th>
                  <th>Alıcı Ülke / Firma</th>
                  <th style={{ textAlign: "right" }}>Döviz Tutarı</th>
                  <th style={{ textAlign: "right" }}>TL Matrah</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>1</td>
                  <td>26340000EX004182</td>
                  <td>15.09.2026</td>
                  <td>18.09.2026</td>
                  <td>Muratbey Gümrük Md.</td>
                  <td>TAB2026000000015</td>
                  <td>Almanya / Global Trade GmbH</td>
                  <td style={{ textAlign: "right" }}>18.500,00 €</td>
                  <td style={{ textAlign: "right", fontWeight: 700 }}>740.000,00 ₺</td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: 24, textAlign: "center", color: "#64748b" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
            <strong>Dönem İçi KDV İade ve Mahsup Talebi Özeti</strong>
            <p style={{ fontSize: 13, marginTop: 4 }}>
              Yüklenilen KDV listesi ve GİB KDVİRA paketleme şablonu indirilmeye hazır.
            </p>
          </div>
        )}
      </div>
    </BeyannameLayout>
  );
}
