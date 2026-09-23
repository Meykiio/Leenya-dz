import type { ReactNode } from "react";

interface SectionProps {
  title: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** @description Dashboard section — a flat ledger line (title + hairline) instead of a boxed card. */
export default function Section({ title, action, children, className }: SectionProps) {
  return (
    <section className={`space-y-3 ${className ?? ""}`}>
      <div className="flex items-center justify-between gap-3 border-b border-[var(--border-default)] pb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          {typeof title === "string" ? (
            <h3 className="font-display text-[15px] font-bold text-[var(--text-primary)] tracking-[-0.015em] truncate">{title}</h3>
          ) : (
            title
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
