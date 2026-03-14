# AGENTS — Argus

> Instructions for AI coding agents working on this repository.

---

## 1. Project Context

Argus is an intelligent IT support ticket auto-handling system with confidence-based Human-in-the-Loop (HITL) escalation. It consists of two web portals — **Employee** (submit tickets, view status) and **Agent** (review escalated tickets, submit resolutions, monitor metrics) — backed by a multi-layered decision pipeline that auto-resolves tickets only when three independent confidence signals pass AND a live sandbox test succeeds.

See `SOLUTION.md` for full product vision, problem statement, and architectural diagrams.

---

## 2. Source of Truth

| Document | Role |
|---|---|
| **`IMPLEMENTATION.md`** | **Authoritative technical specification.** Architecture, modules, data models, API design, pipeline stages, directory structure, tech stack, and testing plan. Defer to this for *how* to build. |
| **`SOLUTION.md`** | **Read-only.** Product intent, context, edge cases, demos. Read for *why*. **Do not modify unless the user explicitly asks.** |
| **`TODO.md`** | Chronological build roadmap. Follow phase order strictly. |
| **`MEMORY.md`** | Current project state. **Read this first** at session start — avoids re-reading full docs. |
| **`RULES.md`** | Operational guardrails. Must follow all rules defined there. |

**Rule:** When in doubt about *how*, defer to `IMPLEMENTATION.md`. When in doubt about *what*, defer to `SOLUTION.md`.

---

## 3. Development Workflow

1. **Read `MEMORY.md` first.** Understand what has been built and what the next task is — without re-reading entire spec files.
2. **Read only the relevant section** of `IMPLEMENTATION.md` for the current task. Do not read the full 700-line file each time.
3. **Follow `TODO.md` phase order.** Later phases depend on earlier ones. Do not skip ahead.
4. **Work module-by-module.** Implement one module, verify it, then move on.
5. **Minimal first, robust second.** Happy path before error handling.
6. **Keep modules independent.** Backend `core/` modules must be testable in isolation with mocked services.

---

## 4. Using Agent Skills

The repository includes reusable skills in `.agents/skills/`. **Before implementing complex functionality, check if a relevant skill exists.**

### Preferred Skills

| Skill | When to Use |
|---|---|
| `shadcn-ui` | Installing, configuring, or customizing any shadcn/ui component. **Read this skill first before adding UI components.** |
| `react-components` | Converting designs into modular React components with proper structure. |
| `frontend-design` | Building polished, production-grade frontend pages that avoid generic aesthetics. |
| `web-design-guidelines` | Reviewing UI for accessibility, usability, and design best practices. |

### Skill Usage Rules

- **Always prefer an existing skill** over recreating patterns from scratch.
- Read the skill's `SKILL.md` before using it.
- Other available skills (`design-md`, `enhance-prompt`, `remotion`, `stitch-loop`, `skill-creator`, `find-skills`) may also be relevant — check by name if your task seems related.

### MCP Servers

Use MCP tools to reduce token usage and produce accurate code on the first attempt:

| MCP Server | When to Use |
|---|---|
| **Context7** | **Always use** to look up library docs (FastAPI, Pydantic, Qdrant SDK, React, shadcn, etc.) before writing integration code. Call `resolve-library-id` → `query-docs`. |
| **Supabase MCP** | Apply migrations, execute SQL, list tables, generate TypeScript types — use instead of writing raw SQL by hand. |
| **BrowserMCP** | Visually test and verify frontend pages during Phase 9+. |
| **21st.dev Magic** | Generate or refine UI components when building frontend pages. |
| **GitHub MCP** | Repo operations (create PRs, search code) if hosted on GitHub. |

---

## 5. Implementation Rules

- **Do not invent new architecture.** Follow the module boundaries, directory structure, and component layout defined in `IMPLEMENTATION.md` Section 6.1.
- **Respect the tech stack.** Use only the libraries listed in `IMPLEMENTATION.md` Section 4. Do not introduce alternative frameworks or libraries without explicit instruction.
- **Do not refactor broadly.** Avoid restructuring directories, renaming modules, or changing data flow unless the task specifically requires it.
- **Preserve pipeline layer order.** The 5-layer decision pipeline (Policy Gate → Embedding/Retrieval → Novelty → Confidence → Sandbox) must always execute in sequence. Do not skip, reorder, or merge layers.
- **Respect escalation safety.** If any component fails or is unavailable (Qdrant down, sandbox unreachable, LLM timeout), the system **must default to escalation**. Never default to auto-resolve.

---

## 6. File Structure Discipline

