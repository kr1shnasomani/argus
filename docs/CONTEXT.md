# Argus System Context & Architecture

**Last Updated**: 2026-04-16

This document is a memory file containing the exhaustive architectural and operational specifications of the Argus system to ensure continuous AI coding agent alignment. This document serves as the absolute source of truth for architectural constraints and historical design decisions.

## 1. High-Level Architecture
Argus is a 3-tier, Confidence-Based Human-in-the-Loop (HITL) system designed to auto-resolve employee IT tickets while enforcing mathematically rigorous safety guarantees.

- **Frontend**: React 18 / Vite / TypeScript. Styled with shadcn/ui. Port 5173.
- **Main Backend (API + Pipeline)**: FastAPI / Python 3.11+. Port 8005.
- **Sandbox Environment**: Isolated execution server evaluating auto-resolutions practically. Port 8001.

All three services are unified into a **Single Docker Container** with `supervisord` maintaining process lifecycle integrity.

## 2. Core Execution Pipeline (The 9-Stage Policy Gate)

Codebase Location: `backend/core/pipeline.py`

Argus does not permit immediate auto-resolution. Any incoming ticket must survive the following gates:

1. **Severity Auto-Detection**: Any ticket classified as `P1` or `P2` triggers an immediate hard-escalation.
2. **Category Auto-Detection**: Tickets routed to VIPs or out-of-scope policies trigger escalation.
3. **Policy Gate (Hard Stop)**: Configurable threshold ensuring high-risk queries never evaluate further.
4. **Embedding**: `Jina AI` vectorization of the ticket state.
5. **Retrieval**: `Qdrant` DB fetches top-K historical resolutions to match against.
6. **Novelty Check**: If maximum historical similarity is `< 0.85`, it is treated as a novel issue and escalated.
7. **Confidence Scoring (A/B/C signals)**:
   - *Signal A (LLM Confidence)*: Semantic grasp of the error.
   - *Signal B (Historical Match)*: Similarity to past tickets.
   - *Signal C (Context Completeness)*: Does the ticket have enough info to resolve?
8. **Sandbox Execution**: The candidate resolution is tested in a live dummy environment. If it crashes, escalate.
9. **Finalization / Audit**: Emits a SHA-256 state hash directly into the Supabase database.

If ANY of the above conditions fail, the system escalates the issue to a Human Agent seamlessly.

## 3. Human-in-the-Loop Feedback Loop

When an auto-resolution is escalated or explicitly rejected by an employee (`TicketStatus.tsx -> Escalate to Agent`):
1. A human agent reviews the resolution in the Agent Portal (`EvidenceCardView.tsx`).
2. They may rewrite the resolution or verify it.
3. Once marked "Verified", the backend (`backend/api/routes/agent.py:verify_auto_resolution`) generates a new embedding.
4. The verified vector and `ticket_id` are passed to `v1/collections/resolved_tickets/points`.
5. The Qdrant model absorbs the agent's updated fix, creating a perpetual learning loop.

## 4. UI/UX "Precision Design" System

Argus demands exceptionally premium, hyper-coordinated visuals. All CSS tokens (`--argus-emerald`, `--argus-red`, `--argus-indigo`, etc.) originate from `frontend/src/index.css`.
- Action verbs affecting positive states (Approval, Verified, Yes) map directly to `--argus-emerald` and `--argus-emerald-light`.
- Action verbs invoking negative states (Escalation, Rejection, No) map directly to `--argus-red` and `--argus-red-light`.
- Hardcoded hex overrides matching these exact bounds are used on raw `shadow` tags when Tailwind utility variables fall short.

## 5. Deployment / Infrastructure Specs

### Docker Manifest (All-In-One Container)
- Provides individual selection via the `$SERVICE` Environment block (`frontend`, `backend`, `sandbox`, `all`).
- Eliminates multi-repo drift and CI pipeline complexity.
- Github Actions builds target the repo-root exclusively.

### Key Dependencies
- `qdrant-client`: Runs `check_version=False` on the async client due to minor mismatch quirks between `1.13` and `1.16`, which are backwards compatible.
- `FastAPI`: Strict validation bounds mapping exclusively to `models/ticket.py`.

## 6. Constraints & Prohibitions
- **NEVER** subvert the Sandbox execution block. Safety must precede speed.
- **NEVER** edit `SOLUTION.md` as it holds the product-marketing definitions.
- **NEVER** alter the internal Supabase UUID/Foreign Key generation structures manually; always rely on `apply_migration` tools.
