# MEMORY — Argus

> Persistent working memory for AI agents. Read this first to understand current project state.

---

## 1. Project Summary

Argus is an intelligent IT support ticket auto-handling system. It auto-resolves tickets only when three independent confidence signals (semantic similarity, resolution consistency, category accuracy) all pass their thresholds AND a live sandbox test succeeds. Everything else is escalated to human agents with a rich Evidence Card. The system learns from every agent decision.

Two portals: **Employee** (submit tickets, view status) and **Agent** (review escalated tickets, resolve, monitor metrics).

---

## 2. Current Status

| Phase | Status | Notes |
|---|---|---|
| **Phase 0**: Scaffolding & Services | ✅ Complete | Directory tree, `.env`, `.gitignore`, all API keys provisioned |
| **Phase 1**: Database Schema | ✅ Complete | 7 tables in Supabase: `users`, `systems`, `tickets`, `ticket_outcomes`, `audit_log`, `category_thresholds`, `novel_tickets` |
| **Phase 2**: Pydantic Models | ✅ Complete | `ticket.py`, `user.py`, `confidence.py`, `evidence_card.py`, `audit.py`, `agent.py` |
| **Phase 3**: Service Clients | ✅ Complete | `supabase.py`, `jina.py`, `qdrant.py`, `llm.py`, `vision.py`, `storage.py` |
| **Phase 4**: Core Pipeline | ✅ Complete | Policy gate, embedder, retriever, novelty, confidence engine, sandbox client, audit hash, latency tracker, pipeline orchestrator |
| **Phase 5**: Sandbox Server | ✅ Complete | Separate FastAPI on port 8001 with `/execute`, `/status`, `/reset`, `/logs` |
| **Phase 6**: API Routes | ✅ Complete | 5 route groups: `tickets`, `agent`, `audit`, `metrics`, `config/simulate` — all tested |
| **Phase 7**: Data Loading | ✅ Complete | 500 synthetic tickets in Supabase, 500 vectors in Qdrant, `cluster_map.json` with 25 clusters |
| **Phase 8**: Frontend Setup | ✅ Complete | Vite + React + TypeScript + Tailwind v4 + shadcn/ui, all shared infra, layouts, services, routes |
| **Phase 9**: Employee Portal | ✅ Complete | `SubmitTicket`, `TicketStatus` pages — real API integration, real-time polling |
| **Phase 10**: Agent Portal | ✅ Complete | `EscalatedQueue`, `EvidenceCardView`, `WhatIfSimulator`, `MetricsDashboard`, `AuditLog` — all functional |
| **Phase 11**: Frontend Polish | 🔄 In Progress | Landing page built; portal polish ongoing |
| **Phase 12**: E2E Demo | ⬜ Not Started | 5 demo scenarios from SOLUTION.md §14 |

---

## 3. Current Phase Detail — Phase 11

**Goal:** "First impression is last impression" — a state-of-the-art, dual-mode UI for the hackathon demo.

**Design System Name:** Argus Precision

**Design Inspiration:** Cohere, Dify, Windsurf, Stripe, Tailwind Plus

