# Pipeline Stages Context

Argus processes each ticket through 8 sequential stages. The pipeline auto-resolves only when all 6 gating stages pass.

## Stage 0: Intake & Categorization
- Parses ticket description and auto-detects category using LLM.
- Maps employee-selected system name to system record.
- Sets severity (default P3).

## Stage 1: Policy Gate
Deterministic rules — no AI involved:
- VIP tier user → immediate escalation
- Severity P1 or P2 → immediate escalation
- System in change freeze → immediate escalation
- Active incident on target system → immediate escalation

Output: `PROCEED` or `ESCALATE` (layer 1 intercepted)

## Stage 2: Vector DB Novelty Check
- Embeds ticket description via Jina AI (`jina-embeddings-v3`).
- Searches Qdrant for top-5 similar known tickets.
- Compares max cosine similarity against `novelty_threshold` (default 0.50).
- Too low similarity = ticket is novel → escalate.

Output: `PROCEED` or `ESCALATE` (layer 2 intercepted)

## Stage 3: Signal A — Semantic Similarity
- Takes the top Qdrant cosine similarity score.
- Compares against `threshold_a` (default 0.85 per category).
- Pass: `score >= threshold_a`.

Output: `PASS` or `FAIL` (escalates at layer 3)

## Stage 4: Signal B — Resolution Consistency
- Examines top-k Qdrant results and checks if they cluster to the same resolution action.
- Score = fraction of top-k agreeing on the same resolution cluster.
- Compares against `threshold_b` (default 0.60).

Output: `PASS` or `FAIL` (escalates at layer 4)

## Stage 5: Signal C — Historical Category Success
- Looks up historical auto-resolution rate for the same category (last 30 days).
- Requires minimum `min_sample_size` rows before computing.
- Compares against `threshold_c` (default 0.70).

Output: `PASS` or `FAIL` (escalates at layer 5)

## Stage 6: Sandbox Execution
- Maps top candidate resolution to an executable sandbox action.
- Calls sandbox service (port 8001) with the action and target system.
- Sandbox executes the action and returns pass/fail.
- If sandbox fails → escalate.

Output: `PASS` or `FAIL` (escalates at layer 6)

## Stage 7: Finalization (`conclude()`)
1. **INSERT into `ticket_outcomes`** — outcome record created with all signals, resolution, sandbox result. If INSERT fails → escalate (never orphan a ticket).
2. **UPDATE `tickets` status** — `auto_resolved` if all passed, `escalated` otherwise.
3. **Write `audit_log`** — SHA-256 Merkle chain entry with evidence payload.

## Escalation Path
- Escalated tickets appear in Agent queue, sorted by `is_urgent` DESC then `created_at` ASC.
- Agent reviews evidence card (pipeline trace, candidate fixes, AI suggestion).
- Agent can "Accept AI Resolution" (sets `retrospective_match=True`, `auto_resolved=True`) or submit own resolution.
- Verified resolutions are upserted into Qdrant for future retrieval.

## Veto Rule
Any single failed signal or sandbox failure escalates. All 6 gating stages must pass for auto-resolution.
