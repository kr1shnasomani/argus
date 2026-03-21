# MEMORY.md — Argus Project State

> **For AI agents:** Read this file first at the start of every session. It is the authoritative record of current project state.

---

## Project Overview

Argus is an intelligent IT support ticket auto-handling system with confidence-based Human-in-the-Loop (HITL) escalation.

- **Two web portals**: Employee (`/employee`) and Agent (`/agent`), both served by a single Vite/React frontend
- **Two backend servers**: Main FastAPI backend on port **8000**, isolated sandbox FastAPI on port **8001**
- **Auto-resolution flow**: A 5-layer decision pipeline runs on every submitted ticket. Only when all 3 confidence signals pass AND sandbox validation succeeds does the system auto-resolve. Otherwise it escalates to a human agent.
- **Tech stack**: Python 3.11+ / FastAPI / async, React 18+ / TypeScript / Vite / shadcn/ui / Tailwind / Framer Motion

---

## Source of Truth

| Document | Role |
|---|---|
| **`SOLUTION.md`** | Read-only. Product intent, context, edge cases. **Do not modify.** |
| **`IMPLEMENTATION_CONTEXT.md`** | Authoritative technical spec — architecture, modules, API design, tech stack. |
| **`PIPELINE_STAGES.md`** | Detailed pipeline logic per stage. |
| **`SIGNALS.md`** | Confidence signal definitions (Signal A/B/C thresholds). |
| **`DATABASE.md`** | Supabase schema reference. |
| **`API.md`** | API endpoint reference. |
| **`MEMORY.md`** | This file — current state, what was built, what is pending. |
| **`RULES.md`** | Operational guardrails. |

---

## Portal Routes (Frontend)

| Route | Page | Description |
|---|---|---|
| `/` | Landing page | Dual portal entry points |
| `/employee` | `UserSelectGrid.tsx` | Employee picks their identity from a grid of avatars |
| `/employee/submit` | `SubmitTicket.tsx` | Employee submits a ticket (pre-fills email from `?email=` param) |
| `/agent` | `EscalatedQueue.tsx` | Agent sees escalated ticket queue |
| `/agent/ticket/:id` | `EvidenceCardView.tsx` | Agent reviews a single ticket's evidence and resolves it |

---

## File Structure

```
argus/
├── backend/
│   ├── main.py                  # FastAPI app entry point, CORS, mounts sandbox
│   ├── api/routes/
│   │   ├── tickets.py           # POST /api/tickets (submit), GET /api/tickets/:id/status
│   │   ├── agent.py             # GET escalated, GET evidence, POST resolve, PATCH correction
│   │   └── config.py           # GET systems, GET users, POST simulate, GET metrics
│   ├── core/
│   │   ├── pipeline.py           # Orchestrates all 5 pipeline stages
│   │   ├── policy_gate.py       # VIP/P1/P2/freeze keyword matching
│   │   ├── novelty.py           # Vector DB novelty detection
│   │   └── confidence.py         # Signal A/B/C computation
│   ├── services/
│   │   ├── supabase.py          # get_supabase() singleton
│   │   ├── jina.py              # generate_embedding(text)
│   │   ├── qdrant.py            # search_similar(), upsert_ticket()
│   │   ├── llm.py               # generate_resolution_message(), generate_ai_suggestion()
│   │   └── sandbox_client.py    # Calls sandbox at localhost:8001
│   ├── models/
│   │   └── ticket.py            # Pydantic models (TicketSubmission, TicketResponse)
│   └── utils/
│       ├── audit_hash.py        # log_to_audit() — SHA-256 Merkle chain
│       └── cluster_map.py       # get_resolution_cluster()
├── sandbox/
│   ├── main.py                  # FastAPI sandbox server (port 8001)
│   ├── actions.py               # ACTION_HANDLERS dict, map_resolution_to_action()
│   └── environment.py           # env singleton
├── frontend/src/
│   ├── pages/employee/
│   │   ├── UserSelectGrid.tsx  # Employee identity picker
│   │   └── SubmitTicket.tsx     # Ticket submission form + TicketResultCard
│   ├── pages/agent/
│   │   ├── EscalatedQueue.tsx  # Agent queue (ticket list)
│   │   └── EvidenceCardView.tsx # Evidence panel + resolution form (main work here)
│   ├── layouts/
│   │   ├── AgentLayout.tsx     # Agent sidebar + header
│   │   └── EmployeeLayout.tsx   # Employee header + back arrow
│   ├── services/
│   │   ├── agent.ts             # getEscalatedTickets, getTicketEvidence, resolveTicket, submitCorrection
│   │   ├── tickets.ts           # submitTicket, getTicketStatus
│   │   └── config.ts           # getSystems, getUsers
│   ├── types/index.ts           # All TypeScript interfaces
│   └── lib/api.ts               # axios instance with base URL
└── data/
    ├── synthetic_tickets.csv
    └── cluster_map.json
```

