import * as React from "react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, value, ...props }, ref) => {
    const isControlled = value !== undefined || props.onChange !== undefined || ('value' in props);
    const resolvedValue = isControlled ? (value ?? "") : value;
    return (
      <textarea
        className={cn(
          "flex min-h-[120px] w-full rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        value={resolvedValue}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
