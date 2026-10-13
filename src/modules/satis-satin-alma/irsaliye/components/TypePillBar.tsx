import { waybillTypeDefsForSide, type DocumentSide } from "../../constants/documentContext";
import type { WaybillTypeCode } from "../constants/dispatchTypes";

type Props = {
  activeType: WaybillTypeCode;
  onSelect: (code: WaybillTypeCode) => void;
  side: DocumentSide;
};

export function TypePillBar({ activeType, onSelect, side }: Props) {
  const types = waybillTypeDefsForSide(side);
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
