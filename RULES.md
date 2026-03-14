# RULES — Argus

> Operational rules and guardrails for AI coding agents working on this repository.

---

## 1. Sources of Truth

| Document | Authority |
|---|---|
| `IMPLEMENTATION.md` | **Primary.** Defines architecture, modules, data models, pipeline stages, API design, directory structure, tech stack, and testing plan. Always defer to this for *how* to build. |
| `SOLUTION.md` | **Read-only.** Product context — *what* the system does, *why* decisions were made, edge cases, demos. **Do not modify unless the user explicitly asks.** |
| `TODO.md` | Build order. Defines the chronological phase sequence and atomic task list. Work must follow this order. |
| `AGENTS.md` | Agent workflow. Defines development patterns, skill usage, and execution strategy. |
| `MEMORY.md` | Project state. Reflects what has been built and what comes next. Must be kept current. |

**Rule:** If any ambiguity exists between documents, `IMPLEMENTATION.md` takes precedence for technical decisions.

---

## 2. Development Order

- **Follow `TODO.md` phases strictly in order.** Later phases depend on earlier ones.
- **Do not skip ahead.** Do not implement Phase 4 (pipeline modules) before Phase 3 (service clients) is complete.
- **Complete all checkboxes in a phase before moving to the next**, unless a specific task is explicitly deferred.
- **One task at a time.** Each checkbox in `TODO.md` represents one unit of work. Complete it fully before starting the next.

---

## 3. Architecture Compliance

- **Follow the module boundaries** defined in `IMPLEMENTATION.md` Section 3 and the directory structure in Section 6.1.
- **Do not create new top-level directories** outside the defined structure (`backend/`, `sandbox/`, `scripts/`, `frontend/`, `tests/`, `data/`).
- **Do not merge modules.** Each file in `core/`, `services/`, `models/`, and `utils/` has a defined responsibility. Keep them separate.
- **Do not introduce new frameworks or libraries** unless they are listed in `IMPLEMENTATION.md` Section 4. If a dependency is needed that isn't listed, flag it — do not add silently.
- **Preserve the 5-layer pipeline order:** Policy Gate → Embedding/Retrieval → Novelty → Confidence → Sandbox. Never skip, reorder, or combine layers.

---

## 4. Fail-Safe Principle

This is the single most important behavioral rule of the system:

> **If anything fails or is uncertain, the system MUST escalate to a human. Never default to auto-resolve.**

This applies to:
- External service failures (Qdrant, Jina, OpenRouter, Supabase unreachable)
- Sandbox server connection errors
- LLM timeouts or malformed responses
- Any unhandled exception in the pipeline

Every `try/except` block in pipeline code must default to escalation, not silence.

---

## 5. Schema & Data Model Rules

- **Do not modify Supabase table schemas** unless the task explicitly requires it.
- If a schema change is necessary:
  1. Update the table definition
  2. Update all Pydantic models in `backend/models/`
  3. Update all service helpers in `backend/services/supabase.py` that query the changed table
  4. Update all test fixtures that reference the changed fields
  5. Update `IMPLEMENTATION.md` Section 5 to reflect the change
- **Do not rename columns** — downstream modules, tests, and frontend types all depend on the exact column names.
- **Qdrant payload structure** (`ticket_id`, `category`, `description`, `resolution`, `resolution_cluster`, `severity`, `auto_resolved`, `verified`, `created_at`) must remain consistent between upserts and queries.

---

## 6. Code Quality

- **Type everything.** Backend: use Pydantic models and Python type hints. Frontend: use TypeScript types (no `any`).
- **Use async where appropriate** in FastAPI route handlers and external service calls.
- **Use `httpx` for all HTTP calls** (not `requests`). Prefer async `httpx.AsyncClient`.
- **Use environment variables** for all configuration. Never hardcode API keys, URLs, or thresholds.
- **Thresholds are configurable.** Read from `category_thresholds` table or `.env`, never hardcode `0.85`, `0.60`, `0.70`, `0.50` in logic.

