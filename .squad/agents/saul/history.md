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
