import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 transition-all duration-200 ease-in-out",
  {
    variants: {
      variant: {
        default:
          "text-[var(--color-text-inverse)] rounded-[var(--radius-pill)] shadow-[var(--shadow-sm)]" +
          " bg-[var(--color-cta-primary)] hover:bg-[var(--color-cta-primary-hover)]",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-[var(--radius-pill)]",
        outline:
          "bg-[var(--color-bg-surface-soft)] text-[var(--color-text-primary)] border border-[var(--color-border-soft)] rounded-[var(--radius-pill)]" +
          " hover:bg-[var(--color-bg-surface-muted)]",
        secondary:
          "bg-[var(--color-bg-surface-soft)] text-[var(--color-text-primary)] border border-[var(--color-border-soft)] rounded-[var(--radius-pill)]" +
          " hover:bg-[var(--color-bg-surface-muted)]",
        ghost:
          "bg-transparent text-[var(--color-text-secondary)] rounded-[var(--radius-md)]" +
          " hover:bg-[var(--color-bg-surface-soft)]",
        link: "text-primary underline-offset-4 hover:underline",
        hero:
          "text-[var(--color-text-inverse)] rounded-[var(--radius-pill)] shadow-[var(--shadow-sm)]" +
          " bg-[var(--color-cta-primary)] hover:bg-[var(--color-cta-primary-hover)] hover:shadow-[var(--shadow-md)] hover:scale-[1.02] active:scale-[0.98]",
      },
      size: {
        default: "h-10 px-[var(--space-6)] py-[var(--space-3)]",
        sm: "h-9 px-3",
        lg: "h-12 px-8 text-base",
        xl: "h-14 px-10 text-lg",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