---

## 7. Testing

- **Write tests alongside new modules.** Every `core/` module must have a corresponding `tests/test_*.py`.
- **Mock all external services** in unit tests (Jina, Qdrant, OpenRouter, Supabase) using `unittest.mock` or `pytest-mock`.
- **Follow the test cases** defined in `IMPLEMENTATION.md` Section 8. Do not skip test scenarios.
- **Run `pytest tests/ -v`** after implementing any module to verify nothing is broken.
- **Do not merge pipeline changes** without passing `test_pipeline_integration.py`.

---

## 8. Incremental Implementation

- **Build minimal working implementations first.** Get the happy path working before adding error handling, retries, or edge cases.
- **Keep changes small.** Each unit of work should be completable in a single session without losing context.
- **Do not refactor broadly.** Avoid restructuring directories, renaming modules, or rewriting interfaces unless the task specifically requires it.
- **Do not optimize prematurely.** Correctness first, performance later.

---

## 9. Progress Tracking

- **Update `MEMORY.md`** after completing any phase or significant milestone:
  - Mark the current development phase
  - Move completed tasks from "Next Task" to "Completed Work"
  - Update the "Current System State" table
  - Set the new "Next Task"
- **Update `TODO.md`** checkboxes: mark `[x]` when a task is complete.
- **Read `MEMORY.md` at the start of every new session** to understand current project state without re-analyzing the full codebase.

---

## 10. What NOT to Do

- ❌ Do not modify `SOLUTION.md` unless the user explicitly asks.
- ❌ Do not generate the synthetic ticket dataset (500 tickets). This is handled separately.
- ❌ Do not deploy the application. Deployment is out of scope.
- ❌ Do not add authentication or user login to the portals (not required for hackathon scope).
- ❌ Do not introduce Tailwind CSS outside of shadcn/ui usage (shadcn requires it; standalone Tailwind use requires explicit user approval).
- ❌ Do not write frontend code before the backend pipeline is verified and working.
- ❌ Do not auto-resolve tickets when the system is uncertain. Always escalate.

---

## 11. Token Efficiency

> The goal is to get maximum results with minimal token usage.

- **Read `MEMORY.md` first** at the start of every session. Do not re-read `SOLUTION.md` or `IMPLEMENTATION.md` in full when `MEMORY.md` already provides context.
- **Read only the relevant section** of `IMPLEMENTATION.md` for the current task — not the entire file.
- **Use Context7 MCP** (`mcp_context7_resolve-library-id` → `mcp_context7_query-docs`) to look up library documentation instead of guessing or searching the web. This produces accurate code with fewer iterations.
- **Use available skills** (`.agents/skills/`) before manually implementing patterns. Skills like `shadcn-ui`, `react-components`, and `frontend-design` contain pre-validated workflows.
- **Keep changes small and atomic.** One task per session. Do not attempt to implement an entire phase in one pass.
- **Avoid exploratory code.** Read the spec, implement the defined behavior, write the test. Do not prototype.

---

## 12. Available Tools

### MCP Servers

| Server | Use For |
|---|---|
| **Context7** | Look up library docs (FastAPI, Pydantic, Qdrant, React, shadcn, etc.) before writing integration code |
| **Supabase MCP** | Direct database operations — apply migrations, execute SQL, list tables, manage schema |
| **GitHub MCP** | Repository operations if hosted on GitHub |
| **BrowserMCP** | Visual testing and verification of frontend pages |
| **Stitch** | UI design generation and iteration |
| **21st.dev Magic** | UI component generation and refinement |
| **Firecrawl** | Web scraping for reference material |

### Agent Skills (`.agents/skills/`)

| Skill | Use For |
|---|---|
| `shadcn-ui` | Installing and configuring shadcn/ui components — **always read before adding UI components** |
| `react-components` | Converting designs to modular React components |
| `frontend-design` | Building premium, production-grade frontend UI |
| `web-design-guidelines` | Reviewing UI for accessibility and best practices |
