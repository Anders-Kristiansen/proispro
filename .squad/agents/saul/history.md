# Saul — History

## Project Context

- **Project:** proispro
- **User:** AK
- **Stack:** Web (HTML, CSS, JavaScript)
- **Team:** Ocean's Eleven cast — Danny (Lead), Rusty (Frontend), Basher (Data), Linus (DevOps)
- **Joined:** 2026-04-13

## Core Context

Color Expert for the proispro project. Brings deep color science knowledge via the `color-expert` skill (`.squad/skills/color-expert/SKILL.md`). Works closely with Rusty on frontend color implementation and with Danny on design system architecture decisions.

Key skill: always prefer OKLCH over HSL for perceptual accuracy. Always apply semantic token layers. Always check accessibility with APCA/WCAG numbers.

## Learnings

### 2025-07-14 — OKLCH Color System for Disc Golf Inventory

**Task:** Convert `styles.css` `:root` hex variables to OKLCH custom properties.

**Key decisions:**
- All surface tokens share H≈264° and C=0.03 — only L varies. This creates a clean, monochromatic dark navy family that is trivially adjustable.
- Badge colors (putter/midrange/fairway/distance) were the most impactful change: pinning all four to L=0.75, C=0.18 with only H varying guarantees perceptually equal brightness. The hex originals had wildly different effective lightness (purple was visually heavier than amber).
- `--clr-accent` at L=0.82 against `--clr-bg` at L=0.16 yields ~14:1 contrast — very comfortable.
- `--clr-muted` at L=0.67 passes WCAG AA (~5.5:1 estimated against bg).

**Pattern to remember:** For any badge/tag system across multiple categories, set a fixed L and C and rotate only H. This is OKLCH's strongest practical advantage over hex or HSL.

**Fallback strategy:** No CSS fallback needed — all target browsers support `oklch()` natively. Hex values preserved in comments for developer orientation only.

**Decision file:** `.squad/decisions/inbox/saul-color-system.md`

---

### 2026-07-14 — Disc Golf Color Picker Palette (10 vivid OKLCH colors)

**Task:** Design 10 vivid disc colors for a color picker UI replacing the free-text "Color" field in the Add/Edit Disc modal.

**Key decisions:**

- **L band 0.72–0.80:** Perceptually uniform across all hues — swatches appear equally bright (impossible to guarantee in hex/HSL). Yellow gets L=0.80 (upper limit) because yellow hue has limited sRGB chroma at lower lightness.
- **C band 0.18–0.26:** High chroma = disc plastic boldness. Blues capped at C=0.18 (sRGB gamut is narrower in the blue region at this lightness). Reds/magentas/purples push to C=0.24–0.26.
- **10 hue stops (≈30–40° apart):** 25, 52, 108, 140, 162, 196, 235, 278, 308, 340 — full spectrum, clearly distinguishable.
- **Text always dark:** At L ≥ 0.72, relative luminance Y ≈ 0.38–0.51. Dark navy text achieves ~8–10:1 contrast (WCAG AAA). White text would fail at < 2.5:1 — dark wins on all 10 swatches.
- **Separation from type badges:** Badges use C=0.18 (communicates disc *type*). Disc colors use C=0.18–0.26 (communicates physical *appearance*). Different roles, different chroma authority.

**Pattern to remember:** When designing a set of vivid picker swatches, fix the L band and let C float per-hue within a chroma budget. Blues need lower C ceiling than reds/magentas — this is OKLCH gamut reality, not a design preference.

**Files produced:**
- `.squad/decisions.md` — merged into Color System section under "Disc Color Palette — 10 Vivid OKLCH Swatches"
