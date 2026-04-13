# Danny — History

## Core Context

- **Project:** A lightweight personal disc golf inventory page hosted on GitHub Pages, using a separate GitHub repo as a simple JSON file backend.
- **Role:** Lead
- **Joined:** 2026-04-13T17:32:22.552Z

## Learnings

### Static-first architecture validates for single-user tools

The proispro disc golf inventory deliberately ships vanilla HTML/CSS/JS with zero build pipeline. This choice surfaces a key principle: **shipping simplicity beats framework cargo-cult**. The app weighs <50KB total and has zero external dependencies beyond browser APIs. Every build tool adds complexity without corresponding benefit at this scale.

The localStorage-first strategy (with GitHub file as backup) is the right tier for personal tools where offline-first matters more than real-time sync. The lack of multi-user conflict resolution is not a limitation—it's a feature boundary that keeps the implementation honest.

### GitHub file storage as backend is boring but right

Asking users to configure their own GitHub repo + PAT feels like friction, but it solves the core problem: data ownership without central infrastructure. The REST API implementation handles SHA tracking and 409 conflict retries, making GitHub's content API reliable enough for this use case. The trade-off (user manages their own repo) is explicit and defensible.

### PAT in localStorage is acceptable with scope boundaries

Storing a GitHub token client-side gets immediate scrutiny from security reviewers. The mitigations here are concrete: narrow scope (repo only), user-controlled expiration, and immediate revocation capability. For a single-user personal tool, the threat model is tighter than multi-tenant SaaS. This is not a universal pattern, but it's right for this context.

### Vanilla JS scales to about 500 lines before pain

app.js is ~250 lines of business logic + UI state. At this volume, manual DOM updates and event handling are maintainable. The escape valve: if the app grew to 1000+ lines of state management, that's the inflection point to introduce a minimal framework (preact, htmx, or Alpine). Don't cross that bridge until traffic demands it.

### Single-tenant UX simplifies everything downstream

No multi-user auth, no permissions model, no data isolation. The app assumes "one person, one device (or multiple tabs on same device)." This single-tenant assumption collapses the entire feature set. A multi-user version would need account model, role-based access, conflict resolution per user, and probably a real backend. The architecture is not "scalable to multiple users"—it's "deliberately constrained to one user." That constraint is a feature, not a limitation.
