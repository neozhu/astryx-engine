# Astryx Local Chart + Three-Pass AI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the RapidAPI-based initial reading with a local natal chart pipeline plus three server-side `ChatGPT 5.4` passes, then render the result as one primary layer with expandable supporting layers.

**Architecture:** The server will compute a local natal chart through the repo-owned `Kerykeion` FastAPI service, normalize the result into a stable chart payload, then run three isolated AI passes against that same payload. The browser will render a `primary` layer first, keep explanation and prediction layers visually subordinate, and preserve the existing same-page follow-up flow with follow-ups anchored to the interpretation and forecast layers.

**Tech Stack:** Next.js 16, React 19, TypeScript, Vitest, OpenAI Responses API with `json_schema`, local FastAPI + `kerykeion`

---

## File Structure

### New Files

- `lib/chart-payload.ts`
  Builds the normalized chart payload and deterministic derived signals from local natal chart JSON.
- `lib/ai-prompts/shared.ts`
  Shared prompt module helpers and common instructions.
- `lib/ai-prompts/explanation.ts`
  Pass 1 prompt modules and JSON schema config.
- `lib/ai-prompts/analysis.ts`
  Pass 2 prompt modules and JSON schema config.
- `lib/ai-prompts/forecast.ts`
  Pass 3 prompt modules and JSON schema config.
- `app/reading-primary-panel.tsx`
  Renders the top-of-page primary interpretation layer.
- `app/reading-analysis-panel.tsx`
  Renders the main structured analysis sections with collapsed overflow.
- `app/reading-forecast-panel.tsx`
  Renders the prioritized near-term and year-ahead forecast domains.
- `test/chart-payload.test.ts`
  Unit tests for normalized payload and derived signals.

### Modified Files

- `lib/astrology-bundle.ts`
  Extend natal chart types to include degrees, houses, and aspects from the local API.
- `lib/ai-reading.ts`
  Replace paragraph-only AI helpers with three-pass schema-validated helpers.
- `lib/reading.ts`
  Replace `reading` with `primary + explanation + analysis + forecast`, anchor follow-ups, and preserve error handling.
- `app/api/reading/route.ts`
  Keep route shape but serve the new ready contract.
- `app/reading-page.tsx`
  Become a composition shell for the new reading panels instead of a paragraph renderer.
- `app/reading-start-page.tsx`
  Pass the richer `ready` payload into the new panels and preserve same-page flow.
- `test/ai-reading.test.ts`
  Add schema and prompt assembly tests for all three passes.
- `test/reading-lib.test.ts`
  Update contract tests, local-provider tests, and follow-up anchoring tests.
- `test/reading-page.test.tsx`
  Update UI rendering expectations for primary and expandable layers.
- `README.md`
  Document the local three-pass AI pipeline and env expectations.

---

### Task 1: Normalize Local Natal Chart Data

**Files:**
- Create: `lib/chart-payload.ts`
- Modify: `lib/astrology-bundle.ts`
- Test: `test/chart-payload.test.ts`

- [ ] **Step 1: Write the failing payload-builder tests**

```ts
import { describe, expect, it } from "vitest";

import {
  buildNormalizedChartPayload,
  type NormalizedChartPayload,
} from "@/lib/chart-payload";
import type { AstrologerChartResponse } from "@/lib/astrology-bundle";

function createNatalChart(): AstrologerChartResponse {
  return {
    status: "OK",
    chart_data: {
      subject: {
        city: "Kunshan",
        nation: "CN",
        tz_str: "Asia/Shanghai",
        iso_formatted_local_datetime: "1990-06-15T14:30:00+09:00",
        iso_formatted_utc_datetime: "1990-06-15T05:30:00Z",
        sun: {
          sign: "Gem",
          house: "Ninth_House",
          position: 23.87,
          abs_pos: 83.87,
        },
        moon: {
          sign: "Pis",
          house: "Fifth_House",
          position: 11.74,
          abs_pos: 341.74,
        },
        ascendant: {
          sign: "Lib",
          house: "First_House",
          position: 14.37,
          abs_pos: 194.37,
        },
      },
      houses: {
        cusps: [194.37, 222.6, 253.25],
        list: [
          { sign: "Lib", house: "First_House", position: 14.37, abs_pos: 194.37 },
        ],
      },
      aspects: {
        relevant: [
          {
            p1_name: "Moon",
            p2_name: "Venus",
            aspect: "sextile",
            aspect_degrees: 60,
            orbit: 6.71,
          },
        ],
      },
    },
  };
}

describe("buildNormalizedChartPayload", () => {
  it("normalizes point, house, and aspect fields into one AI-safe payload", () => {
    const payload = buildNormalizedChartPayload({
      natalChart: createNatalChart(),
      birthTimePrecision: "exact",
      locationLabel: "Kunshan, Jiangsu, 中国",
    });

    expect(payload.points.sun.absPos).toBe(83.87);
    expect(payload.houses.cusps[0]).toBe(194.37);
    expect(payload.aspects.relevant[0]?.aspect).toBe("sextile");
    expect(payload.meta.birthTimePrecision).toBe("exact");
  });

  it("adds deterministic derived signals for prompt stability", () => {
    const payload = buildNormalizedChartPayload({
      natalChart: createNatalChart(),
      birthTimePrecision: "approximate",
      locationLabel: "Kunshan, Jiangsu, 中国",
    });

    expect(payload.derivedSignals.confidenceDowngrades.length).toBeGreaterThan(0);
    expect(payload.derivedSignals.angularPoints).toContain("ascendant");
  });
});
```

