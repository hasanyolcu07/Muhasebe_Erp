import type { ReactNode } from "react";

type FieldProps = {
  label: string;
  children: ReactNode;
  hint?: string;
};

export function AyarField({ label, children, hint }: FieldProps) {
  return (
    <>
      <div className="ayar-form-row">
        <label>{label}</label>
        <div className="field-wrap">{children}</div>
      </div>
      {hint ? <div className="ayar-hint">ℹ️ {hint}</div> : null}
    </>
  );
}

type CollapseProps = {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
};

export function AyarCollapse({ title, open, onToggle, children }: CollapseProps) {
  return (
    <div className="ayar-collapse">
      <div className="ayar-collapse-head" onClick={onToggle} role="button" tabIndex={0} onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onToggle();
      }}>
        <span>{title}</span>
        <span>{open ? "▲" : "▼"}</span>
      </div>
      {open ? <div className="ayar-collapse-body">{children}</div> : null}
    </div>
  );
}
