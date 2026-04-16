# Disc Detail Modal — UX Specification
**By:** Livingston (UX Designer) | **Date:** 2026-04-16 | **For:** Rusty (Frontend Dev)

## Context

Replace the current right-side detail panel (`<aside class="fg-detail">`) with a centered, full-screen modal overlay. Goal: "in your face" product detail experience inspired by trydiscs.com — more screen real estate for disc information, more prominent CTAs, future-ready for wear adjustment UI.

**Remove:** Marshall Street commercial link (lines 227-231 in flight-guide.html).

---

## A) Modal Structure & Information Hierarchy

### Current Side Panel (320px)
- Vertical layout, scrollable
- Close button (top-right corner)
- Name → Brand/Type → Badges → Flight path image → Flight number bars → Actions (Add + Store link)
- Limited width constrains image size, creates cramped feeling
- Actions buried at bottom

### Proposed Modal (Centered Overlay)
- **Backdrop:** semi-transparent dark overlay (rgba(15, 23, 42, 0.85)) covering entire viewport, click to close
- **Modal card:** centered white/surface card, max-width 720px on desktop, full-screen on mobile
- **Close button:** top-right corner of modal card (same as current), plus ESC key (already implemented)
- **Layout:** two-column on desktop (≥768px), single-column on mobile

