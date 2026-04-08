import type { ForecastDomainKey, StructuredForecastViewModel } from "@/lib/ai-reading";

const prioritizedDomains: Array<{ key: ForecastDomainKey; label: string }> = [
  { key: "love", label: "感情" },
  { key: "career", label: "事业" },
  { key: "emotion", label: "情绪" },
  { key: "social", label: "社交" },
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
        近期与年度预测
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        {[
          { title: "未来 30-90 天", data: forecast.nearTerm },
          { title: "未来一年", data: forecast.yearAhead },
        ].map((window) => (
          <section
            key={window.title}
            className="rounded-[1.25rem] bg-background/35 p-4"
          >
            <h3 className="font-serif text-xl text-foreground">{window.title}</h3>
            <div className="mt-4 space-y-4">
              {prioritizedDomains.map(({ key, label }, index) => (
                <article
                  key={`${window.title}-${key}`}
                  className={`space-y-1 ${index > 0 ? "border-t border-line/40 pt-3" : ""}`}
                >
                  <p className="text-sm font-semibold text-foreground">{label}</p>
                  <p className="text-sm leading-6 text-foreground/90">
                    {window.data[key].theme}
                  </p>
                  <p className="text-sm leading-6 text-muted">
                    {window.data[key].forecast}
                  </p>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
