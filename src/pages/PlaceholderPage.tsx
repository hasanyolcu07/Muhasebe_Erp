type Props = { moduleId: string; title?: string };

export function PlaceholderPage({ moduleId, title }: Props) {
  return (
    <div className="card placeholder-card">
      <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>
        {title || moduleId} — Yakında
      </h3>
      <p style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1.6 }}>
        <strong>{moduleId}</strong> modülü FAZ 1 layout iskeletinde hazır. İşlevsel ekranlar sonraki
        fazlarda bağlanacak. Global Şube ve GR-R (Resmi / Gayri Resmi) seçicileri topbar&apos;da
        aktiftir.
      </p>
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
        🚧 Bu bölüm yakında · FAZ 2
      </div>
    </div>
  );
}
