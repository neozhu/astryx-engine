"use client";

import { useEffect, useRef, type FormEventHandler } from "react";

import { LocationMatchPageContent } from "@/app/location-match-page";
import { ReadingPageContent } from "@/app/reading-page";
import { ReadingUnavailablePageContent } from "@/app/reading-unavailable-page";
import type {
  FollowUpOption,
  FollowUpTurn,
  ReadingOutcome,
} from "@/lib/reading";

const dateFields = [
  { id: "year", label: "出生年", placeholder: "1996", inputMode: "numeric" },
  { id: "month", label: "出生月", placeholder: "08", inputMode: "numeric" },
  { id: "day", label: "出生日", placeholder: "12", inputMode: "numeric" },
] as const;

const timeFields = [
  { id: "hour", label: "小时", placeholder: "07", inputMode: "numeric" },
  { id: "minute", label: "分钟", placeholder: "30", inputMode: "numeric" },
] as const;

const inputClassName =
  "min-h-12 w-full rounded-[1.25rem] border border-line bg-background/55 px-4 py-3 text-base text-foreground outline-none transition placeholder:text-muted/75 focus:border-accent focus:ring-2 focus:ring-accent/15";

type ReadingStartPageProps = {
  onSubmit: FormEventHandler<HTMLFormElement>;
  isSubmitting: boolean;
  result: ReadingOutcome | null;
  followUpTurns?: FollowUpTurn[];
  isSubmittingFollowUp?: boolean;
  followUpError?: string | null;
  onSelectFollowUp?: (topic: FollowUpOption) => void;
  onSubmitCustomQuestion?: (question: string) => void;
};

function assertNever(value: never): never {
  throw new Error(`Unexpected reading outcome: ${String(value)}`);
}

function ResultPanel({
  result,
  onReturnToForm,
  followUpTurns,
  isSubmittingFollowUp,
  followUpError,
  onSelectFollowUp,
  onSubmitCustomQuestion,
}: {
  result: ReadingOutcome;
  onReturnToForm: () => void;
  followUpTurns: FollowUpTurn[];
  isSubmittingFollowUp: boolean;
  followUpError: string | null;
  onSelectFollowUp: (topic: FollowUpOption) => void;
  onSubmitCustomQuestion: (question: string) => void;
}) {
  switch (result.kind) {
    case "ready":
      return (
        <ReadingPageContent
          result={result}
          followUpTurns={followUpTurns}
          remainingFollowUps={result.remainingFollowUps}
          isSubmittingFollowUp={isSubmittingFollowUp}
          followUpError={followUpError}
          onSelectFollowUp={onSelectFollowUp}
          onSubmitCustomQuestion={onSubmitCustomQuestion}
        />
      );
    case "location-match":
      return (
        <LocationMatchPageContent
          city={result.city}
          country={result.country}
          postalCode={result.postalCode}
          candidates={result.candidates}
          onReturnToForm={onReturnToForm}
        />
      );
    case "reading-unavailable":
      return (
        <ReadingUnavailablePageContent
          message={result.message}
          onReturnToForm={onReturnToForm}
        />
      );
    default:
      return assertNever(result);
  }
}

