# Astryx V1 Flow Without Storage Design

## Goal

Implement the first real Astryx product flow without Supabase or durable persistence yet, while preserving the intended V1 product shape from the office-hours design.

Hard requirements added on 2026-04-05:

- real astrological facts in this slice must come from `g-battaglia/kerykeion`
- for this implementation slice, those facts will be obtained through the official `Astrologer API`
- location input will be standardized through `GeoNames` before the chart request is made

The output of this slice is a working single-page frontend/server flow for:

- birth input
- time precision selection
- inline generation state
- inline full AI reading
- inline support states for location matching and unavailable reading
- product-structured reading sections derived from the official natal context endpoint

This slice is intentionally stateless or ephemeral. It should prove the product interaction model before database-backed persistence is added.

Local setup requires these environment variables:

- `GEONAMES_USERNAME`
- `RAPIDAPI_KEY`
- `RAPIDAPI_HOST`

## Scope

In scope:

- replace the current static form-to-static-result jump with a real same-page flow
- add birth time precision as a first-class input
- submit input to the backend without route changes or query-param transport
- render generating, reading, and fallback states directly below the form
- render a full reading shaped like the product spec, not just decorative static content
- use `g-battaglia/kerykeion` chart facts via the official `Astrologer API`
- use `POST /api/v5/context/birth-chart` to supply the primary interpretive body copy for the inline reading
- use simple request/response state only, no Supabase

Out of scope:

- Supabase tables, auth, anonymous session persistence, or same-device recovery
- GPT-backed reading generation
- payments or real unlock processing
- persistent storage
- URL-based restore of prior results

## Product Constraints From The Source Design

This design follows `ASTRYX_OFFICE_HOURS_DESIGN_2026-04-02.md`.

Key product requirements preserved in this slice:

- the core path is guided and single-purpose, not a dashboard
- birth-time certainty is a first-class concept
- the reading must feel complete and premium, not like bait
- trust and certainty language must stay explicit
- astrology facts surfaced in the UI must originate from Kerykeion, not handcrafted placeholders
- the reading surface should feel like a direct reading, not a diagnostic report or generated-status panel

## User Flow

### Primary Path

1. User lands on the homepage
2. User enters birth date, birth time, city, country, and time precision
3. User submits the form without leaving the page
4. The page shows an inline generating state directly below the form
5. The same page replaces that generating state with one of:
   - full reading
   - location-match support state
   - reading-unavailable fallback
6. Full reading renders inline:
   - one continuous premium reading body
   - minimal presentation chrome
   - full result state without paywall boundary

### Secondary Inline States

- `location-match`
  Use when location resolution needs user confirmation. For this slice it appears as an inline state section under the form.

- `reading-unavailable`
  Use when generation cannot produce a usable reading. For this slice it appears as an inline fallback section under the form.

## State Model

Use a lightweight request-driven flow, not persistent app state.

Recommended model:

- submit the form to a same-origin server endpoint
- keep the browser on `/`
- show a local inline generating state while the request is in flight
- standardize the birth place through `GeoNames` on the server
- call the official `Astrologer API` with normalized location and time data
- return a discriminated result union:
  - `ready`
  - `location-match`
  - `reading-unavailable`
- render the appropriate inline result section directly below the form

This keeps the code simple and lets us later swap in real persistence without redesigning the data contract.

## Input Model

Required fields:

- `year`
- `month`
- `day`
- `city`
- `country`
- `birthTimePrecision`

Conditionally meaningful fields:

- `hour`
- `minute`

`birthTimePrecision` values:

- `exact`
- `approximate`
- `unknown`

Behavior rules:

- `exact`: hour and minute are expected and the UI can claim strongest certainty
- `approximate`: hour and minute are allowed, but certainty language must soften
- `unknown`: hour and minute may be blank and time-sensitive claims must soften further

Computation rule:

- Kerykeion is the source of truth for any chart facts displayed in the reading
- the official `Astrologer API` is the transport for that Kerykeion-backed computation
- if time precision is weak, the UI must reduce certainty and avoid time-sensitive overclaims even if partial chart data exists
- `unknown` birth time may use a neutral fallback time for API compatibility, but time-sensitive claims must remain softened

## Page Requirements

### Start Page

Keep the current form on `/` and add an inline result region directly below it.

Requirements:

- user can choose `exact`, `approximate`, or `unknown`
- supporting text updates or is phrased so the precision model is legible
- if `unknown` is selected, blank time fields remain acceptable in the frontend flow
- submit does not navigate away from `/`

### Inline Generating State

Purpose:

- make the flow feel intentional without leaving `/`
- set user expectation that a chart snapshot and reading are being assembled

Requirements:

- staged progress copy
- preserve the midnight astrology / observatory visual system
- no fake spinner-only dead state
- appears directly under the form while the server request is running

Suggested staged copy:

- `Locking birth details`
- `Resolving chart precision`
- `Preparing your reading`

### Inline Reading State

The reading result must feel like the reading itself, not like a status card that wraps the reading.

Required hierarchy:

1. direct opening into the reading text
2. a continuous interpretive body or a very lightly separated sequence of paragraphs
3. calm continuation or restart affordances if needed, but no payment boundary

