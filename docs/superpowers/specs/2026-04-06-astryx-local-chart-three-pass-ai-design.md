# Astryx Local Chart + Three-Pass AI Design

## Goal

Replace the current RapidAPI-dependent astrology reading flow with a repo-local chart provider and a new three-pass AI interpretation pipeline.

The new server flow should:

1. compute natal chart data locally through the repo-owned `Kerykeion` FastAPI service
2. normalize the chart data into a stable server-owned JSON payload
3. call `ChatGPT 5.4` three separate times with different prompt goals:
   - `Pass 1`: chart explanation in Chinese
   - `Pass 2`: structured psychological/life-pattern analysis in Chinese
   - `Pass 3`: structured predictive reading in Chinese
4. return those AI-owned results to the browser for deterministic rendering

The browser should never render raw chart JSON directly to the user.

## Product Outcome

The homepage flow becomes:

1. user enters birth details
2. same-page generating state appears
3. the server computes a natal chart locally
4. the server runs three AI passes against the same normalized chart payload
5. the browser renders one primary result layer first
6. the browser allows the user to expand deeper explanation and prediction layers on demand

This should feel closer to a premium astrology interpretation product than a plain chart report or a one-shot paragraph generator.

## Reading Hierarchy

The initial result must not present all three AI passes as equal-weight blocks.

The product should use progressive disclosure:

- `Primary layer`: one concise user-facing result that answers "so what does this chart mean for me?"
- `Secondary layer A`: chart explanation and terminology support
- `Secondary layer B`: predictive reading and time-window detail

The first screen should feel like one reading, not three reports stitched together.

Implications:

- the user should always have one clear first thing to read
- explanatory detail should be collapsible or visually subordinate
- predictive detail should be collapsible or visually subordinate
- the explanation layer should support trust, not compete for attention

## Why Three Passes

The three AI passes must stay separate because they serve different product purposes:

- `Pass 1` explains the chart language so the user can understand what the chart says
- `Pass 2` turns the chart into a structured deep profile
- `Pass 3` turns the chart into a structured prediction layer

The system must not feed the natural-language output of one pass into the next pass.

All three passes must read from the same server-owned normalized chart payload.

Reason:

- feeding prose from pass 1 into pass 2 or 3 risks analysis pollution
- keeping a common input source makes prompt iteration easier
- keeping a common input source makes debugging easier
- the prediction layer can be tightened or softened without affecting the explanatory layer

## Scope

In scope:

- replace `astrologer.p.rapidapi.com` with the local `Kerykeion` provider for natal chart generation
- keep the chart generation and normalization server-owned
- create a normalized chart payload specifically designed for AI use
- implement three server-side `ChatGPT 5.4` calls with strict output schema validation
- redesign the initial reading response contract to return all three AI outputs
- add a primary-result layer above the detailed AI outputs
- update the frontend to render the result as one primary layer plus expandable secondary layers instead of three equal blocks
- keep the current same-page experience
- keep follow-up support working after the initial result is shown
- anchor follow-up to the primary interpretation and prediction layers, not to glossary-style explanation

Out of scope:

- persistence across refreshes
- user accounts
- saved reading history
- voice
- arbitrary open-ended agent workflows
- multi-chart products such as synastry or compatibility
- replacing the current follow-up system in this slice

## Architecture

### Server-Owned Data Flow

The server flow should be:

1. parse user input
2. resolve Chinese postal code to location and timezone
3. call the local natal chart API
4. normalize the raw chart response into a stable AI payload
5. run AI pass 1 using that payload
6. run AI pass 2 using that payload
7. run AI pass 3 using that payload
8. validate every AI output against server-owned schema
9. return a deterministic same-origin response to the browser

### Trust Boundary

The trust boundary must stay server-owned.

Rules:

- the browser never calls the model directly
- the browser never assembles model prompts
- the browser never sends prompt instructions
- the local chart API is server-to-server only
- prompt templates are stored in server code
- all AI outputs are schema-validated before they reach the browser
- follow-up user text remains user input only and must not become prompt policy

