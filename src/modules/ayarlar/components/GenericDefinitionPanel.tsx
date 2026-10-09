import { AyarField } from "./AyarFormBits";
import type { AyarlarPanel } from "../config/ayarlarHubConfig";

/** Genel tanım formu iskeleti — liste + alanlar */
export function GenericDefinitionPanel({ panel }: { panel: AyarlarPanel }) {
  return (
    <div className="ayar-form-card">
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14, gap: 12 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>{panel.title}</h3>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "#64748b" }}>{panel.description}</p>
        </div>
        <button type="button" className="btn-save">+ Yeni</button>
      </div>

      {panel.formatHint ? (
        <div
          style={{
            marginBottom: 14,
            padding: "10px 14px",
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            fontSize: 13,
            fontFamily: "ui-monospace, monospace",
          }}
        >
          Format: <strong>{panel.formatHint}</strong>
        </div>
      ) : null}

      <div className="gg-grid-2col" style={{ marginBottom: 16 }}>
        <div>
          <AyarField label="Kod">
            <input className="form-control" />
          </AyarField>
          <AyarField label="Ad">
            <input className="form-control" />
          </AyarField>
          <AyarField label="Açıklama">
            <input className="form-control" />
          </AyarField>
        </div>
        <div>
          <AyarField label="Şube">
            <select className="form-control" defaultValue="">
              <option value="">Tümü / Topbar</option>
            </select>
          </AyarField>
          <AyarField label="Kayıt Türü (GR-R)">
            <select className="form-control" defaultValue="">
              <option value="">Tümü / Topbar</option>
              <option value="1">Resmi</option>
              <option value="2">Gayri Resmi</option>
            </select>
          </AyarField>
          <AyarField label="Aktif">
            <input type="checkbox" defaultChecked />
          </AyarField>
        </div>
      </div>

      {panel.id.includes("fis-no") || panel.id.includes("e-fatura") || panel.id.includes("e-irsaliye") || panel.id.includes("yevmiye") ? (
        <div className="gg-grid-2col" style={{ marginBottom: 16 }}>
          <AyarField label="Seri (3 Hane)">
            <input className="form-control" maxLength={3} placeholder="ABC" />
          </AyarField>
          <AyarField label="Yıl (4 Hane)">
            <input className="form-control" maxLength={4} placeholder="2026" />
          </AyarField>
          <AyarField label="Numara (9 Hane)">
            <input className="form-control" maxLength={9} placeholder="000000001" />
          </AyarField>
          <AyarField label="Önizleme">
            <input className="form-control" readOnly placeholder="SSSYYYYNNNNNNNNN" />
          </AyarField>
        </div>
      ) : null}

      <table className="data-table" style={{ width: "100%", fontSize: 13 }}>
        <thead>
          <tr>
            <th>Kod</th>
            <th>Ad</th>
            <th>Durum</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colSpan={4} style={{ textAlign: "center", color: "#94a3b8", padding: 18 }}>
              Kayıt listesi — API bağlantısı sonraki adımda.
            </td>
          </tr>
        </tbody>
      </table>

      <div className="ayar-form-actions">
        <button type="button" className="btn-save">Kaydet</button>
      </div>
    </div>
  );
}