Reading content should become deterministic but input-sensitive.

Examples:

- the first visible line is already part of the reading, not a heading that says the reading is ready
- the body is sourced from `context/birth-chart`, mapped into a product reading shape, and lightly edited for precision honesty
- approximate or unknown time inputs soften time-sensitive claims within the reading body itself
- normalized chart facts remain available to the server as grounding material, but are not repeated to the user as a supporting-facts module in this slice

Interpretation mapping rules for this slice:

- the natal context XML is the primary source for the visible reading body
- the visible output should read as one coherent reading, not a dump of API fields
- if the natal context payload is missing, malformed, or too unstable to map cleanly, the UI falls back to the current deterministic short-form reading copy instead of failing
- chart-data facts remain a grounding source for fallback text and server-side validation, but are not rendered in a separate evidence panel

The reading does not need to be intelligent yet, but it must not feel static relative to user input.

### Location Match State

For this slice, implement a shell state only.

Requirements:

- section title explaining that multiple locations matched
- calm confirmation language
- static candidate list for the first implementation slice
- return/back affordance without leaving the page

### Reading Unavailable State

For this slice, implement a shell fallback only.

Requirements:

- preserve trust
- explain that the reading could not be prepared right now
- offer retry
- do not sound catastrophic or mystical

## Data Derivation Rules

Kerykeion is the chart engine for this slice, accessed through the official `Astrologer API`. Interpretation framing and UI summaries must still stay deterministic and honest.

Allowed:

- vary labels, certainty text, and summary wording by precision state
- echo normalized place data
- echo formatted date/time input
- show a “normalized input” trust module based on provided fields
- vary section framing and caution language based on precision state
- consume real chart facts from a Kerykeion-backed computation layer
- show the normalized place label, timezone, and UTC timestamp returned from the resolution + chart pipeline

Not allowed:

- invent placements that claim to come from real astrology computation
- imply timezone resolution already happened when it did not
- imply the chart is truly calculated when it is not

## Technical Approach

### Recommended Approach

Use a same-page client shell on the homepage plus a thin same-origin server endpoint, with two server-side integrations:

- `GeoNames` resolves `city/country` into a canonical place, latitude, longitude, and timezone
- the official `Astrologer API` returns Kerykeion-backed chart facts using that normalized birth snapshot
- the official `Astrologer API` natal context endpoint returns XML-structured interpretation material used to populate the product reading sections

Why:

- minimal complexity
- works in Next.js without storage
- avoids bundling a local Python runtime into this slice
- keeps the chart provider isolated behind one server-side adapter
- lets the UI feel immediate without route transitions
- future migration path to persisted readings or a different chart provider is clean

Recommended computation boundary:

- a same-origin POST endpoint receives birth input
- GeoNames resolves place and timezone
- Astrologer API computes structured chart facts
- Astrologer API computes natal context for interpretation
- the server returns a discriminated UI result payload
- the homepage client renders that payload inline

### File Shape

Expected additions or updates:

- `app/page.tsx`
- same-origin server endpoint files
- server-side GeoNames adapter files
- server-side Astrologer API adapter files
- small local helper module for formatting a premium reading payload
- targeted tests for inline generating, inline reading, precision states, and integration boundaries

## Testing Requirements

Must cover:

- homepage/start page exposes precision selection
- `unknown` precision does not require hour/minute in the frontend flow
- homepage shows staged progress UI inline while generating
- inline reading opens directly into the reading text with no `Reading ready` status header
- reading body changes its certainty framing by precision mode without exposing a separate evidence or fact panel
- reading consumes Kerykeion-derived facts and natal context instead of hardcoded astrology facts
- reading prefers natal-context-derived copy for its visible body and falls back cleanly when context is unavailable
- location normalization resolves a canonical place and timezone before the chart request
- location-match and reading-unavailable states render core fallback messaging inline

## Risks

### Risk 1: Fake depth

If full-reading copy looks too specific before real chart calculation exists, the product will feel dishonest.

Mitigation:

- keep current copy emotionally plausible but clearly framed as an early full-reading structure
- tie certainty language to input precision
- require Kerykeion to provide the factual astrology layer before surfacing chart-specific claims

### Risk 2: UI state fragmentation

If form, generating, reading, and fallback states do not share one state contract, the homepage will become brittle quickly.

Mitigation:

- define one normalized result union now

### Risk 3: Precision gets buried

If precision is just another field and not reflected downstream, the core trust promise is already broken.

Mitigation:

- surface precision in the reading trust strip and summary behavior immediately

### Risk 4: Third-party dependency drift

The Astrologer API docs currently contain endpoint-path inconsistencies between overview pages and endpoint pages.

Mitigation:

- trust live-tested endpoint pages over older quick-start snippets
- isolate outbound API calls in one adapter
- keep explicit tests around payload shape and error handling

## Recommended Slice Order

1. keep normalized input + precision selection on the start page
2. add a same-origin generation endpoint
3. add inline generating and result-state rendering on the homepage
4. add inline support-state sections for location-match and unavailable
5. refine tests and copy
