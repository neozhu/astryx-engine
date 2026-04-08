# Astryx GeoNames + Astrologer Single-Page Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep Astryx on the homepage while submitting birth details to the backend and rendering the generating, reading, location-match, or unavailable state inline below the form.

**Architecture:** The homepage becomes a small client shell around the existing form and an inline result region. Submission goes to one same-origin POST endpoint, which resolves the place with GeoNames, fetches both natal chart facts and natal context from the Astrologer API, and returns a discriminated result payload. The page renders that payload inline without route transitions or query params.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Vitest, GeoNames web services, RapidAPI Astrologer API

---

### Completed Slice

The homepage now owns the full inline flow. Route-based result pages are no longer part of the implementation plan.

### Next Slice: AI Reading First

**Files:**
- Modify: `D:/github/astryx-engine/.worktrees/feat-mvp-foundation/lib/reading.ts`
- Modify: `D:/github/astryx-engine/.worktrees/feat-mvp-foundation/test/reading-lib.test.ts`
- Modify: `D:/github/astryx-engine/.worktrees/feat-mvp-foundation/test/home-page.test.tsx`
- Modify: `D:/github/astryx-engine/.worktrees/feat-mvp-foundation/app/reading-page.tsx`

- [ ] **Step 1: Add a failing test for AI-reading-first presentation**

Add a focused test showing that the ready state renders the reading body directly, with no `Reading ready`, `Your reading is ready`, evidence sidebar, or other diagnostic framing.

- [ ] **Step 2: Add a failing test for natal-context-backed body copy**

Add a focused test showing that when the Astrologer natal context endpoint returns usable content, the visible reading body is populated from that context instead of the deterministic fallback copy.

- [ ] **Step 3: Add a failing test for safe fallback**

Add a focused test showing that when natal context is unavailable or malformed, the deterministic short-form reading still renders and the request does not fail.

- [ ] **Step 4: Fetch natal context on the server**

Extend the Astrologer adapter to call the official natal context endpoint alongside chart data, while keeping the API boundary isolated in `lib/reading.ts`.

- [ ] **Step 5: Map natal context into a continuous reading body**

Map the returned interpretation material into a coherent premium reading body.

Keep precision softening rules intact for approximate and unknown birth times, but express them inside the body rather than in a separate fact module.

- [ ] **Step 6: Simplify the ready-state presentation**

Remove result-status chrome and evidence blocks so the inline result opens directly into the reading text.

- [ ] **Step 7: Run focused verification**

Run:

- `npm test -- test/reading-lib.test.ts test/home-page.test.tsx`

Expected: PASS

- [ ] **Step 8: Run full verification**

Run:

- `npm test`
- `npm run lint`

Expected: PASS

### Task 4: Verify end-to-end single-page behavior and clean up dead routes

**Files:**
- Modify: `D:/github/astryx-engine/.worktrees/feat-mvp-foundation/.env.example`
- Modify: `D:/github/astryx-engine/.worktrees/feat-mvp-foundation/README.md`
- Modify: `D:/github/astryx-engine/.worktrees/feat-mvp-foundation/docs/superpowers/specs/2026-04-05-astryx-v1-flow-no-storage-design.md`
- Modify: `D:/github/astryx-engine/.worktrees/feat-mvp-foundation/docs/superpowers/plans/2026-04-05-astryx-geonames-astrologer-flow.md`

- [ ] **Step 1: Remove dead route references and document local setup**

Ensure docs and code no longer mention old route-based result pages.

Document env vars:

- `GEONAMES_USERNAME`
- `RAPIDAPI_KEY`
- `RAPIDAPI_HOST`

- [ ] **Step 2: Run the focused suite**

Run: `npm test`

Expected: PASS

- [ ] **Step 3: Run lint**

Run: `npm run lint`

Expected: PASS

- [ ] **Step 4: Verify manually in the browser**

Check:

- homepage stays on `/`
- submitting `Kunshan, China` shows inline loading, then inline reading
- submitting `Springfield, United States` shows inline location-match
- submitting an invalid place shows inline unavailable state
