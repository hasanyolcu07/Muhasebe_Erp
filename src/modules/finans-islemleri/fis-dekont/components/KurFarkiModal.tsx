import { useState } from "react";
import type { UseFormSetValue } from "react-hook-form";
import { buildBalancedLinesForType, type FisDekontFormValues } from "../schemas/fisDekontSchema";
import type { FisTypeCode } from "../constants/fisTypes";

type Props = {
  open: boolean;
  onClose: () => void;
  voucherType: FisTypeCode;
  setValue: UseFormSetValue<FisDekontFormValues>;
  defaultAccountId?: number | null;
};

export function KurFarkiModal({ open, onClose, voucherType, setValue, defaultAccountId }: Props) {
  const [accountCode, setAccountCode] = useState("");
  const [rate, setRate] = useState("33.5000");
  const [amount, setAmount] = useState("1250.00");

  if (!open) return null;

  function apply() {
    const amt = parseFloat(amount) || 0;
    const lines = buildBalancedLinesForType(voucherType, amt, defaultAccountId ?? null, false);
    lines[0].description = accountCode ? `KUR FARKI — ${accountCode}` : "KUR FARKI HESAPLAMASI";
    setValue("lines", lines, { shouldDirty: true });
    setValue(
      "type_specific",
      { kur: parseFloat(rate), cari_kod: accountCode, hesaplanan_tutar: amt },
      { shouldDirty: true }
    );
    setValue("description", "Kur farkı fişi — otomatik hesaplama", { shouldDirty: true });
    onClose();
  }

  return (
    <div className="modal-overlay show" role="dialog" aria-modal="true">
      <div className="modal-content" style={{ width: 550 }}>
        <div className="modal-header">
          <span>💱 Kur Farkı Hesaplama Parametreleri</span>
          <button type="button" style={{ background: "none", border: "none", color: "#fff", fontSize: 18, cursor: "pointer" }} onClick={onClose}>
            ✖
          </button>
        </div>
        <div className="modal-body">
          <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 12, alignItems: "center" }}>
            <label style={{ fontWeight: 700 }}>Cari Kart Kodu</label>
            <input className="form-control" value={accountCode} onChange={(e) => setAccountCode(e.target.value)} />
            <label style={{ fontWeight: 700 }}>Döviz Kuru</label>
            <input type="number" className="form-control" value={rate} onChange={(e) => setRate(e.target.value)} step="0.0001" />
            <label style={{ fontWeight: 700 }}>Hesaplanan Tutar (₺)</label>
            <input type="number" className="form-control" value={amount} onChange={(e) => setAmount(e.target.value)} step="0.01" />
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn-cancel" onClick={onClose}>
            Vazgeç
          </button>
          <button type="button" className="btn-save" style={{ background: "#f59e0b", color: "#000" }} onClick={apply}>
            💾 Hesapla ve Kalemlere Aktar
          </button>
        </div>
      </div>
    </div>
  );
}
