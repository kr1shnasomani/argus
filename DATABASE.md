# Database Reference

This document covers both Argus data stores:
- Supabase Postgres (system of record)
- Qdrant (vector knowledge base)

## 1) Supabase (Postgres)

### Tables
- `users` — directory of allowed submitters and their policy tier
- `systems` — policy context for target systems
- `tickets` — canonical ticket lifecycle
- `ticket_outcomes` — per-ticket pipeline outputs and feedback loop
- `audit_log` — immutable decision log with hash chain
- `category_thresholds` — category-level confidence thresholds

### users
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `email` | text | unique |
| `name` | text | |
| `tier` | text | `standard`, `vip`, or `contractor` |
| `department` | text | |
| `created_at` | timestamptz | |

### systems
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `name` | text | unique |
| `category` | text | |
| `change_freeze` | boolean | |
| `active_incident` | boolean | |
| `updated_at` | timestamptz | |

### tickets
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | FK → users.id |
| `system_id` | uuid | FK → systems.id, nullable |
| `description` | text | |
| `category` | text | NOT NULL |
| `severity` | text | `P1`, `P2`, `P3`, `P4` |
| `status` | text | `processing`, `auto_resolved`, `escalated`, `resolved` |
| `is_urgent` | boolean | employee-flagged urgent |
| `attachment_url` | text | nullable, from Supabase storage |
| `attachment_text` | text | nullable, OCR from vision service |
| `created_at` | timestamptz | |
| `resolved_at` | timestamptz | nullable |
| `auto_resolved` | boolean | mirrors ticket_outcomes.auto_resolved |

### ticket_outcomes
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `ticket_id` | uuid | FK → tickets.id |
| `category` | text | |
| `auto_resolved` | boolean | whether pipeline auto-resolved |
| `sandbox_passed` | boolean | nullable |
| `signal_a` | float | semantic similarity score (null = seed data) |
| `signal_b` | float | resolution consistency score |
| `signal_c` | float | category accuracy score |
| `escalation_reason` | text | nullable |
| `resolution` | text | final resolution text |
| `resolution_cluster` | text | nullable, cluster label for Qdrant |
| `agent_verified` | boolean | nullable |
| `override_reason` | text | nullable |
| `ai_suggestion` | text | nullable; populated for escalated tickets |
| `retrospective_match` | boolean | nullable; computed after agent resolves |
| `created_at` | timestamptz | |

Notes:
- `ai_suggestion` is NULL for auto-resolved tickets, populated for escalated ones
- `retrospective_match` is computed via fuzzy string match against `ai_suggestion` (≥80% similarity = match)
- `signal_a/b/c` are NULL for seed data; dashboard queries filter by `signal_a >= 0` to exclude seed rows

### audit_log
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `ticket_id` | uuid | FK → tickets.id |
| `decision` | text | `AUTO_RESOLVED`, `HUMAN_ESCALATION`, `AGENT_RESOLVED`, `AGENT_CORRECTION` |
| `evidence_card` | jsonb | full pipeline trace and candidate fixes |
| `audit_hash` | text | SHA-256 of current entry |
| `previous_hash` | text | SHA-256 of previous entry (chain) |
| `latency_ms` | integer | pipeline execution time |
| `created_at` | timestamptz | |

### category_thresholds
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `category` | text | unique |
| `threshold_a` | float | semantic similarity pass threshold |
| `threshold_b` | float | resolution consistency threshold |
| `threshold_c` | float | category accuracy threshold |
| `novelty_threshold` | float | minimum similarity for novelty check |
| `min_sample_size` | integer | minimum rows for Signal C |
| `updated_at` | timestamptz | |

### Indexes
- `idx_tickets_user_id`, `idx_tickets_status`
- `idx_ticket_outcomes_category`, `idx_ticket_outcomes_created_at`
- `idx_audit_log_ticket_id`

---

## 2) Qdrant (Vector DB)

### Collection
- Name: from env `QDRANT_COLLECTION_NAME` (default `resolved_tickets`)
- Vector size: `1024`
- Distance: `COSINE`

### Stored Payload
- `ticket_id` — display format `INC-XXXXX`
- `description`, `category`, `severity`, `resolution`
- `resolution_cluster`, `user_tier`, `verified`

### Point ID
- May be integer or string. Evidence card normalizes integer IDs to `INC-XXXXX` display format.

### Operations
- `embed_ticket(text)` — Jina AI embeddings
- `retrieve_similar(vector, top_k)` — Qdrant nearest-neighbor search
- `upsert_ticket(ticket_id, vector, payload)` — verified fix insertion

---

## 3) Data Flow

1. Employee submits ticket → `tickets` row created, status=`processing`
2. Pipeline runs 6 stages (Policy Gate → Vector DB → Signal A → B → C → Sandbox)
3. `conclude()`: INSERT into `ticket_outcomes` FIRST (if this fails, ticket escalates), then UPDATE `tickets.status`
4. Evidence and latency written to `audit_log` with SHA-256 hash chain
5. Agent resolves escalated ticket → `retrospective_match` computed, verified fixes upserted to Qdrant
6. Agent corrects auto-resolved ticket → `auto_resolved=False`, corrected resolution upserted

---

## 4) Environment Variables

```
SUPABASE_URL, SUPABASE_SERVICE_KEY
QDRANT_URL, QDRANT_API_KEY, QDRANT_COLLECTION_NAME
JINA_API_KEY
GROQ_API_KEY, GROQ_MODEL
GOOGLE_GEMINI_API_KEY, GEMINI_MODEL
OPENROUTER_API_KEY, OPENROUTER_MODEL
SANDBOX_URL (defaults to http://localhost:8001)
```

---

## 5) Operational Notes

- Backend uses Supabase service role key — bypasses RLS in server-side operations.
- `tickets.category` is NOT NULL; submit flow inserts `Unclassified` before auto-detection updates it.
- `ticket_outcomes.signal_a/b/c` are NULL for seed data — always filter with `signal_a >= 0` in metrics queries.
- No orphaned tickets: `conclude()` INSERTs into `ticket_outcomes` before updating ticket status; INSERT failure escalates the ticket.
