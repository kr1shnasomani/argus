# Argus — TODO Roadmap

> Chronologically ordered build plan. Each checkbox is scoped for a single AI agent session.
> Dependencies flow top-to-bottom — complete each phase before starting the next.

---

## Phase 0: Project Scaffolding & External Services

> Zero code logic — just directory structure, dependency installation, and cloud service provisioning.

- [x] Create the full directory tree: `backend/{api/routes, core, services, models, utils}`, `sandbox/`, `scripts/`, `tests/`, `data/`, `frontend/`
- [x] Create `backend/requirements.txt` with: `fastapi`, `uvicorn[standard]`, `pydantic`, `httpx`, `qdrant-client`, `supabase`, `python-dotenv`, `python-multipart`, `sentence-transformers`, `scikit-learn`
- [x] Create `sandbox/requirements.txt` with: `fastapi`, `uvicorn[standard]`, `pydantic`
- [x] Create `.env.example` with all required environment variable keys (Supabase URL/keys, Qdrant URL/key, Jina API key, OpenRouter API key, sandbox URL, default thresholds)
- [x] Create `.gitignore` (Python, Node, `.env`, `__pycache__`, `node_modules`, `data/*.csv`, `cluster_map.json`)
- [x] Provision Supabase project — obtain project URL, anon key, and service role key
- [x] Provision Qdrant Cloud cluster — obtain URL and API key *(pending — user will provide)*
- [x] Obtain Jina AI API key for `jina-embeddings-v3`
- [x] Obtain OpenRouter API key — verified. Groq and Gemini also obtained (fallback chain)
- [x] Create Qdrant collection `resolved_tickets` (vector size: 1024, distance: Cosine) *(pending — after Qdrant provisioned)*
- [x] Populate `.env` with all obtained credentials (Qdrant fields left blank until provisioned)

---

## Phase 1: Database Schema (Supabase)

> All 7 tables must exist before any backend module can query them.

- [x] Create `users` table: `id` (UUID PK), `email` (TEXT UNIQUE), `name` (TEXT), `tier` (TEXT, default 'standard'), `department` (TEXT), `created_at` (TIMESTAMPTZ, default now())
- [x] Create `systems` table: `id` (UUID PK), `name` (TEXT UNIQUE), `category` (TEXT), `change_freeze` (BOOLEAN, default false), `active_incident` (BOOLEAN, default false), `updated_at` (TIMESTAMPTZ)
- [x] Create `tickets` table: `id` (UUID PK), `user_id` (UUID FK→users), `system_id` (UUID FK→systems, nullable), `description` (TEXT), `category` (TEXT), `severity` (TEXT), `status` (TEXT, default 'processing'), `attachment_url` (TEXT, nullable), `attachment_text` (TEXT, nullable), `created_at` (TIMESTAMPTZ), `resolved_at` (TIMESTAMPTZ, nullable)
- [x] Create `ticket_outcomes` table: `id` (UUID PK), `ticket_id` (UUID FK→tickets), `category` (TEXT), `auto_resolved` (BOOLEAN), `sandbox_passed` (BOOLEAN, nullable), `signal_a` (FLOAT), `signal_b` (FLOAT), `signal_c` (FLOAT), `escalation_reason` (TEXT, nullable), `resolution` (TEXT), `agent_verified` (BOOLEAN), `override_reason` (TEXT, nullable), `created_at` (TIMESTAMPTZ)
- [x] Create `audit_log` table: `id` (UUID PK), `ticket_id` (UUID FK→tickets), `decision` (TEXT), `evidence_card` (JSONB), `audit_hash` (TEXT), `previous_hash` (TEXT), `latency_ms` (INTEGER), `created_at` (TIMESTAMPTZ)
- [x] Create `category_thresholds` table: `id` (UUID PK), `category` (TEXT UNIQUE), `threshold_a` (FLOAT, default 0.85), `threshold_b` (FLOAT, default 0.60), `threshold_c` (FLOAT, default 0.70), `novelty_threshold` (FLOAT, default 0.50), `min_sample_size` (INTEGER, default 30), `updated_at` (TIMESTAMPTZ)
- [x] Create `novel_tickets` table: `id` (UUID PK), `ticket_id` (UUID FK→tickets), `max_similarity` (FLOAT), `reviewed` (BOOLEAN, default false), `created_at` (TIMESTAMPTZ)
- [x] Add indexes on: `tickets.user_id`, `tickets.status`, `ticket_outcomes.category`, `ticket_outcomes.created_at`, `audit_log.ticket_id`