**Desktop Layout (≥768px):**
```
┌─────────────────────────────────────────────────────┐
│  ✕                                                  │
│  ┌──────────────────┐  ┌────────────────────────┐ │
│  │                  │  │ Destroyer              │ │
│  │  Flight Path     │  │ Innova · Distance      │ │
│  │  Image/SVG       │  │ [Distance] [Overstable]│ │
│  │  (400×300)       │  │                        │ │
│  │                  │  │ FLIGHT NUMBERS         │ │
│  └──────────────────┘  │ Speed  [████████] 12   │ │
│                        │ Glide  [████░░░] 5     │ │
│                        │ Turn   [██░░░░] -1     │ │
│                        │ Fade   [█████░] 3      │ │
│                        │                        │ │
│                        │ [Future: Wear section] │ │
│                        │                        │ │
│                        │ Notes/Description:     │ │
│                        │ (placeholder for now)  │ │
│                        │                        │ │
│                        │ [+ Add to My Bag]      │ │
│                        └────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

**Mobile Layout (<768px):**
- Single column, scrollable
- Flight path image at top (full-width, aspect-ratio 4/3)
- Name/brand/badges below image
- Flight numbers with bars
- Future wear section
- CTA at bottom (sticky or in-flow)

**Information Hierarchy (Priority Order):**
1. **Disc name** (H2, 1.5–1.8rem, font-weight 800) — Hero element
2. **Flight path visualization** (large image/SVG) — Visual anchor
3. **Type + Stability badges** (color-coded, high contrast) — Quick scan
4. **Flight numbers with bars** (current bars are excellent, keep them) — Core data
5. **Brand + category** (smaller, muted text) — Context
6. **Notes/description field** (new, placeholder for now) — Future content
7. **Wear adjustment UI** (future, design space reserved) — Only when disc in bag
8. **"Add to My Bag" CTA** (prominent button, bottom-right on desktop, full-width on mobile) — Primary action

---

## B) Interaction Spec

### Open Modal
- **Trigger:** Click disc tile in grid (same as current)
- **State change:** `showDetail = true`, `selectedDisc = {disc object}`
- **Animation:** 
  - Backdrop fades in (200ms ease)
  - Modal scales in from 95% to 100% + fades in (250ms ease-out)
  - Body scroll locked (add `overflow: hidden` to `<body>`)
  - Focus moves to close button (accessibility: focus trap)

### Close Modal
- **Triggers:**
  1. Click close button (×)
  2. Click backdrop (outside modal card)
  3. Press ESC key (already implemented in flight-guide.js line 119)
- **Animation:** reverse of open (200ms ease-in)
- **State change:** `showDetail = false`, body scroll restored

### Modal Behavior
- **Desktop (≥768px):** 720px max-width, centered, padding around card (2rem)
- **Mobile (<768px):** Full-screen (100vw × 100vh), no centering, edge-to-edge
- **Scrolling:** Modal content scrollable if taller than viewport (overflow-y: auto)
- **Focus trap:** Tab cycles within modal (close button → CTA button → close button). See accessibility section.

---

## C) Flight Number Visualization

### Current Bars: Keep Them ✅
The existing horizontal bar chart design is excellent:
- Clear visual encoding (width = value)
- Color-coded by type (speed=yellow, glide=green, turn=blue/orange, fade=red)
- Numeric value displayed alongside bar
- Clean, compact, easy to scan

**Proposed improvements:**
1. **Larger bars in modal:** Increase bar height from 8px to 12px (more prominent)
2. **Wider spacing:** Increase gap between rows from .45rem to .65rem (better readability)
3. **Labels stay left-aligned:** Current label style is good (color-coded text)

### Wear Adjustment UI (Future)
**Context:** Basher is planning wear schema. Discs in bag will have wear values that adjust flight numbers.

**Design approach:** 
- **Location:** NEW section between flight numbers and notes, only visible when `disc.isInBag === true`
- **Section title:** "WEAR ADJUSTMENT" (same style as "FLIGHT NUMBERS")
- **Layout:** 
  - Each flight number gets a small inline slider (or +/- buttons)
  - Display: `Speed 12 → 11.5` (original → adjusted)
  - OR: Single "Wear" slider (0–10 scale) that affects all numbers via algorithm
- **Visual treatment:** 
  - Border-top separator (1px solid var(--clr-border))
  - Muted background (var(--clr-surface2))
  - Padding: 1rem
  - Collapsed by default? Or always visible when in bag?

**Decision for Rusty:** Implement modal structure with a placeholder `<div class="fg-wear-section" x-show="isInBag(selectedDisc)">Wear adjustments coming soon…</div>` so Basher can slot in the real UI later.

---

## D) HTML Structure Spec

### Alpine.js State (Add to `flightGuide()` component)
```javascript
// NEW: isInBag already exists (line 128-132), reuse it
// NEW: Add backdrop click handler
closeModal() {
  this.showDetail = false;
}
```

### HTML Structure
```html
<!-- Modal Backdrop (replaces <aside class="fg-detail">) -->
<div 
  class="fg-modal-backdrop" 
  x-show="showDetail" 
  x-transition.opacity
  @click.self="closeModal()"
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
>
  <div class="fg-modal-card" @click.stop>
    
    <!-- Close button -->
    <button 
      class="fg-modal-close" 
      @click="closeModal()" 
      aria-label="Close disc details"
    >
      ✕
    </button>

    <template x-if="selectedDisc">
      <div class="fg-modal-content">
        
        <!-- Left column: Flight path image -->
        <div class="fg-modal-image-col">
          <template x-if="selectedDisc.pic">
            <img 
              class="fg-modal-pic" 
              :src="selectedDisc.pic" 
              :alt="selectedDisc.name + ' flight path'" 
              loading="lazy" 
            />
          </template>
          <template x-if="!selectedDisc.pic">
            <div class="fg-modal-pic-placeholder">✈️</div>
          </template>
        </div>

        <!-- Right column: Details -->
        <div class="fg-modal-details-col">
          
          <!-- Name + Brand -->
          <h2 class="fg-modal-name" id="modal-title" x-text="selectedDisc.name"></h2>
          <div class="fg-modal-brand" x-text="selectedDisc.brand + ' · ' + (typeLabels[selectedDisc.type] || selectedDisc.category)"></div>

          <!-- Badges -->
          <div class="fg-modal-badges">
            <span 
              class="type-badge" 
              :class="'type-' + selectedDisc.type" 
              x-text="typeLabels[selectedDisc.type] || selectedDisc.category"
            ></span>
            <span 
              class="fn-stability" 
              x-text="stabilityLabels[selectedDisc.stabilitySlug]"
            ></span>
          </div>

          <!-- Flight Numbers -->
          <div class="fg-fn-section">
            <div class="fg-fn-title">Flight Numbers</div>

            <!-- Speed -->
            <div class="fg-fn-row">
              <span class="fg-fn-row-label" style="color:var(--fairway)">Speed</span>
              <div class="fg-fn-bar-wrap">
                <div class="fg-fn-bar bar-speed" :style="'width:' + speedBar(selectedDisc.speed)"></div>
              </div>
              <span class="fg-fn-val" x-text="selectedDisc.speed"></span>
            </div>

            <!-- Glide -->
            <div class="fg-fn-row">
              <span class="fg-fn-row-label" style="color:var(--midrange)">Glide</span>
              <div class="fg-fn-bar-wrap">
                <div class="fg-fn-bar bar-glide" :style="'width:' + glideBar(selectedDisc.glide)"></div>
              </div>
              <span class="fg-fn-val" x-text="selectedDisc.glide"></span>
            </div>

            <!-- Turn -->
            <div class="fg-fn-row">
              <span 
                class="fg-fn-row-label" 
                :style="selectedDisc.turn < 0 ? 'color:oklch(0.74 0.18 204)' : 'color:oklch(0.72 0.22 25)'"
              >
                Turn
              </span>
              <div class="fg-fn-bar-wrap">
                <div 
                  class="fg-fn-bar" 
                  :class="selectedDisc.turn < 0 ? 'bar-turn-under' : 'bar-turn-over'"
                  :style="'width:' + turnBar(selectedDisc.turn)"
                ></div>
              </div>
              <span class="fg-fn-val" x-text="formatTurn(selectedDisc.turn)"></span>
            </div>

            <!-- Fade -->
            <div class="fg-fn-row">
              <span class="fg-fn-row-label" style="color:var(--distance)">Fade</span>
              <div class="fg-fn-bar-wrap">
                <div class="fg-fn-bar bar-fade" :style="'width:' + fadeBar(selectedDisc.fade)"></div>
              </div>
              <span class="fg-fn-val" x-text="selectedDisc.fade"></span>
            </div>
          </div>

          <!-- Wear Adjustment Section (Future) -->
          <div class="fg-wear-section" x-show="isInBag(selectedDisc)">
            <div class="fg-wear-title">Wear Adjustment</div>
            <p style="font-size:.85rem;color:var(--clr-muted);">
              Coming soon: adjust flight numbers based on disc wear.
            </p>
          </div>

          <!-- Notes/Description (Placeholder) -->
          <div class="fg-notes-section">
            <div class="fg-notes-title">Description</div>
            <p style="font-size:.85rem;color:var(--clr-muted);font-style:italic;">
              No description available.
            </p>
          </div>

          <!-- CTA -->
          <div class="fg-modal-actions">
            <button 
              class="fg-add-btn" 
              @click="addToBag(selectedDisc)"
            >
              + Add to My Bag
            </button>
          </div>

        </div><!-- /fg-modal-details-col -->

      </div><!-- /fg-modal-content -->
    </template>

  </div><!-- /fg-modal-card -->