- [ ] **Step 2: Run the new unit test to verify it fails**

Run: `npm test -- test/chart-payload.test.ts`

Expected: FAIL with missing module and missing `buildNormalizedChartPayload`.

- [ ] **Step 3: Implement the minimal normalized payload builder**

```ts
export type NormalizedChartPayload = {
  meta: {
    chartType: "natal";
    localDateTime: string | null;
    utcDateTime: string | null;
    timezone: string | null;
    birthTimePrecision: "exact" | "approximate" | "unknown";
    locationLabel: string;
  };
  points: Record<
    string,
    {
      id: string;
      label: string;
      sign: string | null;
      house: string | null;
      position: number | null;
      absPos: number | null;
      retrograde: boolean | null;
    }
  >;
  houses: {
    cusps: number[];
    list: Array<{
      house: string;
      sign: string | null;
      position: number | null;
      absPos: number | null;
    }>;
  };
  aspects: {
    all: Array<Record<string, unknown>>;
    relevant: Array<Record<string, unknown>>;
  };
  derivedSignals: {
    angularPoints: string[];
    repeatedHouseThemes: string[];
    repeatedSignThemes: string[];
    confidenceDowngrades: string[];
  };
  inputContext: {
    country: string;
    postalCode?: string;
  };
};
```

```ts
export function buildNormalizedChartPayload(input: {
  natalChart: AstrologerChartResponse;
  birthTimePrecision: BirthTimePrecision;
  locationLabel: string;
  postalCode?: string;
}): NormalizedChartPayload {
  const subject = input.natalChart.chart_data?.subject ?? {};

  return {
    meta: {
      chartType: "natal",
      localDateTime: subject.iso_formatted_local_datetime ?? null,
      utcDateTime: subject.iso_formatted_utc_datetime ?? null,
      timezone: subject.tz_str ?? null,
      birthTimePrecision: input.birthTimePrecision,
      locationLabel: input.locationLabel,
    },
    points: {
      sun: toNormalizedPoint("sun", "太阳", subject.sun),
      moon: toNormalizedPoint("moon", "月亮", subject.moon),
      mercury: toNormalizedPoint("mercury", "水星", subject.mercury),
      venus: toNormalizedPoint("venus", "金星", subject.venus),
      mars: toNormalizedPoint("mars", "火星", subject.mars),
      ascendant: toNormalizedPoint("ascendant", "上升", subject.ascendant),
      mediumCoeli: toNormalizedPoint("mediumCoeli", "天顶", subject.medium_coeli),
    },
    houses: {
      cusps: input.natalChart.chart_data?.houses?.cusps ?? [],
      list: (input.natalChart.chart_data?.houses?.list ?? []).map(toNormalizedHouse),
    },
    aspects: {
      all: input.natalChart.chart_data?.aspects?.all ?? [],
      relevant: input.natalChart.chart_data?.aspects?.relevant ?? [],
    },
    derivedSignals: buildDerivedSignals(subject, input.birthTimePrecision),
    inputContext: {
      country: "China",
      ...(input.postalCode ? { postalCode: input.postalCode } : {}),
    },
  };
}
```