---

## Phase 2: Pydantic Data Models

> Shared types used by all backend modules. Must exist before any service or core module.

- [x] Create `backend/models/__init__.py`
- [x] Create `backend/models/ticket.py`: `TicketSubmission` (description, category, severity, user_email, system_name?, attachment?), `TicketResponse` (ticket_id, status, resolution_message?, resolved_at?, decision_latency_ms?)
- [x] Create `backend/models/user.py`: `User` (id, email, name, tier, department), `System` (id, name, category, change_freeze, active_incident)
- [x] Create `backend/models/confidence.py`: `GateResult` (action: PROCEED/ESCALATE/BATCH_ESCALATE, reason), `SignalResult` (name, score, threshold, result: PASS/FAIL), `ConfidenceReport` (decision: CANARY/ESCALATE, signals dict, failed dict, reason?)
- [x] Create `backend/models/evidence_card.py`: `EvidenceCard` (ticket_id, submitted_by, category, description, escalation_reason, signals, novelty_check, why_not_automated, candidate_fixes, decision_latency, audit_hash, previous_hash, timestamp)
- [x] Create `backend/models/audit.py`: `AuditEntry` (id, ticket_id, decision, evidence_card, audit_hash, previous_hash, latency_ms, created_at)
- [x] Create `backend/models/agent.py`: `AgentResolution` (ticket_id, resolution_text, resolution_type: verified/workaround/uncertain, override_reason?)

---

## Phase 3: Service Clients (External Integrations)

> Thin wrappers around external APIs. Must exist before core pipeline modules can use them.

### 3A: Supabase Client
- [x] Create `backend/services/__init__.py`
- [x] Create `backend/services/supabase.py` (initialize `supabase-py` using `SUPABASE_SERVICE_KEY`)
- [x] Add `get_user_by_email(email) → User` helper
- [x] Add `get_system_by_name(name) → System` helper
- [x] Add `insert_ticket(ticket_data) → ticket_id` helper
- [x] Add `update_ticket_status(ticket_id, status, resolved_at?)` helper
- [x] Add `insert_ticket_outcome(outcome_data)` helper
- [x] Add `get_category_thresholds(category) → thresholds dict` helper
- [x] Add `get_ticket_history(category, days=30) → list[dict]` helper (for Signal C)
- [x] Add `insert_audit_log(entry_data)` helper
- [x] Add `get_last_audit_hash() → str` helper
- [x] Add `insert_novel_ticket(ticket_id, max_similarity)` helper

### 3B: Jina AI Client
- [x] Create `backend/services/jina.py`: `embed_text(text: str) → list[float]` — POST to `https://api.jina.ai/v1/embeddings` with model `jina-embeddings-v3`, return 1024-dim vector
- [x] Add `batch_embed(texts: list[str]) → list[list[float]]` for data loading scripts (with rate-limit handling)

### 3C: Qdrant Client
- [x] Create `backend/services/qdrant.py`: initialize `QdrantClient` from env vars
- [x] Add `search_similar(vector, top_k=5, filter_verified=True) → list[ScoredPoint]` — search `resolved_tickets` collection with payload, filter by `verified=true`
- [x] Add `upsert_ticket(ticket_id, vector, payload)` — upsert a single point into `resolved_tickets`
- [x] Add `count_vectors() → int` — return total vector count in collection
- [x] Add startup check: verify collection exists, create if missing (vector size 1024, cosine distance)

### 3D: LLM Client (OpenRouter)
- [x] Create `backend/services/llm.py`: base `_call_openrouter(messages, model?) → str` function using `httpx` async POST to OpenRouter API
- [x] Add `generate_evidence_card(ticket, signals, qdrant_results, escalation_reason) → EvidenceCard` — structured prompt that returns JSON evidence card
- [x] Add `generate_resolution_message(resolution_text, ticket_description) → str` — refine raw resolution into friendly employee-facing message
- [x] Add `generate_why_not_automated(signals, qdrant_results) → str` — generate human-readable explanation of why the ticket wasn't auto-resolved

