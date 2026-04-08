# Astryx AI Reading Follow-Ups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current cleaned astrology-context output with a real `ChatGPT 5.4` reading, then add same-page guided follow-ups that stay grounded in natal + transit data.

**Architecture:** Keep the existing single-page flow and same-origin POST boundary. The server continues to normalize location data and fetch astrology grounding from GeoNames + Astrologer API, then derives a deterministic future-window summary, signs a session token, and calls the model for the initial reading or follow-up answer. The client renders the reading inline, rotates the session token after each successful follow-up, and caps the interaction at three successful follow-ups without adding persistence.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Vitest, OpenAI Node SDK, GeoNames, Astrologer API

---

## File Map

- Modify: `D:/github/astryx-engine/.worktrees/feat-mvp-foundation/package.json`
- Modify: `D:/github/astryx-engine/.worktrees/feat-mvp-foundation/.env.example`
- Modify: `D:/github/astryx-engine/.worktrees/feat-mvp-foundation/app/api/reading/route.ts`
- Create: `D:/github/astryx-engine/.worktrees/feat-mvp-foundation/app/api/reading/follow-up/route.ts`
- Modify: `D:/github/astryx-engine/.worktrees/feat-mvp-foundation/app/page.tsx`
- Modify: `D:/github/astryx-engine/.worktrees/feat-mvp-foundation/app/reading-start-page.tsx`
- Modify: `D:/github/astryx-engine/.worktrees/feat-mvp-foundation/app/reading-page.tsx`
- Create: `D:/github/astryx-engine/.worktrees/feat-mvp-foundation/lib/reading-session.ts`
- Create: `D:/github/astryx-engine/.worktrees/feat-mvp-foundation/lib/ai-reading.ts`
- Create: `D:/github/astryx-engine/.worktrees/feat-mvp-foundation/lib/astrology-bundle.ts`
- Modify: `D:/github/astryx-engine/.worktrees/feat-mvp-foundation/lib/reading.ts`
- Create: `D:/github/astryx-engine/.worktrees/feat-mvp-foundation/test/reading-session.test.ts`
- Create: `D:/github/astryx-engine/.worktrees/feat-mvp-foundation/test/ai-reading.test.ts`
- Modify: `D:/github/astryx-engine/.worktrees/feat-mvp-foundation/test/reading-lib.test.ts`
- Modify: `D:/github/astryx-engine/.worktrees/feat-mvp-foundation/test/home-page.test.tsx`
- Modify: `D:/github/astryx-engine/.worktrees/feat-mvp-foundation/test/reading-page.test.tsx`

### Responsibility Split

- `lib/astrology-bundle.ts`: deterministic server-owned grounding assembly from input, GeoNames, natal/transit calls, and future-window summarization
- `lib/reading-session.ts`: signed token encode/decode and round-count rotation
- `lib/ai-reading.ts`: prompt assembly, strict schema validation, model call, and fallback-safe helpers
- `lib/reading.ts`: input parsing, public response types, route orchestration, fallback reading builder
- API routes: initial reading request and follow-up request
- page/components: same-page rendering, follow-up controls, token rotation, and UI cap enforcement

### Task 1: Add AI Session Contracts And Token Rotation

**Files:**
- Create: `D:/github/astryx-engine/.worktrees/feat-mvp-foundation/lib/reading-session.ts`
- Create: `D:/github/astryx-engine/.worktrees/feat-mvp-foundation/test/reading-session.test.ts`
- Modify: `D:/github/astryx-engine/.worktrees/feat-mvp-foundation/.env.example`

- [ ] **Step 1: Write the failing session-token tests**

