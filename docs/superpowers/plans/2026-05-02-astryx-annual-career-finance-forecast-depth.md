# Astryx Annual Career And Finance Forecast Depth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the annual forecast read like a specific reading instead of generic advice by focusing the visible future output on career and finance and giving each one a stronger annual judgment, turning point, and practical implication.

**Architecture:** Keep the existing `StructuredForecastViewModel` and existing `yearAhead` data shape so the rest of the reading pipeline stays stable. Tighten the forecast prompt so the model produces more concrete annual reasoning for `career` and `finance`, then recompose the forecast panel to show only those two domains with labeled sections for the main line, turning point, risks, and opportunities. The rest of the forecast domains stay in the JSON contract but become hidden implementation detail.

**Tech Stack:** Next.js 16, React 19, TypeScript, Vitest, OpenAI Responses API with `json_schema`

---

### Task 1: Make the forecast prompt write a real annual reading

**Files:**
- Modify: `lib/ai-prompts/forecast.ts`
- Test: `test/ai-reading.test.ts`

- [ ] **Step 1: Write the failing prompt test**

```ts
import { buildForecastPrompt } from "@/lib/ai-prompts/forecast";

it("asks for a stronger one-year career and finance reading", () => {
  const prompt = buildForecastPrompt("{}");

  expect(prompt.instructions).toContain("yearAhead.career");
  expect(prompt.instructions).toContain("yearAhead.finance");
  expect(prompt.instructions).toContain("年度主线");
  expect(prompt.instructions).toContain("关键转折");
  expect(prompt.instructions).toContain("启示");
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npm test -- test/ai-reading.test.ts`
Expected: the forecast prompt assertion fails because the instructions do not yet demand the richer annual structure.

- [ ] **Step 3: Update the prompt instructions**

```ts
export function buildForecastPrompt(payloadJson: string): PromptDefinition {
  return {
    instructions: composePromptInstructions({
      role: [
        "你是预测层，负责在证据约束下输出用户会真正拿来参考的年度推演。",
        "你的内容必须像有判断力的年运，不要像泛泛的建议清单。",
      ],
      taskRules: [
        "输出 nearTerm 和 yearAhead 两个时间层。",
        "每个时间层都必须覆盖 love、career、emotion、social、finance。",
        "用户界面只展示 yearAhead.career 和 yearAhead.finance，因此这两个 domain 必须最具体、最有启示感。",
        "在 career 和 finance 的写法里显式包含年度主线、关键转折和启示三种层次。",
        "yearAhead.career 要写出年度主线、关键转折、机会窗口和主要阻力，不要只写工作态度。",
        "yearAhead.finance 要写出收入结构、资源配置、风险点和现金流节奏，不要只写理财态度。",
        "career 和 finance 的 forecast 必须给出明确判断，说明这一年更像是扩张、重组、沉淀还是收缩。",
        "timingNotes 要写成转折提示或阶段信号，不要写成空泛的时间词。",
        "opportunities、risks 至少各返回 1 条，并且要写出为什么它重要。",
        "opportunities、risks、timingNotes 每条都尽量控制在 12 到 24 个中文字符。",
        "love、emotion、social 仍需按 schema 返回，但应更短、更克制，避免抢走事业和财务的重点。",
      ],
    }),
    schemaName: "structured_forecast_v1",
    payloadJson,
  };
}
```

- [ ] **Step 4: Run the test and verify it passes**

Run: `npm test -- test/ai-reading.test.ts`
Expected: the prompt test passes.

- [ ] **Step 5: Commit**

```bash
git add lib/ai-prompts/forecast.ts test/ai-reading.test.ts
git commit -m "feat: deepen annual forecast prompt"
```

### Task 2: Recompose the forecast UI around year-ahead career and finance

**Files:**
- Modify: `app/reading-forecast-panel.tsx`
- Modify: `app/reading-page.tsx`
- Test: `test/reading-page.test.tsx`

- [ ] **Step 1: Write the failing UI test**

```ts
it("shows only a year-ahead career and finance reading with labeled guidance", () => {
  render(<ReadingStartPage onSubmit={() => undefined} isSubmitting={false} result={createReadyResult()} />);

  expect(screen.getByText("展开看未来一年事业与财务")).toBeInTheDocument();

  fireEvent.click(screen.getByText("展开看未来一年事业与财务"));

  expect(screen.getByText("未来一年")).toBeInTheDocument();
  expect(screen.getByText("事业")).toBeInTheDocument();
  expect(screen.getByText("财务")).toBeInTheDocument();
  expect(screen.queryByText("感情")).not.toBeInTheDocument();
  expect(screen.queryByText("社交")).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npm test -- test/reading-page.test.tsx`