### 3E: Vision Client
- [x] Create `backend/services/vision.py`: `extract_image_text(image_url: str) → str` — send image URL to Gemma 3 27B via OpenRouter with prompt to describe/extract text from screenshot

### 3F: Storage Client
- [x] Create `backend/services/storage.py`: `upload_attachment(file: UploadFile) → str` — upload to Supabase Storage bucket, return public URL

---

## Phase 4: Core Pipeline Modules

> The decision engine. Each layer is an independent, testable Python module.

### 4A: Layer 0 — Hard Policy Gate
- [x] Create `backend/core/__init__.py`
- [x] Create `backend/core/policy_gate.py`: `hard_policy_gate(ticket, user, system) → GateResult` — pure Python if/else: check severity P1/P2 → ESCALATE, VIP tier → ESCALATE, change_freeze → ESCALATE, active_incident → BATCH_ESCALATE, else → PROCEED
- [x] Write `tests/test_policy_gate.py`: 7 test cases (P1 escalate, P2 escalate, VIP escalate, change freeze escalate, active incident batch-escalate, P3 standard proceed, P4 standard proceed)

### 4B: Layer 1 — Embedding & Retrieval
- [x] Create `backend/core/embedder.py`: `embed_ticket(description, attachment_url?) → list[float]` — if attachment: call `vision.extract_image_text()`, append to description; call `jina.embed_text()` on combined text
- [x] Create `backend/core/retriever.py`: `retrieve_similar(vector, top_k=5) → list[ScoredPoint]` — call `qdrant.search_similar()`, return results with payloads

### 4C: Layer 2 — Novelty Detection
- [x] Create `backend/core/novelty.py`: `check_novelty(qdrant_results, threshold=0.50) → GateResult` — compute `max(scores)`, return ESCALATE if below threshold, PROCEED otherwise
- [x] Write `tests/test_novelty.py`: 4 test cases (all below threshold, exactly at threshold, well above, empty results)

### 4D: Layer 3 — Confidence Engine
- [x] Create `backend/utils/cluster_map.py`: `load_cluster_map(path) → dict`, `get_resolution_cluster(resolution_text, cluster_map) → str` — load `data/cluster_map.json` and look up cluster ID for a resolution string
- [x] Create `backend/core/confidence.py`: `compute_confidence(qdrant_results, category, supabase_client, cluster_map) → ConfidenceReport`
- [x] Implement Signal A: `score = qdrant_results[0].score`
- [x] Implement Signal B: extract `resolution_cluster` from each top-5 result via `cluster_map`, compute `most_common_count / total`
- [x] Implement Signal C: query `ticket_outcomes` for category over last 30 days, cold-start check (< 30 tickets → auto-fail), compute `auto_resolved_count / total`
- [x] Implement veto check: compare each signal against per-category thresholds from `category_thresholds` table, any failure → ESCALATE
- [x] Write `tests/test_confidence.py`: 6+ test cases (all pass, signal A fail, signal B fail, signal C fail, cold start, multiple failures)

### 4E: Resolution Mapper
- [x] Create `backend/core/resolution_mapper.py`: `map_resolution_to_action(qdrant_top_result) → dict` — maintain a mapping dict from `resolution_cluster` IDs to sandbox actions (`unlock_account`, `reset_password`, `restart_service`, `grant_permission`, `install_software`), extract target from ticket context

### 4F: Layer 4 — Sandbox Client
- [x] Create `backend/core/sandbox_client.py`: `test_in_sandbox(action, target, params?) → dict` — `httpx.post()` to `SANDBOX_URL/sandbox/execute`, handle connection errors gracefully (default to ESCALATE), parse `success` boolean
- [x] Write `tests/test_sandbox.py`: 5 test cases (successful action, unknown user, unknown action, connection timeout, sandbox reset)

### 4G: Audit Hash Utility
- [x] Create `backend/utils/audit_hash.py`: `generate_audit_hash(evidence_card: dict, previous_hash: str) → str` — SHA-256 of JSON-serialized payload with `sort_keys=True`
- [x] Add `log_to_audit(ticket_id, decision, evidence_card, supabase_client) → str` — fetch last hash, generate new hash, insert audit_log entry, return hash
- [x] Write `tests/test_audit_hash.py`: 4 test cases (deterministic output, different input → different hash, chain integrity, genesis hash)