**What has been done so far:**
- `index.css` — Full design token system: DM Sans + DM Mono fonts, 40+ CSS custom properties (`--argus-indigo`, `--argus-surface`, etc.), light + dark versions of all tokens, `kpi-card` with accent top-border variants, severity/status badge classes, dot-grid background, stagger animation helpers, custom scrollbar, smooth scroll. **Portal-specific additions:** 10+ new CSS animations (float-subtle, glow-pulse, gradient-shift, portal-enter, live-ping), glassmorphism `.glass-panel`, `.hover-lift` micro-interaction, `.signal-bar-track/.signal-bar-fill` with glow pseudo-element, `.pipeline-connector`, `.candidate-fix` hover, `.live-indicator` ping, `.skeleton` loader variants (text, title, card, row, circle), `.metric-value` tabular-nums, `.portal-page` entry animation
- `components/ui/skeleton-loaders.tsx` — 5 skeleton loader components: `QueueSkeleton`, `EvidenceCardSkeleton`, `MetricsSkeleton`, `AuditSkeleton`, `TicketStatusSkeleton`
- `main.tsx` — Flash-free theme initializer (reads `localStorage` before React renders) + Sonner Toaster
- `App.tsx` — Route restructure: `/` → LandingPage, `/employee` → Employee Portal, `/agent` → Agent Portal, AnimatePresence wrapper
- `AgentLayout.tsx` — **Completely rewritten:** 250px sidebar with system status strip (live indicator + "All Systems Operational" + subsystem list), nav items with description subtitles, "Switch Portal" section (Employee View + Back to Home), glassmorphism header with breadcrumb, Framer Motion `AnimatePresence` wrapping Outlet for smooth page transitions, animated live badge
- `EmployeeLayout.tsx` — **Completely rewritten:** 250px sidebar with "Employee" badge pill, "IT Support Portal" subtitle, nav with "Create a new request" description, Switch Portal section (Agent Dashboard + Back to Home), AI-Powered Support banner (Bot icon, 500+ resolutions callout), glassmorphism header with breadcrumb, Framer Motion `AnimatePresence` page transitions, "Secure & Encrypted" badge
- `EscalatedQueue.tsx` — **Revamped:** Framer Motion `motion.div` page entry, staggered row reveal animations (stagger + row variants), `QueueSkeleton` for loading state, `live-indicator` auto-update badge, `Radio` icon with pulse on pending count, `motion.tr` with `whileHover`, arrow translate on hover
- `EvidenceCardView.tsx` — **Revamped:** Framer Motion page entry, `EvidenceCardSkeleton` for loading, `signal-bar-track/fill` CSS classes for enhanced signal bars with glow, `motion.div` on each signal with stagger, `candidate-fix` class with `whileHover` scale + `whileTap` on fix items, staggered candidate fix entry
- `WhatIfSimulator.tsx` — **Critical fix:** Replaced ALL hardcoded dark hex colors (`bg-[#1a1c23]`, `border-[#2d303b]`, `bg-[#0f1117]`) with CSS variable-based inline styles (`var(--argus-surface-2)`, `var(--argus-border)`, etc.). Added `getLayerStyle()` function returning `React.CSSProperties`. `PipelineStage` now uses `motion.div` with stagger, `CheckCircle2` for passed stages, spring-animated INTERCEPTED badge. Full `AnimatePresence` wrapping result display
- `MetricsDashboard.tsx` — **Revamped:** Framer Motion staggered KPI card reveal (stagger + fadeUp variants), `MetricsSkeleton` for loading, `metric-value` CSS class on KPI values, `motion.div` page wrapper
- `AuditLog.tsx` — **Revamped:** Framer Motion page entry, `AuditSkeleton` for loading state, `motion.div` page wrapper
- `SubmitTicket.tsx` — **Revamped:** Framer Motion `motion.div` page entry animation
- `TicketStatus.tsx` — **Revamped:** Framer Motion `motion.div` page entry, `TicketStatusSkeleton` for loading state

**New Landing Page (Phase 11.5):**
- `components/motion/FadeIn.tsx` — FadeIn, StaggerContainer, StaggerItem animation wrappers (Framer Motion)
- `components/motion/PageTransition.tsx` — Page transition wrapper
- `components/landing/Navbar.tsx` — Fixed navbar with glassmorphism on scroll, mobile menu, dual CTAs
- `components/landing/Hero.tsx` — Gradient mesh background, floating orbs, bold headline with underline animation, trust signals, embedded mock dashboard
- `components/landing/LogoBanner.tsx` — Tech stack logos (Supabase, Qdrant, Jina, OpenRouter, FastAPI, React)
- `components/landing/PipelineVisual.tsx` — **Redesigned:** Horizontal 5-stage pipeline step selector with What/How/Why detail panels and code snippets
- `components/landing/Features.tsx` — **Redesigned:** Accordion layout with dark mockups, copy tailored tightly to real hackathon metrics (Qdrant thresholds, SHA-256)
- `components/landing/Stats.tsx` — Dark section with animated counting numbers (73%, 500+, 100%, 5 layers)
- `components/landing/DualPortal.tsx` — **Redesigned:** Tab-switching layout for Employee vs Agent portals with large shared interactive preview
- `components/landing/Architecture.tsx` — **Redesigned:** "Built in 48 hours" tech stack grid + real demo numbers terminal panel
- `components/landing/CTAFooter.tsx` — CTA card with gradient accent + footer with nav links
- `pages/landing/LandingPage.tsx` — Assembles all 9 sections into a single scrollable page

**Build status:** ✅ `npm run build` passes — zero TypeScript errors, 3103 modules, ~4.0s

**New dependencies installed:** `framer-motion`, `sonner`

---

## 4. Current System State

| Component | Status |
|---|---|
| Directory structure | ✅ Created |
| `backend/requirements.txt` | ✅ Created |
| `sandbox/requirements.txt` | ✅ Created |
| `.env.example` | ✅ Created |
| `.env` (real credentials) | ✅ Created |
| `.gitignore` | ✅ Created |
| Supabase project & schema (7 tables) | ✅ Provisioned |
| Jina AI / OpenRouter / Groq / Gemini API keys | ✅ Obtained |
| Qdrant Cloud collection (`resolved_tickets`) | ✅ Provisioned — 500 vectors |
| Pydantic data models | ✅ Implemented |
| Service clients (Supabase, Jina, Qdrant, LLM, Vision, Storage) | ✅ Implemented |
| Pipeline modules (all 5 layers) | ✅ Implemented |
| Sandbox server (port 8001) | ✅ Implemented & running |
| API routes (port 8000) | ✅ Implemented & running |
| Data loading scripts (7 scripts) | ✅ Run — data seeded |
| Synthetic ticket CSV (500 tickets) | ✅ Generated & loaded |
| Frontend: React + Vite + TypeScript + Tailwind v4 + shadcn/ui | ✅ Running on port 5173 |
| Frontend: Employee Portal (Submit, Status pages) | ✅ Complete |
| Frontend: Agent Portal (all 5 pages) | ✅ Complete |
| Design system (index.css, layouts, CSS tokens) | ✅ Implemented — refinement ongoing |
| Tests | ❌ Not written |

