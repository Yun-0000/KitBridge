import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/* Compact workbench buttons with clear keyboard focus and press feedback. */

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap select-none",
    "rounded-[7px] text-[13px] font-medium leading-[20px]",
    "transition-[background-color,border-color,box-shadow,transform] duration-150",
    "focus-visible:outline-none",
    "active:translate-y-px",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        default: [
          "bg-primary text-primary-foreground",

          "hover:bg-primary/90",
          "focus-visible:shadow-[var(--shadow-thumb),0_0_0_1.5px_var(--ring-inverted)]",
        ].join(" "),
        secondary: [
          "bg-card text-foreground",
          "border border-border",
          "hover:bg-secondary",
          "focus-visible:shadow-[inset_0_0_0_1px_var(--ring),var(--shadow-focus-lift)]",
        ].join(" "),
        outline: [
          "border border-border bg-transparent text-foreground",
          "hover:bg-secondary hover:border-foreground/30",
          "focus-visible:border-ring focus-visible:shadow-[var(--shadow-focus-lift)]",
        ].join(" "),
        ghost: [
          "text-muted-foreground",
          "hover:bg-secondary hover:text-foreground",
          "focus-visible:bg-ring/[0.06] focus-visible:shadow-[inset_0_0_0_1px_var(--ring)]",
        ].join(" "),
        destructive: [
          "bg-destructive text-destructive-foreground",

          "hover:bg-destructive/90",
          "focus-visible:shadow-[var(--shadow-thumb),0_0_0_1.5px_var(--ring-inverted)]",
        ].join(" "),
        link: "text-accent-foreground underline-offset-4 hover:underline focus-visible:underline",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-8 rounded-[8px] px-3 text-xs",
        lg: "h-11 px-5",
        icon: "h-10 w-10 px-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
