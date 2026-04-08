# Astryx AI Reading + Follow-Ups Design

## Goal

Upgrade the current single-page Astryx flow from “structured astrology text shown to the user” into a true AI reading product.

The first result should become a complete AI-written reading that combines:

- natal chart analysis
- current transit analysis
- a short future-window trend view

After the first reading, the user can continue with `2-3` follow-up questions in the same page session.

This slice keeps the current no-storage architecture. The objective is to prove the product interaction and AI response quality before persistence is added.

## Product Outcome

The homepage experience becomes:

1. user enters birth details
2. same-page generating state appears
3. a full AI reading appears inline
4. the user can continue with short guided follow-ups

This should feel closer to a premium astrology advisor than a chart report.

## Core Product Requirements

- the first response must be a real AI-written reading, not just cleaned API output
- the AI must reason over both natal and transit context
- the answer should include both interpretation and near-term trend framing
- the experience must remain single-page
- follow-ups must feel continuous with the first reading
- the interaction must stay bounded, not become an open-ended chat product in this slice

## Scope

In scope:

- replace the current context-cleaned first reading with a `ChatGPT 5.4` generated reading
- add transit data and transit context to the server-side astrology input bundle
- add a short future-window framing for the next few weeks
- support up to `3` total follow-up rounds after the initial reading
- provide fixed follow-up chips:
  - `感情`
  - `工作变动`
  - `焦虑与情绪`
- allow a user-written custom follow-up question
- render the follow-up exchange inline below the initial reading

Out of scope:

- persistence across refreshes
- user accounts or saved reading history
- arbitrarily long chat sessions
- voice
- agent tool use
- exact-date prediction promises

## AI Inputs

The server-side AI layer should combine these sources:

- natal chart data
- natal context
- current transit chart data
- current transit context
- a deterministic server-side future-window summary for the next `4-8` weeks
- normalized user input metadata useful for grounding
- conversation state for follow-up rounds in the current request/session only

The AI should never operate from just the user’s freeform question alone. It should always receive the structured astrology bundle.

### Trust Boundary

The prompt boundary must stay server-owned.

Rules:

- system instructions are server-authored only
- developer instructions are server-authored only
- astrology grounding is injected as structured server-owned data, not pasted into user text
- prior conversation turns are passed as user/assistant history, not merged into system instructions
- the custom follow-up question is always treated as user input only
- model output must be schema-validated on the server before it reaches the browser

This prevents the user from overriding prompt policy with freeform follow-up text.

## Model

Use `ChatGPT 5.4`.

The server owns the prompt construction. The browser never calls the model directly.

## Response Contract

The AI layer must return a strict server-owned contract, not freeform provider output.

### Initial Response

The initial same-origin reading response should include:

- `kind: "ready"`
- `sessionToken`
- `reading`
- `followUpOptions`
- `remainingFollowUps`

Recommended reading shape:

- `reading.paragraphs: string[]`

Recommended fixed follow-up options:

- `love`
- `career-change`
- `anxiety`

The user-facing labels for those options may remain:

- `感情`
- `工作变动`
- `焦虑与情绪`

### Follow-Up Response

Each follow-up response should include:

- `kind: "follow-up-ready"`
- `sessionToken`
- `answer`
- `remainingFollowUps`
- `topic`

Recommended answer shape:

- `answer.paragraphs: string[]`

### Error Response

Follow-up errors should use a stable same-origin error shape instead of leaking provider details.

Recommended shape:

- `kind: "follow-up-unavailable"`
- `message`
- `retryable`
- `remainingFollowUps`

This keeps runtime validation simple and lets the UI stay deterministic.

### Session Token Rotation

The same-page session token must rotate on every successful follow-up.

Rules:

- the initial reading returns the first `sessionToken`
- each successful follow-up response returns a fresh `sessionToken`
- the client replaces the old token with the newest token immediately
- an older token becomes stale for future turns and should be rejected

This prevents replaying an earlier token to bypass follow-up counting.

## Response Shape

### Initial Reading

The first response should be a complete reading in natural language.

Desired shape:

- direct opening judgment
- explanation grounded in the chart and the current period
- emphasis on what is active now
- near-term outlook across the next few weeks

Desired tone:

- direct judgment
- reasoned explanation
- short future-window framing
- emotionally readable, but not theatrical or vague

The initial reading should not feel like:

- a chart dump
- a list of placements
- a pseudo-technical diagnostic report
- a generic self-help answer

### Follow-Up Responses

Follow-up responses should:

- build on the already computed chart context
- focus on the asked topic only
- answer more specifically than the first reading
- preserve continuity with previous answers

Follow-up topics in v1:

- `感情`
- `工作变动`
- `焦虑与情绪`
- custom user question

Each follow-up should still reference:

- natal tendencies
- what is active now in transit
- the short future window

## Conversation Limits

This slice should cap the interaction at `3` follow-up rounds.

Behavior:

- before the cap, follow-up controls remain enabled
- after the cap, controls disable and the UI presents a soft ending state
- the user can restart by submitting a new birth reading

This keeps the interaction product-shaped instead of turning into an unbounded chatbot.

## UX Requirements

### Result Area

After generation completes, the result area should show:

1. the AI-written initial reading
2. a compact row of fixed follow-up chips
3. a custom question input
4. inline follow-up answers below the initial reading

The current `AI reading first` presentation should remain visually clean:

