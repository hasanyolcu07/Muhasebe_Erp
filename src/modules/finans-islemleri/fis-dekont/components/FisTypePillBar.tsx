import { FIS_TYPES, type FisTypeCode } from "../constants/fisTypes";

type Props = {
  activeType: FisTypeCode;
  onSelect: (code: FisTypeCode) => void;
};

function variantFor(code: FisTypeCode, isCredit?: boolean): string {
  if (code === "VF" || code === "KF") return "blue";
  if (code === "AF" || code === "OF") return "amber";
  return isCredit ? "red" : "green";
}

export function FisTypePillBar({ activeType, onSelect }: Props) {
  return (
    <div className="fis-type-selector-bar">
      {FIS_TYPES.map((t) => {
        const variant = variantFor(t.code, t.isCredit);
        const isActive = activeType === t.code;
        return (
          <button
            key={t.code}
            type="button"
            className={`fis-type-pill action-pill action-pill-${variant}${isActive ? " active" : ""}`}
            id={`pill-${t.code}`}
            onClick={() => onSelect(t.code)}
          >
            {t.icon} {t.pillLabel}
          </button>
        );
      })}
    </div>
  );
}
