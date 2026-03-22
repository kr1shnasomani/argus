import logging
import os
import json
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Route imports
from api.routes import tickets, agent, audit, metrics, config

# Service imports
import services.qdrant as qdrant_svc

logger = logging.getLogger(__name__)

# Shared app-level state (passed to routes via module-level dict)
app_state: dict = {}

CLUSTER_MAP_PATH = os.path.join(
    os.path.dirname(__file__), "../../data/cluster_map.json"
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application startup and shutdown lifecycle.
    """
    logger.info("Starting Argus API...")

    # 1. Load cluster map
    try:
        with open(CLUSTER_MAP_PATH, "r") as f:
            app_state["cluster_map"] = json.load(f)
        logger.info(f"Loaded cluster_map with {len(app_state['cluster_map'])} entries.")
    except FileNotFoundError:
        logger.warning("cluster_map.json not found. Using empty map.")
        app_state["cluster_map"] = {}

    # 2. Initialize Qdrant client and verify collection
    try:
        qdrant_client = qdrant_svc.get_qdrant_client()
        await qdrant_svc.init_collection()
        app_state["qdrant_client"] = qdrant_client
        logger.info("Qdrant client initialized and collection verified.")
    except Exception as e:
        logger.error(
            f"Qdrant startup check failed: {e}. Routes that require Qdrant will fail."
        )
        app_state["qdrant_client"] = None

    yield

    # Shutdown
    logger.info("Shutting down Argus API.")
    app_state.clear()


def create_app() -> FastAPI:
    app = FastAPI(
        title="Argus — Intelligent IT Ticket Resolution API",
        description="AI-powered, layered pipeline for auto-resolving IT support tickets.",
        version="1.0.0",
        lifespan=lifespan,
    )

    cors_origins = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://localhost:3000,https://argus-rose.vercel.app,https://*.vercel.app",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[o.strip() for o in cors_origins.split(",")],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Include all routers
    app.include_router(tickets.router)
    app.include_router(agent.router)
    app.include_router(audit.router)
    app.include_router(metrics.router)
    app.include_router(config.router)

    # Global exception handler
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger.error(f"Unhandled exception on {request.url}: {exc}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={
                "detail": "An internal error occurred. The ticket has been flagged for human review."
            },
        )

    @app.get("/health")
    async def health():
        return {
            "status": "ok",
            "qdrant_connected": app_state.get("qdrant_client") is not None,
            "cluster_map_loaded": len(app_state.get("cluster_map", {})) > 0,
        }

    return app


app = create_app()
