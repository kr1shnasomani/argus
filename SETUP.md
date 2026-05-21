# Argus — Setup Guide

This guide covers both the recommended Docker-based setup and the manual fallback for local development.

---

## Prerequisites

| Requirement | Docker Setup | Manual Setup |
|---|---|---|
| [Docker Desktop](https://docs.docker.com/get-docker/) | ✅ Required | ❌ Not needed |
| [Python 3.11+](https://www.python.org/downloads/) | ❌ Not needed | ✅ Required |
| [Node.js 18+](https://nodejs.org/) | ❌ Not needed | ✅ Required |
| [Git](https://git-scm.com/) | ✅ Required | ✅ Required |
| Supabase project | ✅ Required | ✅ Required |
| Qdrant Cloud cluster | ✅ Required | ✅ Required |

---

## 🐳 Quick Start with Docker (Recommended)

The published image on **GitHub Container Registry (GHCR)** bundles the frontend, backend, and sandbox into a single deployable container so you never have to build locally.

### 1. Clone the repository

```bash
git clone https://github.com/kr1shnasomani/argus.git
cd argus
```

### 2. Configure environment variables

```bash
cp .env.example .env
# Edit .env with your actual API keys (Supabase, Qdrant, Jina, Groq, Gemini, OpenRouter)
```

### 3. Run (two modes)

**Mode A — build locally** *(use this until the image is on GHCR, or after code changes)*
```bash
docker compose up --build
```

**Mode B — pull from GHCR** *(use this once the workflow has pushed the multi-arch image)*
```bash
docker compose pull
docker compose up
```

Docker Desktop will show **3 separate containers**:

| Container | URL |
|---|---|
| `argus-backend-1` | [http://localhost:8005/docs](http://localhost:8005/docs) |
| `argus-sandbox-1` | [http://localhost:8001/docs](http://localhost:8001/docs) |
| `argus-frontend-1` | [http://localhost:5173](http://localhost:5173) |

### 4. Individual service control

```bash
# Start only one service
docker compose up backend
docker compose up sandbox
docker compose up frontend

# Restart a single service
docker compose restart backend

# View logs for one service
docker compose logs -f backend

# Stop everything
docker compose down
```

Docker Desktop will pull `ghcr.io/kr1shnasomani/argus:latest` and start three services inside the container managed by **supervisord**:

| Service | URL |
|---|---|
| **Frontend UI** | [http://localhost:5173](http://localhost:5173) |
| **Backend API** | [http://localhost:8005/docs](http://localhost:8005/docs) |
| **Sandbox API** | [http://localhost:8001/docs](http://localhost:8001/docs) |

To stop: `docker compose down`

### 4. Pull image directly (without Compose)

```bash
docker pull ghcr.io/kr1shnasomani/argus:latest

docker run --rm \
  --env-file .env \
  -e SERVICE=all \
  -p 8005:8005 \
  -p 8001:8001 \
  -p 5173:5173 \
  ghcr.io/kr1shnasomani/argus:latest
```

### 5. Run individual services

You can target a specific tier by setting the `SERVICE` environment variable:

```bash
# Backend only
docker run --env-file .env -e SERVICE=backend -p 8005:8005 ghcr.io/kr1shnasomani/argus:latest

# Sandbox only
docker run --env-file .env -e SERVICE=sandbox -p 8001:8001 ghcr.io/kr1shnasomani/argus:latest

# Frontend only
docker run --env-file .env -e SERVICE=frontend -p 5173:5173 ghcr.io/kr1shnasomani/argus:latest
```

### 6. Build locally (if you've made code changes)

To build the image from source instead of pulling:

```bash
# In docker-compose.yml, comment out 'image:' and uncomment the 'build:' block, then:
docker compose up --build
```

---

## 🛠️ Manual Setup (Alternative Fallback)

Use this if you prefer running services directly on your host for debugging.

### 1. Database & Infrastructure

Ensure your `.env` (in the project root) contains valid credentials for:
- **Supabase** — PostgreSQL connection + service role key
- **Qdrant Cloud** — cluster URL + API key

Initialise the Supabase schema using `database/schema.sql`.

### 2. Sandbox (Port 8001)

```bash
cd sandbox
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

### 3. Backend (Port 8005)

```bash
cd backend
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
# Ensure SANDBOX_URL=http://localhost:8001 is set in your .env
uvicorn api.main:app --host 0.0.0.0 --port 8005 --reload
```

### 4. Frontend (Port 5173)

```bash
cd frontend
npm install
npm run dev
```

Access the UI at [http://localhost:5173](http://localhost:5173).

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `SUPABASE_URL` | ✅ | Your Supabase project URL |
| `SUPABASE_SERVICE_KEY` | ✅ | Service role key (bypasses RLS) |
| `QDRANT_URL` | ✅ | Qdrant Cloud cluster endpoint |
| `QDRANT_API_KEY` | ✅ | Qdrant API key |
| `QDRANT_COLLECTION_NAME` | ✅ | Vector collection (default: `resolved_tickets`) |
| `JINA_API_KEY` | ✅ | Jina AI embeddings key |
| `OPENROUTER_API_KEY` | ✅ | Primary LLM provider |
| `GROQ_API_KEY` | ⚠️ Fallback | Secondary LLM provider |
| `GOOGLE_GEMINI_API_KEY` | ⚠️ Fallback | Tertiary LLM provider |
| `SANDBOX_URL` | ✅ | `http://localhost:8001` (local) or Render URL (production) |
| `DEFAULT_THRESHOLD_A` | Optional | Semantic similarity threshold (default: `0.85`) |
| `DEFAULT_THRESHOLD_B` | Optional | Resolution consistency threshold (default: `0.60`) |
| `DEFAULT_THRESHOLD_C` | Optional | Category accuracy threshold (default: `0.70`) |
