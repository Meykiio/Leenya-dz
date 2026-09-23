/** @description Branded loading screen — blue logomark with a pulsing queue of dots. Used while page chunks load and between route transitions. */
export default function LoadingScreen({ fullScreen = true }: { fullScreen?: boolean }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={fullScreen ? "min-h-screen flex items-center justify-center bg-[var(--bg-base)]" : "flex items-center justify-center h-64"}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-[8px] bg-primary font-mono text-[17px] font-medium tracking-[-0.04em] text-primary-foreground shadow-sm">
          Ln
        </div>
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-[var(--border-strong)] animate-pulse"
              style={{ animationDelay: `${i * 180}ms`, animationDuration: "900ms" }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
