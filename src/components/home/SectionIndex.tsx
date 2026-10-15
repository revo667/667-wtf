export function SectionIndex({
  labels,
  active,
  onSelect,
}: {
  labels: string[];
  active: number;
  onSelect: (index: number) => void;
}) {
  return (
    <nav
      aria-label="Sections"
      className="fixed top-1/2 right-6 z-40 hidden -translate-y-1/2 animate-fade-in-up sm:block"
    >
      <ol className="flex flex-col items-end gap-3">
        {labels.map((label, i) => {
          const on = i === active;
          return (
            <li key={label}>
              <button
                type="button"
                onClick={() => onSelect(i)}
                aria-current={on ? "true" : undefined}
                className="group flex items-center gap-3 py-1 outline-none"
              >
                <span
                  className={`hidden font-mono text-[10px] tracking-[0.25em] uppercase transition-all duration-500 sm:block ${
                    on
                      ? "translate-x-0 text-foreground"
                      : "translate-x-1 text-muted-foreground/0 group-hover:translate-x-0 group-hover:text-muted-foreground group-focus-visible:text-muted-foreground"
                  }`}
                >
                  {label}
                </span>
                <span
                  className={`block h-px transition-all duration-500 group-focus-visible:bg-accent ${
                    on
                      ? "w-10 bg-accent shadow-[0_0_8px_var(--accent)]"
                      : "w-5 bg-muted-foreground/40 group-hover:w-7 group-hover:bg-muted-foreground"
                  }`}
                />
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