```ts
import { describe, expect, it } from "vitest";

import {
  rotateSessionToken,
  signSessionToken,
  verifySessionToken,
} from "@/lib/reading-session";

const basePayload = {
  normalizedBirth: {
    year: 1990,
    month: 6,
    day: 15,
    hour: 14,
    minute: 30,
    city: "New York",
    country: "US",
    birthTimePrecision: "exact" as const,
  },
  natalSummary: {
    sun: "Gemini",
    moon: "Pisces",
  },
  transitSummary: {
    headline: "Current transits emphasize movement and emotional sensitivity.",
  },
  asOf: "2026-04-05T12:00:00.000Z",
  followUpCount: 0,
};

describe("reading-session", () => {
  it("round-trips a signed session token", () => {
    process.env.READING_SESSION_SECRET = "test-secret";

    const token = signSessionToken(basePayload);
    const decoded = verifySessionToken(token);

    expect(decoded.followUpCount).toBe(0);
    expect(decoded.asOf).toBe("2026-04-05T12:00:00.000Z");
    expect(decoded.normalizedBirth.city).toBe("New York");
  });

  it("rotates the token and increments follow-up count", () => {
    process.env.READING_SESSION_SECRET = "test-secret";

    const firstToken = signSessionToken(basePayload);
    const secondToken = rotateSessionToken(firstToken);
    const decoded = verifySessionToken(secondToken);

    expect(decoded.followUpCount).toBe(1);
  });

  it("rejects a tampered token", () => {
    process.env.READING_SESSION_SECRET = "test-secret";

    const token = signSessionToken(basePayload);
    const tampered = `${token.slice(0, -2)}xx`;

    expect(() => verifySessionToken(tampered)).toThrow(/invalid session token/i);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- test/reading-session.test.ts`

Expected: FAIL with `Cannot find module '@/lib/reading-session'` or missing exported functions.

- [ ] **Step 3: Implement the minimal token signer and rotator**

```ts
import { createHmac, timingSafeEqual } from "node:crypto";

type SessionPayload = {
  normalizedBirth: {
    year: number;
    month: number;
    day: number;
    hour: number | null;
    minute: number | null;
    city: string;
    country: string;
    birthTimePrecision: "exact" | "approximate" | "unknown";
  };
  natalSummary: Record<string, string>;
  transitSummary: Record<string, string>;
  asOf: string;
  followUpCount: number;
};

function getSecret() {
  const secret = process.env.READING_SESSION_SECRET;

  if (!secret) {
    throw new Error("Missing READING_SESSION_SECRET");
  }

  return secret;
}

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function signRaw(encodedPayload: string) {
  return createHmac("sha256", getSecret()).update(encodedPayload).digest("base64url");
}

export function signSessionToken(payload: SessionPayload) {
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signRaw(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifySessionToken(token: string): SessionPayload {
  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    throw new Error("Invalid session token");
  }

  const expected = signRaw(encodedPayload);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);

  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    throw new Error("Invalid session token");
  }

  return JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as SessionPayload;
}

export function rotateSessionToken(token: string) {
  const decoded = verifySessionToken(token);

  return signSessionToken({
    ...decoded,
    followUpCount: decoded.followUpCount + 1,
  });
}
```

- [ ] **Step 4: Expose the new env variable**

```env
GEONAMES_USERNAME=
RAPIDAPI_KEY=
RAPIDAPI_HOST=astrologer.p.rapidapi.com
OPENAI_API_KEY=
OPENAI_READING_MODEL=chatgpt-5.4
READING_SESSION_SECRET=
```

- [ ] **Step 5: Run the tests and commit**

Run: `npm test -- test/reading-session.test.ts`

Expected: PASS

```bash
git add .env.example lib/reading-session.ts test/reading-session.test.ts
git commit -m "feat: add signed reading session tokens"
```

### Task 2: Extract Deterministic Astrology Bundle Assembly

**Files:**
- Create: `D:/github/astryx-engine/.worktrees/feat-mvp-foundation/lib/astrology-bundle.ts`
- Modify: `D:/github/astryx-engine/.worktrees/feat-mvp-foundation/lib/reading.ts`
- Modify: `D:/github/astryx-engine/.worktrees/feat-mvp-foundation/test/reading-lib.test.ts`

- [ ] **Step 1: Write the failing bundle tests**

```ts
import { describe, expect, it, vi } from "vitest";

import { buildAstrologyBundle } from "@/lib/astrology-bundle";

describe("buildAstrologyBundle", () => {
  it("locks one asOf timestamp and returns a deterministic future window summary", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-05T12:00:00.000Z"));

    const bundle = await buildAstrologyBundle({
      year: 1990,
      month: 6,
      day: 15,
      hour: 14,
      minute: 30,
      city: "New York",
      country: "US",
      birthTimePrecision: "exact",
    });

    expect(bundle.asOf).toBe("2026-04-05T12:00:00.000Z");
    expect(bundle.futureWindowSummary.windowLabel).toMatch(/next 4-8 weeks/i);
    expect(bundle.natalSummary.sun).toBeDefined();
    expect(bundle.transitSummary.headline).toBeDefined();
  });

  it("uses a neutral noon fallback when birth time is unknown", async () => {
    const bundle = await buildAstrologyBundle({
      year: 1990,
      month: 6,
      day: 15,
      hour: 7,
      minute: 45,
      city: "New York",
      country: "US",
      birthTimePrecision: "unknown",
    });

    expect(bundle.normalizedBirth.hour).toBeNull();
    expect(bundle.chartRequest.subject.hour).toBe(12);
    expect(bundle.chartRequest.subject.minute).toBe(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- test/reading-lib.test.ts`