- [ ] **Step 4: Extend the natal chart type to expose local provider detail**

```ts
export type AstrologerChartPoint = {
  sign?: string;
  house?: string;
  position?: number;
  abs_pos?: number;
  retrograde?: boolean | null;
};

export type AstrologerChartResponse = {
  status: string;
  chart_data?: {
    subject?: {
      city?: string;
      nation?: string;
      tz_str?: string;
      iso_formatted_local_datetime?: string;
      iso_formatted_utc_datetime?: string;
      sun?: AstrologerChartPoint;
      moon?: AstrologerChartPoint;
      mercury?: AstrologerChartPoint;
      venus?: AstrologerChartPoint;
      mars?: AstrologerChartPoint;
      ascendant?: AstrologerChartPoint;
      medium_coeli?: AstrologerChartPoint;
    };
    houses?: {
      cusps?: number[];
      list?: Array<{
        sign?: string;
        house?: string;
        position?: number;
        abs_pos?: number;
      }>;
    };
    aspects?: {
      all?: Array<Record<string, unknown>>;
      relevant?: Array<Record<string, unknown>>;
    };
  };
};
```

- [ ] **Step 5: Run the focused tests and commit**

Run:
- `npm test -- test/chart-payload.test.ts`

Expected: PASS

Commit:

```bash
git add lib/chart-payload.ts lib/astrology-bundle.ts test/chart-payload.test.ts
git commit -m "feat: normalize local natal chart payload"
```

### Task 2: Add Modular Prompt Builders And Three Schemas

**Files:**
- Create: `lib/ai-prompts/shared.ts`
- Create: `lib/ai-prompts/explanation.ts`
- Create: `lib/ai-prompts/analysis.ts`
- Create: `lib/ai-prompts/forecast.ts`
- Modify: `lib/ai-reading.ts`
- Test: `test/ai-reading.test.ts`

- [ ] **Step 1: Add failing tests for the three-pass AI contract**

```ts
import {
  buildExplanationReading,
  buildStructuredAnalysis,
  buildStructuredForecast,
} from "@/lib/ai-reading";

it("builds explanation output with overview and key patterns", async () => {
  const result = await buildExplanationReading(createPayload(), createAiClient(JSON.stringify({
    overview: "这张盘最突出的是思维与关系的双重张力。",
    keyPatterns: [
      {
        title: "快速理解，慢速信任",
        explanation: "太阳双子与金星八宫使你先靠交流进入关系，再靠深度筛选关系。",
        evidence: [{ label: "太阳双子、金星八宫", refs: ["points.sun.sign=Gem", "points.venus.house=Eighth_House"] }],
      },
    ],
    terminologyNotes: ["八宫强调共享、信任与深层交换。"],
    caveats: ["出生时间不准时，宫位结论应更保守。"],
  })));

  expect(result.keyPatterns[0]?.evidence[0]?.refs[0]).toBe("points.sun.sign=Gem");
});

it("builds structured analysis with section confidence", async () => {
  const result = await buildStructuredAnalysis(createPayload(), createAiClient(JSON.stringify({
    sections: {
      personality: {
        summary: "你的人格重心在好奇心和关系分辨力之间摆动。",
        bullets: ["先通过交流建立连接，再决定是否真正投入。"],
        evidence: [{ label: "太阳双子、金星八宫", refs: ["points.sun.sign=Gem", "points.venus.house=Eighth_House"] }],
        confidence: "high",
      },
    },
  })));

  expect(result.sections.personality.confidence).toBe("high");
});

it("builds structured forecast with nearTerm and yearAhead domains", async () => {
  const result = await buildStructuredForecast(createPayload(), createAiClient(JSON.stringify({
    nearTerm: {
      love: {
        theme: "关系筛选期",
        forecast: "未来 30-90 天更适合观察而不是仓促定性。",
        opportunities: ["看清谁能稳定回应你"],
        risks: ["因为节奏不一致而误判关系"],
        timingNotes: ["前半段偏试探，后半段更清晰"],
        evidence: [{ label: "金星八宫", refs: ["points.venus.house=Eighth_House"] }],
        confidence: "medium",
      },
    },
    yearAhead: {
      love: {
        theme: "关系结构重排",
        forecast: "未来一年会逐渐把情感投入转向更稳定的联系。",
        opportunities: ["长期关系框架更清楚"],
        risks: ["旧的关系模式拖慢选择"],
        timingNotes: ["年度后半段更适合做明确决定"],
        evidence: [{ label: "金星八宫", refs: ["points.venus.house=Eighth_House"] }],
        confidence: "medium",
      },
    },
  })));

  expect(result.nearTerm.love.theme).toBe("关系筛选期");
});
```