### 4H: Latency Tracking
- [x] Create `backend/utils/timestamps.py`: `LatencyTracker` class with `start(stage_name)`, `stop(stage_name)`, `get_breakdown() → dict[str, int]` — tracks millisecond latency per pipeline stage

### 4I: Pipeline Orchestrator
- [x] Create `backend/core/pipeline.py`: `async process_ticket(submission: TicketSubmission) → TicketResponse` — chains all layers:
  1. Insert ticket → Supabase (status: processing)
  2. Fetch user + system records
  3. Start latency tracker
  4. Layer 0: policy gate → if ESCALATE, generate evidence card, log audit, return
  5. Layer 1: embed + retrieve
  6. Layer 2: novelty check → if ESCALATE, log to novel_tickets, generate evidence card, log audit, return
  7. Layer 3: confidence → if ESCALATE, generate evidence card, log audit, return
  8. Map resolution to sandbox action
  9. Layer 4: sandbox test → if FAIL, generate evidence card, log audit, return
  10. Auto-resolve: log outcome, generate user message, log audit with hash, update ticket status, embed to Qdrant
- [x] Write `tests/test_pipeline_integration.py`: 11 integration test scenarios (happy path auto-resolve, VIP escalation, P1 escalation, novel ticket, signal A/B/C failures, cold start, sandbox failure, sandbox unavailable, image ticket, agent verified fix, agent workaround)

---

## Phase 5: Sandbox Server (Port 8001)

> Standalone FastAPI app — no dependency on main backend code.

- [x] Create `sandbox/environment.py`: define `SandboxEnvironment` class with initial state — 10-15 mock users (mix of locked/active/expired), mock services (SAP, VPN, Email, Network, Printer — mix of running/stopped), `reset()` method to restore initial state
- [x] Create `sandbox/actions.py`: action handlers — `unlock_account(env, target)`, `reset_password(env, target)`, `restart_service(env, target)`, `grant_permission(env, target, permission)`, `install_software(env, target)` — each returns `{success: bool, message: str}`
- [x] Create `sandbox/logs.py`: in-memory list of `{timestamp, action, target, success, message}` entries, `get_logs()` and `clear_logs()` functions
- [x] Create `sandbox/main.py`: FastAPI app with 4 endpoints:
  - `POST /sandbox/execute` — route to action handler based on `action` param
  - `GET /sandbox/status` — return current environment state
  - `POST /sandbox/reset` — call `environment.reset()`, clear logs
  - `GET /sandbox/logs` — return execution history
- [x] Verify sandbox starts: `uvicorn sandbox.main:app --port 8001`
- [x] Test: `curl -X POST localhost:8001/sandbox/execute -d '{"action":"unlock_account","target":"john.doe"}'` returns `success: true`
- [x] Test: `curl -X POST localhost:8001/sandbox/reset` resets state

---

## Phase 6: API Routes (Main Backend, Port 8000)

> REST endpoints that expose the pipeline and agent workflows.

### 6A: App Setup
- [x] Create `backend/api/__init__.py`
- [x] Create `backend/api/main.py`: FastAPI app with CORS (allow frontend origin), lifespan event (load cluster_map, verify Qdrant collection), include all routers, global exception handler

### 6B: Ticket Endpoints
- [x] Create `backend/api/routes/__init__.py`
- [x] Create `backend/api/routes/tickets.py`:
  - `POST /api/tickets/submit` — accept `TicketSubmission` (multipart for file), handle optional file upload → Supabase Storage, call `pipeline.process_ticket()`, return `TicketResponse`
  - `GET /api/tickets/{ticket_id}` — query Supabase `tickets` + `ticket_outcomes`, return status, resolution, latency

### 6C: Agent Endpoints
- [x] Create `backend/api/routes/agent.py`:
  - `GET /api/tickets/agent/escalated` — query tickets WHERE status='escalated', join with audit_log for evidence cards, sort by severity then created_at
  - `POST /api/tickets/{ticket_id}/resolve` — accept `AgentResolution`, if verified: embed via Jina → upsert Qdrant (verified=true); insert ticket_outcome; refine message via LLM; update ticket status to 'resolved'

