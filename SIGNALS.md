# Signals Context

This file explains each confidence signal used by Argus.

## Signal A: Semantic Similarity

Definition:
- The top cosine similarity score from Qdrant nearest-neighbor retrieval.

Source:
- Qdrant `query_points` score for best match.

Interpretation:
- Higher score means stronger semantic match with a known resolved ticket.

Threshold:
- `category_thresholds.threshold_a` (default 0.75)

Pass condition:
- `signal_a >= threshold_a`

Failure impact:
- Immediate escalation (veto gate).

## Signal B: Resolution Consistency

Definition:
- Fraction of top-k similar tickets that map to the same resolution cluster.

Source:
- Qdrant top-k payloads + cluster mapping in backend.

Interpretation:
- High consistency indicates historical fixes agree on the same action.

Threshold:
- `category_thresholds.threshold_b` (default 0.60)

Pass condition:
- `signal_b >= threshold_b`

Agent-verified override:
- When Signal A >= 0.95 AND top Qdrant result has `verified=true`: Signal B is boosted to 1.0.
- This reflects trust in cluster consensus when a human expert has verified the match.

Failure impact:
- Escalation due to ambiguous historical fix pattern.

## Signal C: Historical Success

Definition:
- Historical auto-resolution rate, computed from retrieved Qdrant results first, falling back to historical category data.

Source priority:
1. **Result-level** (retrieved Qdrant matches): inspects `auto_resolved` flags from top-k retrieved results
2. **Historical fallback**: queries `ticket_outcomes` for same category (last 30 days)

Signal C logic:
- ALL retrieved `auto_resolved=false` → score = 0.0 → FAIL (immediate escalation)
- ALL retrieved `auto_resolved=true` → score = 1.0 → PASS
- Mixed results (e.g. 1/5 = 0.2) → score = ratio → compare against threshold
- No result-level data → fall back to historical category rate

Thresholds and window:
- `category_thresholds.threshold_c` (default 0.70)
- `category_thresholds.min_sample_size` (default 30)
- 30-day window for historical fallback

Pass condition:
- `signal_c >= threshold_c`

Failure impact:
- Escalation even if A and B pass.

Signal C is NEVER overridden:
- The agent-verified Signal A >= 0.95 override only boosts Signal B, never Signal C.
- Signal C always remains accountable to the veto gate.

## Veto Rule

All three signals must pass.
- Any single failure escalates the ticket.
- Signal C failure is the most critical — it indicates the retrieved results have historically poor outcomes.

## Related Fields in DB

Stored in `ticket_outcomes`:
- `signal_a`, `signal_b`, `signal_c` — signal scores
- `auto_resolved` — the Signal C column (true = historically auto-resolved, false = escalated)
- `ai_suggestion` — AI resolution (populated for escalated tickets only)
- `retrospective_match` — agent resolution match vs ai_suggestion

Thresholds in `category_thresholds`:
- `threshold_a` (default 0.75)
- `threshold_b` (default 0.60)
- `threshold_c` (default 0.70)
- `novelty_threshold` (default 0.50)
- `min_sample_size` (default 30)
