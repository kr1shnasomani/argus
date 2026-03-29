# Argus Setup Guide

This guide provides instructions for setting up the Argus Intelligent IT Ticket Resolution system locally.

## Prerequisites

Before you begin, ensure you have the following installed:

*   **For Docker Setup (Recommended):** [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/)
*   **For Manual Setup (Alternative):** [Python 3.11+](https://www.python.org/downloads/) and [Node.js 20+](https://nodejs.org/)
*   [Git](https://git-scm.com/)
*   A Supabase project (for PostgreSQL)
*   A Qdrant Cloud cluster (or equivalent vector database)

---

## 🐳 Quick Start (Recommended using Docker)

The easiest way to get Argus running for local development is using Docker Compose. We have configured it to support **live-reloading** (hot module replacement) out of the box, meaning any changes you make to the code locally will automatically reflect inside the containers!

1.  **Clone the repository:**
    ```bash
    git clone <repository_url>
    cd argus
    ```

2.  **Environment Variables:**
    Copy the example environment file and update it with your actual keys (like OpenAI API key, Jina API key, Supabase keys, and Qdrant URL/API key).
    ```bash
    cp .env.example .env
    ```

3.  **Start the application:**
    ```bash
    docker-compose up --build
    ```

4.  **Access the application:**
    *   **Frontend UI:** [http://localhost:5173](http://localhost:5173) (Vite Dev Server)
    *   **Backend API (Swagger UI):** [http://localhost:8000/docs](http://localhost:8000/docs)
    *   **Sandbox API (Swagger UI):** [http://localhost:8001/docs](http://localhost:8001/docs)

    *To stop the application, run `docker-compose down`. If you ever add new dependencies to `requirements.txt` or `package.json`, you should rebuild using `docker-compose up --build`.*

---

## 🛠️ Manual Setup (Alternative Fallback)

If Docker isn't working for you, or if you prefer running services directly on your host machine to use specific local debugging tools, follow these steps.

### 1. Database & Infrastructure Setup

Since Argus relies on Supabase and Qdrant Cloud, ensure your `.env` file (placed in the root directory) contains the correct connection URLs and API keys for both services. Additionally, initialize your Supabase PostgreSQL database using the `database/schema.sql` file.

### 2. Sandbox Setup

The Sandbox is an isolated mock environment for AI agent action testing.

1.  Navigate to the sandbox directory:
    ```bash
    cd sandbox
    ```
2.  Create and activate a virtual environment:
    ```bash
    python3.11 -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate
    ```
3.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
4.  Run the Sandbox API:
    ```bash
    uvicorn main:app --host 0.0.0.0 --port 8001 --reload
    ```

### 3. Backend Setup

The main FastAPI application.

1.  Open a new terminal and navigate to the backend directory:
    ```bash
    cd backend
    ```
2.  Create and activate a virtual environment:
    ```bash
    python3.11 -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate
    ```
3.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
4.  Configure Environment Variables:
    Ensure your `.env` file (either in `backend` or the root directory) has `SANDBOX_URL=http://localhost:8001`, as well as your Qdrant and Supabase credentials.
5.  Run the Backend API:
    ```bash
    uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
    ```

### 4. Frontend Setup

The React/Vite user interface.

1.  Open a new terminal and navigate to the frontend directory:
    ```bash
    cd frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Run the Frontend Development Server:
    ```bash
    npm run dev
    ```
4.  Access the UI at the URL provided in the terminal (usually `http://localhost:5173`).
