export function ReadingUnavailablePageContent({
  message,
  onReturnToForm,
}: {
  message?: string;
  onReturnToForm: () => void;
}) {
  return (
    <section
      aria-live="polite"
      className="space-y-4 rounded-[1.75rem] border border-line bg-surface-strong p-5 shadow-[var(--shadow)] backdrop-blur-xl sm:rounded-[2rem] sm:p-6"
    >
      <p className="inline-flex rounded-full border border-accent/20 bg-surface px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-accent">
        解读暂不可用
      </p>
      <h2 className="font-serif text-3xl leading-[0.95] font-medium tracking-[-0.03em] text-foreground sm:text-4xl">
        暂时无法生成解读
      </h2>
      <p className="max-w-2xl text-base leading-7 text-muted sm:text-lg sm:leading-8">
        {message ??
          "请检查邮编或出生时间后再试一次。当地点解析或星盘准备失败时，Astryx 会直接停下来，而不会假装已经成功定位。"}
      </p>
      <div>
        <button
          type="button"
          onClick={onReturnToForm}
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-line bg-background/70 px-5 py-3 text-sm font-semibold text-foreground transition hover:border-accent/40 hover:bg-background"
        >
          重新生成
        </button>
      </div>
    </section>
  );
}