Expected: FAIL with missing `buildAstrologyBundle` export.

- [ ] **Step 3: Move provider calls into a bundle builder**

```ts
export type AstrologyBundle = {
  normalizedBirth: ParsedReadingInput;
  chartRequest: {
    subject: {
      year: number;
      month: number;
      day: number;
      hour: number;
      minute: number;
      city: string;
      nation: string | undefined;
      latitude: number;
      longitude: number;
      timezone: string;
    };
  };
  asOf: string;
  natalChart: AstrologerChartResponse;
  natalContext: AstrologerContextResponse | null;
  transitChart: AstrologerChartResponse | null;
  transitContext: AstrologerContextResponse | null;
  natalSummary: Record<string, string>;
  transitSummary: {
    headline: string;
    highlights: string[];
  };
  futureWindowSummary: {
    windowLabel: string;
    summary: string;
  };
};

async function fetchAstrologerChart(
  endpointPath: string,
  input: ParsedReadingInput,
  location: GeoNamesEntry,
  timezoneId: string,
  asOf: string,
) {
  const payload = {
    ...buildAstrologerPayload(input, location, timezoneId),
    transit_at: asOf,
  };

  return fetchJson<AstrologerChartResponse | AstrologerContextResponse>(
    `https://${process.env.RAPIDAPI_HOST ?? "astrologer.p.rapidapi.com"}${endpointPath}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-RapidAPI-Key": process.env.RAPIDAPI_KEY ?? "",
        "X-RapidAPI-Host": process.env.RAPIDAPI_HOST ?? "astrologer.p.rapidapi.com",
      },
      body: JSON.stringify(payload),
    },
  );
}

async function fetchTransitChart(
  input: ParsedReadingInput,
  location: GeoNamesEntry,
  timezoneId: string,
  asOf: string,
) {
  return fetchAstrologerChart("/api/v5/chart-data/transit", input, location, timezoneId, asOf);
}

async function fetchTransitContext(
  input: ParsedReadingInput,
  location: GeoNamesEntry,
  timezoneId: string,
  asOf: string,
) {
  return fetchAstrologerChart("/api/v5/context/transit", input, location, timezoneId, asOf);
}

function buildAstrologerPayload(
  input: ParsedReadingInput,
  location: GeoNamesEntry,
  timezoneId: string,
) {
  const chartTime = buildChartTime(input);

  return {
    subject: {
      name: "Astryx Reading",
      year: input.year,
      month: input.month,
      day: input.day,
      hour: chartTime.hour,
      minute: chartTime.minute,
      city: location.name,
      nation: location.countryCode,
      longitude: Number.parseFloat(location.lng),
      latitude: Number.parseFloat(location.lat),
      timezone: timezoneId,
    },
  };
}

function summarizeNatalChart(chart: AstrologerChartResponse) {
  return {
    sun: humanizeSign(chart.chart_data?.subject?.sun?.sign),
    moon: humanizeSign(chart.chart_data?.subject?.moon?.sign),
    venus: humanizeSign(chart.chart_data?.subject?.venus?.sign),
  };
}

function summarizeCurrentTransits(
  chart: AstrologerChartResponse | null,
  context: AstrologerContextResponse | null,
) {
  return {
    headline:
      extractNatalContextParagraphs(context?.context ?? "")[0] ??
      "Current transits emphasize movement and emotional processing.",
    highlights: chart
      ? [
          `Transit sun: ${humanizeSign(chart.chart_data?.subject?.sun?.sign)}`,
          `Transit moon: ${humanizeSign(chart.chart_data?.subject?.moon?.sign)}`,
        ]
      : [],
  };
}