## Local Chart Provider

The app should use the repo-local `Kerykeion` FastAPI service as the natal chart source.

Expected local output now includes:

- point sign and house
- point degrees:
  - `position`
  - `abs_pos`
- house cusps:
  - `houses.cusps`
  - `houses.list`
- natal aspects:
  - `aspects.all`
  - `aspects.relevant`

The application should stop depending on `astrologer.p.rapidapi.com` for natal chart generation in this slice.

Transit and more advanced forecasting inputs may still remain absent until a separate slice adds a local transit-capable source. This design focuses on a robust natal-first pipeline.

## Normalized Chart Payload

The raw local chart JSON should not be passed directly to the model.

The server should build one normalized chart payload designed for prompt stability.

Recommended top-level shape:

- `meta`
- `points`
- `houses`
- `aspects`
- `derivedSignals`
- `inputContext`

### `meta`

Recommended fields:

- `chartType`
- `localDateTime`
- `utcDateTime`
- `timezone`
- `birthTimePrecision`
- `locationLabel`

### `points`

Recommended fields per point:

- `id`
- `label`
- `sign`
- `house`
- `position`
- `absPos`
- `retrograde`

At minimum the normalized payload should include:

- Sun
- Moon
- Mercury
- Venus
- Mars
- Ascendant
- Midheaven

Additional points may be added later, but this slice should avoid forcing the prompts to depend on unstable extras unless they are consistently present.

### `houses`

Recommended shape:

- `cusps: number[]`
- `list: Array<{ house: string; sign: string; position: number; absPos: number }>`

### `aspects`

Recommended shape:

- `all`
- `relevant`

The server may prune noisy aspects before sending to AI if needed, but that pruning must happen deterministically in server code, not inside the prompt.

### `derivedSignals`

This section should contain server-computed stable summaries that make prompt iteration easier.

Examples:

- angular emphasis
- repeated house themes
- repeated sign themes
- major aspect clusters
- confidence downgrades if birth time is not exact

The purpose is not to replace the raw chart data, but to provide a clean bridge between raw data and interpretation.

## Prompt System Design

Prompt design must optimize for later iteration.

Do not keep each prompt as a single long freeform string. Instead, build each pass from reusable prompt modules.

Recommended prompt module groups:

- `systemGoal`
- `hardConstraints`
- `toneRules`
- `inputContract`
- `outputContract`
- `taskRules`

Each AI pass should compose its final prompt from those modules.

Benefits:

- easier to soften or strengthen prediction language later
- easier to add or remove sections without rewriting all instructions
- easier to A/B test tone
- easier to debug prompt regressions

## AI Pass 1: Chart Explanation Layer

### Goal

Translate the normalized chart payload into clear Chinese explanation that helps the user understand what the chart is showing.

This pass is a supporting trust layer, not the main product layer.

### This Pass Should Do

- explain the most important chart structures
- explain how planets, signs, houses, and major aspects combine
- define terminology in readable language
- help the user understand why certain themes are prominent
- support the deeper analysis and prediction layers without replacing them

### This Pass Should Not Do

- not give fortune-telling style predictions
- not present relationship or career outcomes as facts
- not reduce the user to a simplistic personality label
- not give action advice
- not use mystical filler language when concrete language is available

### Output Shape

Pass 1 should return structured JSON, not free prose.

Recommended shape:

- `overview`
- `keyPatterns`
- `terminologyNotes`
- `caveats`

Recommended details:

- `overview: string`
- `keyPatterns: Array<{ title: string; explanation: string; evidence: EvidenceItem[] }>`
- `terminologyNotes: string[]`
- `caveats: string[]`

This result should be directly renderable in the browser.

Default presentation rule:

- collapsed by default after the initial reading resolves
- opened when the user wants to inspect the chart basis or terminology
- never treated as the main headline result

## AI Pass 2: Structured Analysis Layer

### Goal

Produce a structured Chinese analysis of enduring patterns and themes from the same normalized chart payload.

