import * as React from "react";

import { cn } from "@/lib/utils";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[92px] w-full rounded-[5px] border border-input bg-background px-3 py-2.5 text-[16px] sm:text-[14px] text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-[var(--accent-light)] disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-[var(--error)] aria-[invalid=true]:ring-[length:3px] aria-[invalid=true]:ring-[var(--error-bg)]",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
