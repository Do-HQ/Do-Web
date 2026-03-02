import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input/50 h-9 w-full min-w-0 rounded-md border bg-transparent px-2.5 py-1 shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-xs file:font-medium font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 text-[12.5px]",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-2",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        "bg-input/10 focus-visible:dark:ring-ring/50",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