Expected: the current forecast panel still renders the old wording and broader domain set.

- [ ] **Step 3: Update the forecast panel markup**

```tsx
const prioritizedDomains: Array<{ key: ForecastDomainKey; label: string }> = [
  { key: "career", label: "事业" },
  { key: "finance", label: "财务" },
];

export function ReadingForecastPanel({ forecast }: { forecast: StructuredForecastViewModel }) {
  return (
    <section className="space-y-4">
      <p className="text-xs uppercase tracking-[0.22em] text-accent">未来一年</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {prioritizedDomains.map(({ key, label }) => {
          const domain = forecast.yearAhead[key];

          return (
            <article key={key} className="space-y-3 rounded-[1.25rem] bg-background/35 p-4">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">{label}</p>
                <h3 className="font-serif text-xl text-foreground">{domain.theme}</h3>
              </div>
              <p className="text-sm leading-6 text-foreground/90">{domain.forecast}</p>
              <div className="space-y-2 border-t border-line/40 pt-3">
                {domain.timingNotes.slice(0, 1).map((item) => (
                  <p key={item} className="text-sm leading-6 text-muted">转折：{item}</p>
                ))}
                {domain.opportunities.slice(0, 1).map((item) => (
                  <p key={item} className="text-sm leading-6 text-muted">机会：{item}</p>
                ))}
                {domain.risks.slice(0, 1).map((item) => (
                  <p key={item} className="text-sm leading-6 text-muted">留意：{item}</p>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Update the section label in the reading shell**

```tsx
<summary className="cursor-pointer text-sm font-semibold text-foreground">
  展开看未来一年事业与财务
</summary>
```

- [ ] **Step 5: Run the test and verify it passes**

Run: `npm test -- test/reading-page.test.tsx`
Expected: the forecast panel now only shows year-ahead career and finance with the richer labels.

- [ ] **Step 6: Commit**

```bash
git add app/reading-forecast-panel.tsx app/reading-page.tsx test/reading-page.test.tsx
git commit -m "feat: focus annual forecast on career and finance"
```

### Task 3: Update fixtures and contract tests for the richer annual reading

**Files:**
- Modify: `test/home-page.test.tsx`
- Modify: `test/reading-start-page.test.tsx`
- Modify: `test/reading-lib.test.ts`
- Modify: `test/ai-reading.test.ts`

- [ ] **Step 1: Refresh the sample forecast fixtures**

```ts
yearAhead: {
  career: {
    theme: "路径重组",
    forecast: "这一年更像是把旧能力重新定价，不是盲目换赛道。",
    opportunities: ["把经验转成更稳定的筹码"],
    risks: ["在犹豫里错过窗口"],
    timingNotes: ["上半年重整结构，下半年定位置"],
    evidence: [{ label: "年度事业", refs: ["points.mediumCoeli.sign"] }],
    confidence: "medium",
  },
  finance: {
    theme: "资源收束",
    forecast: "财务重点会从增长幻觉转向现金流与资源分配。",
    opportunities: ["建立更稳的缓冲和配置顺序"],
    risks: ["短期冲动放大波动"],
    timingNotes: ["先保流动性，再谈扩张"],
    evidence: [{ label: "年度财务", refs: ["points.venus.house"] }],
    confidence: "medium",
  },
}
```

- [ ] **Step 2: Update the contract assertions**

```ts
expect(screen.getByText("展开看未来一年事业与财务")).toBeInTheDocument();
expect(screen.getByText("事业")).toBeInTheDocument();
expect(screen.getByText("财务")).toBeInTheDocument();
```

- [ ] **Step 3: Run the full test subset**

Run: `npm test -- test/home-page.test.tsx test/reading-start-page.test.tsx test/reading-lib.test.ts test/ai-reading.test.ts`
Expected: all updated fixtures and contract tests pass together.

- [ ] **Step 4: Commit**

```bash
git add test/home-page.test.tsx test/reading-start-page.test.tsx test/reading-lib.test.ts test/ai-reading.test.ts
git commit -m "test: align annual forecast fixtures with new focus"
```

### Task 4: Verify the full app still passes

**Files:**
- None

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: no new errors; existing unused-function warnings remain unchanged unless the implementation naturally removes them.