---

## 5. Key Technical Decisions

| Decision | Detail |
|---|---|
| Backend framework | FastAPI (Python 3.11+), async |
| Frontend framework | React 18 + TypeScript + Vite + shadcn/ui + **Tailwind CSS v4** |
| LLM | Gemma 3 27B via OpenRouter (free tier) |
| Embeddings | Jina AI `jina-embeddings-v3` (1024-dim, free tier) |
| Vector DB | Qdrant Cloud (collection: `resolved_tickets`, cosine distance) |
| Relational DB | Supabase (PostgreSQL, 7 tables) |
| Sandbox | Separate FastAPI server on port 8001 |
| Audit trail | SHA-256 Merkle hash chain in `audit_log` table |
| Fail-safe principle | Any error or unavailability → escalate to human, never auto-resolve |
| Confidence engine | 3 independent signals, all must pass per-category thresholds + sandbox test |
| Data seeded | Supabase: 681 records in `tickets`, 505 in `ticket_outcomes` (some from demo prep scripts); Qdrant: 500 vectors |
| Design system | "Argus Precision" — DM Sans + DM Mono, CSS tokens, light/dark mode, theme toggle |
| Design inspiration | Cohere, Dify, Windsurf, Stripe, Tailwind Plus |

---

## 6. Key Files (Frontend)

| File | Purpose |
|---|---|
| `frontend/src/index.css` | Global design tokens, fonts, component styles, badge classes |
| `frontend/src/main.tsx` | Flash-free theme initializer + Sonner Toaster |
| `frontend/src/App.tsx` | Route structure: / → Landing, /employee → Employee, /agent → Agent |
| `frontend/src/layouts/AgentLayout.tsx` | Agent portal sidebar + header |
| `frontend/src/layouts/EmployeeLayout.tsx` | Employee portal sidebar + header |
| `frontend/src/pages/landing/LandingPage.tsx` | Landing page assembling all sections |
| `frontend/src/components/landing/*.tsx` | 9 landing page section components |
| `frontend/src/components/motion/*.tsx` | FadeIn, StaggerContainer, PageTransition wrappers |
| `frontend/src/pages/agent/EscalatedQueue.tsx` | Escalated ticket queue |
| `frontend/src/pages/agent/EvidenceCardView.tsx` | Ticket evidence card + agent resolution form |
| `frontend/src/pages/agent/MetricsDashboard.tsx` | KPI cards + Recharts + drift monitor |
| `frontend/src/pages/agent/AuditLog.tsx` | Merkle-chain audit log viewer |
| `frontend/src/pages/agent/WhatIfSimulator.tsx` | What-if pipeline simulator |
| `frontend/src/pages/employee/SubmitTicket.tsx` | Ticket submission form |
| `frontend/src/pages/employee/TicketStatus.tsx` | Real-time ticket status + timeline |

---

## 7. Key Files (Backend)

| File | Purpose |
|---|---|
| `backend/api/main.py` | FastAPI app, CORS, lifespan, routers |
| `backend/api/routes/tickets.py` | Ticket submit + status endpoints |
| `backend/api/routes/agent.py` | Agent queue + resolve endpoints |
| `backend/api/routes/audit.py` | Audit log endpoint |
| `backend/api/routes/metrics.py` | Dashboard, coverage, drift endpoints |
| `backend/api/routes/config.py` | Thresholds + What-If Simulator endpoint |
| `backend/core/pipeline.py` | End-to-end pipeline orchestrator |
| `backend/core/confidence.py` | 3-signal confidence engine |
| `backend/core/policy_gate.py` | Layer 0 deterministic policy gate |
| `data/cluster_map.json` | Resolution cluster map (25 clusters) |

---

## 8. Reference Documents

| File | Purpose |
|---|---|
| `SOLUTION.md` | Product vision, architecture diagrams, edge cases, demo script |
| `IMPLEMENTATION.md` | Technical spec: modules, data models, pipeline logic, testing plan |
| `TODO.md` | Chronological build roadmap (12 phases, 100+ atomic tasks) |
| `AGENTS.md` | Instructions for AI agents working on this repo |
| `MEMORY.md` | This file — current project state |
| `RULES.md` | Operational rules and guardrails for agents |