</div><!-- /fg-modal-backdrop -->
```

---

## E) What to REMOVE

### From `flight-guide.html`
1. **Lines 159-237:** Entire `<aside class="fg-detail">` block — DELETE
2. **Lines 227-231:** `<a class="fg-store-link">` — DELETE (no commercial links)

### From `flight-guide.css`
3. **Lines 269-395:** All `.fg-detail*` classes — DELETE (modal CSS will replace)
4. **Line 380-394:** `.fg-store-link` class — DELETE

### From `flight-guide.js`
5. **No deletions** — all existing methods reused (`showDetail`, `selectedDisc`, `addToBag`, `isInBag`, ESC handler)

---

## F) Accessibility

### WCAG 2.2 Compliance

**Focus Management:**
- On modal open: move focus to close button (first interactive element)
- Focus trap: Tab cycles within modal (close → badges? → CTA → close)
- On modal close: return focus to clicked disc tile (requires storing ref)

**Implementation:**
```javascript
// Add to flightGuide() component
selectDisc(disc, event) {
  this.selectedDisc = disc;
  this.showDetail = true;
  this.lastFocusedElement = event?.target; // Store for return focus
  
  // Move focus to close button after render
  this.$nextTick(() => {
    const closeBtn = document.querySelector('.fg-modal-close');
    closeBtn?.focus();
  });
},

