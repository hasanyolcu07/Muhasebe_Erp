import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, value, ...props }, ref) => {
    // Ensure input value never transitions from defined to undefined
    const isControlled = value !== undefined || props.onChange !== undefined || ('value' in props);
    const resolvedValue = isControlled && type !== "file" ? (value ?? "") : value;
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm text-foreground shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        value={resolvedValue}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
