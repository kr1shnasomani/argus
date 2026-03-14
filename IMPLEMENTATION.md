# Argus — Complete Implementation Plan

> **Intelligent Auto-Handling of Support Tickets with Confidence-Based Human-in-the-Loop (HITL)**

---

## 1. Project Overview

### Problem
Large enterprises process thousands of IT support tickets daily. Most are handled manually — even repetitive ones like password resets — leading to SLA breaches, wasted engineering time, and no institutional memory. Fully automated systems are too risky for enterprise governance, and rule-based systems can't adapt to natural language.

### Solution
Argus is a **two-portal web application** (Employee + Agent) that intelligently processes IT tickets through a **multi-layered confidence pipeline**. It auto-resolves tickets only when **three independent signals** all pass their thresholds AND a **live sandbox test** succeeds. Everything else is escalated to humans with a rich Evidence Card showing exactly why automation was not safe.

### Key Differentiator
Argus never makes a single-score guess. It requires mathematical proof of safety across semantic similarity, resolution consistency, and historical category accuracy — plus a live sandbox test — before acting autonomously.

---

## 2. System Architecture

### 2.1 High-Level Components

| Component | Description | Port |
|---|---|---|
| **Main Backend** | FastAPI server — orchestrates the entire ticket pipeline | `8000` |
| **Canary Sandbox** | Isolated FastAPI server — mock IT environment for testing fixes | `8001` |
| **Employee Portal** | React frontend — ticket submission and status tracking | `5173` |
| **Agent Portal** | React frontend — escalated ticket review, Evidence Cards, metrics | `5173` |
| **Supabase** | PostgreSQL — tickets, users, audit logs, thresholds, outcomes | Cloud |
| **Qdrant Cloud** | Vector DB — stores embeddings of resolved tickets for RAG | Cloud |
| **Jina AI** | Embedding API — converts ticket text into vectors | Cloud |
| **Gemma 3 27B** | LLM via OpenRouter — Evidence Cards, image analysis, response refinement | Cloud |

### 2.2 Data Flow (End-to-End)

```
Employee submits ticket
       │
       ▼
┌─ Layer 0: Hard Policy Gate ─────────────────────────────┐
│  Check: P1/P2 severity? VIP user? Change freeze?        │
│  Active incident on system?                             │
│  If any → ESCALATE immediately (no AI involved)         │
└────────────────────────────┬────────────────────────────┘
                             │ passes
                             ▼
┌─ Layer 1: Embedding & Retrieval ────────────────────────┐
│  If image attached → Gemma 3 27B extracts text          │
│  Jina AI embeds ticket text → vector                    │
│  Qdrant: search top-5 similar resolved tickets          │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─ Layer 2: Novelty Detection ────────────────────────────┐
│  Best similarity score < 0.50? → ESCALATE (novel)       │
│  Otherwise → proceed                                    │
└────────────────────────────┬────────────────────────────┘
                             │ known domain
                             ▼
┌─ Layer 3: 3-Signal Confidence Engine ───────────────────┐
│  A) Semantic similarity of top-1 result (≥ 0.85)        │
│  B) Resolution consistency across top-5 (≥ 60%)         │
│  C) Category auto-resolve accuracy, 30 days (≥ 70%)     │
│  Any fail → ESCALATE with reason                        │
└────────────────────────────┬────────────────────────────┘
                             │ all pass
                             ▼
┌─ Layer 4: Canary Sandbox ───────────────────────────────┐
│  POST fix to sandbox server (port 8001)                 │
│  Test fix in isolated mock environment                  │
│  Fail → ESCALATE with sandbox trace                     │
│  Pass → proceed to auto-resolve                         │
└────────────────────────────┬────────────────────────────┘
                             │ success
                             ▼
┌─ Auto-Resolve ──────────────────────────────────────────┐
│  Apply fix to mock production                           │
│  Gemma 3 27B generates friendly resolution message      │
│  SHA-256 audit hash logged to Supabase                  │
│  Employee notified via portal                           │
│  Knowledge base updated (Qdrant + Supabase)             │
└─────────────────────────────────────────────────────────┘

On ESCALATE (any layer):
  → Gemma 3 27B generates Evidence Card
  → Ticket appears in Agent Portal with full signal breakdown
  → Agent approves/modifies/rejects
  → If "verified fix" → embedded into Qdrant (system learns)
  → Gemma 3 27B refines agent message → sent to employee
```

### 2.3 Processing Stages Summary

| Stage | Input | Output | Tech |
|---|---|---|---|
| Policy Gate | Ticket metadata, user record, system record | PROCEED or ESCALATE | Python if/else |
| Embedding | Ticket text (+ image text) | 1024-dim vector | Jina AI API |
| Retrieval | Query vector | Top-5 similar tickets + metadata | Qdrant |
| Novelty Check | Top-5 similarity scores | PROCEED or ESCALATE | Python |
| Confidence Engine | Qdrant results + Supabase history | CANARY or ESCALATE (with signals) | Python |
| Sandbox Test | Action + target | success/fail | HTTP POST to port 8001 |
| Auto-Resolve | Fix details | Resolution message + audit hash | Gemma 3 27B + SHA-256 |
| Evidence Card Gen | All pipeline data | Structured JSON card | Gemma 3 27B |
| Feedback Loop | Agent decision | Qdrant upsert + Supabase update | Jina AI + Qdrant + Supabase |

---

## 3. Modules / Components Breakdown

### 3.1 Backend Modules (FastAPI, Port 8000)

#### `api/` — API Layer

| Module | Purpose | Inputs | Outputs | Connects To |
|---|---|---|---|---|
| `api/routes/tickets.py` | Ticket submission and retrieval endpoints | HTTP requests | JSON responses | All pipeline modules |
| `api/routes/agent.py` | Agent resolution and escalated queue | HTTP requests | JSON responses | Supabase, Qdrant, LLM |
| `api/routes/audit.py` | Audit log retrieval with hash chain | HTTP requests | JSON w/ hashes | Supabase |
| `api/routes/metrics.py` | Dashboard metrics, drift, coverage | HTTP requests | JSON stats | Supabase, Qdrant |
| `api/routes/config.py` | Category threshold management | HTTP requests | JSON config | Supabase |

#### `core/` — Pipeline Logic