- [ ] **Step 2: Run the focused AI unit tests to verify they fail**

Run: `npm test -- test/ai-reading.test.ts`

Expected: FAIL with missing exports and invalid schema shape.

- [ ] **Step 3: Create prompt module files**

```ts
// lib/ai-prompts/shared.ts
export function buildSharedPromptParts() {
  return {
    hardConstraints: [
      "只能依据服务端提供的 chart payload JSON。",
      "不要输出 markdown。",
      "不要额外输出 schema 之外的字段。",
    ],
    toneRules: [
      "使用现代中文。",
      "避免空泛玄学套话。",
      "证据不足时降低断言强度。",
    ],
  };
}
```

```ts
// lib/ai-prompts/explanation.ts
export function buildExplanationPrompt(payloadJson: string) {
  return {
    instructions: [
      "你是星盘解释层，不是预测层。",
      "解释术语、结构和组合关系。",
      "不要做运势预测。",
    ].join("\n"),
    inputJson: payloadJson,
    schemaName: "chart_explanation_v1",
  };
}
```

```ts
// lib/ai-prompts/analysis.ts
export function buildAnalysisPrompt(payloadJson: string) {
  return {
    instructions: [
      "你是核心解读层。",
      "输出人格、行为与思维模式、关系与情感模式、职业与发展路径、优势与风险、人生主题、时间维度。",
      "每个 section 必须返回 summary、bullets、evidence、confidence。",
    ].join("\n"),
    inputJson: payloadJson,
    schemaName: "structured_analysis_v1",
  };
}
```

```ts
// lib/ai-prompts/forecast.ts
export function buildForecastPrompt(payloadJson: string) {
  return {
    instructions: [
      "你是预测层。",
      "输出 nearTerm 和 yearAhead。",
      "覆盖 love、career、emotion、social、finance。",
      "语气平衡，不要绝对化。",
    ].join("\n"),
    inputJson: payloadJson,
    schemaName: "structured_forecast_v1",
  };
}
```

- [ ] **Step 4: Replace paragraph-only AI helpers with three schema-validated builders**

```ts
export async function buildExplanationReading(
  payload: NormalizedChartPayload,
  client?: AiReadingClient,
) {
  return parseStructuredResponse(
    await callJsonSchemaModel(buildExplanationPrompt(JSON.stringify(payload, null, 2)), client),
    explanationSchema,
    "Invalid explanation schema.",
  );
}

export async function buildStructuredAnalysis(
  payload: NormalizedChartPayload,
  client?: AiReadingClient,
) {
  return parseStructuredResponse(
    await callJsonSchemaModel(buildAnalysisPrompt(JSON.stringify(payload, null, 2)), client),
    analysisSchema,
    "Invalid analysis schema.",
  );
}

export async function buildStructuredForecast(
  payload: NormalizedChartPayload,
  client?: AiReadingClient,
) {
  return parseStructuredResponse(
    await callJsonSchemaModel(buildForecastPrompt(JSON.stringify(payload, null, 2)), client),
    forecastSchema,
    "Invalid forecast schema.",
  );
}
```

- [ ] **Step 5: Run the tests and commit**

Run:
- `npm test -- test/ai-reading.test.ts`

Expected: PASS

Commit:

```bash
git add lib/ai-prompts/shared.ts lib/ai-prompts/explanation.ts lib/ai-prompts/analysis.ts lib/ai-prompts/forecast.ts lib/ai-reading.ts test/ai-reading.test.ts
git commit -m "feat: add three-pass ai prompt and schema builders"
```

### Task 3: Rewrite The Reading Contract Around Primary + Analysis + Forecast

**Files:**
- Modify: `lib/reading.ts`
- Modify: `app/api/reading/route.ts`
- Test: `test/reading-lib.test.ts`

- [ ] **Step 1: Add a failing ready-contract test**