function summarizeFutureWindow(
  chart: AstrologerChartResponse | null,
  context: AstrologerContextResponse | null,
) {
  return {
    windowLabel: "Next 4-8 weeks",
    summary:
      extractNatalContextParagraphs(context?.context ?? "")[1] ??
      summarizeCurrentTransits(chart, context).headline,
  };
}

export async function buildAstrologyBundle(input: ParsedReadingInput): Promise<AstrologyBundle> {
  const resolvedLocation = await resolveLocation(input);
  if (resolvedLocation.kind !== "resolved") {
    throw new Error("Location must be resolved before building astrology bundle");
  }

  const asOf = new Date().toISOString();
  const natalChart = await fetchChartData(input, resolvedLocation.location, resolvedLocation.timezoneId);
  const natalContext = await fetchNatalContext(input, resolvedLocation.location, resolvedLocation.timezoneId).catch(() => null);
  const transitChart = await fetchTransitChart(input, resolvedLocation.location, resolvedLocation.timezoneId, asOf).catch(() => null);
  const transitContext = await fetchTransitContext(input, resolvedLocation.location, resolvedLocation.timezoneId, asOf).catch(() => null);

  return {
    normalizedBirth: input,
    chartRequest: buildAstrologerPayload(input, resolvedLocation.location, resolvedLocation.timezoneId),
    asOf,
    natalChart,
    natalContext,
    transitChart,
    transitContext,
    natalSummary: summarizeNatalChart(natalChart),
    transitSummary: summarizeCurrentTransits(transitChart, transitContext),
    futureWindowSummary: summarizeFutureWindow(transitChart, transitContext),
  };
}
```

- [ ] **Step 4: Keep `lib/reading.ts` as the orchestration layer**

```ts
import { buildAstrologyBundle } from "@/lib/astrology-bundle";

export async function resolveReadingFlow(rawInput: RawReadingInput): Promise<ReadingOutcome> {
  const parsed = parseReadingSearchParams(rawInput);
  const locationOutcome = await resolveLocation(parsed);

  if (locationOutcome.kind === "location-match") {
    return {
      kind: "location-match",
      city: parsed.city,
      country: parsed.country,
      candidates: locationOutcome.candidates,
    };
  }

  if (locationOutcome.kind === "reading-unavailable") {
    return { kind: "reading-unavailable" };
  }

  const bundle = await buildAstrologyBundle(parsed);
  const fallbackReading = buildReadingViewModel(
    parsed,
    locationOutcome.location,
    locationOutcome.timezoneId,
    bundle.natalChart,
    bundle.natalContext,
  );

  return {
    kind: "ready",
    reading: fallbackReading,
  };
}
```

- [ ] **Step 5: Run the tests and commit**

Run: `npm test -- test/reading-lib.test.ts`

Expected: PASS

```bash
git add lib/astrology-bundle.ts lib/reading.ts test/reading-lib.test.ts
git commit -m "refactor: extract astrology bundle assembly"
```

### Task 3: Add The OpenAI Reading Adapter With Strict Schema Validation

**Files:**
- Create: `D:/github/astryx-engine/.worktrees/feat-mvp-foundation/lib/ai-reading.ts`
- Modify: `D:/github/astryx-engine/.worktrees/feat-mvp-foundation/package.json`
- Create: `D:/github/astryx-engine/.worktrees/feat-mvp-foundation/test/ai-reading.test.ts`

- [ ] **Step 1: Write the failing AI adapter tests**

```ts
import { describe, expect, it, vi } from "vitest";

import {
  buildFollowUpAnswer,
  buildInitialAiReading,
} from "@/lib/ai-reading";

const bundle = {
  normalizedBirth: {
    year: 1990,
    month: 6,
    day: 15,
    hour: 14,
    minute: 30,
    city: "New York",
    country: "US",
    birthTimePrecision: "exact" as const,
  },
  asOf: "2026-04-05T12:00:00.000Z",
  natalSummary: { sun: "Gemini", moon: "Pisces" },
  transitSummary: {
    headline: "Movement and emotional overstimulation are active now.",
    highlights: ["Mars is activating work pressure.", "Venus is softening relationship tone."],
  },
  futureWindowSummary: {
    windowLabel: "Next 4-8 weeks",
    summary: "The next several weeks favor relational clarity and practical decisions.",
  },
};

