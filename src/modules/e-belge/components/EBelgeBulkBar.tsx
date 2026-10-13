type Props = {
  selectedCount: number;
  busy?: boolean;
  onSend: () => void;
  onCancel: () => void;
  onDownload: () => void;
  onClear: () => void;
};

export function EBelgeBulkBar({
  selectedCount,
  busy,
  onSend,
  onCancel,
  onDownload,
  onClear,
}: Props) {
  if (selectedCount <= 0) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap",
        padding: "8px 12px",
        marginBottom: 10,
        background: "#eff6ff",
        border: "1px solid #bfdbfe",
        borderRadius: 8,
        fontSize: 13,
      }}
    >
      <strong>{selectedCount} belge seçili</strong>
      <span style={{ color: "#64748b" }}>Toplu:</span>
      <button type="button" className="btn-save" disabled={busy} onClick={onSend}>
        Gönder
      </button>
      <button type="button" className="btn-cancel" disabled={busy} onClick={onCancel}>
        İptal
      </button>
      <button type="button" className="btn-top" disabled={busy} onClick={onDownload}>
        İndir (ZIP)
      </button>
      <button type="button" className="btn-top" disabled={busy} onClick={onClear} style={{ marginLeft: "auto" }}>
        Seçimi temizle
      </button>
    </div>
  );
}