| Module | Purpose | Inputs | Outputs | Connects To |
|---|---|---|---|---|
| `core/policy_gate.py` | Layer 0: deterministic policy checks | Ticket + User + System | GateResult (PROCEED/ESCALATE) | Supabase |
| `core/embedder.py` | Layer 1: text embedding via Jina AI | Ticket text | Vector (1024-dim) | Jina AI API |
| `core/retriever.py` | Layer 1: vector search in Qdrant | Query vector | Top-5 results with payloads | Qdrant |
| `core/novelty.py` | Layer 2: novelty detection | Top-5 scores | PROCEED/ESCALATE | — |
| `core/confidence.py` | Layer 3: 3-signal confidence engine | Qdrant results, category, Supabase | ConfidenceReport | Supabase |
| `core/sandbox_client.py` | Layer 4: HTTP client to sandbox server | Action + target | success/fail | Sandbox server |
| `core/resolution_mapper.py` | Map ticket to executable action | Qdrant top result | Action type + target | — |
| `core/pipeline.py` | Orchestrator: chains all layers together | Raw ticket | Final decision + evidence | All core modules |

#### `services/` — External Integrations

| Module | Purpose | Inputs | Outputs | Connects To |
|---|---|---|---|---|
| `services/llm.py` | Gemma 3 27B via OpenRouter | Prompts | Generated text/JSON | OpenRouter API |
| `services/vision.py` | Image text extraction via Gemma 3 27B | Image file/URL | Extracted text description | OpenRouter API |
| `services/jina.py` | Jina AI embeddings client | Text | Vector | Jina AI API |
| `services/qdrant.py` | Qdrant Cloud client wrapper | Vectors, queries, upserts | Search results | Qdrant Cloud |
| `services/supabase.py` | Supabase client wrapper | Queries | Data | Supabase |
| `services/storage.py` | File upload to Supabase Storage | Files | Public URLs | Supabase Storage |

#### `models/` — Data Models

| Module | Purpose |
|---|---|
| `models/ticket.py` | Ticket, TicketSubmission, TicketResponse Pydantic models |
| `models/confidence.py` | ConfidenceReport, Signal, GateResult models |
| `models/evidence_card.py` | EvidenceCard model |
| `models/audit.py` | AuditEntry, AuditHash models |
| `models/user.py` | User, System models |

#### `utils/` — Utilities

| Module | Purpose |
|---|---|
| `utils/audit_hash.py` | SHA-256 Merkle chain hash generation |
| `utils/cluster_map.py` | Resolution clustering + cluster_map.json management |
| `utils/timestamps.py` | Decision latency tracking utilities |

### 3.2 Sandbox Server (FastAPI, Port 8001)

| Module | Purpose |
|---|---|
| `sandbox/main.py` | FastAPI app entry point |
| `sandbox/environment.py` | Mock IT environment state (users, services, systems) |
| `sandbox/actions.py` | Action handlers (unlock_account, restart_service, etc.) |
| `sandbox/logs.py` | Execution log storage for debugging |

### 3.3 Data Pipeline (One-Time Setup Scripts)

| Script | Purpose |
|---|---|
| `scripts/load_data.py` | Load synthetic tickets CSV → Supabase tables |
| `scripts/embed_tickets.py` | Embed all ticket descriptions via Jina AI → Qdrant |
| `scripts/build_clusters.py` | Build resolution_cluster map using sentence-transformers |
| `scripts/seed_thresholds.py` | Seed default per-category thresholds into Supabase |
| `scripts/seed_systems.py` | Seed mock systems and users into Supabase |
| `scripts/prepare_demo.py` | Insert 5 specific demo tickets with known outcomes |

### 3.4 Frontend (React + shadcn/ui)

| Page / Component | Portal | Purpose |
|---|---|---|
| `SubmitTicket` | Employee | Ticket form with category, severity, file upload |
| `TicketStatus` | Employee | Real-time status: Processing / Resolved / Under Review |
| `EscalatedQueue` | Agent | List of pending escalated tickets, sorted by severity/time |
| `EvidenceCard` | Agent | Full signal breakdown, candidate fixes, "Why Not Automated" |
| `ResolutionForm` | Agent | Resolution input + verification gate (verified/workaround/uncertain) |
| `WhatIfSimulator` | Agent | Interactive: change user tier/severity/system status, re-run pipeline |
| `MetricsDashboard` | Agent | Auto-resolve rate, escalation rate, sandbox failures |
| `DriftMonitor` | Agent | Signal trends over 7 days with status indicators |
| `CoverageIndicator` | Agent | Qdrant vector count, categories covered, avg similarity |
| `AuditLog` | Agent | Hash-chain verified audit entries per ticket |

---

## 4. Technology Stack

### 4.1 Core Stack

| Layer | Technology | Version / Notes |
|---|---|---|
| **Language** | Python 3.11+ | Backend and data scripts |
| **Backend Framework** | FastAPI | Async, type-safe, auto-docs |
| **Frontend Framework** | React 18+ (Vite) | With TypeScript |
| **UI Library** | shadcn/ui | Component library |
| **Styling** | Tailwind CSS | shadcn/ui dependency |

### 4.2 External Services (All Free Tier)

| Service | Purpose | Free Tier Limits |
|---|---|---|
| **Jina AI** | `jina-embeddings-v3` text embeddings | 1M tokens/month |
| **Qdrant Cloud** | Vector database for resolved ticket embeddings | 1GB storage |
| **Supabase** | PostgreSQL, Auth, Storage, Edge Functions | 500MB DB, 1GB storage |
| **OpenRouter** | Gemma 3 27B LLM (text + vision) | Free tier |

### 4.3 Python Libraries

| Library | Purpose |
|---|---|
| `fastapi` | Web framework |
| `uvicorn` | ASGI server |
| `pydantic` | Data validation and models |
| `httpx` | Async HTTP client (Jina AI, OpenRouter, sandbox) |
| `qdrant-client` | Qdrant Cloud Python SDK |
| `supabase` | Supabase Python SDK |
| `langchain` | RAG orchestration (optional, for structured chains) |
| `sentence-transformers` | Resolution clustering (startup-time only) |
| `scikit-learn` | AgglomerativeClustering for resolution clusters |
| `python-multipart` | File upload handling |
| `python-dotenv` | Environment variable management |

### 4.4 Frontend Libraries

| Library | Purpose |
|---|---|
| `react` + `react-dom` | Core UI framework |
| `react-router-dom` | Client-side routing |
| `@tanstack/react-query` | Data fetching and caching |
| `axios` | HTTP client for API calls |
| `@supabase/supabase-js` | Supabase client (file uploads, realtime) |
| `recharts` or `chart.js` | Metrics dashboard charts |
| `lucide-react` | Icons |
| `shadcn/ui` | UI components (Button, Card, Dialog, Table, etc.) |
| `tailwindcss` | Styling (shadcn/ui dependency) |

