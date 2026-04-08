"use client";

import { useState } from "react";

import type { StructuredAnalysisViewModel } from "@/lib/ai-reading";

const analysisOrder = [
  { key: "personality", label: "人格" },
  { key: "behaviorAndThinking", label: "行为与思维模式" },
  { key: "relationshipsAndEmotions", label: "关系与情感模式" },
  { key: "careerAndGrowth", label: "职业与发展路径" },
  { key: "strengthsAndRisks", label: "优势与风险" },
  { key: "lifeThemes", label: "人生主题" },
  { key: "timeDimension", label: "时间维度" },
] as const;

const confidenceLabels = {
  high: "高",
  medium: "中",
  low: "低",
} as const;

export function ReadingAnalysisPanel({
  analysis,
}: {
  analysis: StructuredAnalysisViewModel;
}) {
  const [expanded, setExpanded] = useState(false);
  const visibleSections = expanded ? analysisOrder : analysisOrder.slice(0, 3);
  const hasHiddenSections = analysisOrder.length > 3;

  return (
    <section className="space-y-4 rounded-[1.75rem] border border-line/80 bg-background/50 p-5 sm:rounded-[2rem]">
      <p className="text-xs uppercase tracking-[0.22em] text-accent">
        结构分析
      </p>
      <div className="space-y-4">
        {visibleSections.map(({ key, label }, index) => {
          const section = analysis.sections[key];

          return (
            <article
              key={key}
              className={`rounded-[1rem] px-1 py-1 ${
                index > 0 ? "border-t border-line/50 pt-5" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-serif text-xl text-foreground">{label}</h3>
                <span className="text-xs tracking-[0.12em] text-muted">
                  {confidenceLabels[section.confidence]}
                </span>
              </div>
              <p className="mt-3 text-sm leading-7 text-foreground/90">
                {section.summary}
              </p>
              <ul className="mt-3 space-y-2">
                {section.bullets.map((bullet) => (
                  <li key={bullet} className="text-sm leading-6 text-muted">
                    {bullet}
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>
      {hasHiddenSections ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="rounded-full border border-accent/20 bg-background/45 px-4 py-2 text-sm font-medium text-foreground"
        >
          {expanded ? "收起更多分析" : "展开更多分析"}
        </button>
      ) : null}
    </section>
  );
}
