# Database Reference

This document covers both Argus data stores:
- Supabase Postgres (system of record)
- Qdrant (vector knowledge base)

## 1) Supabase (Postgres)

### Public Tables
- `users`
- `systems`
- `tickets`
- `ticket_outcomes`
- `audit_log`
- `category_thresholds`
- `novel_tickets`

### users
Purpose: directory of allowed submitters and their policy tier.

Columns:
- `id` UUID PK
- `email` TEXT UNIQUE NOT NULL
- `name` TEXT NOT NULL
- `tier` TEXT NOT NULL (`standard|vip|contractor`)
- `department` TEXT NOT NULL
- `created_at` TIMESTAMPTZ NOT NULL

### systems
Purpose: policy context for target systems.

Columns:
- `id` UUID PK
- `name` TEXT UNIQUE NOT NULL
- `category` TEXT NOT NULL
- `change_freeze` BOOLEAN NOT NULL
- `active_incident` BOOLEAN NOT NULL
- `updated_at` TIMESTAMPTZ NOT NULL

### tickets
Purpose: canonical ticket lifecycle.

Columns:
- `id` UUID PK
- `user_id` UUID FK -> `users.id`
- `system_id` UUID FK -> `systems.id` (nullable)
- `description` TEXT NOT NULL
- `category` TEXT NOT NULL
- `severity` TEXT NOT NULL (`P1|P2|P3|P4`)
- `status` TEXT NOT NULL (`processing|auto_resolved|escalated|resolved`)
- `attachment_url` TEXT nullable
- `attachment_text` TEXT nullable
- `created_at` TIMESTAMPTZ NOT NULL
- `resolved_at` TIMESTAMPTZ nullable

### ticket_outcomes
Purpose: per-ticket pipeline outputs and feedback loop fields.

Columns:
- `id` UUID PK
- `ticket_id` UUID FK -> `tickets.id`
- `category` TEXT NOT NULL
- `auto_resolved` BOOLEAN NOT NULL
- `sandbox_passed` BOOLEAN nullable
- `signal_a` FLOAT nullable
- `signal_b` FLOAT nullable
- `signal_c` FLOAT nullable
- `escalation_reason` TEXT nullable
- `resolution` TEXT nullable
- `resolution_cluster` TEXT nullable
- `agent_verified` BOOLEAN nullable
- `override_reason` TEXT nullable
- `description` TEXT nullable
- `ai_suggestion` TEXT nullable
- `retrospective_match` BOOLEAN nullable
- `created_at` TIMESTAMPTZ NOT NULL

Rules in current implementation:
- `ai_suggestion` is NULL for auto-resolved outcomes
- `ai_suggestion` is populated for escalated outcomes
- On agent resolution, `retrospective_match` is computed by fuzzy match vs `ai_suggestion`

### audit_log
Purpose: immutable decision log with evidence payload and hash chain.

Columns:
- `id` UUID PK
- `ticket_id` UUID FK -> `tickets.id`
- `decision` TEXT NOT NULL
- `evidence_card` JSONB NOT NULL
- `audit_hash` TEXT NOT NULL
- `previous_hash` TEXT NOT NULL
- `latency_ms` INTEGER NOT NULL
- `created_at` TIMESTAMPTZ NOT NULL

### category_thresholds
Purpose: category-level confidence thresholds.

Columns:
- `id` UUID PK
- `category` TEXT UNIQUE NOT NULL
- `threshold_a` FLOAT NOT NULL
- `threshold_b` FLOAT NOT NULL
- `threshold_c` FLOAT NOT NULL
- `novelty_threshold` FLOAT NOT NULL
- `min_sample_size` INTEGER NOT NULL
- `updated_at` TIMESTAMPTZ NOT NULL

### novel_tickets
Purpose: queue of out-of-domain/novel tickets for review.

Columns:
- `id` UUID PK
- `ticket_id` UUID FK -> `tickets.id`
- `max_similarity` FLOAT NOT NULL
- `reviewed` BOOLEAN NOT NULL
- `created_at` TIMESTAMPTZ NOT NULL

### Indexes (from schema)
- `idx_tickets_user_id`
- `idx_tickets_status`
- `idx_ticket_outcomes_category`
- `idx_ticket_outcomes_created_at`
- `idx_audit_log_ticket_id`
- `idx_novel_tickets_reviewed`

## 2) Qdrant (Vector DB)

### Collection
- Name: from env `QDRANT_COLLECTION_NAME` (default `resolved_tickets`)
- Vector size: `1024`
- Distance: `COSINE`

### Stored Payload (typical)
- `ticket_id` (e.g., `INC-10246`)
- `description`
- `category`
- `severity`
- `resolution`
- `resolution_cluster`
- `user_tier`
- `verified`

### Point ID usage
- Qdrant point id may be integer or string.
- Evidence card candidate fixes normalize integer point ids to `INC-XXXXX` display format.

### Core operations
- `search_similar(vector, top_k=5)`
- `upsert_ticket(ticket_id, vector, payload)`
- `count_vectors()`

## 3) Data Flow Between Stores

1. Ticket created in `tickets`.
2. Pipeline computes outcomes; writes `ticket_outcomes`.
3. Evidence and latency written to `audit_log`.
4. If verified by agent, resolution upserted into Qdrant.
5. `category_thresholds` and recent `ticket_outcomes` power Signal C.
6. Novel routes insert into `novel_tickets`.

## 4) Environment Variables (DB-related)

Supabase:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`

Qdrant:
- `QDRANT_URL`
- `QDRANT_API_KEY`
- `QDRANT_COLLECTION_NAME` (optional; defaults to `resolved_tickets`)

## 5) Operational Notes

- Backend uses Supabase service role key, so it bypasses RLS in server-side operations.
- `tickets.category` is NOT NULL. Submit flow inserts `Unclassified` if category is blank before auto-detection updates it.
- `audit_log.evidence_card` is the primary structured object used by the Agent Evidence view.