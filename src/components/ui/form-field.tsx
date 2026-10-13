import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "./label";

type FormFieldProps = {
  label: string;
  htmlFor?: string;
  required?: boolean;
  error?: string | null;
  hint?: string;
  className?: string;
  children: React.ReactNode;
};

/** Label üstte, hata durumu altta */
export function FormField({
  label,
  htmlFor,
  required,
  error,
  hint,
  className,
  children,
}: FormFieldProps) {
  return (
    <div className={cn("ui-form-field", className)}>
      <Label htmlFor={htmlFor} className={cn(required && "after:content-['*'] after:ml-0.5 after:text-destructive")}>
        {label}
      </Label>
      <div className={cn(error && "[&_input]:border-destructive [&_select]:border-destructive [&_textarea]:border-destructive")}>
        {children}
      </div>
      {error ? (
        <p className="ui-form-field-error" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="ui-form-field-hint">{hint}</p>
      ) : null}
    </div>
  );
}