closeModal() {
  this.showDetail = false;
  // Return focus to tile
  this.$nextTick(() => {
    this.lastFocusedElement?.focus();
  });
}
```

**Keyboard Navigation:**
- ✅ ESC key closes modal (already implemented)
- ✅ Click backdrop closes modal (new)
- ✅ Close button has aria-label
- ✅ Modal has `role="dialog"` and `aria-modal="true"`
- ✅ Modal title has `id="modal-title"` + backdrop has `aria-labelledby="modal-title"`

**Focus Trap Implementation:**
Use Alpine.js `@keydown.tab` directive or vanilla JS:
```javascript
// Add to modal card:
@keydown.tab.prevent="handleTabKey($event)"

// In component:
handleTabKey(e) {
  const focusable = this.$el.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  
  if (e.shiftKey && document.activeElement === first) {
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    first.focus();
  }
}
```

**Screen Reader Support:**
- Modal announces as dialog: `role="dialog" aria-modal="true"`
- Title announced: `aria-labelledby="modal-title"`
- Close button labeled: `aria-label="Close disc details"`

**Color Contrast:**
- Backdrop: rgba(15, 23, 42, 0.85) — sufficient contrast with modal card
- Modal card background: var(--clr-surface) (light on dark theme)
- Text: var(--clr-text) — 4.5:1+ contrast verified
- Badges: existing type-badge classes already meet contrast requirements

**Target Size:**
- Close button: minimum 44×44px (meets WCAG 2.5.8 AA)
- CTA button: minimum 44px height, full-width on mobile

**Reduced Motion:**
```css
@media (prefers-reduced-motion: reduce) {
  .fg-modal-backdrop,
  .fg-modal-card {
    transition: none !important;
  }
}
```

---

## G) CSS Structure Spec

### New Classes for Rusty to Implement

**Backdrop + Card:**
```css
.fg-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.85);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem; /* breathing room on desktop */
  overflow-y: auto; /* scroll if content taller than viewport */
}

.fg-modal-card {
  background: var(--clr-surface);
  border-radius: var(--radius-lg, 12px);
  box-shadow: 0 20px 60px rgba(0,0,0,0.6);
  max-width: 720px;
  width: 100%;
  position: relative;
  max-height: calc(100vh - 4rem); /* leave room for padding */
  overflow-y: auto;
}

.fg-modal-close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: var(--clr-bg);
  border: 1px solid var(--clr-border);
  color: var(--clr-muted);
  font-size: 1.3rem;
  cursor: pointer;
  padding: .4rem;
  line-height: 1;
  border-radius: 6px;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color .15s, border-color .15s;
  z-index: 10;
}
.fg-modal-close:hover { color: var(--clr-text); border-color: var(--clr-accent); }
```

**Two-Column Layout (Desktop):**
```css
.fg-modal-content {
  display: grid;
  grid-template-columns: 1fr 1.2fr; /* image | details */
  gap: 2rem;
  padding: 2.5rem 2rem 2rem 2rem; /* extra top for close button */
}

