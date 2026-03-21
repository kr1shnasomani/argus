# Implementation Context

This file summarizes the concrete implementation choices in the current Argus codebase.

## Backend Entrypoint
- `backend/api/main.py` — FastAPI app factory, CORS, startup lifecycle, cluster map loading, Qdrant collection init.

## Core Modules
| Module | File | Role |
|---|---|---|
| Orchestrator | `backend/core/pipeline.py` | Runs all 8 pipeline stages in sequence, calls `conclude()` on finish |
| Policy Gate | `backend/core/policy_gate.py` | VIP/P1/P2/freeze/incident matching — returns `PROCEED` or `ESCALATE` |
| Embedder | `backend/core/embedder.py` | Jina AI text embedding (`jina-embeddings-v3`) |
| Retriever | `backend/core/retriever.py` | Qdrant nearest-neighbor search |
| Novelty | `backend/core/novelty.py` | Vector DB novelty check |
| Confidence | `backend/core/confidence.py` | Signal A/B/C computation |
| Resolution Mapper | `backend/core/resolution_mapper.py` | Maps Qdrant resolution to sandbox action |
| Sandbox Client | `backend/core/sandbox_client.py` | Calls sandbox at localhost:8001 |

## External Services
| Service | File | Notes |
|---|---|---|
| Supabase | `backend/services/supabase.py` | `get_supabase()` singleton, audit hash chain |
| Qdrant | `backend/services/qdrant.py` | Search and upsert |
| Jina AI | `backend/services/jina.py` | Text embeddings |
| LLM | `backend/services/llm.py` | Groq → Gemini → OpenRouter fallback chain for resolution generation |
| Vision | `backend/services/vision.py` | OpenRouter vision OCR for ticket attachments |
| Storage | `backend/services/storage.py` | Supabase file storage for attachments |

## API Routes
| Route | File | Notes |
|---|---|---|
| Tickets | `backend/api/routes/tickets.py` | `POST /api/tickets`, `GET /api/tickets/{id}`, `GET /api/tickets/{id}/status` |
| Agent | `backend/api/routes/agent.py` | Escalated queue, evidence, resolve, correction, all tickets |
| Config | `backend/api/routes/config.py` | Health checks (8 services), users, systems, thresholds, simulate |
| Metrics | `backend/api/routes/metrics.py` | Dashboard, coverage, drift |
| Audit | `backend/api/routes/audit.py` | Global logs, per-ticket chain |

## Pydantic Models
- `backend/models/ticket.py` — `TicketSubmission`, `TicketResponse`
- `backend/models/user.py` — `User`, `System`
- `backend/models/confidence.py` — `GateAction`, `ConfidenceDecision`, `SignalStatus`, `ConfidenceReport`
- `backend/models/evidence_card.py` — `EvidenceCard`
- `backend/models/agent.py` — `AgentResolution`, `AgentCorrection`
- `backend/models/audit.py` — `AuditEntry`

## Sandbox
- `sandbox/main.py` — FastAPI server on port 8001, `GET /health` endpoint
- `sandbox/actions.py` — `ACTION_HANDLERS` dict, `map_resolution_to_action()`
- `sandbox/environment.py` — `env` singleton simulating IT environment state

## Frontend Portals
| Portal | Pages |
|---|---|
| Employee | `UserSelectGrid.tsx`, `SubmitTicket.tsx`, `TicketStatus.tsx` |
| Agent | `EscalatedQueue.tsx`, `EvidenceCardView.tsx`, `TicketHistory.tsx`, `SystemHealth.tsx`, `MetricsDashboard.tsx`, `WhatIfSimulator.tsx`, `AuditLog.tsx` |
| Landing | `LandingPage.tsx` |

## Frontend Services
- `frontend/src/services/tickets.ts` — ticket submission and status
- `frontend/src/services/agent.ts` — escalated queue, evidence, resolve, correction
- `frontend/src/services/config.ts` — health, users, systems, thresholds, simulate
- `frontend/src/services/metrics.ts` — dashboard, coverage, drift
- `frontend/src/services/audit.ts` — global logs, per-ticket chain
- `frontend/src/lib/api.ts` — Axios instance (`http://localhost:8000/api`)

## Key Runtime Contracts
- `POST /api/tickets` accepts multipart form with optional `attachment` field.
- `ticket_outcomes.ai_suggestion` is NULL for auto-resolved tickets, populated for escalated ones.
- `conclude()` inserts into `ticket_outcomes` BEFORE updating ticket status — INSERT failure escalates.
- `retrospective_match` computed via `SequenceMatcher` against `ai_suggestion` — ≥80% similarity = match.
- `accept_suggestion=true` in resolve skips similarity check, sets `retrospective_match=True` directly.
- Dashboard metrics query filters `signal_a >= 0` to exclude seed data rows.

## System Health — 8 Services
| ID | Name | Type | Check |
|---|---|---|---|
| `supabase` | Supabase | Database | `SELECT id` from users table |
| `qdrant` | Qdrant | Vector DB | `GET /collections` |
| `sandbox` | Sandbox | Sandbox | `GET /health` on port 8001 |
| `jina` | Jina AI | Embeddings | `POST /v1/embeddings` (model: `jina-embeddings-v3`) |
| `groq` | Groq | LLM Primary | `POST /v1/chat/completions` |
| `gemini` | Gemini | LLM Fallback | `POST /...generateContent` (model: `gemini-2.5-flash-lite`) |
| `openrouter` | OpenRouter | LLM + Vision | `POST /v1/chat/completions` |
| `pipeline` | Pipeline | Backend API | Always returns `operational` |

## Source of Truth
- `SOLUTION.md` is the principal design and solution reference and should not be modified during cleanup work.