---

## 5. Data Model / Data Structures

### 5.1 Supabase Tables (PostgreSQL)

#### `users`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | Auto-generated |
| `email` | TEXT (UNIQUE) | Employee email |
| `name` | TEXT | Full name |
| `tier` | TEXT | `"standard"` or `"VIP"` |
| `department` | TEXT | e.g., "Engineering", "Finance" |
| `created_at` | TIMESTAMPTZ | Default: now() |

#### `systems`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | Auto-generated |
| `name` | TEXT (UNIQUE) | e.g., "SAP", "VPN", "Email" |
| `category` | TEXT | Maps to ticket category |
| `change_freeze` | BOOLEAN | Default: false |
| `active_incident` | BOOLEAN | Default: false |
| `updated_at` | TIMESTAMPTZ | |

#### `tickets`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | Auto-generated |
| `user_id` | UUID (FK→users) | Submitting employee |
| `system_id` | UUID (FK→systems) | Affected system (nullable) |
| `description` | TEXT | Ticket body |
| `category` | TEXT | One of 8 categories |
| `severity` | TEXT | P1, P2, P3, P4 |
| `status` | TEXT | `processing`, `auto_resolved`, `escalated`, `resolved` |
| `attachment_url` | TEXT | Supabase Storage URL (nullable) |
| `attachment_text` | TEXT | Extracted text from image (nullable) |
| `created_at` | TIMESTAMPTZ | |
| `resolved_at` | TIMESTAMPTZ | Nullable |

#### `ticket_outcomes`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | Auto-generated |
| `ticket_id` | UUID (FK→tickets) | |
| `category` | TEXT | Denormalized for Signal C queries |
| `auto_resolved` | BOOLEAN | Was it auto-resolved? |
| `sandbox_passed` | BOOLEAN | Did sandbox test pass? (nullable) |
| `signal_a` | FLOAT | Semantic similarity score |
| `signal_b` | FLOAT | Resolution consistency score |
| `signal_c` | FLOAT | Category accuracy score |
| `escalation_reason` | TEXT | Nullable — reason if escalated |
| `resolution` | TEXT | Final resolution text |
| `agent_verified` | BOOLEAN | Agent marked as verified reusable fix? |
| `override_reason` | TEXT | Nullable — why agent modified AI suggestion |
| `created_at` | TIMESTAMPTZ | |

#### `audit_log`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | Auto-generated |
| `ticket_id` | UUID (FK→tickets) | |
| `decision` | TEXT | `auto_resolved`, `escalated`, `agent_resolved` |
| `evidence_card` | JSONB | Full Evidence Card JSON |
| `audit_hash` | TEXT | SHA-256 hash |
| `previous_hash` | TEXT | Previous entry's hash (or "GENESIS") |
| `latency_ms` | INTEGER | Total decision latency |
| `created_at` | TIMESTAMPTZ | |

#### `category_thresholds`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | Auto-generated |
| `category` | TEXT (UNIQUE) | e.g., "Auth/SSO" |
| `threshold_a` | FLOAT | Default: 0.85 |
| `threshold_b` | FLOAT | Default: 0.60 |
| `threshold_c` | FLOAT | Default: 0.70 |
| `novelty_threshold` | FLOAT | Default: 0.50 |
| `min_sample_size` | INTEGER | Default: 30 |
| `updated_at` | TIMESTAMPTZ | |

#### `novel_tickets`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | Auto-generated |
| `ticket_id` | UUID (FK→tickets) | |
| `max_similarity` | FLOAT | Highest Qdrant score |
| `reviewed` | BOOLEAN | Default: false |
| `created_at` | TIMESTAMPTZ | |

### 5.2 Qdrant Collection

**Collection:** `resolved_tickets`

| Field | Type | Notes |
|---|---|---|
| Vector | 1024-dim float | Jina embeddings v3 output |
| `ticket_id` | string (payload) | Reference back to Supabase |
| `category` | string (payload) | For filtered search |
| `description` | string (payload) | Original ticket text |
| `resolution` | string (payload) | Resolution applied |
| `resolution_cluster` | string (payload) | Cluster ID for Signal B |
| `severity` | string (payload) | P1–P4 |
| `auto_resolved` | boolean (payload) | |
| `verified` | boolean (payload) | Only verified=true used in searches |
| `created_at` | string (payload) | ISO timestamp |

### 5.3 In-Memory Data Structures

| Structure | Type | Purpose |
|---|---|---|
| `cluster_map` | `dict[str, str]` | Maps resolution text → cluster ID |
| `sandbox_env` | `dict` | Mock IT environment state on port 8001 |

### 5.4 Key Pydantic Models

```python
class TicketSubmission(BaseModel):
    description: str
    category: str  # One of 8 categories
    severity: str  # P1, P2, P3, P4
    user_email: str
    system_name: str | None = None
    attachment: UploadFile | None = None

class GateResult(BaseModel):
    action: Literal["PROCEED", "ESCALATE", "BATCH_ESCALATE"]
    reason: str

class ConfidenceReport(BaseModel):
    decision: Literal["CANARY", "ESCALATE"]
    signals: dict[str, float]
    failed: dict[str, float]
    reason: str | None = None

class EvidenceCard(BaseModel):
    ticket_id: str
    submitted_by: str
    category: str
    description: str
    escalation_reason: str
    signals: dict[str, dict]
    novelty_check: dict
    why_not_automated: str
    candidate_fixes: list[dict]
    decision_latency: dict[str, int]
    audit_hash: str
    previous_hash: str
    timestamp: str

class AgentResolution(BaseModel):
    ticket_id: str
    resolution_text: str
    resolution_type: Literal["verified", "workaround", "uncertain"]
    override_reason: str | None = None
```

---

## 6. Step-by-Step Implementation Plan

> **Important Constraint:** The task "Generate 500 synthetic tickets" is excluded — it will be handled separately by another LLM.

### Phase 1: Project Setup & Infrastructure

**Goal:** Set up the monorepo, install dependencies, configure all external services, create database schema.