function ReadingGeneratingPanel() {
  return (
    <section
      aria-live="polite"
      className="space-y-4 rounded-[1.75rem] border border-line bg-surface-strong p-5 shadow-[var(--shadow)] backdrop-blur-xl sm:rounded-[2rem] sm:p-6"
    >
      <div className="space-y-2">
        <p className="inline-flex rounded-full border border-accent/20 bg-surface px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-accent">
          星盘生成中
        </p>
        <h2 className="font-serif text-3xl leading-[0.95] font-medium tracking-[-0.03em] text-foreground sm:text-4xl">
          正在生成你的解读
        </h2>
        <p className="max-w-2xl text-base leading-7 text-muted sm:text-lg sm:leading-8">
          我们正在根据中国邮编定位出生地，锁定时区快照，并整理这次解读所需的星盘事实。
        </p>
      </div>

      <div className="grid gap-3">
        {[
          "锁定出生信息",
          "校准时间精度",
          "整理本次解读",
        ].map((stage, index) => (
          <div
            key={stage}
            className="rounded-[1.4rem] border border-line bg-background/60 px-4 py-4"
          >
            <p className="text-xs uppercase tracking-[0.22em] text-accent-strong">
              步骤 {index + 1}
            </p>
            <p className="mt-2 text-base font-semibold text-foreground">
              {stage}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function InlineStatusPanel({
  isSubmitting,
  result,
  onReturnToForm,
  followUpTurns,
  isSubmittingFollowUp,
  followUpError,
  onSelectFollowUp,
  onSubmitCustomQuestion,
}: {
  isSubmitting: boolean;
  result: ReadingOutcome | null;
  onReturnToForm: () => void;
  followUpTurns: FollowUpTurn[];
  isSubmittingFollowUp: boolean;
  followUpError: string | null;
  onSelectFollowUp: (topic: FollowUpOption) => void;
  onSubmitCustomQuestion: (question: string) => void;
}) {
  if (isSubmitting) {
    return <ReadingGeneratingPanel />;
  }

  if (result) {
    return (
      <ResultPanel
        result={result}
        onReturnToForm={onReturnToForm}
        followUpTurns={followUpTurns}
        isSubmittingFollowUp={isSubmittingFollowUp}
        followUpError={followUpError}
        onSelectFollowUp={onSelectFollowUp}
        onSubmitCustomQuestion={onSubmitCustomQuestion}
      />
    );
  }

  return null;
}

export default function ReadingStartPage({
  onSubmit,
  isSubmitting,
  result,
  followUpTurns = [],
  isSubmittingFollowUp = false,
  followUpError = null,
  onSelectFollowUp = () => undefined,
  onSubmitCustomQuestion = () => undefined,
}: ReadingStartPageProps) {
  const statusPanelRef = useRef<HTMLDivElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  function returnToForm() {
    const form = formRef.current;

    if (typeof form?.scrollIntoView === "function") {
      form.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }

    const postalCodeInput =
      form?.querySelector<HTMLInputElement>("#postalCode, [name='postalCode']") ?? null;

    if (postalCodeInput) {
      postalCodeInput.focus();
      return;
    }

    form?.focus();
  }

  useEffect(() => {
    if (!isSubmitting && !result) {
      return;
    }

    if (typeof statusPanelRef.current?.scrollIntoView !== "function") {
      return;
    }

    statusPanelRef.current.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [isSubmitting, result]);

  return (
    <main className="grain-overlay relative isolate min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top,rgba(216,185,117,0.18),transparent_60%)]" />
      <div
        data-testid="observatory-starfield"
        className="pointer-events-none absolute inset-0 opacity-80"
      >
        <span className="absolute left-[14%] top-[14%] h-1.5 w-1.5 rounded-full bg-foreground/80 shadow-[0_0_14px_rgba(243,236,223,0.35)]" />
        <span className="absolute left-[24%] top-[30%] h-1 w-1 rounded-full bg-accent/70 shadow-[0_0_16px_rgba(216,185,117,0.35)]" />
        <span className="absolute right-[18%] top-[18%] h-1.5 w-1.5 rounded-full bg-foreground/75 shadow-[0_0_12px_rgba(243,236,223,0.35)]" />
        <span className="absolute right-[11%] top-[34%] h-1 w-1 rounded-full bg-accent-strong/80 shadow-[0_0_18px_rgba(125,138,176,0.35)]" />
        <span className="absolute left-[12%] bottom-[22%] h-1 w-1 rounded-full bg-accent-strong/70 shadow-[0_0_18px_rgba(125,138,176,0.3)]" />
        <span className="absolute right-[22%] bottom-[16%] h-1.5 w-1.5 rounded-full bg-foreground/70 shadow-[0_0_12px_rgba(243,236,223,0.28)]" />
      </div>
      <div
        data-testid="observatory-orbit-primary"
        className="pointer-events-none absolute -right-28 top-10 h-[28rem] w-[28rem] rounded-full border border-accent/12"
      />
      <div
        data-testid="observatory-orbit-secondary"
        className="pointer-events-none absolute right-8 top-24 h-[20rem] w-[20rem] rounded-full border border-accent-strong/18"
      />
      <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-4 pb-28 pt-8 sm:px-8 sm:pb-12 sm:pt-12">
        <div className="space-y-5 sm:space-y-6">
          <div className="space-y-4">
            <p className="inline-flex rounded-full border border-accent/25 bg-surface px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-accent sm:text-xs sm:tracking-[0.24em]">
              精准星盘设定
            </p>
            <h1 className="max-w-3xl font-serif text-4xl leading-[0.95] font-medium tracking-[-0.03em] text-foreground sm:text-6xl">
              开始你的解读
            </h1>
            <p className="max-w-2xl text-base leading-7 text-muted sm:text-lg sm:leading-8">
              我们只收集锁定一次星盘所必需的信息：出生日期、出生时间和中国出生地邮编。系统会在服务端解析邮编，统一锁定城市、时区和 UTC 快照。
            </p>
          </div>

          <div className="relative">
            <div
              data-testid="observatory-panel-rim"
              className="pointer-events-none absolute inset-0 -m-4 rounded-[2.25rem] border border-accent/10 sm:-m-5"
            />
            <div className="pointer-events-none absolute inset-0 -m-6 rounded-[2.75rem] border border-foreground/6 [mask-image:radial-gradient(circle_at_top,black,transparent_78%)]" />
            <div className="pointer-events-none absolute left-6 right-6 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(216,185,117,0.38),transparent)]" />
            <form
              id="reading-start-form"
              ref={formRef}
              onSubmit={onSubmit}
              className="relative space-y-6 rounded-[1.75rem] border border-line bg-surface-strong p-4 shadow-[var(--shadow)] backdrop-blur-xl sm:rounded-[2rem] sm:p-6"
            >
              <section className="space-y-4">
                <div className="space-y-1">
                  <h2 className="font-serif text-2xl text-foreground">
                    出生日期
                  </h2>
                  <p className="text-sm leading-6 text-muted">
                    必填。这是整张星盘的基础锚点。
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-3 sm:gap-4">
                  {dateFields.map((field) => (
                    <label key={field.id} className="space-y-2">
                      <span className="text-sm font-semibold text-foreground">
                        {field.label}
                      </span>
                      <input
                        id={field.id}
                        name={field.id}
                        type="text"
                        inputMode={field.inputMode}
                        placeholder={field.placeholder}
                        disabled={isSubmitting}
                        className={inputClassName}
                      />
                    </label>
                  ))}
                </div>
              </section>

              <section className="space-y-4">
                <div className="space-y-1">
                  <h2 className="font-serif text-2xl text-foreground">
                    出生时间
                  </h2>
                  <p className="text-sm leading-6 text-muted">
                    请输入你手头最接近的出生时间；如果不确定，就先填写一个大概时间。
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  {timeFields.map((field) => (
                    <label key={field.id} className="space-y-2">
                      <span className="text-sm font-semibold text-foreground">
                        {field.label}
                      </span>
                      <input
                        id={field.id}
                        name={field.id}
                        type="text"
                        inputMode={field.inputMode}
                        placeholder={field.placeholder}
                        disabled={isSubmitting}
                        className={inputClassName}
                      />
                    </label>
                  ))}
                </div>
              </section>

              <section className="space-y-4">
                <div className="space-y-1">
                  <h2 className="font-serif text-2xl text-foreground">
                    出生地邮编
                  </h2>
                  <p className="text-sm leading-6 text-muted">
                    国家固定为中国。请输入 6 位出生地邮编，我们会据此锁定唯一地点和时区。
                  </p>
                </div>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-foreground">
                    邮编
                  </span>
                  <input
                    id="postalCode"
                    name="postalCode"
                    type="text"
                    inputMode="numeric"
                    placeholder="215300"
                    disabled={isSubmitting}
                    className={inputClassName}
                  />
                </label>
              </section>

              <div className="hidden sm:block">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-accent px-6 py-3 text-base font-semibold text-background shadow-[0_18px_48px_rgba(216,185,117,0.24)] transition-transform duration-200 hover:-translate-y-0.5 hover:brightness-105"
                >
                  {isSubmitting ? "正在生成..." : "生成解读"}
                </button>
              </div>
            </form>
            {isSubmitting || result ? (
              <div ref={statusPanelRef} className="mt-6">
                <InlineStatusPanel
                  isSubmitting={isSubmitting}
                  result={result}
                  onReturnToForm={returnToForm}
                  followUpTurns={followUpTurns}
                  isSubmittingFollowUp={isSubmittingFollowUp}
                  followUpError={followUpError}
                  onSelectFollowUp={onSelectFollowUp}
                  onSubmitCustomQuestion={onSubmitCustomQuestion}
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-accent/10 bg-[rgba(13,16,32,0.88)] px-4 pb-[calc(0.9rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl sm:hidden">
        <button
          type="submit"
          form="reading-start-form"
          disabled={isSubmitting}
          className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-accent px-6 py-3 text-base font-semibold text-background shadow-[0_18px_48px_rgba(216,185,117,0.24)]"
        >
          {isSubmitting ? "正在生成..." : "生成解读"}
        </button>
      </div>
    </main>
  );
}