- no `Reading ready`
- no evidence panel
- no trust strip
- no obvious status-card framing around the answer

### Fixed Follow-Up Actions

The fixed actions should feel like natural continuations, not system commands.

They may be labeled in Chinese exactly as:

- `感情`
- `工作变动`
- `焦虑与情绪`

### Custom Follow-Up Input

The user should also be able to type a question such as:

- relationship uncertainty
- whether now is a good time to change jobs
- why they feel restless or anxious recently

The input should remain scoped by the same chart context. It is not a blank-slate general assistant.

## Technical Approach

### Server Responsibilities

The server should:

- keep the existing input validation and location normalization
- continue using Astrologer API for natal facts
- add transit data retrieval
- add transit context retrieval
- derive the future-window summary on the server from transit inputs before the LLM call
- build one internal astrology bundle
- send that bundle to `ChatGPT 5.4`
- return a normalized UI response object for:
  - initial reading
  - follow-up answer

### Future Window Source

The future-window summary must have one deterministic source of truth.

Rules:

- it is derived on the server from the same transit grounding used for the reading
- it must not come from a separate freeform model call
- it is included in the LLM input bundle as structured guidance
- if it cannot be derived, the AI layer still works with natal and current-transit grounding only

This avoids model-on-model drift and keeps fallback behavior simple.

### Client Responsibilities

The client should:

- keep the current single-page form flow
- render the initial reading
- render fixed follow-up chips and custom input
- submit follow-up requests to a same-origin endpoint
- append new follow-up answers inline
- enforce the `3`-round interaction cap in UI state

## State Model

This slice remains stateless across refreshes but stateful within the current browser session.

Recommended shape:

- initial request returns:
  - `sessionToken`
  - initial AI reading
  - remaining follow-up count
- follow-up request sends:
  - `sessionToken`
  - prior conversation turns needed for continuity
  - selected fixed topic or custom question

### Session Carrier

Because persistence is still out of scope, the server should not issue a database-backed session identifier for this slice.

Use a signed, tamper-evident `sessionToken` that contains the minimum astrology grounding needed for the current browser session, including:

- normalized birth input snapshot
- natal grounding summary
- transit grounding summary
- follow-up count state
- transit time anchor

The client keeps this token only in local memory for the current page session.

This avoids server persistence while still letting follow-up requests remain compact and verifiable.

### Conversation State

The browser should also keep the displayed conversation turns in local memory and send only the minimal turn history needed for continuity.

No refresh recovery is required in this slice.

## Transit Time Anchor

Transit analysis must stay anchored for the entire same-page session.

Rules:

- the initial reading locks one `asOf` timestamp on the server
- the initial reading also locks one future window relative to that same `asOf`
- every follow-up in the same session reuses the same transit grounding
- follow-ups do not silently recompute “now” on every turn

This prevents the user from getting slightly different “current period” answers across turn 1, turn 2, and turn 3.

If the user wants refreshed timing, they should start a new reading.

## Round Counting Rules

The follow-up cap must be explicit.

Rules:

- the initial reading does **not** count as a follow-up round
- the cap applies to successful follow-up answers only
- fixed follow-up chips and custom questions share the same counter
- a failed follow-up request does **not** consume a round
- the first slice allows at most `3` successful follow-up rounds

UI behavior:

- before the cap, chips and input remain enabled
- after the cap, both chips and input disable together
- after the cap, show a soft ending state and suggest starting a new reading

## Prompting Requirements

The prompt must make the model do three things:

1. ground itself in astrology inputs rather than guessing
2. produce a premium, readable reading instead of repeating raw placements
3. preserve bounded scope and avoid overclaiming exact certainty

Prompt rules:

- if birth time precision is weak, explicitly soften timing-sensitive statements
- use transit and future-window framing for “what is happening now”
- do not promise exact future dates unless they are explicitly supported and intentionally scoped
- keep answers specific but not deterministic in a false way

## Error Handling

If the AI layer fails:

- do not break the whole reading flow
- fall back to the current non-LLM reading body
- do not expose raw model/provider errors to the user

If follow-up generation fails:

- keep the initial reading visible
- show a calm inline retry state for the failed follow-up

## Testing Requirements

Must cover:

- initial reading path uses the model layer when all required inputs are available
- fallback to non-LLM reading still works if the model layer fails
- follow-up chips submit correctly
- custom follow-up input submits correctly
- follow-up rounds append in order
- follow-up round cap is enforced
- weak time precision still softens model-visible claims
- transit inputs are included in the AI bundle

## Risks

### Risk 1: Model becomes generic

If the prompt is weak, the result will sound like generic wellness text.

Mitigation:

- include concrete natal + transit signals
- require direct judgment, reasons, and short future-window framing

### Risk 2: Overclaiming

If the model speaks too definitely under weak birth-time precision, the product loses trust.

Mitigation:

- inject explicit precision rules into the prompt
- retain server-side precision-aware grounding

### Risk 3: Follow-ups become open-ended chat

If the UX is not bounded, this slice turns into a chatbot instead of a focused astrology product.

Mitigation:

- fixed chips
- scoped custom input
- `3`-round cap

### Risk 4: Transit layer adds complexity too early

Transit retrieval and summarization can complicate the first AI integration.

Mitigation:

- keep the future window short
- keep the returned UI shape simple
- isolate transit gathering behind one server-side adapter