---

## Database Schema (Supabase — use `supabase_argus_*` MCP tools)

### `users`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `email` | text | unique |
| `name` | text | |
| `department` | text | |
| `tier` | text | `standard`, `vip`, or `contractor` |

### `tickets`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | FK → users.id |
| `description` | text | |
| `category` | text | e.g. "Network", "Software", "Hardware", "Access" |
| `severity` | text | `P1`, `P2`, `P3`, `P4` |
| `status` | text | `processing`, `auto_resolved`, `escalated`, `resolved` |
| `is_urgent` | boolean | |
| `created_at` | timestamptz | |
| `resolved_at` | timestamptz | nullable |
| `auto_resolved` | boolean | **Added via migration.** Tracks whether this ticket was auto-resolved (by accepting AI suggestion or pipeline). |

### `ticket_outcomes`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `ticket_id` | uuid | FK → tickets.id |
| `category` | text | |
| `auto_resolved` | boolean | Whether pipeline auto-resolved this ticket |
| `sandbox_passed` | boolean | |
| `signal_a` | float | Semantic similarity score |
| `signal_b` | float | Resolution consistency score |
| `signal_c` | float | Category accuracy score |
| `escalation_reason` | text | Why it was escalated |
| `resolution` | text | Final resolution text |
| `agent_verified` | boolean | Agent marked it correct |
| `retrospective_match` | boolean | Agent resolution matched AI suggestion (≥80%) |
| `override_reason` | text | Why agent overrode |
| `ai_suggestion` | text | AI's suggested resolution for escalated tickets |
| `resolution_cluster` | text | Cluster label for Qdrant upsert |

### `audit_log`
Stores SHA-256 hash chain per ticket decision. Fields: `id, ticket_id, decision, evidence_card (jsonb), audit_hash, previous_hash, latency_ms, created_at`.

### `category_thresholds`
Per-category Signal A/B/C thresholds. Fields: `id, category, threshold_a, threshold_b, threshold_c, novelty_threshold, min_sample_size`.

---

## Backend API Endpoints

### `POST /api/tickets` (tickets.py)
- Accepts `TicketSubmission`: `{ description, category, severity, user_email, system }`
- Creates ticket in `tickets` table, creates entry in `ticket_outcomes`
- Runs full 5-layer pipeline synchronously
- Returns `TicketResponse`: `{ ticket_id, status, resolution_message, resolution }`

### `GET /api/tickets/:id/status` (tickets.py)
- Returns current ticket status and resolution.

### `GET /api/tickets/agent/escalated` (agent.py)
- Returns all `status='escalated'` tickets joined with audit_log and outcomes.
- Sorted by `is_urgent` then `created_at` (oldest first).

### `GET /api/tickets/:id/evidence` (agent.py)
- Returns full evidence card for a single ticket: ticket data + `evidence_card` from audit_log + `outcome` from ticket_outcomes + thresholds + `candidate_fixes`.
- Computes `layer_intercepted` approximation if not stored.

### `POST /api/tickets/:id/resolve` (agent.py)
- **Request body** (`AgentResolution`): `{ resolution_text, resolution_type ("verified"|"workaround"|"uncertain"), override_reason?, accept_suggestion? }`
- If `accept_suggestion=True`: skips similarity check, sets `retrospective_match=True` + `auto_resolved=True` directly.
- Otherwise: compares `resolution_text` to `ai_suggestion` via `SequenceMatcher` — ≥80% similarity = match.
- Updates `ticket_outcomes`: `resolution`, `agent_verified`, `override_reason`, `retrospective_match`, `auto_resolved`.
- Updates `tickets`: `status='resolved'`, `resolved_at`, `auto_resolved` (mirrors outcome value).
- If `resolution_type='verified'`: embeds ticket description into Qdrant with cluster label.
- Logs to `audit_log`.

