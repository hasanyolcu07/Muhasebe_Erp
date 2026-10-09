export const GIB_STATUS_LABELS: Record<string, string> = {
  BEKLEMEDE: "Beklemede",
  GONDERILDI: "Gönderildi",
  ONAYLANDI: "Onaylandı",
  RED: "Red",
  HATA: "Hata",
  IPTAL: "İptal",
};

export function gibStatusClass(status?: string | null): string {
  const s = (status || "BEKLEMEDE").toUpperCase();
  if (s === "ONAYLANDI") return "badge-green";
  if (s === "GONDERILDI") return "badge-blue";
  if (s === "RED" || s === "HATA") return "badge-red";
  if (s === "IPTAL") return "badge-gray";
  return "badge-yellow";
}

export function GibStatusBadge({ status, label }: { status?: string | null; label?: string | null }) {
  const s = (status || "BEKLEMEDE").toUpperCase();
  const text = label || GIB_STATUS_LABELS[s] || s;
  return <span className={`badge ${gibStatusClass(s)}`}>{text}</span>;
}
