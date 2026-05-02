# Astryx Annual Career And Finance Forecast Depth Design

**Goal:** Make the future-year reading feel specific, interpretable, and useful by focusing the forecast on career and finance only, with clearer judgment, turning points, and practical implications.

**Scope:** Keep the existing reading pipeline and data flow. Do not redesign the core reading architecture, follow-up flow, or the primary/explanation layers. Only reshape the forecast prompt and forecast rendering so the user sees a stronger annual reading with more substance.

**Approach:** Reuse the existing `yearAhead.career` and `yearAhead.finance` forecast data, but instruct the model to write more decisive annual judgments and clearer timing notes. On the UI side, render these two domains as the only visible future section and break each one into a small set of labeled ideas: annual mainline, turning point, opportunity, risk, and practical implication. Keep the other forecast domains in the schema for compatibility, but do not show them in the interface.

**Acceptance Criteria:**
- The future section only shows one-year career and finance.
- Each visible card contains a clear annual judgment, not just a vague description.
- The visible copy includes at least one concrete turning point and one practical implication per domain.
- The rest of the forecast data remains compatible with existing tests and schemas.