describe("ai-reading", () => {
  it("returns validated paragraphs for the initial reading", async () => {
    const responsesCreate = vi.fn().mockResolvedValue({
      output_text: JSON.stringify({
        paragraphs: [
          "You are entering a period where movement in work and relationships becomes impossible to ignore.",
          "The next few weeks are better for direct decisions than passive waiting.",
        ],
      }),
    });

    const reading = await buildInitialAiReading(bundle, {
      responses: { create: responsesCreate },
    } as never);

    expect(reading.paragraphs).toHaveLength(2);
    expect(responsesCreate).toHaveBeenCalled();
  });

  it("rejects malformed model output", async () => {
    const responsesCreate = vi.fn().mockResolvedValue({
      output_text: JSON.stringify({
        body: "wrong shape",
      }),
    });

    await expect(
      buildInitialAiReading(bundle, {
        responses: { create: responsesCreate },
      } as never),
    ).rejects.toThrow(/invalid ai reading schema/i);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- test/ai-reading.test.ts`

Expected: FAIL with missing `@/lib/ai-reading`.

- [ ] **Step 3: Add the provider package**

Run: `npm install openai zod`

Expected: `added` output from npm and `package.json` updated.

- [ ] **Step 4: Implement prompt construction and schema validation**

```ts
import OpenAI from "openai";
import { z } from "zod";

const readingSchema = z.object({
  paragraphs: z.array(z.string().min(1)).min(2).max(6),
});

const followUpSchema = z.object({
  paragraphs: z.array(z.string().min(1)).min(1).max(4),
});

function getClient(client?: OpenAI) {
  return client ?? new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function getModel() {
  return process.env.OPENAI_READING_MODEL ?? "chatgpt-5.4";
}

export async function buildInitialAiReading(bundle: AstrologyBundle, client?: OpenAI) {
  const response = await getClient(client).responses.create({
    model: getModel(),
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: [
              "You are writing a premium astrology reading.",
              "Use natal grounding, current transit grounding, and the future-window summary.",
              "Do not expose raw placement lists or internal metadata.",
              "If birth time precision is not exact, soften timing-sensitive claims.",
              "Return JSON only with a paragraphs array.",
            ].join("\n"),
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: JSON.stringify({
              normalizedBirth: bundle.normalizedBirth,
              natalSummary: bundle.natalSummary,
              transitSummary: bundle.transitSummary,
              futureWindowSummary: bundle.futureWindowSummary,
              asOf: bundle.asOf,
            }),
          },
        ],
      },
    ],
  });

  return readingSchema.parse(JSON.parse(response.output_text ?? ""));
}

export async function buildFollowUpAnswer(
  bundle: AstrologyBundle,
  question: string,
  priorTurns: Array<{ role: "user" | "assistant"; paragraphs: string[] }>,
  client?: OpenAI,
) {
  const response = await getClient(client).responses.create({
    model: getModel(),
    input: [
      {
        role: "system",
        content: [{ type: "input_text", text: "Answer one astrology follow-up only. Return JSON only." }],
      },
      {
        role: "user",
        content: [{ type: "input_text", text: JSON.stringify({ bundle, priorTurns, question }) }],
      },
    ],
  });

  return followUpSchema.parse(JSON.parse(response.output_text ?? ""));
}
```

- [ ] **Step 5: Run the tests and commit**

Run: `npm test -- test/ai-reading.test.ts`

Expected: PASS

```bash
git add package.json package-lock.json lib/ai-reading.ts test/ai-reading.test.ts
git commit -m "feat: add ai reading adapter"
```

### Task 4: Upgrade The Same-Origin API Contracts

**Files:**
- Modify: `D:/github/astryx-engine/.worktrees/feat-mvp-foundation/app/api/reading/route.ts`
- Create: `D:/github/astryx-engine/.worktrees/feat-mvp-foundation/app/api/reading/follow-up/route.ts`
- Modify: `D:/github/astryx-engine/.worktrees/feat-mvp-foundation/lib/reading.ts`
- Modify: `D:/github/astryx-engine/.worktrees/feat-mvp-foundation/test/reading-lib.test.ts`

- [ ] **Step 1: Write the failing response-contract tests**

```ts
it("returns a ready response with follow-up state when ai reading succeeds", async () => {
  const outcome = await resolveReadingFlow({
    year: "1990",
    month: "6",
    day: "15",
    hour: "14",
    minute: "30",
    city: "New York",
    country: "US",
    birthTimePrecision: "exact",
  });

  expect(outcome.kind).toBe("ready");
  if (outcome.kind === "ready") {
    expect(outcome.sessionToken).toBeTruthy();
    expect(outcome.followUpOptions).toEqual(["love", "career-change", "anxiety"]);
    expect(outcome.remainingFollowUps).toBe(3);
  }
});

it("returns follow-up-ready with a rotated token", async () => {
  const response = await resolveFollowUpFlow({
    sessionToken: "signed-token",
    topic: "love",
    question: "What is happening in love right now?",
    priorTurns: [],
  });

  expect(response.kind).toBe("follow-up-ready");
  if (response.kind === "follow-up-ready") {
    expect(response.sessionToken).not.toBe("signed-token");
    expect(response.remainingFollowUps).toBe(2);
  }
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- test/reading-lib.test.ts`

Expected: FAIL because `sessionToken`, `followUpOptions`, and follow-up route are not implemented.

- [ ] **Step 3: Expand the public response types and initial route**

```ts
export type ReadyReadingOutcome = {
  kind: "ready";
  reading: ReadingViewModel;
  sessionToken: string | null;
  followUpOptions: Array<"love" | "career-change" | "anxiety">;
  remainingFollowUps: number;
};

export type FollowUpReadyOutcome = {
  kind: "follow-up-ready";
  sessionToken: string;
  answer: {
    paragraphs: string[];
  };
  remainingFollowUps: number;
  topic: "love" | "career-change" | "anxiety" | "custom";
};

export async function POST(request: Request) {
  try {
    const result = await resolveReadingFlow(await readReadingRequest(request));
    return Response.json(result);
  } catch {
    return Response.json({ kind: "reading-unavailable" });
  }
}
```

- [ ] **Step 4: Add the follow-up route**

```ts
import { parseFollowUpRequestBody, resolveFollowUpFlow } from "@/lib/reading";

export async function POST(request: Request) {
  try {
    const result = await resolveFollowUpFlow(
      parseFollowUpRequestBody(await request.json()),
    );

    return Response.json(result);
  } catch {
    return Response.json({
      kind: "follow-up-unavailable",
      message: "We could not continue this reading right now.",
      retryable: true,
      remainingFollowUps: 0,
    });
  }
}
```

- [ ] **Step 5: Run the tests and commit**

Run: `npm test -- test/reading-lib.test.ts`

Expected: PASS

```bash
git add app/api/reading/route.ts app/api/reading/follow-up/route.ts lib/reading.ts test/reading-lib.test.ts
git commit -m "feat: add reading follow-up api contracts"
```

### Task 5: Add Same-Page Follow-Up UI And Token Rotation

**Files:**
- Modify: `D:/github/astryx-engine/.worktrees/feat-mvp-foundation/app/page.tsx`
- Modify: `D:/github/astryx-engine/.worktrees/feat-mvp-foundation/app/reading-start-page.tsx`
- Modify: `D:/github/astryx-engine/.worktrees/feat-mvp-foundation/app/reading-page.tsx`
- Modify: `D:/github/astryx-engine/.worktrees/feat-mvp-foundation/test/home-page.test.tsx`
- Modify: `D:/github/astryx-engine/.worktrees/feat-mvp-foundation/test/reading-page.test.tsx`

- [ ] **Step 1: Write the failing UI tests**

```tsx
it("renders follow-up chips after the initial ai reading", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({
          kind: "ready",
          reading: { body: ["Initial AI reading paragraph."] },
          sessionToken: "token-1",
          followUpOptions: ["love", "career-change", "anxiety"],
          remainingFollowUps: 3,
        }),
    }),
  );

  render(<Home />);
  fireEvent.submit(document.getElementById("reading-start-form") as HTMLFormElement);

  expect(await screen.findByText(/initial ai reading paragraph/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /感情/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /工作变动/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /焦虑与情绪/i })).toBeInTheDocument();
});

