# Pipeline Stages Context

Argus processes each ticket through deterministic and ML-backed stages in strict order.

## Stage 0: Policy Gate
Checks deterministic rules before AI layers:
- VIP tier
- Severity P1/P2
- System change freeze
- Active incident

Output:
- `PROCEED`, `ESCALATE`, or `BATCH_ESCALATE`

## Stage 1a: Embedding
- Ticket text (plus optional extracted attachment context) is embedded.
- Uses Jina embeddings.

## Stage 1b: Retrieval
- Searches Qdrant for top-k similar known tickets.

## Stage 2: Novelty Check
- Compares max similarity against novelty threshold.
- If too low, ticket is considered novel and escalated.

## Stage 3: Confidence Engine
Computes three signals:
- Signal A semantic similarity
- Signal B cohort consistency
- Signal C historical category success

Veto behavior:
- Any failed signal escalates.

## Stage 4: Resolution Mapping and Sandbox
- Maps top candidate to executable sandbox action.
- Executes canary sandbox validation.
- If sandbox fails, escalate.

## Stage 5: Finalization and Audit
- Updates ticket status and ticket_outcomes.
- Writes evidence payload to audit_log with hash chain.
- Auto-resolve path returns resolution_message.

## Escalation Path
- Escalated tickets are visible in Agent queue.
- Agent submits resolution with type (`verified|workaround|uncertain`).
- Verified fixes can be upserted into Qdrant.

## Evidence Trace Fields (normalized)
`GET /api/tickets/{ticket_id}/evidence` returns normalized fields used by UI:
- `signal_a|b|c`
- `threshold_a|b|c`
- `candidate_fixes`
- `sandbox_passed`
- `escalation_reason`
- `layer_intercepted`
- `total_latency_ms`