### `PATCH /api/tickets/:id/correction` (agent.py)
- For **auto-resolved** tickets marked incorrect by agent.
- Request body: `{ corrected_resolution, resolution_type }`
- Updates `ticket_outcomes`: `ai_suggestion=original_ai`, `resolution=corrected`, `retrospective_match=False`, `agent_verified=True`, `auto_resolved=False`.
- Updates `tickets`: `status='resolved'`, `resolved_at`, `auto_resolved=False`.
- If `resolution_type='verified'`: upserts corrected resolution to Qdrant.
- Logs to `audit_log` with action `AGENT_CORRECTION`.

### `GET /api/config/users` (config.py)
- Returns all users: `id, name, email, department, tier`.

### `POST /api/simulate` (config.py)
- Accepts a ticket description, runs pipeline with a dummy user/system, returns full step-by-step simulation result.
- **Now calls real sandbox** (`map_resolution_to_action()` → `test_in_sandbox()`) instead of faking PASS.

---

## Frontend: EvidenceCardView.tsx (Agent Evidence Panel)

This is the most actively developed page. Current structure:

### LEFT column (`lg:col-span-7`)
1. **User Request Card** — shows ticket description and category
2. **Argus Engine Trace Card** — full pipeline stepper:
   - Intake & Categorization
   - Policy Gate
   - Vector DB Novelty Check
   - Signal A (Semantic Similarity) — value vs threshold
   - Signal B (Resolution Consistency) — value vs threshold
   - Signal C (Category Accuracy) — value vs threshold
   - Sandbox Execution — PASSED/FAILED/SKIPPED
   - Decision — AUTO RESOLVED or HUMAN ESCALATION REQUIRED
3. **Why This Decision** — contextual plain-text explanation based on which layer intercepted
4. **Similar Past Incidents** — top 3 Qdrant matches with ticket_id, similarity %, resolution text. Clicking a match populates the Resolution Steps textarea.
5. **Latency** display + **Audit Hash** display

### RIGHT column (`lg:col-span-5`, sticky)

**For `status === "auto_resolved"` tickets:**
- Shows "Applied Resolution" text
- "Validation Complete" badge
- "Was this resolution correct?" Yes/No buttons
- If No → shows correction form (corrected resolution textarea + resolution type radio + submit)
- Correction calls `submitCorrection()` → `PATCH /tickets/:id/correction`

**For `status === "escalated"` tickets:**
- AI suggestion shown in purple box (from `card.outcome.ai_suggestion`) — **no button inside it**
- "Resolution Steps" textarea starts **empty** (not pre-filled)
- Two buttons side by side:
  - **"Accept AI Resolution"** (green `#10B981`) → calls `resolveTicket()` with `accept_suggestion=True`, `resolution_type="verified"` → sets `auto_resolved=True`
  - **"Submit Resolution →"** (indigo) → submits whatever text is in the textarea
- "Resolution Type" radio: Verified Reusable Fix / Temporary Workaround / Uncertain
- "Resolution Context" dropdown (optional): Why human input was needed

**For `status === "resolved"` tickets:** No dedicated UI branch yet — redirects to `/agent` after resolution. Revisiting a resolved ticket would show the escalated form. (Known issue — see Pending.)

---

## Accomplished Work

### Backend

| Change | File | What Was Done |
|---|---|---|
| Sandbox imports | `sandbox/main.py`, `sandbox/actions.py` | Changed `from sandbox.environment import env` → `from environment import env` (relative) so `uvicorn main:app` works from inside `sandbox/` |
| `resolution` field | `backend/models/ticket.py`, `pipeline.py`, `api/routes/tickets.py` | Added `resolution: Optional[str]` to `TicketResponse`, populated in `conclude()`, returned in API |
| `action_payload` unbound | `pipeline.py` | `action_payload` was referenced before extraction from `extra` dict — fixed extraction order |
| Real sandbox calls | `api/routes/config.py` (`/api/simulate`) | Was hardcoded to fake PASS — now calls `map_resolution_to_action()` → `test_in_sandbox()` |
| `GET /api/config/users` | `api/routes/config.py` | Returns `id, name, email, department, tier` from users table |
| `auto_resolved` column | `tickets` table + `api/routes/agent.py` | Added via migration. `POST /resolve` writes it to both `tickets` and `ticket_outcomes`. `PATCH /correction` writes `auto_resolved=False` to both. |
| `accept_suggestion` | `AgentResolution` Pydantic model + `resolve_ticket()` | When agent clicks "Accept AI Resolution", `accept_suggestion=True` skips similarity check and directly sets `retrospective_match=True` + `auto_resolved=True` |
| `model_config = {"extra": "ignore"}` | `AgentResolution` | Prevents 422 errors when frontend sends extra fields (was causing 422 because frontend sent `"reusable"` not `"verified"`) |