This is the main user-facing interpretation layer.

Pass 2 should own the "core reading" experience.

It should answer:

- who or what themes stand out most in this chart
- how those patterns tend to show up in thought, relationships, work, and life direction
- what the user should take away first before diving into evidence or prediction

### Sections

The pass must return exactly these sections:

- `人格`
- `行为与思维模式`
- `关系与情感模式`
- `职业与发展路径`
- `优势与风险`
- `人生主题`
- `时间维度`

### Section Shape

Each section must contain:

- `summary`
- `bullets`
- `evidence`
- `confidence`

Recommended section contract:

```json
{
  "summary": "string",
  "bullets": ["string"],
  "evidence": [
    {
      "label": "string",
      "refs": ["string"]
    }
  ],
  "confidence": "high | medium | low"
}
```

### Evidence Shape

The evidence must use the mixed format requested for both display and debugging:

- `label`: human-readable evidence text
- `refs`: machine-readable chart references

Example:

```json
{
  "label": "太阳双子落九宫，上升天秤，金星八宫",
  "refs": [
    "points.sun.sign=Gem",
    "points.sun.house=Ninth_House",
    "points.ascendant.sign=Lib",
    "points.venus.house=Eighth_House"
  ]
}
```

Presentation rule:

- `label` is user-facing by default
- `refs` are hidden behind an explicit "查看依据" affordance or comparable reveal pattern
- the UI should not dump machine-readable references inline by default

### Confidence Rules

Allowed values:

- `high`
- `medium`
- `low`

If birth time precision is not exact, the system should bias toward lower confidence for house- and angle-dependent claims.

## AI Pass 3: Structured Prediction Layer

### Goal

Produce a Chinese predictive layer that includes both near-term windows and year-ahead themes.

This pass is allowed to perform astrology-style forecasting.

### Tone

The tone should be `balanced`:

- make meaningful judgments
- avoid total certainty
- avoid empty hedging
- avoid absolute fate language

The language should use forms such as:

- `更容易`
- `这段时间更可能`
- `这一阶段的主题会集中在`

instead of purely evasive wording or absolute determinism.

### Time Horizons

The pass must include:

- `nearTerm`
- `yearAhead`

Recommended interpretation:

- `nearTerm`: next `30-90` days
- `yearAhead`: next `12` months

The prediction layer should not dominate the first screen.

### Prediction Domains

Both time horizons must cover:

- `感情`
- `事业`
- `情绪`
- `人际`
- `财务`

However, the UI does not need to expand all domains equally on first paint.

Default presentation rule:

- show at most `2-3` prioritized domains expanded at first
- keep the remaining domains collapsed behind "展开更多预测" or equivalent
- keep `nearTerm` more prominent than `yearAhead`

### Domain Shape

Each domain should contain:

- `theme`
- `forecast`
- `opportunities`
- `risks`
- `timingNotes`
- `evidence`
- `confidence`

Recommended contract:

```json
{
  "theme": "string",
  "forecast": "string",
  "opportunities": ["string"],
  "risks": ["string"],
  "timingNotes": ["string"],
  "evidence": [
    {
      "label": "string",
      "refs": ["string"]
    }
  ],
  "confidence": "high | medium | low"
}
```

### Prediction Guardrails

The prediction pass may forecast themes and likely windows, but it should still avoid:

- medical diagnosis
- legal certainty
- guaranteed financial outcome claims
- exact-date promises unless a later slice explicitly adds that requirement

## Initial Reading Response Contract

The current first-reading contract should be upgraded from a plain paragraph-based reading into a structured response with one primary layer and two secondary layers.

Recommended `kind: "ready"` shape:

- `sessionToken`
- `primary`
- `explanation`
- `analysis`
- `forecast`
- `followUpOptions`
- `remainingFollowUps`

Recommended contract:

```ts
{
  kind: "ready";
  sessionToken: string;
  primary: PrimaryReadingViewModel;
  explanation: ExplanationViewModel;
  analysis: StructuredAnalysisViewModel;
  forecast: StructuredForecastViewModel;
  followUpOptions: FollowUpOption[];
  remainingFollowUps: number;
}
```