#### Step 1.1 — Initialize Project Structure
```
argus/
├── backend/
│   ├── api/
│   │   ├── __init__.py
│   │   ├── main.py             # FastAPI app entry, CORS, lifespan
│   │   └── routes/
│   │       ├── __init__.py
│   │       ├── tickets.py
│   │       ├── agent.py
│   │       ├── audit.py
│   │       ├── metrics.py
│   │       └── config.py
│   ├── core/
│   │   ├── __init__.py
│   │   ├── policy_gate.py
│   │   ├── embedder.py
│   │   ├── retriever.py
│   │   ├── novelty.py
│   │   ├── confidence.py
│   │   ├── sandbox_client.py
│   │   ├── resolution_mapper.py
│   │   └── pipeline.py
│   ├── services/
│   │   ├── __init__.py
│   │   ├── llm.py
│   │   ├── vision.py
│   │   ├── jina.py
│   │   ├── qdrant.py
│   │   ├── supabase.py
│   │   └── storage.py
│   ├── models/
│   │   ├── __init__.py
│   │   ├── ticket.py
│   │   ├── confidence.py
│   │   ├── evidence_card.py
│   │   ├── audit.py
│   │   └── user.py
│   ├── utils/
│   │   ├── __init__.py
│   │   ├── audit_hash.py
│   │   ├── cluster_map.py
│   │   └── timestamps.py
│   ├── requirements.txt
│   └── .env
├── sandbox/
│   ├── main.py
│   ├── environment.py
│   ├── actions.py
│   ├── logs.py
│   └── requirements.txt
├── scripts/
│   ├── load_data.py
│   ├── embed_tickets.py
│   ├── build_clusters.py
│   ├── seed_thresholds.py
│   ├── seed_systems.py
│   └── prepare_demo.py
├── frontend/                   # Vite + React + TypeScript
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── services/
│   │   ├── hooks/
│   │   ├── types/
│   │   └── lib/
│   ├── package.json
│   └── vite.config.ts
├── tests/
│   ├── test_policy_gate.py
│   ├── test_novelty.py
│   ├── test_confidence.py
│   ├── test_sandbox.py
│   ├── test_audit_hash.py
│   ├── test_pipeline_integration.py
│   └── conftest.py
├── data/
│   ├── synthetic_tickets.csv   # (generated separately)
│   └── cluster_map.json        # (built by scripts/build_clusters.py)
└── README.md
```

#### Step 1.2 — Configure External Services
- **Supabase:** Create project, get URL + anon key + service role key
- **Qdrant Cloud:** Create cluster, get URL + API key, create collection `resolved_tickets` (vector size: 1024, distance: Cosine)
- **Jina AI:** Get API key for `jina-embeddings-v3`
- **OpenRouter:** Get API key, configure for `google/gemma-3-27b-it:free`

#### Step 1.3 — Create Supabase Database Schema
Apply all 7 table migrations (users, systems, tickets, ticket_outcomes, audit_log, category_thresholds, novel_tickets) with proper FK constraints and indexes.

#### Step 1.4 — Create `.env` Configuration
```env
# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Qdrant
QDRANT_URL=
QDRANT_API_KEY=
QDRANT_COLLECTION=resolved_tickets

# Jina AI
JINA_API_KEY=

# OpenRouter
OPENROUTER_API_KEY=
OPENROUTER_MODEL=google/gemma-3-27b-it:free

# Sandbox
SANDBOX_URL=http://localhost:8001

# Thresholds (defaults)
DEFAULT_NOVELTY_THRESHOLD=0.50
DEFAULT_SIGNAL_A_THRESHOLD=0.85
DEFAULT_SIGNAL_B_THRESHOLD=0.60
DEFAULT_SIGNAL_C_THRESHOLD=0.70
MIN_CATEGORY_SAMPLE_SIZE=30
```

---

### Phase 2: Service Clients & Data Models

**Goal:** Build all external service wrappers and Pydantic models so they can be used by pipeline modules.

#### Step 2.1 — Pydantic Models (`models/`)
- `TicketSubmission`, `TicketResponse`, `TicketStatus`
- `GateResult`
- `ConfidenceReport`, `SignalResult`
- `EvidenceCard`
- `AuditEntry`
- `User`, `System`
- `AgentResolution`

#### Step 2.2 — Supabase Client (`services/supabase.py`)
- Initialize Supabase client from env vars
- Helper functions: `get_user_by_email()`, `get_system_by_name()`, `get_category_thresholds()`, `get_ticket_history()`, `insert_ticket()`, `update_ticket_status()`, `insert_outcome()`, `insert_audit_log()`, `insert_novel_ticket()`

#### Step 2.3 — Jina AI Client (`services/jina.py`)
- `embed_text(text: str) -> list[float]` — POST to Jina API, return 1024-dim vector
- `batch_embed(texts: list[str]) -> list[list[float]]` — for data loading

#### Step 2.4 — Qdrant Client (`services/qdrant.py`)
- `search_similar(vector, top_k=5, filter_verified=True) -> list[ScoredPoint]`
- `upsert_ticket(ticket_id, vector, payload)`
- `count_vectors() -> int`
- Ensure collection creation on startup if not exists

#### Step 2.5 — LLM Client (`services/llm.py`)
- `generate_evidence_card(ticket, signals, qdrant_results) -> EvidenceCard`
- `generate_resolution_message(resolution_text) -> str`
- `extract_image_text(image_url) -> str` (vision capability)
- All via OpenRouter API using `httpx`

#### Step 2.6 — Storage Client (`services/storage.py`)
- `upload_attachment(file) -> str` — upload to Supabase Storage, return public URL

---

### Phase 3: Core Pipeline Implementation

**Goal:** Implement all 5 pipeline layers as independent, testable modules, then wire them together in the orchestrator.

#### Step 3.1 — Layer 0: Hard Policy Gate (`core/policy_gate.py`)
- Input: `Ticket`, `User`, `System`
- Logic:
  1. If `severity` in `["P1", "P2"]` → ESCALATE
  2. If `user.tier == "VIP"` → ESCALATE
  3. If `system.change_freeze == True` → ESCALATE
  4. If `system.active_incident == True` → BATCH_ESCALATE
  5. Otherwise → PROCEED
- Output: `GateResult`
- **Pure Python, zero ML dependencies**

#### Step 3.2 — Layer 1: Embedding & Retrieval (`core/embedder.py` + `core/retriever.py`)
- Embedder:
  1. Check if ticket has attachment → if yes, call `vision.extract_image_text()`
  2. Combine ticket description + extracted text
  3. Call `jina.embed_text()` → return vector
- Retriever:
  1. Call `qdrant.search_similar(vector, top_k=5)`
  2. Return list of scored results with payloads

