import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  sticky?: boolean;
  className?: string;
};

/** Form altı VAZGEÇ / KAYDET buton çubuğu */
export function FormActionFooter({ children, sticky = true, className = "" }: Props) {
  return (
    <div className={`form-action-footer${sticky ? " form-action-footer-sticky" : ""} ${className}`.trim()}>
      <div className="form-action-footer-inner">{children}</div>
    </div>
  );
}
