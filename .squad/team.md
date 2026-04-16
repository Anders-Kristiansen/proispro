# Squad Team

> proispro

## Coordinator

| Name | Role | Notes |
|------|------|-------|
| Squad | Coordinator | Routes work, enforces handoffs and reviewer gates. |

## Members

| Name | Role | Charter | Status |
|------|------|---------|--------|
| Danny | Lead | `.squad/agents/danny/charter.md` | ✅ Active |
| Rusty | Frontend Dev | `.squad/agents/rusty/charter.md` | ✅ Active |
| Basher | Data Engineer | `.squad/agents/basher/charter.md` | ✅ Active |
| Linus | DevOps | `.squad/agents/linus/charter.md` | ✅ Active |
| Saul | Color Expert | `.squad/agents/saul/charter.md` | ✅ Active |
| Scribe | Session Logger | `.squad/agents/scribe/charter.md` | 📋 Silent |
| Ralph | Work Monitor | `.squad/agents/ralph/charter.md` | 🔄 Monitor |
| @copilot | Coding Agent | `.github/copilot-instructions.md` | 🤖 Coding Agent |

## Coding Agent

<!-- copilot-auto-assign: true -->

@copilot picks up issues labeled `squad:copilot` autonomously via GitHub Copilot. No session required.

### Capabilities

| Domain | Fit | Notes |
|--------|-----|-------|
| Alpine.js components, HTML/CSS | 🟢 Good fit | Proceed autonomously |
| Supabase schema, SQL migrations | 🟢 Good fit | Proceed autonomously |
| GitHub Actions, CI/CD workflows | 🟢 Good fit | Proceed autonomously |
| Complex RLS policy logic | 🟡 Needs review | Note in PR — Danny should review before merge |
| Auth flows, security logic | 🟡 Needs review | Note in PR — Danny should review before merge |
| Color system decisions | 🔴 Not suitable | Route to Saul instead |

## Project Context

- **Project:** proispro
- **Created:** 2026-04-13

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Alpine.js (CDN) + vanilla CSS with OKLCH color system |
| **Backend** | Supabase PostgreSQL with Row-Level Security (RLS) |
| **Auth** | Supabase Auth – GitHub OAuth provider |
| **Hosting** | GitHub Pages (static, no build step) |