#### Step 3.3 — Layer 2: Novelty Detection (`core/novelty.py`)
- Input: list of Qdrant scored results
- Logic: `max_similarity = max([r.score for r in results])`
- If `max_similarity < novelty_threshold` → ESCALATE with reason "Novel ticket"
- Also log to `novel_tickets` table in Supabase
- Output: PROCEED or ESCALATE

#### Step 3.4 — Layer 3: 3-Signal Confidence Engine (`core/confidence.py`)
- Input: Qdrant results, category string, Supabase client
- Signal A: `qdrant_results[0].score` (top-1 cosine similarity)
- Signal B: Count resolution_cluster frequency across top-5, compute `most_common_count / 5`
- Signal C: Query `ticket_outcomes` for last 30 days in this category, compute `auto_resolved_success_count / total_count`. Cold start rule: if < 30 tickets → auto-fail Signal C
- Compare each signal against per-category thresholds from `category_thresholds` table
- Output: `ConfidenceReport` with decision, individual signal values, and failures

#### Step 3.5 — Resolution Mapper (`core/resolution_mapper.py`)
- Input: Top Qdrant result payload
- Logic: Map the resolution text to an executable sandbox `action` and `target`
- Maintain a mapping dictionary: `{"credential_reset": "unlock_account", "restart_service": "restart_service", ...}`
- Output: `{action: str, target: str, params: dict}`

#### Step 3.6 — Layer 4: Sandbox Client (`core/sandbox_client.py`)
- Input: action, target, params
- Logic: `httpx.post(SANDBOX_URL + "/sandbox/execute", json={action, target, params})`
- Handle connection errors gracefully → default to ESCALATE
- Parse response: `success: true/false`
- Output: sandbox result (pass/fail with message)

#### Step 3.7 — Pipeline Orchestrator (`core/pipeline.py`)
- `async def process_ticket(submission: TicketSubmission) -> TicketResult:`
  1. Insert ticket into Supabase (status: "processing")
  2. Fetch user and system records
  3. Start latency timer
  4. Run Layer 0 → if ESCALATE, generate Evidence Card, log audit, return
  5. Run Layer 1 → embed + retrieve
  6. Run Layer 2 → novelty check → if ESCALATE, generate Evidence Card, log audit, return
  7. Run Layer 3 → confidence engine → if ESCALATE, generate Evidence Card, log audit, return
  8. Map resolution to sandbox action
  9. Run Layer 4 → sandbox test → if FAIL, generate Evidence Card, log audit, return
  10. AUTO-RESOLVE: apply mock fix, generate user message, log audit with SHA-256 hash
  11. Update knowledge base (embed resolution → Qdrant, insert outcome → Supabase)
  12. Return resolution to employee

#### Step 3.8 — SHA-256 Audit Hashing (`utils/audit_hash.py`)
- `generate_audit_hash(evidence_card: dict, previous_hash: str) -> str`
- `log_to_audit(ticket_id, decision, evidence_card, supabase_client) -> str`
- Implements Merkle chain: each entry references previous hash

#### Step 3.9 — Resolution Clustering (`utils/cluster_map.py`)
- At startup OR via script: load all resolution texts from Qdrant
- Use `sentence-transformers` to embed resolution texts
- Apply `AgglomerativeClustering` (distance_threshold-based)
- Build `cluster_map: dict[str, str]` mapping resolution → cluster_id
- Save/load from `data/cluster_map.json`
- `get_resolution_cluster(resolution_text: str) -> str`

---

### Phase 4: API Layer

**Goal:** Expose all pipeline functionality through REST endpoints.

#### Step 4.1 — Ticket Endpoints (`api/routes/tickets.py`)
- `POST /api/tickets/submit` — accepts `TicketSubmission` (multipart/form-data for file upload), calls `pipeline.process_ticket()`, returns ticket ID + initial status
- `GET /api/tickets/{ticket_id}` — returns current status, resolution message if resolved

#### Step 4.2 — Agent Endpoints (`api/routes/agent.py`)
- `GET /api/tickets/agent/escalated` — returns all tickets with status="escalated", sorted by severity then time, includes Evidence Card
- `POST /api/tickets/{ticket_id}/resolve` — accepts `AgentResolution`, handles:
  - If `resolution_type == "verified"`: embed via Jina → upsert into Qdrant (verified=true)
  - Update `ticket_outcomes` in Supabase
  - Generate refined message via Gemma 3 27B
  - Update ticket status to "resolved"
  - Log override_reason if provided

#### Step 4.3 — Audit Endpoints (`api/routes/audit.py`)
- `GET /api/audit/{ticket_id}` — returns audit log entries with hash chain for this ticket

#### Step 4.4 — Metrics Endpoints (`api/routes/metrics.py`)
- `GET /api/metrics/dashboard` — auto-resolved count, escalated count, sandbox failures (last N tickets)
- `GET /api/metrics/coverage` — Qdrant vector count, categories covered, avg similarity
- `GET /api/metrics/drift` — Signal trends over 7 days vs previous 7 days, per category

#### Step 4.5 — Config Endpoints (`api/routes/config.py`)
- `GET /api/config/thresholds` — returns all per-category thresholds
- `GET /api/config/thresholds/{category}` — returns thresholds for one category

#### Step 4.6 — What-If Simulator Endpoint
- `POST /api/simulate` — accepts modified ticket parameters (user_tier, severity, system_status), runs pipeline in dry-run mode (no DB writes), returns which layer intercepted and why

#### Step 4.7 — FastAPI App Setup (`api/main.py`)
- CORS configuration for frontend
- Lifespan event: load cluster_map, verify Qdrant collection, warm up connections
- Include all routers
- Global error handler

---

### Phase 5: Sandbox Server Implementation

**Goal:** Build the isolated mock IT environment.

#### Step 5.1 — Mock Environment (`sandbox/environment.py`)
- Define initial state with 10-15 mock users (various statuses: locked, active, expired)
- Define mock services (SAP, VPN, Email, Network, Printer, etc.)
- Define mock systems with freeze/incident states
- Provide `reset()` function to restore initial state

#### Step 5.2 — Action Handlers (`sandbox/actions.py`)
- `unlock_account(target)` — change user status to "active"
- `reset_password(target)` — reset password_status to "valid"
- `restart_service(target)` — change service status to "running"
- `grant_permission(target, permission)` — add permission to user
- `install_software(target)` — simulate software installation
- Each returns `{success: bool, message: str}`

