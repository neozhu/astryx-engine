# Astryx Midnight Astrology Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-theme the single-page Astryx intake experience to use the approved midnight astrology palette.

**Architecture:** Keep layout and copy unchanged. Apply the new direction through global tokens in `app/globals.css` and targeted styling updates in the shared reading-start page component.

**Tech Stack:** Next.js, React, Tailwind v4, Vitest

---

### Task 1: Lock the new palette in tests

**Files:**
- Modify: `test/globals-css.test.ts`
- Modify: `test/reading-start-page.test.tsx`

- [x] Add a failing token test for the midnight background, moon-cream foreground, and gold accent.
- [x] Add a failing CTA test requiring `bg-accent` and `text-background`.
- [x] Run the focused test command and confirm red.

### Task 2: Apply midnight astrology tokens

**Files:**
- Modify: `app/globals.css`

- [x] Replace the warm beige palette with midnight indigo, moon-cream, mist blue-gray, and old-gold tokens.
- [x] Update background gradients and text selection styling to match the new direction.
- [x] Soften the grain overlay so it supports the darker palette instead of muddying it.

### Task 3: Update the intake form styling

**Files:**
- Modify: `app/reading-start-page.tsx`

- [x] Keep the existing structure and copy.
- [x] Switch the pill badge to gold-led styling.
- [x] Make form surfaces read as blue-black glass.
- [x] Update inputs to use darker fills and muted placeholders.
- [x] Change the primary CTA to a gold button with dark text.

### Task 4: Add observatory ritual framing

**Files:**
- Modify: `app/reading-start-page.tsx`
- Modify: `test/reading-start-page.test.tsx`

- [x] Add a sparse starfield layer.
- [x] Add two faint orbital rings offset toward the upper-right background.
- [x] Add a subtle outer rim around the intake form.
- [x] Keep all new treatment outside the functional form interior.

### Task 5: Verify

**Files:**
- Test: `test/globals-css.test.ts`
- Test: `test/reading-start-page.test.tsx`
- Test: `test/home-page.test.tsx`

- [x] Run `npm test -- test/globals-css.test.ts test/reading-start-page.test.tsx test/home-page.test.tsx`.
- [x] Check the running page in the browser to confirm the visual direction matches the approved palette.
