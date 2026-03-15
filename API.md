# API Reference

This document describes all HTTP APIs used by the Argus frontend and backend.

## Base URLs
- Backend local: `http://localhost:8000`
- Frontend API client base (from `frontend/src/lib/api.ts`): `http://localhost:8000/api` (default)

All paths below are shown as full backend paths.

## Health
### GET /health
Returns app readiness and startup state.

Response:
```json
{
  "status": "ok",
  "qdrant_connected": true,
  "cluster_map_loaded": true
}
```

## Tickets
### POST /api/tickets/submit
Submits a ticket and runs the pipeline.

Content-Type: `multipart/form-data`

Form fields:
- `description` (required)
- `user_email` (required)
- `category` (optional; backend auto-detects if blank)
- `severity` (optional; default `P3`)
- `urgent` (optional bool; default `false`)
- `system_id` (optional UUID)
- `attachment` (optional file)

Response (`TicketResponse`):
```json
{
  "ticket_id": "uuid",
  "status": "processing|auto_resolved|escalated|resolved",
  "resolution_message": "string|null",
  "resolved_at": null,
  "decision_latency_ms": 1234.56
}
```

Common errors:
- `404` user not found in `users`
- `500` pipeline or storage failure

### GET /api/tickets/{ticket_id}
Returns current ticket state and latest outcome summary.

Response:
```json
{
  "ticket_id": "uuid",
  "status": "escalated",
  "category": "Network/Connectivity",
  "severity": "P3",
  "created_at": "timestamp",
  "resolved_at": null,
  "resolution": null,
  "decision_latency_ms": 2114,
  "evidence_card": {}
}
```

## Agent APIs
### GET /api/tickets/agent/escalated
Returns escalated queue rows (sorted by severity then created_at), including latest audit/outcome context.

### GET /api/tickets/{ticket_id}/evidence
Returns normalized Evidence Card payload for detail view.

Includes:
- ticket fields
- `outcome`
- `candidate_fixes`
- `signal_a|b|c`
- `threshold_a|b|c`
- `escalation_reason`
- `sandbox_passed`
- `layer_intercepted`
- `total_latency_ms`

### POST /api/tickets/{ticket_id}/resolve
Agent resolves escalated tickets.

Body:
```json
{
  "resolution_text": "...",
  "resolution_type": "verified|workaround|uncertain",
  "override_reason": "missing_context"
}
```

Behavior:
- updates `ticket_outcomes`
- computes `retrospective_match` using fuzzy string match against `ai_suggestion`
- if `resolution_type=verified`, upserts verified payload into Qdrant
- writes audit entry
- marks ticket `resolved`

### GET /api/tickets/agent/all
Returns ticket history rows for the agent all-tickets page.

## Configuration APIs
### GET /api/config/thresholds
Returns all category thresholds.

### GET /api/config/thresholds/{category}
Returns thresholds for one category.

### GET /api/config/systems
Returns all systems (`id`, `name`).

### POST /api/simulate
Runs deterministic dry-run policy gate simulation.

Body:
```json
{
  "description": "...",
  "category": "General",
  "severity": "P3",
  "user_tier": "standard",
  "system_name": "VPN",
  "change_freeze": false,
  "active_incident": false
}
```

## Metrics APIs
### GET /api/metrics/dashboard
Returns dashboard aggregates:
- `system_performance`
- `override_analysis`
- `knowledge_base_coverage`
- `drift_monitor`

### GET /api/metrics/coverage
Returns vector count, category coverage, and average signal.

### GET /api/metrics/drift
Returns per-category recent vs previous accuracy drift.

## Audit APIs
### GET /api/audit/logs
Returns latest global audit log entries.

### GET /api/audit/{ticket_id}
Returns full audit hash chain for a ticket.

## Frontend Service Mapping
- `frontend/src/services/tickets.ts`
  - `POST /api/tickets/submit`
  - `GET /api/tickets/{id}`
- `frontend/src/services/agent.ts`
  - `GET /api/tickets/agent/escalated`
  - `GET /api/tickets/{id}/evidence`
  - `POST /api/tickets/{id}/resolve`
  - `GET /api/tickets/agent/all`
- `frontend/src/services/config.ts`
  - `GET /api/config/thresholds`
  - `GET /api/config/systems`
  - `POST /api/simulate`
- `frontend/src/services/metrics.ts`
  - `GET /api/metrics/dashboard`
  - `GET /api/metrics/coverage`
  - `GET /api/metrics/drift`
- `frontend/src/services/audit.ts`
  - `GET /api/audit/logs`

## Error Handling Notes
- The backend has a global exception handler returning a generic internal error detail.
- Route-level `HTTPException` details are still surfaced for specific failures.
- Employee submit UI now surfaces backend `detail` when available.