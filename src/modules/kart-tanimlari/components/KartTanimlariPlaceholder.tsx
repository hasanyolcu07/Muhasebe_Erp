type Props = {
  title: string;
  description: string;
  icon: string;
  badge?: string;
};

export function KartTanimlariPlaceholder({ title, description, icon, badge }: Props) {
  return (
    <div className="card placeholder-card">
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 24 }}>{icon}</span>
        <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>{title}</h3>
        {badge ? (
          <span className="nav-badge" style={{ background: "#10b981", color: "#fff", marginLeft: 4 }}>
            {badge}
          </span>
        ) : null}
      </div>
      <p style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1.6 }}>{description}</p>
      <div
        style={{
          marginTop: 16,
          padding: "10px 14px",
          background: "var(--placeholder-bg)",
          border: "1px dashed var(--border)",
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 600,
          color: "var(--text-muted)",
        }}
      >
        🚧 FAZ 2 · Kart Tanımları menü iskeleti hazır — CRUD ekranları sonraki bölümlerde
      </div>
    </div>
  );
}
