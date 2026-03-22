# Pipeline Stages Context

Argus processes each ticket through 9 sequential stages. The pipeline auto-resolves only when all gating stages pass.

## Stage 0a: Severity Auto-Detection
- Parses ticket description for P1/P2 keywords.
- Detects P1 from: "entire building", "entire team", "all users", "completely down", "mass outage", etc.
- Detects P2 from: "multiple users", "several people", "widespread", etc.
- Default severity is P3 if no keywords match.
- Severity is written back to the ticket before the Policy Gate runs.

## Stage 0b: Category Auto-Detection
- Uses LLM to detect category from description (with keyword-based fallback).
- Maps detected category to a valid category from `category_thresholds`.
- Category is written back to the ticket before the Policy Gate runs.

## Stage 1: Policy Gate (Layer 0)
Deterministic rules — no AI involved:
- VIP tier user → immediate escalation
- Severity P1 or P2 → immediate escalation (reason includes detected keyword, e.g. "AI classified P1 — mass outage entire building")
- System in change freeze → immediate escalation
- Active incident on target system → immediate escalation

Output: `PROCEED` or `ESCALATE` (intercepted before AI processing)

## Stage 2: Embedding (Layer 1a)
- Embeds ticket description via Jina AI (`jina-embeddings-v3`, 1024-dim).

## Stage 3: Retrieval (Layer 1b)
- Searches Qdrant for top-5 similar known tickets using cosine similarity.

## Stage 4: Novelty Detection (Layer 2)
- Compares max cosine similarity against `novelty_threshold` (default 0.50).
- Too low similarity = ticket is novel → escalate and write to `novel_tickets`.

Output: `PROCEED` or `ESCALATE` (intercepted at layer 2)

## Stage 5: Confidence Engine (Layer 3)
Three signals evaluated:

### Signal A — Semantic Similarity
- Top Qdrant cosine similarity score.
- Threshold: `threshold_a` (default 0.75).
- Pass: `score >= threshold_a`.

### Signal B — Resolution Consistency
- Fraction of top-k agreeing on the same resolution cluster.
- Threshold: `threshold_b` (default 0.60).
- Pass: `score >= threshold_b`.

### Signal C — Historical Success (Result-Level Priority)
- Priority order: ALL retrieved=false → FAIL (0.0) | ALL retrieved=true → PASS (1.0) | mixed → result-level ratio | no data → historical category rate.
- Threshold: `threshold_c` (default 0.70).
- Result-level data: examines `auto_resolved` flags from retrieved Qdrant matches.
- Historical fallback: queries `ticket_outcomes` for same category (last 30 days).
- Signal C is NEVER overridden — it always remains accountable to the veto gate.

### Agent-Verified Override (Signal B only)
- When Signal A >= 0.95 AND top Qdrant result is `verified=true`:
  - Signal B is boosted to 1.0 (trust cluster consensus from human-verified match)
  - Signal C is NOT overridden

### Veto Gate
- All three signals must pass.
- Any single failure escalates.

Output: `PASS` or `FAIL` (intercepted at layer 3)

## Stage 6: Sandbox Execution (Layer 4)
- Maps top candidate resolution to an executable sandbox action via `resolution_mapper.py`.
- Calls sandbox service (port 8001) with action, target, and optional params.
- Sandbox executes the action and returns pass/fail.
- If sandbox fails → escalate.

Output: `PASS` or `FAIL` (intercepted at layer 4)

## Stage 7: Finalization (`conclude()`)
1. **INSERT into `ticket_outcomes`** — outcome record created with all signals, resolution, sandbox result. If INSERT fails → escalate (never orphan a ticket).
2. **UPDATE `tickets` status** — `auto_resolved` if all passed, `escalated` otherwise.
3. **Write `audit_log`** — SHA-256 chain entry with evidence payload.

## Escalation Path
- Escalated tickets appear in Agent queue, sorted by `is_urgent` DESC then `created_at` ASC.
- Agent reviews evidence card (pipeline trace, candidate fixes, AI suggestion).
- Agent can "Accept AI Resolution" or submit own resolution.
- Verified resolutions are upserted into Qdrant for future retrieval.

## Mass Outage Keywords (P1 Detection)
Keywords that trigger P1 severity auto-detection and policy gate escalation:
- "entire building", "entire floor", "entire team", "entire procurement team"
- "all users", "all employees", "all staff", "all departments"
- "entire company", "entire department", "entire office"
- "completely down", "mass outage", "all sites"