#### Step 5.3 — Sandbox API (`sandbox/main.py`)
- `POST /sandbox/execute` — route to appropriate action handler
- `GET /sandbox/status` — return current environment state
- `POST /sandbox/reset` — restore default state
- `GET /sandbox/logs` — return execution history

---

### Phase 6: Data Pipeline Scripts

**Goal:** Build scripts to load synthetic data into Qdrant and Supabase, build clusters, and seed configuration.

> **Note:** The synthetic ticket CSV itself is generated separately by another LLM. These scripts assume the CSV exists at `data/synthetic_tickets.csv`.

#### Step 6.1 — `scripts/seed_systems.py`
- Insert mock systems into Supabase `systems` table (SAP, VPN, Email, Network, Printer, etc.)
- Insert mock users into Supabase `users` table (mix of standard and VIP)

#### Step 6.2 — `scripts/load_data.py`
- Read `data/synthetic_tickets.csv`
- Validate schema (description, category, severity, resolution, resolution_cluster, user_tier)
- Insert into Supabase `tickets` table
- Insert initial outcomes into `ticket_outcomes` (pre-marked as auto_resolved=true, agent_verified=true for knowledge base seeding)

#### Step 6.3 — `scripts/embed_tickets.py`
- Read all tickets from Supabase
- Batch embed descriptions via Jina AI (with rate limiting)
- Upsert all vectors + payloads into Qdrant `resolved_tickets` collection

#### Step 6.4 — `scripts/build_clusters.py`
- Load all unique resolution texts from the synthetic data
- Embed with `sentence-transformers`
- Run `AgglomerativeClustering`
- Output `data/cluster_map.json`: `{resolution_text: cluster_id}`

#### Step 6.5 — `scripts/seed_thresholds.py`
- Insert default thresholds for all 8 categories into `category_thresholds` table

#### Step 6.6 — `scripts/prepare_demo.py`
- Insert 5 specific demo tickets described in the solution document (password reset, SAP login, intermittent network, CEO email, production database down)
- Ensure their corresponding users (VIP CEO, standard employees) and systems exist

---

### Phase 7: Frontend (React + shadcn/ui)

**Goal:** Build both Employee and Agent portals.

> **Note:** This phase is described at a high level. Full frontend implementation details should be planned separately after the backend pipeline is verified.

#### Step 7.1 — Project Setup
- Initialize Vite + React + TypeScript
- Install shadcn/ui, Tailwind CSS, react-router-dom, @tanstack/react-query, axios, recharts, lucide-react

#### Step 7.2 — Employee Portal
- `/` — Submit Ticket page (form with description, category dropdown, severity dropdown, file upload)
- `/ticket/:id` — Ticket Status page (real-time polling for status updates, displays resolution when ready)

#### Step 7.3 — Agent Portal
- `/agent` — Escalated Queue (sortable table of pending tickets)
- `/agent/ticket/:id` — Evidence Card View (full signal breakdown, candidate fixes, "Why Not Automated", resolution form with verification gate)
- `/agent/simulator` — What-If Simulator (interactive parameter adjustment, instant re-run)
- `/agent/metrics` — Dashboard (charts for auto-resolve rate, escalation reasons, signal trends, coverage)
- `/agent/audit` — Audit Log viewer (hash-chain entries with verification badges)

---

## 7. Pipeline Logic — Detailed Flow

### Input
Employee submits via `POST /api/tickets/submit`:
```json
{
  "description": "Cannot login to SAP after password expiry",
  "category": "Auth/SSO",
  "severity": "P3",
  "user_email": "john.doe@company.com",
  "system_name": "SAP",
  "attachment": null
}
```

### Stage-by-Stage Processing

**Stage 1: Ticket Ingestion**
- Save ticket to Supabase → get `ticket_id`
- If attachment provided: upload to Supabase Storage → get URL
- Set status = "processing"
- Start latency timer

**Stage 2: Layer 0 — Hard Policy Gate**
- Fetch user from Supabase by email → check `tier`
- Fetch system from Supabase by name → check `change_freeze`, `active_incident`
- Check `severity` against P1/P2 rules
- Decision: PROCEED or ESCALATE
- If ESCALATE → skip to Evidence Card generation

**Stage 3: Layer 1 — Embedding & Retrieval**
- If attachment exists and is image: call Gemma 3 27B → extract text → append to description
- Call Jina AI → embed combined text → 1024-dim vector
- Call Qdrant → `search(vector, top_k=5, filter: verified=true)`
- Returns: list of `{score, payload}` sorted by similarity

**Stage 4: Layer 2 — Novelty Detection**
- `max_score = max(result.score for result in qdrant_results)`
- If `max_score < 0.50` → ESCALATE ("Novel ticket — unknown territory")
- Log to `novel_tickets` table
- If passes → proceed

**Stage 5: Layer 3 — 3-Signal Confidence Engine**
- **Signal A** = `qdrant_results[0].score` (top-1 similarity)
- **Signal B** = count most common `resolution_cluster` across top-5, divide by 5
  - Uses `cluster_map.json` loaded at startup
  - e.g., 4/5 same cluster → Signal B = 0.80
- **Signal C** = query Supabase `ticket_outcomes` WHERE category = X AND created_at > 30_days_ago
  - If count < 30 → auto-fail (cold start protection)
  - Else: `sum(auto_resolved AND successful) / total`
- Fetch per-category thresholds from `category_thresholds`
- Compare each signal against its threshold
- Any failure → ESCALATE with specific reason
- All pass → CANARY

**Stage 6: Layer 4 — Canary Sandbox Test**
- Map top resolution to executable action via `resolution_mapper`
  - e.g., resolution "Reset SAP password" → action: `reset_password`, target: `john.doe`
- `POST http://localhost:8001/sandbox/execute` with `{action, target, params}`
- If connection error → ESCALATE (fail-safe)
- If response `success: false` → ESCALATE with sandbox error
- If response `success: true` → proceed to auto-resolve

**Stage 7a: Auto-Resolve Path**
- Apply mock action to "production" (log the action)
- Generate friendly message via Gemma 3 27B: "Your SAP access has been restored. A password reset was applied to your account."
- Generate SHA-256 audit hash (chained to previous hash)
- Insert audit_log entry with evidence card, hash, latency
- Insert ticket_outcome (auto_resolved=true, signals stored)
- Update ticket status = "auto_resolved", resolved_at = now()
- Embed the new resolution into Qdrant (verified=true) — system learns
- Return resolution message to employee