### Frontend

| Change | File | What Was Done |
|---|---|---|
| User select grid | `UserSelectGrid.tsx` | New page — responsive grid of employee initials avatars, tier-colored borders, click navigates to `/employee/submit?email=X` |
| Submit ticket | `SubmitTicket.tsx` | URL email pre-fill from `?email=` param, `TicketResultCard` with status-aware display (auto_resolved/escalated/processing/resolved) |
| Employee layout | `EmployeeLayout.tsx` | Added back arrow on submit page |
| Routing | `App.tsx` | Split: `/employee` → UserSelectGrid, `/employee/submit` → SubmitTicket |
| Config service | `config.ts` | Added `getUsers()` + `User` type |
| Types | `types/index.ts` | Fixed `TicketResponse` with `resolution` field. `AgentResolution.resolution_type` uses `"verified"` (not `"reusable"`). |
| Feedback type radio | `EvidenceCardView.tsx` | Fixed nested click target conflict — replaced parent div `onClick` with `htmlFor` label wrapping `RadioGroupItem`. Added theme-matched colors: emerald/green for "Verified Reusable Fix", amber/orange for "Temporary Workaround", rose/red for "Uncertain/Site-Specific". |

| Change | Details |
|---|---|
| Pipeline stepper | Vertical 8-step trace with colored dots (green=passed, red=intercepted, amber=unavailable) |
| Why This Decision | Plain-text block explaining why auto-resolved or why escalated based on `interceptedLayer` |
| Similar Past Incidents | Top 3 Qdrant matches, click to populate textarea |
| Escalated form | AI suggestion box (no duplicate button inside), empty textarea, "Accept AI Resolution" + "Submit Resolution →", Resolution Type radio, Resolution Context dropdown |
| Resolution type fix | Changed from `"reusable"` to `"verified"` everywhere — was causing 422 errors |
| Override → Resolution Context | Renamed "Override Context" → "Resolution Context", placeholder: "Why was human input needed?" |

---

## Pending / Known Issues

### 1. `EvidenceCardView` — no `status === "resolved"` branch
When an agent resolves an escalated ticket, the page redirects to `/agent`. But if an agent navigates directly to a resolved ticket (e.g. via URL), the page falls into the `escalated` branch and shows the resolution form. Need a `status === "resolved"` branch that shows the resolution that was applied, with no form.

### 2. RLS policies on `tickets.auto_resolved`
The `auto_resolved` column was added to `tickets` via migration but RLS policies haven't been tested for write access. Verify the authenticated service role can UPDATE this column. Run `supabase_argus_get_advisors(type=security)` to check.

### 3. `correctionSuccess` mutation
`handleSubmitCorrection` mutates `(card as any).resolution = correctionText` but doesn't properly trigger a React Query cache invalidation. The UI may not update visually after correction submission.

### 4. `card.outcome` is typed as `any`
The `EvidenceCard` TypeScript type has `outcome?: any`. For proper type safety, tighten this to a concrete interface with `ai_suggestion`, `signal_a`, `signal_b`, `signal_c`, `resolution`, `auto_resolved`, etc.

### 5. "Agent verified" on auto-resolved tickets
`handleMarkYes` calls `markAgentVerified()` which only updates `ticket_outcomes.agent_verified=True`. Does NOT update `tickets.auto_resolved`. If agent later corrects, `auto_resolved` stays true. Consider whether "yes, verified" should also update the `tickets` table.

---

## Git Status

```
Commit: 00be287 — "feat: explainable AI panel + accept/override flow in EvidenceCardView"
Status: Uncommitted changes since that commit:
  - EvidenceCardView: removed duplicate "✓ Use This Solution" button
  - EvidenceCardView: removed pre-fill useEffect, textarea now starts empty
  - EvidenceCardView: renamed "Override Context" → "Resolution Context"
  - EvidenceCardView: removed "How Argus Decided" header, kept "Why This Decision"
  - EvidenceCardView: removed Signal A/B/C bars from "How Argus Decided"
  - EvidenceCardView: removed "Submit Different Resolution" + "Submit Override Resolution →"
  - EvidenceCardView: renamed handleAcceptAiResolution → handleAcceptSuggestion
  - types/index.ts: AgentResolution.resolution_type "reusable" → "verified"
  - EvidenceCardView: added model_config={"extra":"ignore"} (backend)
  - EvidenceCardView: fixed stray </div> causing JSX parse error
  - UserSelectGrid.tsx: removed unused Loader2 import
  - EvidenceCardView: fixed feedback type radio — htmlFor label + theme colors (emerald/amber/rose)
  - MEMORY.md: created
  - AGENTS.md: updated with correct spec file names
```