### 6D: Audit Endpoints
- [x] Create `backend/api/routes/audit.py`:
  - `GET /api/audit/{ticket_id}` — return audit_log entries for ticket with hash chain

### 6E: Metrics Endpoints
- [x] Create `backend/api/routes/metrics.py`:
  - `GET /api/metrics/dashboard` — compute: auto_resolved count, escalated count, sandbox_failed count (last 100 tickets)
  - `GET /api/metrics/coverage` — call Qdrant count, query unique categories, compute avg signal_a of recent 50 outcomes, determine coverage level (High/Moderate/Low)
  - `GET /api/metrics/drift` — for each category: compare last 7 days accuracy vs previous 7 days, flag if drift > 10%

### 6F: Config & Simulator Endpoints
- [x] Create `backend/api/routes/config.py`:
  - `GET /api/config/thresholds` — return all category_thresholds rows
  - `GET /api/config/thresholds/{category}` — return thresholds for one category
- [x] Add `POST /api/simulate` to `backend/api/routes/config.py` — accept modified ticket params (user_tier, severity, system_status), run pipeline in dry-run mode (no DB writes), return which layer intercepted and why

### 6G: Verify Backend Starts
- [x] Verify main backend starts: `uvicorn backend.api.main:app --port 8000 --reload`
- [x] Test `POST /api/tickets/submit` with a sample P3 ticket → verify full pipeline executes
- [x] Test `POST /api/tickets/submit` with a VIP user email → verify immediate escalation
- [x] Test `GET /api/tickets/agent/escalated` → verify escalated tickets appear with evidence cards

---

## Phase 7: Data Loading Scripts

> One-time scripts to seed the knowledge base. Requires Phase 1 (DB), Phase 3 (service clients), and the synthetic CSV (generated separately).

- [x] Create `scripts/seed_systems.py`: insert 8 mock systems into Supabase `systems` table (SAP, VPN, Email, Network, Printer, Active Directory, Software Portal, File Server) with `change_freeze=false`, `active_incident=false`
- [x] Create `scripts/seed_users.py`: insert 15-20 mock users into Supabase `users` table — 2-3 VIP users (CEO, CFO, CTO), rest standard across various departments
- [x] Create `scripts/seed_thresholds.py`: insert default thresholds for all 8 categories (Auth/SSO, SAP Issues, Email Access, VPN Problems, Printer Issues, Software Install, Network/Connectivity, Permissions/Access) into `category_thresholds` table
- [x] Create `scripts/load_data.py`: read `data/synthetic_tickets.csv`, validate schema (description, category, severity, resolution, resolution_cluster, user_tier), insert into Supabase `tickets` + `ticket_outcomes` (pre-marked as auto_resolved=true, agent_verified=true)
- [x] Create `scripts/embed_tickets.py`: read all tickets from Supabase, batch-embed descriptions via Jina AI (with rate-limit delays), upsert all vectors + payloads into Qdrant `resolved_tickets` collection
- [x] Create `scripts/build_clusters.py`: load unique resolution texts, embed with `sentence-transformers`, run `AgglomerativeClustering`, output `data/cluster_map.json` mapping `{resolution_text: cluster_id}`
- [x] Create `scripts/prepare_demo.py`: insert the 5 specific demo tickets from SOLUTION.md Section 14 — password reset (auto-resolve), SAP login (auto-resolve), intermittent network (Signal B fail), CEO email (VIP escalation), production DB down (P1 escalation) — and their expected outcomes
- [x] Run scripts in order: `seed_systems.py` → `seed_users.py` → `seed_thresholds.py` → `load_data.py` → `embed_tickets.py` → `build_clusters.py` → `prepare_demo.py`
- [x] Verify: Qdrant has ~500 vectors, Supabase has populated tables, `cluster_map.json` exists

---

## Phase 8: Frontend — Project Setup & Shared Infrastructure

> Initialize the React app and build shared components before any page-specific work.

