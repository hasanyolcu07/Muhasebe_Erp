type Props = {
  value: boolean;
  onChange: (v: boolean) => void;
  activeLabel?: string;
  passiveLabel?: string;
  disabled?: boolean;
};

export function AktifPasifToggle({
  value,
  onChange,
  activeLabel = "Aktif",
  passiveLabel = "Pasif",
  disabled = false,
}: Props) {
  return (
    <button
      type="button"
      className={`btn-aktif-pasif status-pill-btn${value ? " is-active" : " is-passive"}`}
      aria-pressed={value}
      disabled={disabled}
      onClick={() => onChange(!value)}
    >
      {value ? activeLabel : passiveLabel}
    </button>
  );
}
