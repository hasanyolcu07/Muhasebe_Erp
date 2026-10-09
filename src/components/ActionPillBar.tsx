export type ActionPill = {
  id: string;
  label: string;
  icon?: string;
  variant?: "default" | "green" | "red" | "blue" | "amber" | "orange";
  onClick: () => void;
};

type Props = {
  pills: ActionPill[];
  activeId?: string | null;
  className?: string;
};

/** Fiş türü pill stilinde işlem butonları */
export function ActionPillBar({ pills, activeId = null, className = "" }: Props) {
  return (
    <div className={`fis-type-selector-bar action-pill-bar ${className}`.trim()} role="toolbar">
      {pills.map((pill) => {
        const isActive = activeId === pill.id;
        return (
          <button
            key={pill.id}
            type="button"
            className={`fis-type-pill action-pill action-pill-${pill.variant ?? "default"}${isActive ? " active" : ""}`}
            onClick={pill.onClick}
            aria-pressed={isActive}
            aria-current={isActive ? "true" : undefined}
          >
            {pill.icon ? `${pill.icon} ` : ""}
            {pill.label}
          </button>
        );
      })}
    </div>
  );
}
