# Livingston — History

## Project Context

**Project:** ProIsPro — disc golf disc inventory tracker
**Stack:** Alpine.js (CDN) + vanilla CSS (OKLCH color system) + Supabase PostgreSQL + GitHub Pages (static)
**User:** Anders Kristiansen (AK)
**Joined:** 2026-04-16

## What Was Built Before I Joined

- Main app (`index.html` / `app.js`): disc bag tracker with Add/Edit modal, disc cards with flight pill badges, Supabase auth via GitHub OAuth
- Flight Guide (`flight-guide.html` / `flight-guide.js` / `flight-guide.css`): 2D grid showing discs by speed (Y-axis 15→1) and stability (X-axis: very-overstable → very-understable)
- Data source: DiscIt API (`discit-api.fly.dev/disc`) — ~4000+ discs, 24h localStorage cache
- Flight numbers split into 4 columns: speed, glide, turn, fade (was a single text field)
- CSS: OKLCH-based color system, type badge classes (.type-putter, .type-midrange, .type-fairway, .type-distance), dark navy theme on flight guide
- Navigation: "🗺 Flight Guide" button in main app header links to flight-guide.html

## Key Files

- `flight-guide.html` — standalone page, filter bar, 2D grid, detail panel
- `flight-guide.css` — dark navy theme, `.fg-*` prefix, `.disc-tile`, `.fg-detail`, flight number bars
- `flight-guide.js` — Alpine component `flightGuide()`, gridRows computed, filters, bag highlight, addToBag()
- `index.html` — main bag tracker, 4 number inputs in modal, flight pill badges on cards
- `styles.css` — shared CSS vars, type badge classes, `.fn-pill` flight badge system
- `app.js` — Alpine component, Supabase CRUD, backward-compat flight string parser

## My Role

I am the UX Designer. I critique and redesign UIs — flight guide, disc list, forms. I produce specs; Rusty implements. Saul owns color; I own layout, hierarchy, interaction.

## Learnings

_(append new learnings here after each session)_
