import type { PrimaryReadingViewModel } from "@/lib/reading";

export function ReadingPrimaryPanel({
  primary,
}: {
  primary: PrimaryReadingViewModel;
}) {
  return (
    <section className="space-y-4 rounded-[1.75rem] border border-line/80 bg-background/55 p-5 sm:rounded-[2rem]">
      <p className="text-xs uppercase tracking-[0.22em] text-accent">
        核心解读
      </p>
      <h2 className="font-serif text-3xl leading-tight text-foreground">
        {primary.title}
      </h2>
      {primary.chartEvidence.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {primary.chartEvidence.map((item) => (
            <span
              key={item}
              className="rounded-full border border-accent/20 bg-accent/5 px-3 py-1 text-xs tracking-[0.08em] text-accent"
            >
              {item}
            </span>
          ))}
        </div>
      ) : null}
      <p className="text-base leading-8 text-foreground/92">
        {primary.summary}
      </p>
      <ul className="space-y-2 border-t border-line/60 pt-4">
        {primary.highlights.map((item) => (
          <li key={item} className="text-sm leading-6 text-muted">
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