.fg-modal-image-col {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.fg-modal-pic {
  width: 100%;
  border-radius: var(--radius);
  border: 1px solid var(--clr-border);
  background: var(--clr-bg);
  aspect-ratio: 4/3;
  object-fit: contain;
  padding: 1rem;
}

.fg-modal-pic-placeholder {
  width: 100%;
  aspect-ratio: 4/3;
  background: var(--clr-surface2);
  border: 1px solid var(--clr-border);
  border-radius: var(--radius);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 4rem;
}

.fg-modal-details-col {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.fg-modal-name {
  font-size: 1.75rem;
  font-weight: 800;
  line-height: 1.2;
  margin: 0;
}

.fg-modal-brand {
  font-size: .9rem;
  color: var(--clr-muted);
  margin-top: -.6rem; /* tighten gap with name */
}

.fg-modal-badges {
  display: flex;
  gap: .6rem;
  flex-wrap: wrap;
}

/* Flight numbers: increase bar height + spacing */
.fg-modal-content .fg-fn-bar-wrap {
  height: 12px; /* was 8px */
}

.fg-modal-content .fg-fn-row {
  margin-bottom: .65rem; /* was .45rem */
}

/* Wear section (future) */
.fg-wear-section {
  border-top: 1px solid var(--clr-border);
  background: var(--clr-surface2);
  padding: 1rem;
  border-radius: var(--radius);
}

.fg-wear-title {
  font-size: .72rem;
  font-weight: 700;
  color: var(--clr-muted);
  text-transform: uppercase;
  letter-spacing: .06em;
  margin-bottom: .5rem;
}

/* Notes section */
.fg-notes-section {
  border-top: 1px solid var(--clr-border);
  padding-top: 1rem;
}

.fg-notes-title {
  font-size: .72rem;
  font-weight: 700;
  color: var(--clr-muted);
  text-transform: uppercase;
  letter-spacing: .06em;
  margin-bottom: .5rem;
}

/* Actions */
.fg-modal-actions {
  margin-top: auto;
  padding-top: 1rem;
}

.fg-modal-actions .fg-add-btn {
  width: 100%;
  min-height: 48px;
  font-size: 1rem;
}
```

**Mobile Responsive (<768px):**
```css
@media (max-width: 767px) {
  .fg-modal-backdrop {
    padding: 0; /* full-screen modal on mobile */
  }

  .fg-modal-card {
    max-width: 100%;
    max-height: 100vh;
    border-radius: 0;
  }

  .fg-modal-content {
    grid-template-columns: 1fr; /* single column */
    gap: 1rem;
    padding: 1.5rem 1rem;
  }

  .fg-modal-name {
    font-size: 1.4rem;
  }

  .fg-modal-close {
    top: .75rem;
    right: .75rem;
  }
}
```

---

## H) Implementation Notes for Rusty

### Order of Work:
1. **Remove old code:** Delete `<aside class="fg-detail">` block and `.fg-detail*` CSS classes
2. **Add modal HTML:** Insert new `<div class="fg-modal-backdrop">` structure
3. **Add modal CSS:** Copy CSS spec above into flight-guide.css
4. **Update Alpine methods:** Add `closeModal()`, update `selectDisc()` to track focus
5. **Test interactions:** Click tile → modal opens, click backdrop → closes, ESC → closes
6. **Test responsive:** Desktop (720px centered) vs mobile (full-screen)
7. **Test focus trap:** Tab cycles within modal
8. **Test accessibility:** Screen reader announces dialog, close button labeled

### Edge Cases:
- **No flight path image:** Show placeholder (already handled with `x-if/x-if`)
- **Very long disc names:** Text wraps (line-height 1.2 allows multi-line)
- **Modal taller than viewport:** Scrollable content (overflow-y: auto on card)
- **Backdrop click during animation:** Animation completes, no jank

### Future Work (Not in Scope):
- Notes/description data source (Basher to add to DiscIt schema?)
- Wear adjustment UI (Basher designing schema + logic)
- "Already in bag" state for CTA button (change text to "View in Bag" or disable?)

---

## Summary

This spec replaces the 320px side panel with a modern, spacious modal:
- **Desktop:** Two-column layout (image | details), 720px max-width, centered
- **Mobile:** Full-screen, single-column, scrollable
- **Accessibility:** Focus trap, backdrop click, ESC key, ARIA labels, keyboard nav
- **Future-ready:** Space reserved for wear adjustment + notes

The modal provides 2× the screen real estate, emphasizes the flight path image, and makes the "Add to Bag" CTA more prominent. Flight number bars are enhanced (taller, more spacing) but retain their excellent design. No external commercial links.

**Decision:** Modal replaces side panel. Marshall Street link removed. Wear + notes sections are placeholders for future work.
