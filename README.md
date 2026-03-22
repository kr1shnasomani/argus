# <div align="center">Argus</div>

<div align="center">

Automatically resolves IT support tickets using confidence-based AI decision pipeline backed by vector search, LLM reasoning, and live sandbox validation.

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI%203.0-009688?style=for-the-badge&logo=fastapi&logoColor=white)](backend/)
[![React](https://img.shields.io/badge/Frontend-React%2018-61DAFB?style=for-the-badge&logo=react&logoColor=222)](frontend/)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](frontend/)
[![Python](https://img.shields.io/badge/Python-3.11%2B-3776AB?style=for-the-badge&logo=python&logoColor=white)](backend/)
[![Supabase](https://img.shields.io/badge/Database-Supabase-336791?style=for-the-badge&logo=supabase&logoColor=white)](DATABASE.md)
[![Qdrant](https://img.shields.io/badge/Vector%20DB-Qdrant-EA4AAA?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0iI0VBNEFBQSIgZD0iTTEyIDJDNi40OCAyIDIgNi40OCAyIDEyczQuNDggMTAgMTAgMTAgMTAtNC40OCAxMC0xMFMxNy41MiAyIDEyIDJ6Ii8+PC9zdmc+)](DATABASE.md)
[![GitHub Actions](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-2088FF?style=for-the-badge&logo=github-actions&logoColor=white)](#cicd-pipeline)
[![Tests](https://img.shields.io/badge/Tests-pytest-0A9EDC?style=for-the-badge&logo=pytest&logoColor=white)](tests/)

</div>

---

## Table of Contents

1. [What Argus Does](#what-argus-does)
2. [Production Deployment](#production-deployment)
3. [Local Development Setup](#local-development-setup)
4. [Architecture Overview](#architecture-overview)
5. [The 8-Stage Pipeline](#the-8-stage-pipeline)
6. [Environment Variables](#environment-variables)
7. [CI/CD Pipeline](#cicd-pipeline)
8. [Documentation Index](#documentation-index)

---

## What Argus Does

Argus runs a **multi-stage confidence pipeline** to automatically handle IT tickets:

```
Ticket Submitted → Policy Gate → Vector Search → Confidence Signals → Sandbox Test → Decision
                                                                      ↓
                                                    Auto-Resolve (✓) OR Escalate (→ Agent)
```

### For Employees
- Submit IT support tickets via the **Employee Portal**
- Track ticket status in real-time
- View resolution details or agent notes if escalated

### For IT Agents
- Review escalated tickets in the **Agent Portal** with full confidence evidence
- Approve or override auto-resolution decisions
- Submit verified resolutions back to the system
- Monitor system health and run what-if simulations
- View complete audit trails

### For IT Leadership
- Monitor real-time metrics and system performance
- Track confidence distribution across ticket categories
- Analyze escalation patterns and resolution trends

---

## Production Deployment

| Component | Platform | Status | URL |
|-----------|----------|--------|-----|
| **Frontend** | Vercel | ✅ Live | [argus-frontend.vercel.app](https://argus-4xv8a19a9-kr1shnasomani-preview.vercel.app) |
| **Backend API** | Render | ✅ Live | [https://argus-okop.onrender.com](https://argus-okop.onrender.com) |
| **Sandbox** | Render | ✅ Live | [https://argus-1-y489.onrender.com](https://argus-1-y489.onrender.com) |
| **Database** | Supabase | ✅ Live | PostgreSQL + Qdrant Vector DB |

**Last verified:** March 23, 2026  
**Frontend deployments:** 15+ successful deployments  
**Backend latest:** Commit `c4254f5` — all systems operational

---

## Local Development Setup

### Prerequisites
- **Python 3.11+** (for backend & sandbox)
- **Node.js 18+** (for frontend)
- **pip** and **npm** (package managers)

### 1) Backend (FastAPI on port 8000)

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # macOS/Linux
# or
venv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements.txt

# Set environment variables (see Environment Variables section)
export SUPABASE_URL="..."
export SUPABASE_SERVICE_KEY="..."
# ... set all required variables ...

# Start the backend server
PYTHONPATH=$(pwd) uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
```

**Expected output:**
```
Uvicorn running on http://0.0.0.0:8000
```

**Health check:**
```bash
curl http://localhost:8000/health
```

### 2) Sandbox (FastAPI on port 8001)

The sandbox runs in a separate terminal and provides isolated action execution for ticket resolution validation.

```bash
cd sandbox

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the sandbox server
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

**Expected output:**
```
Uvicorn running on http://0.0.0.0:8001
```

**Health check:**
```bash
curl http://localhost:8001/health
```

### 3) Frontend (React + Vite on port 5173)

```bash
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

**Expected output:**
```
  VITE v... ready in ... ms

  ➜  Local:   http://127.0.0.1:5173/
```

Visit http://localhost:5173 in your browser.

---

## Architecture Overview

Argus is a **3-tier distributed system**:

### Tier 1: Frontend (Vercel)
- **React SPA** built with Vite
- **Two portals:** Employee (submit/track tickets) and Agent (review/resolve escalations)
- **Landing page:** Static HTML, zero dependencies
- Uses **shadcn/ui** components with Tailwind CSS
- All API calls routed through `/services/` layer

### Tier 2: Backend (Render)
- **FastAPI** application orchestrating the decision pipeline
- Routes: tickets, agent actions, configuration, metrics, audit logs
- Connects to: Supabase (PostgreSQL), Qdrant (vector DB), LLM services, sandbox
- Implements all 8 pipeline stages (see [The 8-Stage Pipeline](#the-8-stage-pipeline))
- Default port: `8000`

### Tier 3: Sandbox (Render)
- **Isolated FastAPI** service for action validation
- Executes proposed ticket resolutions in a controlled environment
- Prevents malicious or invalid actions from reaching production systems
- Default port: `8001`

### Data Layer
- **Supabase PostgreSQL:** Ticket metadata, user accounts, resolution history, audit logs
- **Qdrant Vector DB:** Embedding-based retrieval of similar historical tickets and resolutions

### External Services (Free Tier)
- **Jina AI:** Text embeddings
- **Groq / Gemini / OpenRouter:** LLM reasoning
- **Google Vision API:** Image analysis (if needed)

---

## The 8-Stage Pipeline

Every ticket flows through this deterministic pipeline:

| Stage | Component | Input | Output | Decision |
|-------|-----------|-------|--------|----------|
| **1. Policy Gate** | `policy_gate.py` | Raw ticket | Pass/Fail | If severity < threshold → escalate immediately |
| **2. Category Detection** | `policy_gate.py` | Ticket text | Category tag | Classify ticket domain (e.g., "Hardware", "Software") |
| **3. Embedding** | `embedder.py` + Jina AI | Ticket text | Vector (384-dim) | Convert ticket to searchable embedding |
| **4. Retrieval** | `retriever.py` + Qdrant | Vector | Similar historical tickets | Find top-K resolved tickets with similar embeddings |
| **5. Novelty Check** | `novelty.py` | Similarity scores | Novelty score (0–1) | If too novel → escalate (insufficient precedent) |
| **6. Signal A** | `confidence.py` | Historical matches | Confidence A (0–1) | LLM-based confidence: "Does retrieval suggest a solution?" |
| **7. Signal B** | `confidence.py` | Historical matches | Confidence B (0–1) | Statistical confidence: "Are similar tickets resolved successfully?" |
| **8. Signal C** | `confidence.py` | Ticket attributes | Confidence C (0–1) | Category heuristic: "Does this category auto-resolve well?" |
| **Sandbox Execution** | `sandbox_client.py` | Proposed action | Execution result | Execute & validate resolution in isolated environment |
| **Final Decision** | `pipeline.py` | All signals + sandbox result | Auto-Resolve OR Escalate | If (Signal A ≥ 0.8 AND Signal B ≥ 0.8 AND Signal C ≥ 0.8) AND sandbox success → auto-resolve |

### Fail-Safe Principle
**If any component fails, times out, or is unavailable (Qdrant down, LLM timeout, sandbox unreachable), the system defaults to escalation.** Never auto-resolve when uncertain.

---

## Environment Variables

### Backend Required (Backend + Sandbox services need these)

```bash
# Supabase PostgreSQL
SUPABASE_URL=https://[project].supabase.co
SUPABASE_SERVICE_KEY=[service-role-key-with-full-access]

# Qdrant Vector Database
QDRANT_URL=https://[cluster]-qdrant.a1.quarkus-codegen.ts.net:6333
QDRANT_API_KEY=[api-key]
QDRANT_COLLECTION_NAME=resolved_tickets  # default

# Embeddings (Jina AI)
JINA_API_KEY=[jina-api-key]

# LLM Providers (pick at least one)
GROQ_API_KEY=[groq-api-key]
GROQ_MODEL=mixtral-8x7b-32768

GOOGLE_GEMINI_API_KEY=[gemini-api-key]
GEMINI_MODEL=gemini-pro

OPENROUTER_API_KEY=[openrouter-api-key]
OPENROUTER_MODEL=openrouter/auto

# Sandbox URL (where to send action execution requests)
SANDBOX_URL=https://argus-1-y489.onrender.com  # production
# or
SANDBOX_URL=http://localhost:8001  # local development

# Optional: Google Vision API (for image analysis)
GOOGLE_VISION_API_KEY=[vision-api-key]  # optional
```

### How to Get These

| Service | Instructions |
|---------|--------------|
| **Supabase** | Create project at [supabase.com](https://supabase.com), copy URL & service key from Settings → API |
| **Qdrant** | Create cluster at [qdrant.tech](https://qdrant.tech), copy cluster URL & API key |
| **Jina AI** | Sign up at [jina.ai](https://jina.ai), create API key in dashboard |
| **Groq** | Sign up at [console.groq.com](https://console.groq.com), create API key |
| **Google Gemini** | Get API key from [Google AI Studio](https://makersuite.google.com/app/apikey) |
| **OpenRouter** | Sign up at [openrouter.ai](https://openrouter.ai), create API key |

### Local Development Setup

Create a `.env` file in the `backend/` and `sandbox/` directories:

```bash
# backend/.env
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...
QDRANT_URL=...
QDRANT_API_KEY=...
QDRANT_COLLECTION_NAME=resolved_tickets
JINA_API_KEY=...
GROQ_API_KEY=...
GROQ_MODEL=mixtral-8x7b-32768
GOOGLE_GEMINI_API_KEY=...
GEMINI_MODEL=gemini-pro
OPENROUTER_API_KEY=...
OPENROUTER_MODEL=openrouter/auto
SANDBOX_URL=http://localhost:8001
```

**Note:** Never commit `.env` files to version control. Use `.env.example` as a template.

---

## CI/CD Pipeline

Argus uses **GitHub Actions** to ensure code quality and continuous deployment.

### Workflows

| Workflow | Trigger | Tasks |
|----------|---------|-------|
| **backend-ci.yml** | Push to any branch | Ruff linting, Pyright type checking, pytest + coverage |
| **frontend-ci.yml** | Push to any branch | ESLint, TypeScript type check, Vite build verification |
| **deploy.yml** | Push to `main` + tests pass | Auto-deploy backend to Render, sandbox to Render, frontend to Vercel |

### How They Work

1. **Every push** → Run linting & type checks for both backend and frontend
2. **Tests pass?** → Both CI workflows succeed
3. **Push to `main`?** → Deploy workflow triggers:
   - Backend deployed to Render (port 8000)
   - Sandbox deployed to Render (port 8001)
   - Frontend deployed to Vercel (auto-deploy already enabled)

### Secrets Required in GitHub

To enable auto-deployment, add these as repository secrets:

```
RENDER_DEPLOY_KEY_BACKEND=srv-d701m4n5r7bs73f3hjkg
RENDER_DEPLOY_KEY_SANDBOX=srv-d701pkchg0os73a37870
VERCEL_TOKEN=[vercel-token]
VERCEL_PROJECT_ID=[project-id]
```

See [GitHub Secrets Documentation](https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions).

---

## Project Structure

```
argus/
├── .github/workflows/          GitHub Actions CI/CD
│   ├── backend-ci.yml          Python linting, type check, tests
│   ├── frontend-ci.yml         Node.js linting, type check, build
│   └── deploy.yml              Auto-deploy to Render & Vercel
│
├── backend/                    FastAPI application (port 8000)
│   ├── api/
│   │   ├── routes/
│   │   │   ├── tickets.py      POST /tickets/submit, GET /tickets/{id}
│   │   │   ├── agent.py        GET/POST escalated queue, resolutions
│   │   │   ├── config.py       GET /config/systems, /config/categories
│   │   │   ├── metrics.py      GET /metrics/* (system & ticket stats)
│   │   │   └── audit.py        GET /audit/logs with filtering
│   │   └── main.py             FastAPI app initialization
│   │
│   ├── core/                   Decision pipeline (8-stage)
│   │   ├── pipeline.py         Main orchestrator
│   │   ├── policy_gate.py      Stages 1–2: Policy + Category detection
│   │   ├── embedder.py         Stage 3: Vector embedding
│   │   ├── retriever.py        Stage 4: Qdrant retrieval
│   │   ├── novelty.py          Stage 5: Novelty detection
│   │   ├── confidence.py       Stages 6–8: Signals A/B/C
│   │   ├── resolution_mapper.py Map decisions to actions
│   │   └── sandbox_client.py   Sandbox execution client
│   │
│   ├── services/               External service clients
│   │   ├── supabase.py         PostgreSQL queries
│   │   ├── qdrant.py           Vector DB operations
│   │   ├── jina.py             Embedding generation
│   │   ├── llm.py              LLM inference (Groq/Gemini/OpenRouter)
│   │   ├── vision.py           Image analysis (Google Vision)
│   │   └── storage.py          File storage (S3-compatible)
│   │
│   ├── models/                 Pydantic data models
│   │   ├── ticket.py           Ticket schema
│   │   ├── user.py             User schema
│   │   ├── resolution.py       Resolution schema
│   │   └── audit.py            Audit log schema
│   │
│   ├── utils/
│   │   ├── audit_hash.py       SHA-256 hash chaining for audit trail
│   │   ├── cluster_map.py      Category-to-cluster mapping
│   │   └── timestamps.py       ISO 8601 timestamp utilities
│   │
│   ├── requirements.txt        Python dependencies
│   ├── main.py                 Entry point (if separate from api/main.py)
│   └── .env.example            Environment template
│
├── sandbox/                    Action execution service (port 8001)
│   ├── main.py                 FastAPI app with /sandbox/execute endpoint
│   ├── actions.py              Ticket resolution actions
│   ├── environment.py          Action execution environment
│   ├── requirements.txt        Python dependencies
│   └── .env.example            Environment template
│
├── frontend/                   React Vite application
│   ├── src/
│   │   ├── pages/
│   │   │   ├── agent/
│   │   │   │   ├── EscalatedQueue.tsx      List of escalated tickets
│   │   │   │   ├── EvidenceCardView.tsx    Confidence signals visualization
│   │   │   │   ├── TicketHistory.tsx       Past resolutions
│   │   │   │   ├── SystemHealth.tsx        8 subsystems status
│   │   │   │   ├── MetricsDashboard.tsx    Charts & analytics
│   │   │   │   ├── WhatIfSimulator.tsx     Policy simulation
│   │   │   │   └── AuditLog.tsx            Immutable event log
│   │   │   │
│   │   │   ├── employee/
│   │   │   │   ├── UserSelectGrid.tsx      User/role picker
│   │   │   │   ├── SubmitTicket.tsx        Ticket form
│   │   │   │   └── TicketStatus.tsx        Status tracker
│   │   │   │
│   │   │   ├── landing/
│   │   │   │   └── LandingPage.tsx         Static homepage
│   │   │   │
│   │   │   └── 404.tsx                     Not found
│   │   │
│   │   ├── layouts/
│   │   │   ├── AgentLayout.tsx             Agent portal wrapper
│   │   │   └── EmployeeLayout.tsx          Employee portal wrapper
│   │   │
│   │   ├── components/
│   │   │   ├── landing/                    Homepage components
│   │   │   ├── motion/                     Framer Motion animations
│   │   │   └── ui/                         shadcn/ui primitives
│   │   │
│   │   ├── services/
│   │   │   ├── agent.ts                    Agent portal API client
│   │   │   ├── tickets.ts                  Ticket CRUD client
│   │   │   ├── config.ts                   Config fetch client
│   │   │   ├── metrics.ts                  Metrics API client
│   │   │   └── audit.ts                    Audit log client
│   │   │
│   │   ├── types/
│   │   │   └── index.ts                    TypeScript type definitions
│   │   │
│   │   ├── App.tsx                         Router & layout
│   │   ├── main.tsx                        Entry point
│   │   └── index.css                       Global styles + Argus design tokens
│   │
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── tailwind.config.js
│
├── tests/                      pytest unit & integration tests
│   ├── test_policy_gate.py     Policy gate tests
│   ├── test_pipeline.py        Full pipeline integration tests
│   ├── test_sandbox_client.py  Sandbox execution tests
│   └── conftest.py             Shared test fixtures
│
├── scripts/                    Operational & demo scripts
│   ├── seed_db.py              Populate database with demo data
│   └── run_simulation.py        What-if scenario runner
│
├── data/
│   ├── cluster_map.json        Category → vector cluster mapping
│   ├── demo_tickets.csv        Sample IT tickets
│   └── demo_resolutions.csv    Sample resolutions
│
├── README.md                   **You are here**
├── SOLUTION.md                 Authoritative design blueprint (read-only)
├── API.md                      Full API endpoint reference
├── DATABASE.md                 Supabase + Qdrant schema
├── PIPELINE_STAGES.md          Detailed stage documentation
├── SIGNALS.md                  Confidence signal definitions
├── IMPLEMENTATION_CONTEXT.md   Technical implementation details
├── AGENTS.md                   AI agent development instructions
│
└── .git/                       Version control

```

---

## Documentation Index

| Document | Purpose |
|----------|---------|
| **README.md** | You are here — project overview, setup, architecture, and CI/CD |
| **[SOLUTION.md](SOLUTION.md)** | **Authoritative design blueprint** (read-only). Product requirements, edge cases, decision rationale. Do not modify unless explicitly requested. |
| **[API.md](API.md)** | Complete API endpoint reference with request/response schemas |
| **[DATABASE.md](DATABASE.md)** | Supabase PostgreSQL schema + Qdrant vector DB configuration |
| **[PIPELINE_STAGES.md](PIPELINE_STAGES.md)** | Detailed documentation of all 8 pipeline stages with decision logic |
| **[SIGNALS.md](SIGNALS.md)** | Confidence signal definitions (A, B, C) and scoring logic |
| **[IMPLEMENTATION_CONTEXT.md](IMPLEMENTATION_CONTEXT.md)** | Technical implementation reference, module boundaries, design patterns |
| **[AGENTS.md](AGENTS.md)** | Development instructions for AI coding agents working on this repo |

---

## Quick Reference: Key Concepts

### Confidence Signals
- **Signal A:** LLM-based confidence (0–1) — "Does retrieval suggest a solution?"
- **Signal B:** Statistical confidence (0–1) — "Are similar tickets resolved successfully?"
- **Signal C:** Category heuristic (0–1) — "Does this category auto-resolve well?"
- **Decision Rule:** Auto-resolve if all three ≥ 0.8 **AND** sandbox test succeeds

### Escalation
A ticket is escalated to an IT agent if:
- Any confidence signal < 0.8
- Ticket is too novel (insufficient precedent)
- Sandbox execution fails or times out
- Policy gate rejects (e.g., severity too high)
- Any external service is unavailable (fail-safe default)

### Audit Trail
Every decision is hashed and chained to the previous entry using SHA-256. This creates an **immutable audit log** for compliance and debugging.

### Sandbox
An isolated FastAPI service (port 8001) that validates proposed ticket resolutions in a controlled environment before they reach production systems.

---

## Getting Help

- **Code questions?** See [IMPLEMENTATION_CONTEXT.md](IMPLEMENTATION_CONTEXT.md)
- **API questions?** See [API.md](API.md)
- **Database schema?** See [DATABASE.md](DATABASE.md)
- **Pipeline details?** See [PIPELINE_STAGES.md](PIPELINE_STAGES.md)
- **Design rationale?** See [SOLUTION.md](SOLUTION.md)
- **Development workflow?** See [AGENTS.md](AGENTS.md)

---

## License

Proprietary — All rights reserved.

---

**Last Updated:** March 23, 2026  
**Current Maintainer:** OpenCode AI  
**Status:** Production ✅
