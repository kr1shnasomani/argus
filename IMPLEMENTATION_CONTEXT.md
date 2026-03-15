# Implementation Context

This file summarizes the concrete implementation choices in the current Argus codebase.

## Backend Entrypoint
- App factory and startup lifecycle: `backend/api/main.py`
- Loads cluster map at startup and initializes Qdrant collection.

## Core Modules
- Orchestrator: `backend/core/pipeline.py`
- Policy gate: `backend/core/policy_gate.py`
- Confidence logic: `backend/core/confidence.py`
- Novelty: `backend/core/novelty.py`
- Resolution mapper: `backend/core/resolution_mapper.py`

## External Service Layers
- Supabase wrapper: `backend/services/supabase.py`
- Qdrant adapter: `backend/services/qdrant.py`
- Embeddings: `backend/services/jina.py`
- LLM/evidence generation: `backend/services/llm.py`
- Sandbox calls: `backend/core/sandbox_client.py`

## API Surface (high level)
- Tickets: `backend/api/routes/tickets.py`
- Agent: `backend/api/routes/agent.py`
- Metrics: `backend/api/routes/metrics.py`
- Audit: `backend/api/routes/audit.py`
- Config/Simulate: `backend/api/routes/config.py`

## Frontend Portals
- Employee pages: `frontend/src/pages/employee/*`
- Agent pages: `frontend/src/pages/agent/*`
- Shared API client: `frontend/src/lib/api.ts`
- Service adapters: `frontend/src/services/*.ts`

## Key Runtime Contracts
- `POST /api/tickets/submit` accepts multipart form with `attachment` field.
- `tickets.category` is non-null in DB; submit flow inserts `Unclassified` if category is blank before auto-detection updates it.
- `ticket_outcomes.ai_suggestion` remains null for auto-resolved cases and populated for escalations.
- Agent resolution computes `retrospective_match` via fuzzy similarity against `ai_suggestion`.

## Decision Trace Rendering Contract
The Evidence Card UI expects normalized fields from `/api/tickets/{ticket_id}/evidence` including:
- signals (`signal_a|b|c`)
- thresholds (`threshold_a|b|c`)
- candidate fixes (ticket_id, similarity_score, resolution)
- latency (`total_latency_ms`)
- escalation context (`escalation_reason`, `layer_intercepted`)

## Testing and Validation
- Formal tests live in `tests/`.
- Operational scripts live in `scripts/`.
- Avoid removing test utilities unless clearly obsolete and unreferenced.

## Source of Truth
- `SOLUTION.md` is the principal design and solution reference and should not be modified during cleanup work.