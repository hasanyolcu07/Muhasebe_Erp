type Props = {
  breadcrumb: string;
  title: string;
  description?: string;
  formatHint?: string;
};

/** Ayarlar alt sayfaları — iskelet / yakında ekranı */
export function SettingsStubPage({ breadcrumb, title, description, formatHint }: Props) {
  return (
    <>
      <div className="header-bar">
        <div className="header-breadcrumb">{breadcrumb}</div>
      </div>
      <div className="fis-box">
        <div className="fis-box-title">
          <span>{title}</span>
          <span className="badge badge-blue">Tanım ekranı</span>
        </div>
        {description ? (
          <p style={{ fontSize: 13, color: "#475569", margin: "0 0 12px" }}>{description}</p>
        ) : null}
        {formatHint ? (
          <div
            style={{
              marginBottom: 12,
              padding: "10px 14px",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              fontSize: 13,
              fontFamily: "ui-monospace, monospace",
            }}
          >
            Format: <strong>{formatHint}</strong>
          </div>
        ) : null}
        <div
          style={{
            padding: "10px 14px",
            background: "var(--placeholder-bg, #f1f5f9)",
            border: "1px dashed var(--border, #cbd5e1)",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-muted, #64748b)",
          }}
        >
          🚧 Kayıt / düzenleme formu sonraki adımda bağlanacak · Şube ve GR-R topbar seçicileri aktiftir.
        </div>
      </div>
    </>
  );
}
