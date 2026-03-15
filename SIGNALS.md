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
- `category_thresholds.threshold_a`

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
- `category_thresholds.threshold_b`

Pass condition:
- `signal_b >= threshold_b`

Failure impact:
- Escalation due to ambiguous historical fix pattern.

## Signal C: Historical Category Success

Definition:
- Historical auto-resolution rate for the same category over recent window.

Source:
- Supabase `ticket_outcomes` rows filtered by category and time window.

Interpretation:
- Category-level safety trend signal.

Threshold and window:
- `category_thresholds.threshold_c`
- `category_thresholds.min_sample_size`
- typically 30-day window in current implementation.

Pass condition:
- `signal_c >= threshold_c`

Failure impact:
- Escalation even if A and B pass.

## Veto Rule

All three signals must pass.
- Any single failure escalates the ticket.

## Related Fields in DB

Stored in `ticket_outcomes`:
- `signal_a`
- `signal_b`
- `signal_c`
- `auto_resolved`
- `ai_suggestion`
- `retrospective_match`

Thresholds in `category_thresholds`:
- `threshold_a`
- `threshold_b`
- `threshold_c`
- `novelty_threshold`
- `min_sample_size`