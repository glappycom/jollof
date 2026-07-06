import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-sm text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cursor-border disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-orange text-black hover:bg-orange/90",
        secondary: "bg-cursor-hover text-cursor-text hover:bg-cursor-border",
        ghost: "bg-transparent text-cursor-text hover:bg-cursor-hover",
      },
      size: {
        default: "h-8 px-3 py-1.5",
        sm: "h-7 px-2.5",
        icon: "h-7 w-7",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
