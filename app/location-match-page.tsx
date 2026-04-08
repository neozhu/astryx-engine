import type { LocationCandidate } from "@/lib/reading";

export function LocationMatchPageContent({
  city,
  country,
  postalCode,
  candidates,
  onReturnToForm,
}: {
  city: string;
  country: string;
  postalCode?: string;
  candidates: LocationCandidate[];
  onReturnToForm: () => void;
}) {
  return (
    <section
      aria-live="polite"
      className="space-y-4 rounded-[1.75rem] border border-line bg-surface-strong p-5 shadow-[var(--shadow)] backdrop-blur-xl sm:rounded-[2rem] sm:p-6"
    >
      <div className="space-y-2">
        <p className="inline-flex rounded-full border border-accent/20 bg-surface px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-accent">
          地点确认
        </p>
        <h2 className="font-serif text-3xl leading-[0.95] font-medium tracking-[-0.03em] text-foreground sm:text-4xl">
          确认出生地
        </h2>
        <p className="max-w-2xl text-base leading-7 text-muted sm:text-lg sm:leading-8">
          {postalCode
            ? `这个邮编 ${postalCode} 对应多个中国地点。请在锁定星盘前先确认出生地，避免把错误的城市和时区带入解读。`
            : `我们找到了多个可能的出生地：${city}，${country}。请先确认地点，再继续生成解读。`}
        </p>
      </div>

      <div className="grid gap-3">
        {candidates.map((candidate) => (
          <div
            key={candidate.label}
            className="rounded-[1.4rem] border border-line bg-background/65 px-4 py-4 text-sm leading-7 text-foreground"
          >
            {candidate.label}
          </div>
        ))}
      </div>

      <div>
        <button
          type="button"
          onClick={onReturnToForm}
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-line bg-background/70 px-5 py-3 text-sm font-semibold text-foreground transition hover:border-accent/40 hover:bg-background"
        >
          返回表单
        </button>
      </div>
    </section>
  );
}