- [x] Initialize Vite + React + TypeScript project in `frontend/` directory
- [x] Install core dependencies: `react-router-dom`, `@tanstack/react-query`, `axios`, `recharts`, `lucide-react`
- [x] Install and configure shadcn/ui (read the `shadcn-ui` skill in `.agents/skills/` first) with Tailwind CSS
- [x] Install shadcn/ui components: `button`, `card`, `input`, `textarea`, `select`, `badge`, `table`, `dialog`, `tabs`, `separator`, `dropdown-menu`, `radio-group`, `label`, `progress`
- [x] Create `frontend/src/lib/api.ts`: axios instance with `baseURL: http://localhost:8000`, shared request/response types
- [x] Create `frontend/src/types/index.ts`: TypeScript types matching backend Pydantic models — `Ticket`, `TicketSubmission`, `TicketResponse`, `EvidenceCard`, `ConfidenceSignal`, `AgentResolution`, `AuditEntry`, `DashboardMetrics`, `CoverageMetrics`, `DriftData`
- [x] Create `frontend/src/services/tickets.ts`: `submitTicket()`, `getTicketStatus(id)` API functions
- [x] Create `frontend/src/services/agent.ts`: `getEscalatedTickets()`, `resolveTicket(id, resolution)` API functions
- [x] Create `frontend/src/services/metrics.ts`: `getDashboardMetrics()`, `getCoverage()`, `getDrift()` API functions
- [x] Create `frontend/src/services/audit.ts`: `getAuditLog(ticketId)` API functions
- [x] Create `frontend/src/services/config.ts`: `getThresholds()`, `simulate(params)` API functions
- [x] Set up React Router in `frontend/src/App.tsx` with route structure:
  - `/` → Employee: Submit Ticket
  - `/ticket/:id` → Employee: Ticket Status
  - `/agent` → Agent: Escalated Queue
  - `/agent/ticket/:id` → Agent: Evidence Card + Resolution
  - `/agent/simulator` → Agent: What-If Simulator
  - `/agent/metrics` → Agent: Dashboard
  - `/agent/audit` → Agent: Audit Log
- [x] Create shared layout components: `EmployeeLayout` (header, nav), `AgentLayout` (sidebar nav, header)

---

## Phase 9: Frontend — Employee Portal Pages
* **Status**: Complete

- [x] Create `SubmitTicket` page (`frontend/src/pages/employee/SubmitTicket.tsx`):
  - Text area for description
  - Category dropdown (8 categories)
  - Severity dropdown (P1, P2, P3, P4)
  - File upload input (images, documents)
  - Submit button → calls `submitTicket()`, redirects to `/ticket/:id` on success
- [x] Create `TicketStatus` page (`frontend/src/pages/employee/TicketStatus.tsx`):
  - Poll `getTicketStatus(id)` every 3 seconds using `@tanstack/react-query` with `refetchInterval`
  - Display real-time status badge: Processing (spinner), Auto-Resolved (green), Under Human Review (amber)
  - When resolved: show LLM-generated resolution message in a card
  - When pending: show "Your ticket is under review" message
  - Show decision latency after resolution

---

## Phase 10: Frontend — Agent Portal Pages

### 10A: Escalated Queue
- [x] Create `EscalatedQueue` page (`frontend/src/pages/agent/EscalatedQueue.tsx`):
  - Fetch escalated tickets via `getEscalatedTickets()`
  - Render sortable table: ticket ID, category, severity, escalation reason, time waiting
  - Click row → navigate to `/agent/ticket/:id`
  - Auto-refresh every 10 seconds

### 10B: Evidence Card & Resolution
- [x] Create `EvidenceCardView` page (`frontend/src/pages/agent/EvidenceCardView.tsx`):
  - Fetch ticket + evidence card data
  - Display confidence signals section: Signal A, B, C each with score, threshold, PASS/FAIL badge with visual bar
  - Display novelty check result
  - Display "Why Not Automated" explanation block
  - Display candidate fixes list (ticket ID, similarity, resolution text, success rate)
  - Display decision latency breakdown
- [x] Add `ResolutionForm` component within the Evidence Card page:
  - Textarea for resolution text
  - Radio group: Verified reusable fix / Temporary workaround / Uncertain
  - Optional dropdown for override reason (Incorrect suggestion, Missing context, Multiple possible fixes, User clarification required, Other)
  - Submit button → calls `resolveTicket()`
  - On success: show confirmation, redirect to queue