Follow the directory structure defined in `IMPLEMENTATION.md` Section 6.1:

```
argus/
├── backend/
│   ├── api/routes/        # FastAPI route handlers
│   ├── core/              # Pipeline logic (policy gate, confidence, etc.)
│   ├── services/          # External service clients (Jina, Qdrant, LLM, Supabase)
│   ├── models/            # Pydantic data models
│   └── utils/             # Hashing, clustering, timestamps
├── sandbox/               # Isolated sandbox server (port 8001)
├── scripts/               # One-time data loading and seeding scripts
├── frontend/src/          # React + shadcn/ui (Vite + TypeScript)
├── tests/                 # pytest unit and integration tests
└── data/                  # Synthetic data CSV and cluster_map.json
```

- Do not create directories outside this structure.
- Do not duplicate module logic across different directories.
- Place new utilities in `utils/`, new external integrations in `services/`, new pipeline stages in `core/`.

---

## 7. Testing Expectations

`IMPLEMENTATION.md` Section 8 defines the full testing plan. Follow it.

- **Write unit tests alongside new modules.** Every `core/` module should have a corresponding `tests/test_*.py`.
- **Mock external services.** Use `unittest.mock` or `pytest-mock` to mock Jina AI, Qdrant, OpenRouter, and Supabase in unit tests.
- **Key test suites required:**
  - `test_policy_gate.py` — deterministic if/else logic (7+ cases)
  - `test_novelty.py` — threshold boundary tests (4+ cases)
  - `test_confidence.py` — signal computation + cold start (6+ cases)
  - `test_audit_hash.py` — hash determinism + chain integrity (4+ cases)
  - `test_sandbox.py` — action success/failure + connection errors (5+ cases)
  - `test_pipeline_integration.py` — full flow with mocked services (11+ scenarios)
- **Run tests with:** `pytest tests/ -v`

---

## 8. Safe Modification Guidelines

| ⚠️ Before modifying... | Do this first |
|---|---|
| Database schema (Supabase tables) | Check all modules that query those tables. Update Pydantic models, service helpers, and test fixtures. |
| Pipeline stages (`core/`) | Verify the change doesn't break the layer execution order in `core/pipeline.py`. |
| Data models (`models/`) | Search for all usages of the model across `api/`, `core/`, and `services/`. |
| API endpoints | Update corresponding frontend API calls and types. |
| External service clients (`services/`) | Check if test mocks need updating. |
| Confidence thresholds or signal logic | Update test cases in `test_confidence.py` and verify with integration tests. |

**General rule:** If you change a data model or schema, grep the entire codebase for usages and update them all in the same change.

---

## 9. Agent Execution Strategy

When implementing a feature or module, follow this checklist:

```
1. □ Read the relevant IMPLEMENTATION.md section
2. □ Identify the exact module(s) being implemented
3. □ Check if a relevant agent skill exists in .agents/skills/
4. □ Implement minimal working functionality
5. □ Write or update unit tests
6. □ Verify tests pass: pytest tests/ -v
7. □ Check that no existing modules are broken
```

### Common Implementation Patterns

**Adding a new backend endpoint:**
1. Define Pydantic request/response models in `models/`
2. Add route handler in `api/routes/`
3. Implement business logic in `core/` (if pipeline-related) or `services/` (if external)
4. Add test cases

**Adding a new frontend page:**
1. Read the `shadcn-ui` and `frontend-design` skills first
2. Create page component in `frontend/src/pages/`
3. Add API service function in `frontend/src/services/`
4. Add route in the router config
5. Use shadcn/ui components — do not build custom UI primitives

**Modifying the decision pipeline:**
1. Read `IMPLEMENTATION.md` Section 7 (Pipeline Logic) fully
2. Make changes only within the specific layer module in `core/`
3. Update `core/pipeline.py` orchestrator if the interface changes
4. Run `test_pipeline_integration.py` to verify end-to-end behavior

---

## 10. Key Technical Constraints

- **Backend:** Python 3.11+, FastAPI, async where possible
- **Frontend:** React 18+, TypeScript, Vite, shadcn/ui, Tailwind CSS
- **External services (all free tier):** Jina AI, Qdrant Cloud, Supabase, OpenRouter (Gemma 3 27B)
- **Two servers:** Main backend on port `8000`, sandbox on port `8001`
- **Fail-safe principle:** Any error or unavailability → escalate to human. Never auto-resolve when uncertain.
- **Audit trail:** Every decision must produce a SHA-256 hash chained to the previous entry (Merkle chain in `audit_log` table).