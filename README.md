# Argus

[![Backend](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi&logoColor=white)](backend/)
[![Frontend](https://img.shields.io/badge/Frontend-React-61DAFB?logo=react&logoColor=222)](frontend/)
[![Database](https://img.shields.io/badge/Database-Supabase-3ECF8E?logo=supabase&logoColor=white)](DATABASE.md)
[![Vector%20DB](https://img.shields.io/badge/Vector%20DB-Qdrant-EA4AAA)](DATABASE.md)
[![Docs](https://img.shields.io/badge/Docs-API%20%26%20Context-4F46E5)](API.md)

Argus is an intelligent IT ticket handling platform with confidence-based human-in-the-loop escalation.

The project source-of-truth design document is [SOLUTION.md](SOLUTION.md). This README is intentionally concise and operational.

## What Argus Does
- Accepts tickets from employees.
- Runs a multi-stage decision pipeline.
- Auto-resolves only when policy + confidence + sandbox checks pass.
- Escalates uncertain or unsafe tickets to agents with evidence.
- Learns from agent-verified fixes.

## Repositories and Main Folders
```text
argus/
├── backend/      FastAPI application and pipeline logic
├── frontend/     React portals (employee + agent)
├── sandbox/      Canary execution service
├── scripts/      Seeding and operational scripts
├── tests/        Automated tests
├── database/     SQL schema and DB setup
├── context/      Signal/stage/implementation context docs
├── API.md        Full API reference
├── DATABASE.md   Supabase + Qdrant reference
└── SOLUTION.md   Authoritative solution blueprint (do not modify)
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

Set these for backend runtime:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `QDRANT_URL`
- `QDRANT_API_KEY`
- `QDRANT_COLLECTION_NAME` (optional; defaults to `resolved_tickets`)
- `JINA_API_KEY`
- `OPENROUTER_API_KEY` (and/or Groq/Gemini keys per fallback chain)

## Documentation Index
- API reference: [API.md](API.md)
- Data stores and schema: [DATABASE.md](DATABASE.md)
- Signal details: [context/SIGNALS.md](context/SIGNALS.md)
- Pipeline stage details: [context/PIPELINE_STAGES.md](context/PIPELINE_STAGES.md)
- Implementation context: [context/IMPLEMENTATION_CONTEXT.md](context/IMPLEMENTATION_CONTEXT.md)
- Full solution blueprint: [SOLUTION.md](SOLUTION.md)

## Notes
- Keep `SOLUTION.md` unchanged unless explicitly requested by project owners.
- Use `tests/` for automated validations; `scripts/` for operational/demo workflows.
