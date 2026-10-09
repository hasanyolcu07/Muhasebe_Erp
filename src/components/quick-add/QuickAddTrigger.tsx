import type { ReactNode } from "react";

type Props = {
  label?: string;
  onClick: () => void;
  /** inline = label satırında sağda; alone = tek başına (eski) */
  placement?: "inline" | "alone";
  disabled?: boolean;
  className?: string;
};

/** İnce "+ Ekle" — alan hizasını bozmamak için label satırında kullanılır */
export function QuickAddTrigger({
  label = "+ Ekle",
  onClick,
  placement = "inline",
  disabled,
  className,
}: Props) {
  return (
    <button
      type="button"
      className={["btn-add", "quick-add-btn", className].filter(Boolean).join(" ")}
      disabled={disabled}
      onClick={onClick}
      data-placement={placement}
      style={{
        padding: "2px 8px",
        minHeight: 22,
        fontSize: 11,
        whiteSpace: "nowrap",
        flexShrink: 0,
        lineHeight: 1.2,
      }}
    >
      {label}
    </button>
  );
}

/** Label + isteğe bağlı Yeni Ekle — tüm satır girdileri aynı hizada kalsın */
export function FieldLabelRow({
  label,
  htmlFor,
  required,
  action,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  action?: ReactNode;
}) {
  return (
    <div className="field-label-row">
      <label htmlFor={htmlFor} className={required ? "required-label" : undefined}>
        {label}
      </label>
      {action}
    </div>
  );
}
