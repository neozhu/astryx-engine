import type { ForecastDomainKey, StructuredForecastViewModel } from "@/lib/ai-reading";

const prioritizedDomains: Array<{ key: ForecastDomainKey; label: string }> = [
  { key: "career", label: "事业" },
  { key: "finance", label: "财务" },
];

export function ReadingForecastPanel({
  forecast,
}: {
  forecast: StructuredForecastViewModel;
}) {
  return (
    <section className="space-y-4">
      <p className="text-xs uppercase tracking-[0.22em] text-accent">
        未来一年
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {prioritizedDomains.map(({ key, label }) => {
          const domain = forecast.yearAhead[key];
          const turningPoint =
            domain.timingNotes[0] ?? "这一年会在中段出现一次明显的节奏变化。";
          const opportunity =
            domain.opportunities[0] ?? "有一个值得稳步抓住的机会。";
          const risk =
            domain.risks[0] ?? "要留意短期判断把节奏带偏。";

          return (
            <article
              key={key}
              className="space-y-3 rounded-[1.25rem] bg-background/35 p-4"
            >
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">{label}</p>
                <p className="text-xs uppercase tracking-[0.18em] text-accent">
                  年度主线
                </p>
                <h3 className="font-serif text-xl text-foreground">
                  {domain.theme}
                </h3>
              </div>
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.18em] text-accent">
                  年度判断
                </p>
                <p className="text-sm leading-6 text-foreground/90">
                  {domain.forecast}
                </p>
              </div>
              <div className="space-y-2 border-t border-line/40 pt-3">
                <p className="text-xs uppercase tracking-[0.18em] text-accent">
                  关键转折
                </p>
                <p className="text-sm leading-6 text-muted">{turningPoint}</p>
                <p className="text-xs uppercase tracking-[0.18em] text-accent">
                  启示
                </p>
                <p className="text-sm leading-6 text-muted">{opportunity}</p>
                <p className="text-xs uppercase tracking-[0.18em] text-accent">
                  风险
                </p>
                <p className="text-sm leading-6 text-muted">{risk}</p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