```ts
it("returns a ready result with primary, explanation, analysis, and forecast", async () => {
  const result = await resolveReadingFlow(
    {
      year: "1990",
      month: "6",
      day: "15",
      hour: "14",
      minute: "30",
      postalCode: "215300",
      birthTimePrecision: "exact",
    },
    {
      aiClient: createThreePassAiClient({
        explanation: { /* valid explanation json */ },
        analysis: { /* valid analysis json */ },
        forecast: { /* valid forecast json */ },
      }),
    },
  );

  expect(result.kind).toBe("ready");
  if (result.kind !== "ready") throw new Error("Expected ready");
  expect(result.primary.title.length).toBeGreaterThan(0);
  expect(result.analysis.sections.personality.summary.length).toBeGreaterThan(0);
  expect(result.forecast.nearTerm.love.theme.length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run the reading library test to verify it fails**

Run: `npm test -- test/reading-lib.test.ts`

Expected: FAIL because `ready` still exposes `reading`.

- [ ] **Step 3: Replace the `ReadingOutcome` ready payload**

```ts
export type PrimaryReadingViewModel = {
  title: string;
  summary: string;
  highlights: string[];
  nextBestActions?: string[];
};

export type ReadingOutcome =
  | {
      kind: "ready";
      primary: PrimaryReadingViewModel;
      explanation: ExplanationViewModel;
      analysis: StructuredAnalysisViewModel;
      forecast: StructuredForecastViewModel;
      sessionToken: string;
      followUpOptions: FollowUpOption[];
      remainingFollowUps: number;
    }
  | ...
```

- [ ] **Step 4: Build the three-pass orchestration with fallback rules**

```ts
async function buildInitialReadingResult(...) {
  const chartPayload = buildNormalizedChartPayload({
    natalChart: bundle.natalChart,
    birthTimePrecision: bundle.normalizedBirth.birthTimePrecision,
    locationLabel: buildPlaceLabel(location),
    postalCode: bundle.normalizedBirth.postalCode,
  });

  const explanation = await buildExplanationReading(chartPayload, options?.aiClient);
  const analysis = await buildStructuredAnalysis(chartPayload, options?.aiClient);
  const forecast = await buildStructuredForecast(chartPayload, options?.aiClient);

  return {
    primary: buildPrimaryReadingViewModel(analysis, forecast),
    explanation,
    analysis,
    forecast,
  };
}
```

```ts
function buildPrimaryReadingViewModel(
  analysis: StructuredAnalysisViewModel,
  forecast: StructuredForecastViewModel,
): PrimaryReadingViewModel {
  return {
    title: analysis.sections.lifeTheme.summary,
    summary: analysis.sections.personality.summary,
    highlights: [
      analysis.sections.relationshipPattern.bullets[0],
      analysis.sections.careerPath.bullets[0],
      forecast.nearTerm.love.theme,
      forecast.nearTerm.career.theme,
    ].filter(Boolean).slice(0, 4),
  };
}
```

- [ ] **Step 5: Preserve route semantics and commit**

Run:
- `npm test -- test/reading-lib.test.ts`

Expected: PASS

Commit:

```bash
git add lib/reading.ts app/api/reading/route.ts test/reading-lib.test.ts
git commit -m "feat: replace paragraph reading with layered reading contract"
```

### Task 4: Re-anchor Follow-Ups To Interpretation And Forecast

**Files:**
- Modify: `lib/reading.ts`
- Test: `test/reading-lib.test.ts`

- [ ] **Step 1: Add a failing follow-up routing test**

```ts
it("maps follow-up questions to analysis and forecast context instead of explanation-only context", async () => {
  const initial = await resolveReadingFlow(validRequest, {
    aiClient: createThreePassAiClient(validThreePassOutput),
  });

  if (initial.kind !== "ready") throw new Error("Expected ready");

  const response = await resolveReadingFollowUp(
    {
      sessionToken: initial.sessionToken,
      topic: "career-change",
      question: "现在适合换工作吗？",
      priorTurns: [],
    },
    {
      aiClient: createAiClient(JSON.stringify({
        paragraphs: ["接下来更重要的是判断节奏和稳定性，而不是冲动切换。"],
      })),
    },
  );

  expect(response.kind).toBe("follow-up-ready");
});
```

- [ ] **Step 2: Run the focused follow-up tests to verify they fail or show missing context**

Run: `npm test -- test/reading-lib.test.ts`

Expected: FAIL or prompt coverage mismatch for the new source context.

- [ ] **Step 3: Build a follow-up payload from analysis + forecast context**

```ts
function buildFollowUpPromptContext(input: {
  chartPayload: NormalizedChartPayload;
  analysis: StructuredAnalysisViewModel;
  forecast: StructuredForecastViewModel;
}) {
  return {
    chart: input.chartPayload,
    analysis: input.analysis,
    forecast: input.forecast,
  };
}
```

```ts
const mappedQuestion = mapTopicToQuestion(request.topic, request.question);
const followUpContext = buildFollowUpPromptContext({
  chartPayload,
  analysis: initialAnalysis,
  forecast: initialForecast,
});
```

- [ ] **Step 4: Keep follow-up answers paragraph-based for this slice**

```ts
// Do not redesign follow-up UI in this task.
// Keep the current answer shape:
type FollowUpOutcome = {
  kind: "follow-up-ready";
  answer: {
    paragraphs: string[];
  };
  ...
};
```

- [ ] **Step 5: Run the tests and commit**

Run:
- `npm test -- test/reading-lib.test.ts`

Expected: PASS

Commit:

```bash
git add lib/reading.ts test/reading-lib.test.ts
git commit -m "feat: anchor follow-ups to layered reading context"
```

### Task 5: Rebuild The Reading UI Around A Primary Layer

**Files:**
- Create: `app/reading-primary-panel.tsx`
- Create: `app/reading-analysis-panel.tsx`
- Create: `app/reading-forecast-panel.tsx`
- Modify: `app/reading-page.tsx`
- Modify: `app/reading-start-page.tsx`
- Test: `test/reading-page.test.tsx`
- Test: `test/reading-start-page.test.tsx`

- [ ] **Step 1: Add failing UI tests for the new hierarchy**

```tsx
it("renders a primary reading layer first and keeps explanation subordinate", () => {
  render(
    <ReadingPageContent
      result={createReadyResult()}
      followUpTurns={[]}
      onSelectFollowUp={() => {}}
      onSubmitCustomQuestion={() => {}}
    />,
  );

  expect(screen.getByText("核心解读")).toBeInTheDocument();
  expect(screen.getByText("展开看星盘依据")).toBeInTheDocument();
  expect(screen.getByText("展开看近期与年度预测")).toBeInTheDocument();
});