The old paragraph-only `reading` shape should be retired after the UI is updated.

### Primary Layer Contract

The `primary` object should give the user a clear first reading target before they inspect any supporting detail.

Recommended shape:

```ts
{
  title: string;
  summary: string;
  highlights: string[];
  nextBestActions?: string[];
}
```

The primary layer may be composed deterministically from pass 2 and pass 3 outputs, or generated through a lightweight server-owned summarization step. It must not require the user to read all sections before understanding the result.

## Frontend Rendering

The frontend should render one primary layer and two secondary layers:

1. `核心解读`
2. `展开看星盘依据`
3. `展开看近期与年度预测`

### Layer 1: 核心解读

This is the first visible result.

Render:

- primary title
- primary summary
- 3-5 top highlights
- a clear affordance to continue into detailed analysis

Below that, render the most important parts of pass 2 first:

- expand the first `2-3` analysis sections by default
- keep the remaining sections collapsed behind "展开更多分析" or equivalent

### Layer 2: 展开看星盘依据

Render:

- explanation overview
- key chart patterns
- terminology notes
- caveats

This layer exists to build comprehension and trust. It should be visually subordinate to the primary layer.

### Layer 3: 展开看近期与年度预测

Render:

- `nearTerm` first
- `yearAhead` second
- only `2-3` prioritized domains expanded by default
- remaining domains collapsed behind an explicit reveal action

For expanded domains, render:

- theme
- forecast
- opportunities
- risks
- timing notes
- evidence labels
- confidence

Machine-readable `refs` should stay hidden unless the user explicitly asks to inspect evidence.

## Follow-Ups

This slice should keep the current same-page follow-up flow, but follow-ups should now operate on the new chart + AI result stack.

Follow-ups should attach to the primary interpretation and prediction layers.

They should not attach to the terminology/explanation layer.

Reason:

- users naturally ask follow-up questions about conclusions and forecasts
- they rarely ask follow-ups about glossary-style explanation
- attaching follow-up to the wrong layer makes the product feel like a report browser instead of an advisor

Follow-up requests should continue to use:

- server-owned prompt construction
- current session token rotation
- structured server-owned chart input

The follow-up slice does not need to adopt all three new output contracts immediately, but it must remain compatible with the new initial reading contract.

Recommended v1 behavior:

- follow-up questions should primarily deepen `analysis`
- prediction-oriented questions may reference `forecast`
- follow-up answers should not re-explain raw chart terminology unless the user explicitly asks

## Error Handling

The server must distinguish:

- invalid input
- local chart service unavailable
- OpenAI unavailable
- invalid schema output from any AI pass

The browser should continue receiving stable same-origin error results.

Provider-specific details should not leak into the UI.

## Testing

The implementation should add or update tests for:

- local natal provider integration
- normalized chart payload builder
- prompt module assembly
- pass 1 schema validation
- pass 2 schema validation
- pass 3 schema validation
- fallback behavior when one AI pass fails
- reading flow contract changes
- frontend rendering of all three blocks

Mocked AI tests should verify:

- the correct prompt modules are included
- the correct schema name is used
- invalid JSON is rejected
- invalid schema output is rejected

## Rollout Notes

The safest rollout is:

1. ship local natal provider + normalized chart payload
2. ship AI pass schemas and prompt modules
3. swap initial reading contract to the new three-block response
4. adapt the frontend rendering
5. re-wire follow-ups against the new contract

This keeps the biggest moving parts isolated and testable.

## Open Questions Resolved In This Spec

- raw chart JSON should not be shown directly to users
- the AI should interpret the chart in Chinese
- natural-language output from one pass should not be fed into later passes
- prompt design should be modular for iteration
- analysis output should use structured JSON schema
- prediction output should include both near-term and year-ahead horizons
- prediction tone should be balanced, not weakly hedged and not absolute
