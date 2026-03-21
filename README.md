# Argus

[![Backend](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi&logoColor=white)](backend/)
[![Frontend](https://img.shields.io/badge/Frontend-React-61DAFB?logo=react&logoColor=222)](frontend/)
[![Database](https://img.shields.io/badge/Database-Supabase-3ECF8E?logo=supabase&logoColor=white)](DATABASE.md)
[![Vector%20DB](https://img.shields.io/badge/Vector%20DB-Qdrant-EA4AAA)](DATABASE.md)
[![Docs](https://img.shields.io/badge/Docs-API%20%26%20Context-4F46E5)](API.md)

Argus is an intelligent IT ticket handling platform with confidence-based human-in-the-loop escalation.

The project source-of-truth design document is [SOLUTION.md](SOLUTION.md). This README is intentionally concise and operational.

## What Argus Does
- Accepts tickets from employees via the Employee portal.
- Runs a multi-stage decision pipeline (Policy Gate → Vector DB → Signal A/B/C → Sandbox).
- Auto-resolves only when all confidence signals pass AND sandbox validation succeeds.
- Escalates uncertain or high-priority tickets to agents with full evidence trace.
- Agents resolve escalated tickets; verified fixes are upserted into the knowledge base.
- Monitors all 8 subsystems in real-time via the System Health dashboard.

## Project Structure
```
argus/
├── backend/           FastAPI application (port 8000)
│   ├── api/routes/    tickets, agent, config, metrics, audit
│   ├── core/         pipeline, policy_gate, confidence, novelty, embedder, retriever
│   ├── services/      supabase, qdrant, jina, llm, vision, storage
│   ├── models/        pydantic models
│   └── utils/         audit_hash, cluster_map, timestamps
├── sandbox/           Canary execution service (port 8001)
├── frontend/src/      React portals
│   ├── pages/agent/   EscalatedQueue, EvidenceCardView, TicketHistory,
│   │                  SystemHealth, MetricsDashboard, WhatIfSimulator, AuditLog
│   ├── pages/employee/ UserSelectGrid, SubmitTicket, TicketStatus
│   ├── layouts/       AgentLayout, EmployeeLayout
│   ├── services/      agent, tickets, config, metrics, audit
│   └── components/ui/ shadcn/ui primitives
├── tests/             pytest unit and integration tests
├── scripts/            seeding and operational scripts
└── data/              synthetic data CSV and cluster_map.json
```

## Quick Start

### 1) Backend
```bash
cd backend
pip install -r requirements.txt
PYTHONPATH=$(pwd) uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
```

### 2) Sandbox
```bash
cd sandbox
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

### 3) Frontend
```bash
cd frontend
npm install
npm run dev
```

## Required Environment Variables

Backend runtime:
- `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
- `QDRANT_URL`, `QDRANT_API_KEY`, `QDRANT_COLLECTION_NAME` (defaults to `resolved_tickets`)
- `JINA_API_KEY`
- `GROQ_API_KEY`, `GROQ_MODEL`
- `GOOGLE_GEMINI_API_KEY`, `GEMINI_MODEL`
- `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`
- `SANDBOX_URL` (defaults to `http://localhost:8001`)

## Documentation Index
- [API.md](API.md) — Full API reference
- [DATABASE.md](DATABASE.md) — Supabase + Qdrant schema
- [SIGNALS.md](SIGNALS.md) — Signal A/B/C definitions
- [PIPELINE_STAGES.md](PIPELINE_STAGES.md) — Pipeline stage details
- [IMPLEMENTATION_CONTEXT.md](IMPLEMENTATION_CONTEXT.md) — Technical implementation reference
- [SOLUTION.md](SOLUTION.md) — Authoritative design blueprint (do not modify)

## Notes
- Keep `SOLUTION.md` unchanged unless explicitly requested by project owners.
- Use `tests/` for automated validations; `scripts/` for operational/demo workflows.
