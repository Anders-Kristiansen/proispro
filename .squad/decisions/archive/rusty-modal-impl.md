# Modal Implementation Decisions

**Date:** 2025-01-27  
**Author:** Rusty (Frontend Dev)  
**Issue:** Flight Guide modal redesign

## Changes Made

### flight-guide.html
- Removed entire `<aside class="fg-detail">` panel (lines 159-237)
- Removed `<a class="fg-store-link">` commercial link to Marshall Street
- Replaced with new modal structure: `.fg-modal-backdrop` > `.fg-modal-card` with two-column layout
- Updated disc-tile click handler from `@click="selectDisc(disc)"` to `@click="selectDisc(disc, $event)"` to pass event for focus management

### flight-guide.js
- Added `lastFocusedElement: null` to state for focus restoration
- Updated `selectDisc(disc, event)` to capture focus source and set body overflow
- Added `closeModal()` method for proper cleanup and focus restoration
- Added `handleTabKey(e)` method for keyboard trap inside modal
- Updated ESC key handler to call `closeModal()` instead of directly setting `showDetail = false`
- Added body scroll lock: `document.body.style.overflow = 'hidden'` on open, restored on close

### flight-guide.css
- Removed all `.fg-detail*` CSS rules (old right-side panel)
- Removed `.fg-store-link` CSS rule
- Added complete `.fg-modal-*` CSS ruleset for centered modal with backdrop
- Modal features: fixed positioning, centered with backdrop, 720px max-width, two-column grid
- Mobile: full-screen layout, single column
- Accessibility: larger close button (44x44 touch target), focus trap, reduced motion support
- Kept `.fg-add-btn` but removed `.fg-detail-actions` container (actions now in `.fg-modal-actions`)

## Implementation Notes

1. **Focus Management:** Modal captures the element that triggered it and restores focus on close — essential for keyboard nav.

2. **Scroll Lock:** Body scroll is disabled when modal is open to prevent background scrolling.

3. **Keyboard Trap:** Tab key cycles through focusable elements within the modal only.

4. **Accessibility:** Modal has proper ARIA attributes (`role="dialog"`, `aria-modal="true"`, `aria-labelledby`).

5. **Responsive:** Modal is centered on desktop, full-screen on mobile. Two-column layout collapses to single column on mobile.

6. **Data Model:** The `link` field on disc objects is retained in the data model but not shown in UI — may be used later for different purposes.

7. **Layout:** `.fg-body` no longer needs special grid layout since there's no fixed right panel — grid wrapper now takes full width naturally via flexbox.

## Future Considerations

- Wear adjustment section is a placeholder waiting for Basher's schema work
- Description/notes field is placeholder — data model doesn't yet support disc descriptions
- Modal could be enhanced with animations using Alpine's x-transition modifiers
- Consider adding a "View similar discs" feature using existing catalog data