it("rotates the session token and appends a follow-up answer", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            kind: "ready",
            reading: { body: ["Initial AI reading paragraph."] },
            sessionToken: "token-1",
            followUpOptions: ["love", "career-change", "anxiety"],
            remainingFollowUps: 3,
          }),
      })
      .mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            kind: "follow-up-ready",
            sessionToken: "token-2",
            answer: { paragraphs: ["Love is becoming more direct and clarifying."] },
            remainingFollowUps: 2,
            topic: "love",
          }),
      }),
  );

  render(<Home />);
  fireEvent.submit(document.getElementById("reading-start-form") as HTMLFormElement);
  fireEvent.click(await screen.findByRole("button", { name: /感情/i }));

  expect(await screen.findByText(/love is becoming more direct and clarifying/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- test/home-page.test.tsx test/reading-page.test.tsx`

Expected: FAIL because the current UI has no follow-up controls or follow-up request state.

- [ ] **Step 3: Add follow-up state to the homepage container**

```tsx
const [followUpTurns, setFollowUpTurns] = useState<
  Array<
    | { role: "assistant"; paragraphs: string[] }
    | { role: "user"; text: string }
  >
>([]);
const [sessionToken, setSessionToken] = useState<string | null>(null);
const [remainingFollowUps, setRemainingFollowUps] = useState(0);
const [isSubmittingFollowUp, setIsSubmittingFollowUp] = useState(false);

async function handleFollowUpSubmit(topic: "love" | "career-change" | "anxiety" | "custom", question: string) {
  if (!sessionToken || remainingFollowUps <= 0) {
    return;
  }

  setIsSubmittingFollowUp(true);

  const response = await fetch("/api/reading/follow-up", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionToken,
      topic,
      question,
      priorTurns: followUpTurns,
    }),
  });

  const payload = await response.json();

  if (payload.kind === "follow-up-ready") {
    setSessionToken(payload.sessionToken);
    setRemainingFollowUps(payload.remainingFollowUps);
    setFollowUpTurns((current) => [
      ...current,
      { role: "user", text: question },
      { role: "assistant", paragraphs: payload.answer.paragraphs },
    ]);
  }

  setIsSubmittingFollowUp(false);
}
```

- [ ] **Step 4: Render chips, custom input, and inline turns**

```tsx
function ReadingPageContent({
  reading,
  followUpOptions,
  followUpTurns,
  onSelectFollowUp,
  onSubmitCustomQuestion,
  remainingFollowUps,
  isSubmittingFollowUp,
}: {
  reading: ReadingViewModel;
  followUpOptions: Array<"love" | "career-change" | "anxiety">;
  followUpTurns: Array<{ role: "user" | "assistant"; text?: string; paragraphs?: string[] }>;
  onSelectFollowUp: (topic: "love" | "career-change" | "anxiety") => void;
  onSubmitCustomQuestion: (question: string) => void;
  remainingFollowUps: number;
  isSubmittingFollowUp: boolean;
}) {
  return (
    <section className="space-y-6">
      <div className="space-y-4">
        {reading.body.map((paragraph) => (
          <p key={paragraph} className="text-base leading-8 text-foreground/92">
            {paragraph}
          </p>
        ))}
      </div>

      {followUpOptions.length > 0 ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => onSelectFollowUp("love")} disabled={remainingFollowUps <= 0 || isSubmittingFollowUp}>感情</button>
            <button type="button" onClick={() => onSelectFollowUp("career-change")} disabled={remainingFollowUps <= 0 || isSubmittingFollowUp}>工作变动</button>
            <button type="button" onClick={() => onSelectFollowUp("anxiety")} disabled={remainingFollowUps <= 0 || isSubmittingFollowUp}>焦虑与情绪</button>
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              onSubmitCustomQuestion(String(formData.get("question") ?? ""));
            }}
          >
            <input name="question" placeholder="Ask about love, work, anxiety, or something specific" />
          </form>
        </div>
      ) : null}

      <div className="space-y-5">
        {followUpTurns.map((turn, index) =>
          turn.role === "assistant" ? (
            <div key={index} className="space-y-3">
              {turn.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </div>
          ) : (
            <p key={index} className="text-sm text-muted">{turn.text}</p>
          ),
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Run the tests and commit**

Run: `npm test -- test/home-page.test.tsx test/reading-page.test.tsx`

Expected: PASS

```bash
git add app/page.tsx app/reading-start-page.tsx app/reading-page.tsx test/home-page.test.tsx test/reading-page.test.tsx
git commit -m "feat: add same-page ai follow-ups"
```

### Task 6: Verify Fallbacks, Contracts, And Regression Coverage

**Files:**
- Modify: `D:/github/astryx-engine/.worktrees/feat-mvp-foundation/test/ai-reading.test.ts`
- Modify: `D:/github/astryx-engine/.worktrees/feat-mvp-foundation/test/reading-lib.test.ts`
- Modify: `D:/github/astryx-engine/.worktrees/feat-mvp-foundation/test/home-page.test.tsx`

- [ ] **Step 1: Add regression tests for fallback and cap behavior**

```ts
it("falls back to the non-llm reading body when the model call fails", async () => {
  const outcome = await resolveReadingFlow({
    year: "1990",
    month: "6",
    day: "15",
    hour: "14",
    minute: "30",
    city: "New York",
    country: "US",
    birthTimePrecision: "exact",
  });

  expect(outcome.kind).toBe("ready");
  if (outcome.kind === "ready") {
    expect(outcome.reading.body.length).toBeGreaterThan(0);
  }
});

it("disables follow-up controls after three successful answers", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            kind: "ready",
            reading: { body: ["Initial AI reading paragraph."] },
            sessionToken: "token-1",
            followUpOptions: ["love", "career-change", "anxiety"],
            remainingFollowUps: 3,
          }),
      })
      .mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            kind: "follow-up-ready",
            sessionToken: "token-2",
            answer: { paragraphs: ["Follow-up one."] },
            remainingFollowUps: 2,
            topic: "love",
          }),
      })
      .mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            kind: "follow-up-ready",
            sessionToken: "token-3",
            answer: { paragraphs: ["Follow-up two."] },
            remainingFollowUps: 1,
            topic: "career-change",
          }),
      })
      .mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            kind: "follow-up-ready",
            sessionToken: "token-4",
            answer: { paragraphs: ["Follow-up three."] },
            remainingFollowUps: 0,
            topic: "anxiety",
          }),
      }),
  );

  render(<Home />);
  fireEvent.submit(document.getElementById("reading-start-form") as HTMLFormElement);
  fireEvent.click(await screen.findByRole("button", { name: /感情/i }));
  fireEvent.click(await screen.findByRole("button", { name: /工作变动/i }));
  fireEvent.click(await screen.findByRole("button", { name: /焦虑与情绪/i }));

  expect(await screen.findByRole("button", { name: /感情/i })).toBeDisabled();
  expect(screen.getByRole("button", { name: /工作变动/i })).toBeDisabled();
  expect(screen.getByRole("button", { name: /焦虑与情绪/i })).toBeDisabled();
});
```

- [ ] **Step 2: Run the focused regression suite**

Run: `npm test -- test/ai-reading.test.ts test/reading-lib.test.ts test/home-page.test.tsx`

Expected: PASS

- [ ] **Step 3: Run lint and the full suite**

Run: `npm test`

Expected: PASS with all tests green

Run: `npm run lint`

Expected: PASS with no ESLint errors

- [ ] **Step 4: Manually verify the single-page interaction**

Run: `npm run dev`

Expected:
- homepage still loads at `http://localhost:3000`
- submitting a valid birth form shows a same-page AI reading
- clicking one follow-up chip appends a new answer inline
- the custom question input works
- after the third successful follow-up, controls disable and the soft ending state appears

- [ ] **Step 5: Commit**

```bash
git add test/ai-reading.test.ts test/reading-lib.test.ts test/home-page.test.tsx
git commit -m "test: cover ai reading fallbacks and follow-up limits"
```

## Self-Review

### Spec Coverage

- initial AI-written reading: Task 3 and Task 4
- natal + transit + future window grounding: Task 2 and Task 3
- same-page follow-ups with chips + custom question: Task 5
- prompt trust boundary and schema validation: Task 3
- signed rotating session token and no persistence: Task 1 and Task 4
- fixed 3-round cap and stale-token prevention: Task 1, Task 4, and Task 6
- fallback to non-LLM body when AI fails: Task 4 and Task 6

### Placeholder Scan

- no `TODO` or `TBD`
- no “write tests” without explicit test code
- every file path is explicit
- every run step includes the command and expected result

### Type Consistency

- initial route returns `kind: "ready"` plus `sessionToken`, `followUpOptions`, `remainingFollowUps`
- follow-up route returns `kind: "follow-up-ready"` plus rotated `sessionToken`
- fixed follow-up keys stay `love | career-change | anxiety`
- session token always carries `followUpCount` and `asOf`
