import { formatMoney } from "../constants/invoiceTypes";

type Props = {
  subtotal: number;
  discountTotal: number;
  taxByRate: Record<string, number>;
  taxTotal: number;
  tevkifat: number;
  grandTotal: number;
};

export function FaturaTotalsPanel({
  subtotal,
  discountTotal,
  taxByRate,
  taxTotal,
  tevkifat,
  grandTotal,
}: Props) {
  return (
    <div
      style={{
        background: "#f8fafc",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: 18,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13.5 }}>
        <span>Ara Toplam:</span>
        <strong>{formatMoney(subtotal)}</strong>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13.5, color: "#ef4444" }}>
        <span>İskonto Toplamı:</span>
        <strong>- {formatMoney(discountTotal)}</strong>
      </div>
      {Object.entries(taxByRate).map(([rate, amt]) => (
        <div
          key={rate}
          style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13.5, color: "#2563eb" }}
        >
          <span>KDV (%{rate}):</span>
          <strong>{formatMoney(amt)}</strong>
        </div>
      ))}
      {tevkifat > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13.5, color: "#f59e0b" }}>
          <span>Tevkifat:</span>
          <strong>- {formatMoney(tevkifat)}</strong>
        </div>
      )}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          paddingTop: 12,
          borderTop: "2px dashed #cbd5e1",
          fontSize: 18,
          fontWeight: 800,
          color: "#1e3a8a",
        }}
      >
        <span>GENEL TOPLAM:</span>
        <strong>{formatMoney(grandTotal)}</strong>
      </div>
      <div style={{ marginTop: 8, fontSize: 11, color: "var(--text-muted)" }}>
        KDV toplam: {formatMoney(taxTotal)}
      </div>
    </div>
  );
}