### 10C: What-If Simulator
- [x] Create `WhatIfSimulator` page (`frontend/src/pages/agent/WhatIfSimulator.tsx`):
  - Input fields: ticket description (textarea), user tier (dropdown: Standard/VIP), severity (dropdown: P1-P4), change freeze (toggle), active incident (toggle)
  - "Simulate" button → calls `POST /api/simulate`
  - Results panel: which pipeline layer intercepted, reason, signal values if applicable
  - Visual pipeline diagram highlighting the interception point

### 10D: Metrics Dashboard
- [x] Create `MetricsDashboard` page (`frontend/src/pages/agent/MetricsDashboard.tsx`):
  - **System Performance card**: auto-resolved count, escalated count, sandbox failures (last 100 tickets) — use `recharts` pie or donut chart
  - **Knowledge Base Coverage card**: Qdrant vector count, categories covered, avg similarity, coverage level badge (High/Moderate/Low)
  - **Drift Monitor card**: per-category signal trends (7 days) with ↑/→/↓ indicators and ✅/⚠️ status badges
  - **Override Analysis card**: breakdown of override reasons with counts

### 10E: Audit Log
- [x] Create `AuditLog` page (`frontend/src/pages/agent/AuditLog.tsx`):
  - Search/filter by ticket ID
  - Table of audit entries: timestamp, ticket ID, decision, latency, audit hash (truncated)
  - "Cryptographically Verified ✅" badge on each entry
  - Click to expand: full evidence card JSON, complete hash, previous hash

---

## Phase 11: Frontend Polish & Integration Testing
> **Status: 🔄 In Progress** — Landing page built; portal polish ongoing.

### Done so far
- [x] **Design system implemented** (`index.css`): DM Sans + DM Mono fonts, full CSS token set for light and dark mode, `kpi-card` accent variants, severity/status badge classes, dot-grid background, shadow scale, stagger animations, custom scrollbar, smooth scroll
- [x] **Flash-free theme toggle**: `main.tsx` reads `localStorage` before React renders; Sun/Moon button persists preference
- [x] **AgentLayout rebuilt**: gradient logo, active-state left-border nav indicator, engine status chip, theme toggle, dot-grid main content, Back to Home link
- [x] **EmployeeLayout rebuilt**: consistent sidebar design, AI processing banner, "Secure & Encrypted" header badge, Back to Home link
- [x] **EscalatedQueue redesigned**: premium table, monospace ticket ID chips, severity pill badges, hover arrow reveal, empty state
- [x] **MetricsDashboard redesigned**: KPI cards with accent top borders, Recharts with CSS variable colors, drift monitor rows
- [x] **AuditLog redesigned**: Merkle-Verified badge, search bar, monospace hash preview, detail dialog
- [x] **WhatIfSimulator updated**: all hardcoded dark hex colors replaced with CSS variable tokens
- [x] **EvidenceCardView redesigned**: two-column layout, signal bars, escalation alert, sticky resolution workspace, toast notifications
- [x] **SubmitTicket redesigned**: AI auto-resolution banner, gradient submit CTA, clean form card, toast notifications
- [x] **TicketStatus redesigned**: visual step timeline, per-status accent config, resolution details block
- [x] **Installed framer-motion & sonner**: animation library + toast notifications
- [x] **Route restructure**: `/` → Landing, `/employee` → Employee Portal, `/agent` → Agent Portal
- [x] **FadeIn & StaggerContainer**: Framer Motion animation wrappers for scroll-triggered reveals
- [x] **PageTransition**: Framer Motion page transition wrapper
- [x] **Landing Page — Navbar**: Fixed glassmorphism navbar, mobile menu, dual CTAs, smooth scroll anchors
- [x] **Landing Page — Hero**: Gradient mesh background, floating orbs, bold headline with animated underline, trust signals, embedded mock dashboard preview
- [x] **Landing Page — LogoBanner**: Tech stack logos (Supabase, Qdrant, Jina, OpenRouter, FastAPI, React)
- [x] **Landing Page — PipelineVisual**: 5-stage pipeline diagram with connector lines, stage tags, outcome badges
- [x] **Landing Page — Features**: 8-feature card grid with hover accent gradients
- [x] **Landing Page — Stats**: Dark section with animated counting numbers (73%, 500+, 100%, 5)
- [x] **Landing Page — DualPortal**: Side-by-side portal previews with feature lists and mock content
- [x] **Landing Page — Architecture**: Layered architecture diagram (Frontend → API → Intelligence → Sandbox → Data)
- [x] **Landing Page — CTA & Footer**: CTA card with gradient accent + nav footer
- [x] **LandingPage.tsx**: Assembled all 9 sections into a single scrollable page
- [x] **Toast notifications**: Sonner Toaster in main.tsx, toasts on ticket submit success/error and resolution success/error
- [x] **AnimatePresence**: Wrapped routes for page transition animations
- [x] **Build verified**: `npm run build` → 0 TypeScript errors, 3101 modules, 2.54s