**User rule: Do NOT push to GitHub unless explicitly asked.**

---

## Design System (Frontend)

- **CSS variables**: `--argus-*` (all colors), `--argus-surface`, `--argus-surface-2`, `--argus-border`, `--argus-text-primary`, `--argus-text-secondary`, `--argus-text-muted`, `--argus-indigo`, `--argus-indigo-light`, `--argus-emerald`, `--argus-amber`, `--argus-red`, `--argus-red-light`, `--shadow-card`, `--shadow-lg`
- **Fonts**: Inter (UI), DM Mono (monospace/code)
- **Rule**: Hardcode hex colors in React components (not CSS variables) to avoid dark/light mode contrast issues. Exception: inside shadcn/ui components that already use CSS vars.
- **Icons**: Lucide React (`lucide-react`)
- **Animation**: Framer Motion (`motion.*` components)
- **UI components**: shadcn/ui (`Button`, `Textarea`, `RadioGroup`, `Label`, `Select`, `Separator`)

---

## Pipeline (Backend — 5 Layers)

```
Ticket submitted
    │
    ▼
Layer 1: Policy Gate ──(VIP/P1/P2/freeze)──► ESCALATE ─────────┐
    │                                                      │
    ▼                                                      │
Layer 2: Vector DB Novelty Check ──(similarity < 0.5)──► ESCALATE │
    │                                                         │
    ▼                                                         │
Layer 3: Signal A (Semantic Similarity) ──(score < threshold_a)──► ESCALATE
    │                                                              │
    ▼                                                              │
Layer 4: Signal B (Resolution Consistency) ──(score < threshold_b)──► ESCALATE
    │                                                              │
    ▼                                                              │
Layer 5: Signal C (Category Accuracy) ──(score < threshold_c)──► ESCALATE
    │                                                              │
    ▼                                                              │
Layer 6: Sandbox Execution ──(test fails)──► ESCALATE ───────────┘
    │
    ▼
AUTO RESOLVE (all passed)
```

- **Fail-safe**: Any error, timeout, or unavailability → escalate. Never auto-resolve on uncertainty.
- **Signal thresholds** per category are stored in `category_thresholds` table (defaults: A=0.85, B=0.60, C=0.70).
- **Auto-resolve condition**: all 3 signals pass their thresholds AND sandbox passes.

---

## Frontend → Backend Data Flow (EvidenceCardView)

```
GET /api/tickets/:id/evidence
    │
    ├── tickets table ──► description, category, severity, status, user_email, created_at
    ├── audit_log ──► evidence_card (jsonb): candidate_fixes, escalation_reason, layer_intercepted
    ├── ticket_outcomes ──► ai_suggestion, resolution, signal_a/b/c, auto_resolved, sandbox_passed
    └── category_thresholds ──► threshold_a/b/c
         │
         ▼
    Frontend derives:
    - aiSuggestion = card.outcome.ai_suggestion
    - resolutionText = state (starts empty)
    - resolutionType = "verified" (default)
    - accept_suggestion = true (only when "Accept AI Resolution" clicked)
```

**POST /api/tickets/:id/resolve**
```
Body: { resolution_text, resolution_type, override_reason?, accept_suggestion? }
│
├── accept_suggestion=true → retrospective_match=True, auto_resolved=True (no similarity check)
├── accept_suggestion=false → SequenceMatcher(resolution_text, ai_suggestion) ≥ 80% → retrospective_match=True
└── Writes: ticket_outcomes (resolution, agent_verified, override_reason, retrospective_match, auto_resolved)
            tickets (status='resolved', resolved_at, auto_resolved)
            Qdrant (if resolution_type='verified')
            audit_log (AGENT_RESOLVED)
```

**PATCH /api/tickets/:id/correction**
```
Body: { corrected_resolution, resolution_type }
│
└── Writes: ticket_outcomes (ai_suggestion=original, resolution=corrected, retrospective_match=False, agent_verified=True, auto_resolved=False)
            tickets (status='resolved', resolved_at, auto_resolved=False)
            Qdrant (if resolution_type='verified')
            audit_log (AGENT_CORRECTION)
```
