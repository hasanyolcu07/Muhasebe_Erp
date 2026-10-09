import { invoiceTypeDefsForSide, type DocumentSide } from "../../constants/documentContext";
import type { InvoiceTypeCode } from "../constants/invoiceTypes";

type Props = {
  activeType: InvoiceTypeCode;
  onSelect: (code: InvoiceTypeCode) => void;
  side: DocumentSide;
};

export function FaturaTypePillBar({ activeType, onSelect, side }: Props) {
  const types = invoiceTypeDefsForSide(side);
  return (
    <div className="fis-type-selector-bar fatura-type-switcher">
      {types.map((t) => (
        <button
          key={t.code}
          type="button"
          className={`fis-type-pill action-pill action-pill-${t.variant}${activeType === t.code ? " active" : ""}`}
          onClick={() => onSelect(t.code)}
        >
          {t.icon} <strong>{t.pillLabel}</strong>
        </button>
      ))}
    </div>
  );
}