it("shows only the first few analysis sections and keeps the rest collapsed", () => {
  render(<ReadingPageContent ... />);
  expect(screen.getByText("人格")).toBeVisible();
  expect(screen.getByRole("button", { name: /展开更多分析/i })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the reading page tests to verify they fail**

Run:
- `npm test -- test/reading-page.test.tsx test/reading-start-page.test.tsx`

Expected: FAIL because the current UI still expects `reading.body`.

- [ ] **Step 3: Create focused rendering components**

```tsx
// app/reading-primary-panel.tsx
export function ReadingPrimaryPanel({ primary }: { primary: PrimaryReadingViewModel }) {
  return (
    <section className="space-y-4 rounded-[1.75rem] border border-line bg-background/65 p-5">
      <p className="text-xs uppercase tracking-[0.22em] text-accent">核心解读</p>
      <h2 className="font-serif text-3xl text-foreground">{primary.title}</h2>
      <p className="text-base leading-8 text-foreground/92">{primary.summary}</p>
      <ul className="space-y-2">
        {primary.highlights.map((item) => (
          <li key={item} className="text-sm leading-6 text-muted">{item}</li>
        ))}
      </ul>
    </section>
  );
}
```

```tsx
// app/reading-analysis-panel.tsx
export function ReadingAnalysisPanel({ analysis }: { analysis: StructuredAnalysisViewModel }) {
  const visibleSections = analysis.order.slice(0, 3);
  const hiddenSections = analysis.order.slice(3);
  ...
}
```

```tsx
// app/reading-forecast-panel.tsx
export function ReadingForecastPanel({ forecast }: { forecast: StructuredForecastViewModel }) {
  const prioritizedNearTerm = ["love", "career", "emotion"];
  ...
}
```

- [ ] **Step 4: Replace the old paragraph view shell**

```tsx
// app/reading-page.tsx
export function ReadingPageContent({ result, ...props }: { result: ReadyReadingOutcome; ... }) {
  return (
    <section className="space-y-5 ...">
      <ReadingPrimaryPanel primary={result.primary} />
      <ReadingAnalysisPanel analysis={result.analysis} />
      <ReadingForecastPanel forecast={result.forecast} />
      <details>
        <summary>展开看星盘依据</summary>
        <ReadingExplanationPanel explanation={result.explanation} />
      </details>
      {renderFollowUpControls(props)}
    </section>
  );
}
```

```tsx
// app/reading-start-page.tsx
case "ready":
  return (
    <ReadingPageContent
      result={result}
      followUpTurns={followUpTurns}
      remainingFollowUps={result.remainingFollowUps}
      ...
    />
  );
```

- [ ] **Step 5: Run the UI tests and commit**

Run:
- `npm test -- test/reading-page.test.tsx test/reading-start-page.test.tsx`

Expected: PASS

Commit:

```bash
git add app/reading-primary-panel.tsx app/reading-analysis-panel.tsx app/reading-forecast-panel.tsx app/reading-page.tsx app/reading-start-page.tsx test/reading-page.test.tsx test/reading-start-page.test.tsx
git commit -m "feat: render layered reading ui"
```

### Task 6: Update End-To-End Contracts, Docs, And Final Verification

**Files:**
- Modify: `README.md`
- Modify: `test/reading-lib.test.ts`
- Modify: `test/home-page.test.tsx`
- Modify: `test/reading-generating-page.test.tsx`

- [ ] **Step 1: Add or update contract tests around the local provider path**

```ts
it("returns a layered ready payload through the local kerykeion provider", async () => {
  process.env.ASTROLOGY_PROVIDER = "kerykeion-local";
  process.env.LOCAL_ASTROLOGY_API_URL = "http://127.0.0.1:8010";

  const result = await resolveReadingFlow(validPostalRequest, {
    aiClient: createThreePassAiClient(validThreePassOutput),
  });

  expect(result.kind).toBe("ready");
  if (result.kind !== "ready") throw new Error("Expected ready");
  expect(result.primary.title.length).toBeGreaterThan(0);
  expect(result.analysis.sections.personality.summary.length).toBeGreaterThan(0);
  expect(result.forecast.nearTerm.love.theme.length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run the full suite once before documentation edits**

Run:
- `npm test`

Expected: PASS with all updated reading, AI, and UI tests.

- [ ] **Step 3: Update README for the new layered reading pipeline**

```md
## Three-pass AI reading

When `ASTROLOGY_PROVIDER=kerykeion-local`, the app:

1. calls the local natal chart API
2. builds a normalized chart payload
3. runs three `ChatGPT 5.4` passes:
   - explanation
   - structured analysis
   - structured forecast
4. renders one primary layer plus expandable supporting layers
```

- [ ] **Step 4: Run lint and the final verification commands**

Run:
- `npm run lint`
- `npm test`
- `uv run --project services/kerykeion_api --python 3.11 pytest services/kerykeion_api/tests/test_app.py`

Expected:
- ESLint passes
- Vitest passes
- Python FastAPI tests pass

- [ ] **Step 5: Commit the final contract and docs changes**

```bash
git add README.md test/reading-lib.test.ts test/home-page.test.tsx test/reading-generating-page.test.tsx
git commit -m "docs: document layered local chart reading flow"
```

---

## Self-Review

### Spec Coverage

- Local natal provider replaces RapidAPI for natal chart usage: covered in Task 1 and Task 6
- Normalized chart payload: covered in Task 1
- Modular prompt system: covered in Task 2
- Three AI passes with schema validation: covered in Task 2 and Task 3
- Primary layer plus expandable supporting layers: covered in Task 3 and Task 5
- Follow-up compatibility with the new contract: covered in Task 4
- Frontend rendering of primary, explanation, and forecast layers: covered in Task 5
- Testing and docs: covered in Task 6

### Placeholder Scan

- No `TBD`, `TODO`, or “similar to Task N” placeholders remain
- Each task includes a failing test, verification command, minimal implementation sketch, and commit point

### Type Consistency

- `NormalizedChartPayload` is introduced once in Task 1 and reused in Tasks 2-4
- `PrimaryReadingViewModel` is introduced in Task 3 and consumed in Task 5
- `explanation`, `analysis`, and `forecast` stay consistent across server and UI tasks

---

Plan complete and saved to `docs/superpowers/plans/2026-04-06-astryx-local-chart-three-pass-ai-implementation.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