**Stage 7b: Escalation Path (any layer)**
- Generate Evidence Card via Gemma 3 27B:
  - Include: all signal values, thresholds, pass/fail, `why_not_automated` explanation
  - Include: top-3 candidate fixes from Qdrant results with similarity scores
  - Include: latency breakdown
- Generate SHA-256 audit hash
- Insert audit_log entry
- Update ticket status = "escalated"
- Ticket appears in Agent Portal

**Stage 8: Agent Resolution (when agent acts on escalated ticket)**
- Agent submits via `POST /api/tickets/{id}/resolve`:
  - resolution_text, resolution_type (verified/workaround/uncertain), override_reason
- If `verified`:
  1. Embed resolution via Jina AI
  2. Upsert into Qdrant with `verified=true`
  3. Check cluster membership, update `cluster_map.json` if needed
- Insert into `ticket_outcomes` (agent_verified=true/false, override_reason)
- Refine agent message via Gemma 3 27B → professional user-facing text
- Update ticket status = "resolved", resolved_at = now()
- Signal C is automatically recalculated on next query (data-driven)

### Output
Employee receives:
```json
{
  "ticket_id": "INC-20481",
  "status": "auto_resolved",
  "resolution_message": "Your SAP access has been restored. A password reset was applied to your account. If you continue to experience issues, please submit a new ticket.",
  "resolved_at": "2026-02-23T09:14:35Z",
  "decision_latency_ms": 1420
}
```

---

## 8. Pipeline Testing Plan

### 8.1 Unit Tests

All tests use `pytest`. Mock external services (Jina AI, Qdrant, OpenRouter, Supabase) using `unittest.mock` or `pytest-mock`.

#### Test: Policy Gate (`tests/test_policy_gate.py`)

| Test Case | Input | Expected |
|---|---|---|
| P1 severity → escalate | severity="P1", tier="standard", freeze=False | ESCALATE, reason contains "severity" |
| P2 severity → escalate | severity="P2", tier="standard", freeze=False | ESCALATE |
| VIP user → escalate | severity="P3", tier="VIP", freeze=False | ESCALATE, reason contains "VIP" |
| Change freeze → escalate | severity="P3", tier="standard", freeze=True | ESCALATE, reason contains "freeze" |
| Active incident → batch escalate | severity="P3", tier="standard", incident=True | BATCH_ESCALATE |
| All clear → proceed | severity="P3", tier="standard", freeze=False, incident=False | PROCEED |
| P4 + standard → proceed | severity="P4", tier="standard", freeze=False | PROCEED |

```bash
pytest tests/test_policy_gate.py -v
```

#### Test: Novelty Detection (`tests/test_novelty.py`)

| Test Case | Input | Expected |
|---|---|---|
| All scores < 0.50 → novel | scores=[0.30, 0.25, 0.40, 0.35, 0.20] | ESCALATE |
| Top score exactly 0.50 → proceed | scores=[0.50, 0.30, 0.20, 0.15, 0.10] | PROCEED |
| Top score = 0.92 → proceed | scores=[0.92, 0.88, 0.80, 0.75, 0.60] | PROCEED |
| Empty results → novel | scores=[] | ESCALATE |

```bash
pytest tests/test_novelty.py -v
```

#### Test: Confidence Engine (`tests/test_confidence.py`)

| Test Case | Input | Expected |
|---|---|---|
| All signals pass | s_a=0.90, s_b=0.80, s_c=0.75 (thresholds: 0.85, 0.60, 0.70) | CANARY |
| Signal A fails | s_a=0.70, s_b=0.80, s_c=0.75 | ESCALATE, failed={"similarity"} |
| Signal B fails | s_a=0.90, s_b=0.40, s_c=0.75 | ESCALATE, failed={"consistency"} |
| Signal C fails | s_a=0.90, s_b=0.80, s_c=0.50 | ESCALATE, failed={"accuracy"} |
| Cold start (< 30 tickets) | category with 15 historical tickets | ESCALATE, reason contains "cold start" |
| Multiple signals fail | s_a=0.70, s_b=0.40, s_c=0.50 | ESCALATE, 3 failures |

```bash
pytest tests/test_confidence.py -v
```

#### Test: Audit Hash (`tests/test_audit_hash.py`)

| Test Case | Expected |
|---|---|
| Hash generation is deterministic | Same input → same hash |
| Hash changes with different input | Different evidence card → different hash |
| Chain integrity | hash_2 computed with hash_1 as previous_hash |
| Genesis hash | First entry uses "GENESIS" as previous_hash |

```bash
pytest tests/test_audit_hash.py -v
```

#### Test: Sandbox Client (`tests/test_sandbox.py`)

| Test Case | Expected |
|---|---|
| Successful unlock_account | returns success=True |
| Unknown user → fails | returns success=False |
| Unknown action → fails | returns success=False |
| Connection timeout → escalate | httpx.ConnectError → ESCALATE |
| Sandbox reset works | State returns to initial |

```bash
pytest tests/test_sandbox.py -v
```

#### Test: Resolution Mapper (`tests/test_resolution_mapper.py`)

| Test Case | Expected |
|---|---|
| "Reset password via LDAP" | action="reset_password", target extracted |
| "Restart VPN service" | action="restart_service", target="vpn" |
| Unknown resolution text | Returns a safe default or ESCALATE |

```bash
pytest tests/test_resolution_mapper.py -v
```

### 8.2 Integration Tests (`tests/test_pipeline_integration.py`)

These tests exercise the full pipeline with mocked external services but real logic flow.

| Test Case | Scenario | Expected Outcome |
|---|---|---|
| Happy path auto-resolve | P3 ticket, standard user, high similarity, consistent fixes, good accuracy, sandbox passes | Auto-resolved, audit hash generated, outcome logged |
| Policy gate catches VIP | VIP user, P3 ticket | Escalated at Layer 0, Evidence Card generated |
| Policy gate catches P1 | P1 severity | Escalated at Layer 0 |
| Novel ticket escalation | All Qdrant scores < 0.50 | Escalated at Layer 2, logged as novel |
| Signal B failure | Top-5 have 3 different resolution clusters | Escalated at Layer 3, reason: inconsistent fixes |
| Cold start protection | Category with only 10 historical tickets | Escalated at Layer 3, reason: cold start |
| Sandbox failure | Sandbox returns success=false | Escalated at Layer 4, includes sandbox trace |
| Sandbox unavailable | Connection refused to port 8001 | Escalated (fail-safe) |
| Image ticket processing | Ticket with image attachment | Image text extracted, appended to description, then normal flow |
| Agent verified fix | Agent submits verified fix | Resolution embedded into Qdrant, outcome updated |
| Agent workaround | Agent submits workaround | NOT embedded into Qdrant, only stored in Supabase |