### Still to do
- [x] Add toast notifications for: ticket submitted, resolution submitted
- [x] Add loading states and skeleton loaders for all data-fetching pages
- [x] **Portal Revamp (Phase 11B):** Complete overhaul of Agent + Employee portal layouts and all 7 portal pages
  - [x] Enhanced CSS with 10+ new animations, glassmorphism, signal bars, skeleton classes, hover-lift, live-indicator
  - [x] Created 5 skeleton loader components: QueueSkeleton, EvidenceCardSkeleton, MetricsSkeleton, AuditSkeleton, TicketStatusSkeleton
  - [x] AgentLayout: system status strip, nav descriptions, portal switch, glass-panel header, Framer Motion page transitions
  - [x] EmployeeLayout: Employee badge, IT Support Portal subtitle, AI-Powered Support banner, glass-panel header, Framer Motion page transitions
  - [x] All 7 pages: Framer Motion entry animations, skeleton loaders for loading states, enhanced micro-interactions
  - [x] WhatIfSimulator: Fixed hardcoded dark hex colors to CSS variable tokens for light/dark mode support
  - [x] Build verified: 0 TypeScript errors, 3102 modules, 2.28s
- [ ] Test full Employee flow end-to-end: submit → processing → auto-resolved with message
- [ ] Test full Agent flow end-to-end: see escalated ticket → review evidence card → submit resolution → employee sees resolution
- [ ] Test What-If Simulator: change VIP/severity → verify pipeline re-routes correctly
- [ ] Test Metrics Dashboard: verify charts render with real data from Supabase/Qdrant
- [ ] Verify CORS works between frontend (port 5173) and both backend servers (8000, 8001)

---

## Phase 12: End-to-End Demo Verification

> Run the 5 demo scenarios from SOLUTION.md Section 14 and verify correct behavior.

- [ ] **Demo 1 — Password Reset**: submit "Reset my password — locked out of Windows" (P3, standard user, Auth/SSO) → verify auto-resolved in < 3 seconds, all signals green, friendly message displayed
- [ ] **Demo 2 — SAP Login**: submit "SAP login not working since this morning" (P3, standard user, SAP Issues) → verify auto-resolved, different category proves cross-category capability
- [ ] **Demo 3 — Inconsistent Network**: submit "Intermittent network issue, sometimes works sometimes doesn't" (P3, standard user, Network) → verify Signal B fails, escalated with evidence card, agent resolves, then submit same ticket again → verify it auto-resolves (system learned)
- [ ] **Demo 4 — VIP Email**: submit "CEO cannot access his email — urgent" (P3, VIP user, Email) → verify instant escalation by policy gate, evidence card shows "VIP user" reason
- [ ] **Demo 5 — Production Down**: submit "Production database is completely down" (P1, standard user, Network) → verify instant escalation by policy gate, evidence card shows "Critical severity" reason
- [ ] **What-If Demo**: open simulator, replay Demo 3 with user tier changed to VIP → verify system escalates same ticket that previously auto-resolved
- [ ] Verify audit log shows SHA-256 hash chain for all 5 demo tickets
- [ ] Verify metrics dashboard shows correct counts after demo run

---

*Each checkbox above is scoped for a single AI agent session. Complete phases in order — later phases depend on earlier ones.*
