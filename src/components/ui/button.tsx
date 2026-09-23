import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-[7px] whitespace-nowrap rounded-[5px] font-body text-[13px] font-semibold transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-50 active:scale-[0.96] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "border-0 bg-primary text-primary-foreground hover:-translate-y-px hover:opacity-90 hover:shadow-sm",
        signal: "border-0 bg-signal text-white hover:-translate-y-px hover:opacity-90 hover:shadow-sm",
        destructive: "border border-[var(--error)] bg-[var(--error-bg)] text-[var(--error)] hover:bg-[var(--error)] hover:text-white",
        outline: "border border-primary bg-transparent text-primary hover:-translate-y-px hover:bg-[var(--accent-light)]",
        outlineSignal: "border border-signal bg-transparent text-signal hover:-translate-y-px hover:bg-[var(--signal-dim)]",
        secondary: "border border-input bg-secondary text-secondary-foreground hover:bg-muted",
        ghost: "bg-transparent text-muted-foreground hover:bg-[var(--bg-overlay)] hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-[38px] px-[18px] py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-11 rounded-[5px] px-[18px]",
        icon: "h-[38px] w-[38px]",
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

// eslint-disable-next-line react-refresh/only-export-components
export { Button, buttonVariants };