```bash
pytest tests/test_pipeline_integration.py -v
```

### 8.3 Example Input/Output Validation

These are manual smoke tests using `curl` or `httpx` against a running backend.

#### Test 1: Password Reset (Expected: Auto-Resolve)
```bash
curl -X POST http://localhost:8000/api/tickets/submit \
  -H "Content-Type: application/json" \
  -d '{
    "description": "I am locked out of my Windows account. Need password reset.",
    "category": "Auth/SSO",
    "severity": "P3",
    "user_email": "standard.user@company.com",
    "system_name": "Active Directory"
  }'
```
**Expected:** status = "auto_resolved", resolution message returned.

#### Test 2: VIP User (Expected: Immediate Escalation)
```bash
curl -X POST http://localhost:8000/api/tickets/submit \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Email not working.",
    "category": "Email Access",
    "severity": "P3",
    "user_email": "ceo@company.com",
    "system_name": "Email"
  }'
```
**Expected:** status = "escalated", reason contains "VIP".

#### Test 3: P1 Severity (Expected: Immediate Escalation)
```bash
curl -X POST http://localhost:8000/api/tickets/submit \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Production database completely down.",
    "category": "Network/Connectivity",
    "severity": "P1",
    "user_email": "standard.user@company.com"
  }'
```
**Expected:** status = "escalated", reason contains "severity".

### 8.4 Debugging Checkpoints

At each layer in the pipeline, log structured debug output:

| Checkpoint | What to Log | How to Verify |
|---|---|---|
| After Policy Gate | `gate_result`, `reason`, `user_tier`, `system_status` | Check FastAPI console logs |
| After Embedding | Vector dimension (should be 1024), first 5 values | Log statement |
| After Qdrant Search | Top-5 scores, top-5 ticket_ids, top-5 categories | Log statement |
| After Novelty Check | `max_similarity`, `threshold`, `decision` | Log statement |
| After Signal A/B/C | Individual signal values, threshold comparisons | Log statement + returned in API response |
| After Sandbox Call | HTTP status, response body, latency | Log statement |
| After Audit Hash | Current hash, previous hash | Compare in Supabase audit_log table |
| Full Pipeline | Total latency breakdown by stage | Returned in evidence_card.decision_latency |

**How to run all tests:**
```bash
# Unit tests (mocked external services)
cd backend
pytest tests/ -v --tb=short

# Integration test with running services (requires sandbox + Supabase + Qdrant)
pytest tests/test_pipeline_integration.py -v --tb=long

# Manual smoke tests
# Start backend: uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
# Start sandbox: uvicorn sandbox.main:app --host 0.0.0.0 --port 8001 --reload
# Run curl commands from Section 8.3
```

---

## 9. Risks / Ambiguities

### 9.1 Identified Ambiguities

| # | Ambiguity | Assumption Made |
|---|---|---|
| 1 | **Resolution Mapper logic** — How exactly does the system map a Qdrant resolution text like "Reset LDAP binding credentials" to a sandbox action like `unlock_account`? | Assume a manually maintained mapping dictionary that maps resolution_cluster IDs to sandbox actions. For the hackathon scope, this covers the 8 categories with ~10-15 distinct action types. |
| 2 | **"Apply fix to mock production"** — What is the mock production environment? | Assume it's the same sandbox server's state. After sandbox test passes, the same action is considered "committed" and logged. There's no separate production system. |
| 3 | **Category auto-detection** — The submit form mentions "(auto-detect option)" for category | Assume this is either a future feature or a simple LLM call to categorize free-text. For initial implementation, use the user-selected dropdown value. |
| 4 | **How does the employee know their ticket ID to check status?** | Assume the submit endpoint returns the ticket ID, and the frontend stores it / shows it. Could also build a "My Tickets" page keyed by email. |
| 5 | **Nightly Drift Monitor execution** — Solution says "Supabase Edge Functions or cron job" | Assume implementation as a FastAPI background task or a script that can be invoked. Supabase Edge Functions are out of scope for initial build. |
| 6 | **Qdrant filtering by category** — Solution mentions filtering by category for edge cases | For initial implementation, do NOT filter by category during vector search (to allow cross-category matches). Only use category in Signal C calculation. Add category filtering as a configurable option. |
| 7 | **How are LLM prompts for Evidence Card and response refinement structured?** | Will need to design specific prompt templates. The solution provides the JSON structure as a hint, but exact prompt engineering is needed. |
| 8 | **Resolution cluster map updates** — When a new verified fix is added, does the cluster map update in real-time? | For hackathon: update at next restart. Build the `cluster_map.json` offline. Real-time clustering is future scope. |
| 9 | **Batch-group with incident team** — What does BATCH_ESCALATE actually do differently from ESCALATE? | Assume same behavior as ESCALATE for initial build, with a different reason tag. Batch grouping is future scope. |
| 10 | **Supabase Realtime for live status updates** — The employee portal shows "real-time status" | Assume polling (every 3-5 seconds) for initial build. Supabase Realtime subscriptions can be added as enhancement. |

### 9.2 Technical Risks

| Risk | Impact | Mitigation |
|---|---|---|
| **Jina AI rate limits** | Blocked embeddings during high volume | Implement retry with exponential backoff; batch embed during data loading |
| **OpenRouter rate limits / latency** | Slow evidence card generation | Cache common prompt patterns; implement timeout (10s) with fallback to template-based cards |
| **Qdrant Cloud free tier storage** | May run out with 500+ tickets | Monitor vector count; 500 tickets × 1024 dims × 4 bytes ≈ 2MB — well within 1GB limit |
| **Cold start on fresh categories** | Signal C always fails until 30 tickets processed | Expected behavior — clearly documented in UI. Agents handle all tickets initially. |
| **Cluster map quality** | Bad clusters → bad Signal B | Manually inspect and adjust cluster_map.json after generation |
| **LLM hallucination in Evidence Cards** | Misleading "Why Not Automated" explanations | Template the structure, inject only factual data, limit LLM to text refinement only |

---

*This implementation plan is designed for direct use by developers building Argus from scratch. Focus on pipeline correctness first, then UI integration.*
