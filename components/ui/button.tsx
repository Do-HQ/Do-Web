import * as React from "react";
import { Loader } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

interface Props
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  ref?: React.RefObject<HTMLButtonElement | null>;
}

const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-sm text-[13px] font-medium leading-none transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-2 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "border border-destructive/45 bg-destructive/12 text-destructive ring-1 ring-destructive/20 hover:border-destructive/55 hover:bg-destructive/18 focus-visible:ring-destructive/30 dark:border-destructive/45 dark:bg-destructive/18 dark:ring-destructive/25",
        outline:
          "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-foreground underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-3.5 py-1.5 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1 px-3 text-[12.5px] has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-4 text-[13.5px] has-[>svg]:px-3.5",
        icon: "size-8",
        "icon-sm": "size-[1.875rem]",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

const Button = ({
  className,
  variant,
  size,
  loading = false,
  disabled,
  children,
  ref,
  ...props
}: Props) => {
  return (
    <button
      ref={ref}
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(
        buttonVariants({ variant, size, className }),
        "flex items-center gap-1.5",
        loading && "cursor-progress",
      )}
      disabled={loading || disabled}
      {...props}
    >
      {loading ? <Loader className="mr-1 h-4 w-4 animate-spin" /> : children}
    </button>
  );
};

Button.displayName = "Button";

export { Button, buttonVariants };
