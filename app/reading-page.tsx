import type { FormEvent } from "react";

import { ReadingAnalysisPanel } from "@/app/reading-analysis-panel";
import { ReadingForecastPanel } from "@/app/reading-forecast-panel";
import { ReadingPrimaryPanel } from "@/app/reading-primary-panel";
import type {
  FollowUpOption,
  FollowUpTurn,
  ReadingOutcome,
} from "@/lib/reading";

const followUpLabels: Record<FollowUpOption, string> = {
  love: "感情",
  "career-change": "工作变动",
  anxiety: "焦虑与情绪",
};

function ExplanationPanel({
  explanation,
}: {
  explanation: Extract<ReadingOutcome, { kind: "ready" }>["explanation"];
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm leading-7 text-foreground/90">
        {explanation.overview}
      </p>
      <div className="space-y-3">
        {explanation.keyPatterns.map((pattern, index) => (
          <article
            key={pattern.title}
            className={`space-y-1 ${index > 0 ? "border-t border-line/50 pt-4" : ""}`}
          >
            <h3 className="text-sm font-semibold text-foreground">
              {pattern.title}
            </h3>
            <p className="text-sm leading-6 text-muted">
              {pattern.explanation}
            </p>
          </article>
        ))}
      </div>
      <ul className="space-y-2">
        {explanation.caveats.map((item) => (
          <li key={item} className="text-xs leading-5 text-muted">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ReadingPageContent({
  result,
  followUpTurns = [],
  remainingFollowUps = 0,
  isSubmittingFollowUp = false,
  followUpError = null,
  onSelectFollowUp,
  onSubmitCustomQuestion,
}: {
  result: Extract<ReadingOutcome, { kind: "ready" }>;
  followUpTurns?: FollowUpTurn[];
  remainingFollowUps?: number;
  isSubmittingFollowUp?: boolean;
  followUpError?: string | null;
  onSelectFollowUp: (topic: FollowUpOption) => void;
  onSubmitCustomQuestion: (question: string) => void;
}) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const question = String(formData.get("question") ?? "").trim();

    if (!question) {
      return;
    }

    onSubmitCustomQuestion(question);
    form.reset();
  }

  const controlsDisabled = remainingFollowUps <= 0 || isSubmittingFollowUp;

  return (
    <section
      aria-live="polite"
      className="space-y-5 rounded-[1.75rem] border border-line/80 bg-surface-strong p-5 shadow-[var(--shadow)] sm:rounded-[2rem] sm:p-6"
    >
      <ReadingPrimaryPanel primary={result.primary} />
      <ReadingAnalysisPanel analysis={result.analysis} />

      <details className="rounded-[1.5rem] border border-line/80 bg-background/35 p-4">
        <summary className="cursor-pointer text-sm font-semibold text-foreground">
          展开看未来一年事业与财务
        </summary>
        <div className="mt-4">
          <ReadingForecastPanel forecast={result.forecast} />
        </div>
      </details>

      <details className="rounded-[1.5rem] border border-line/80 bg-background/35 p-4">
        <summary className="cursor-pointer text-sm font-semibold text-foreground">
          展开看星盘依据
        </summary>
        <div className="mt-4">
          <ExplanationPanel explanation={result.explanation} />
        </div>
      </details>

      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {result.followUpOptions.map((topic) => (
            <button
              key={topic}
              type="button"
              disabled={controlsDisabled}
              onClick={() => onSelectFollowUp(topic)}
              className="rounded-full border border-accent/20 bg-background/70 px-4 py-2 text-sm font-medium text-foreground transition hover:border-accent/40 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {followUpLabels[topic]}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            name="question"
            type="text"
            disabled={controlsDisabled}
            placeholder="可以继续问感情、工作变动、焦虑与情绪，或输入更具体的问题"
            className="min-h-12 w-full rounded-[1.25rem] border border-line bg-background/55 px-4 py-3 text-base text-foreground outline-none transition placeholder:text-muted/75 focus:border-accent focus:ring-2 focus:ring-accent/15 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </form>

        {followUpError ? (
          <p className="text-sm leading-6 text-muted">{followUpError}</p>
        ) : null}
        {remainingFollowUps <= 0 ? (
          <p className="text-sm leading-6 text-muted">
            这次解读的追问次数已经用完。重新提交一组出生信息，才能刷新当前时段的判断。
          </p>
        ) : null}
      </div>

      {followUpTurns.length > 0 ? (
        <div className="space-y-4 rounded-[1.5rem] border border-line/80 bg-background/35 p-4">
          {followUpTurns.map((turn, index) =>
            turn.role === "user" ? (
              <p
                key={`${turn.role}-${index}`}
                className="text-sm font-medium text-muted"
              >
                {turn.paragraphs.join(" ")}
              </p>
            ) : (
              <div key={`${turn.role}-${index}`} className="space-y-3">
                {turn.paragraphs.map((paragraph) => (
                  <p
                    key={paragraph}
                    className="max-w-3xl text-base leading-8 text-foreground/92"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            ),
          )}
        </div>
      ) : null}
    </section>
  );
}
