import logging
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Literal, cast

from services.supabase import get_supabase

logger = logging.getLogger(__name__)
router = APIRouter(tags=["config"])

SYSTEM_DEFINITIONS = [
    {
        "id": "supabase",
        "name": "Supabase",
        "type": "Database",
        "method": "GET",
        "endpoint": "PostgreSQL — SELECT 1",
    },
    {
        "id": "qdrant",
        "name": "Qdrant",
        "type": "Vector DB",
        "method": "GET",
        "endpoint": "api.qdrant.tech/collections",
    },
    {
        "id": "sandbox",
        "name": "Sandbox",
        "type": "Sandbox",
        "method": "GET",
        "endpoint": "localhost:8001/health",
    },
    {
        "id": "jina",
        "name": "Jina AI",
        "type": "Embeddings",
        "method": "POST",
        "endpoint": "api.jina.ai/v1/embeddings",
    },
    {
        "id": "groq",
        "name": "Groq",
        "type": "LLM",
        "method": "POST",
        "endpoint": "api.groq.com/v1/chat/completions",
    },
    {
        "id": "gemini",
        "name": "Gemini",
        "type": "LLM",
        "method": "POST",
        "endpoint": "generativelanguage.googleapis.com",
    },
    {
        "id": "openrouter",
        "name": "OpenRouter",
        "type": "LLM + Vision",
        "method": "POST",
        "endpoint": "openrouter.ai/api/v1/chat/completions",
    },
    {
        "id": "pipeline",
        "name": "Pipeline",
        "type": "Backend API",
        "method": "GET",
        "endpoint": "localhost:8000/api/config/health",
    },
]


async def _check_supabase() -> dict:
    import time

    start = time.monotonic()
    try:
        supabase = get_supabase()
        supabase.table("users").select("id").limit(1).execute()
        latency_ms = round((time.monotonic() - start) * 1000)
        return {"status": "operational", "latency_ms": latency_ms}
    except Exception as e:
        latency_ms = round((time.monotonic() - start) * 1000)
        return {"status": "down", "error": str(e), "latency_ms": latency_ms}


async def _check_qdrant() -> dict:
    import time
    from services.qdrant import QDRANT_URL, QDRANT_API_KEY

    start = time.monotonic()
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            headers = {"api-key": QDRANT_API_KEY} if QDRANT_API_KEY else {}
            r = await client.get(f"{QDRANT_URL}/collections", headers=headers)
            latency_ms = round((time.monotonic() - start) * 1000)
            if r.status_code == 200:
                return {"status": "operational", "latency_ms": latency_ms}
            return {
                "status": "degraded",
                "error": f"HTTP {r.status_code}",
                "latency_ms": latency_ms,
            }
    except Exception as e:
        latency_ms = round((time.monotonic() - start) * 1000)
        return {"status": "down", "error": str(e), "latency_ms": latency_ms}


async def _check_sandbox() -> dict:
    import os
    import time

    url = os.getenv("SANDBOX_URL", "http://localhost:8001")
    start = time.monotonic()
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            r = await client.get(f"{url}/health")
            latency_ms = round((time.monotonic() - start) * 1000)
            if r.status_code == 200:
                return {"status": "operational", "latency_ms": latency_ms}
            return {
                "status": "degraded",
                "error": f"HTTP {r.status_code}",
                "latency_ms": latency_ms,
            }
    except Exception as e:
        latency_ms = round((time.monotonic() - start) * 1000)
        return {"status": "down", "error": str(e), "latency_ms": latency_ms}


async def _check_jina() -> dict:
    import os
    import time

    api_key = os.getenv("JINA_API_KEY", "")
    start = time.monotonic()
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            headers = {"Authorization": f"Bearer {api_key}"} if api_key else {}
            r = await client.post(
                "https://api.jina.ai/v1/embeddings",
                json={"input": "ping", "model": "jina-embeddings-v3"},
                headers=headers,
            )
            latency_ms = round((time.monotonic() - start) * 1000)
            if r.status_code == 200:
                return {"status": "operational", "latency_ms": latency_ms}
            return {
                "status": "degraded",
                "error": f"HTTP {r.status_code}",
                "latency_ms": latency_ms,
            }
    except Exception as e:
        latency_ms = round((time.monotonic() - start) * 1000)
        return {"status": "down", "error": str(e), "latency_ms": latency_ms}


async def _check_groq() -> dict:
    import os
    import time

    api_key = os.getenv("GROQ_API_KEY", "")
    start = time.monotonic()
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": os.getenv("GROQ_MODEL", "qwen/qwen3-32b"),
                    "messages": [{"role": "user", "content": "ping"}],
                    "max_tokens": 1,
                },
            )
            latency_ms = round((time.monotonic() - start) * 1000)
            if r.status_code == 200:
                return {"status": "operational", "latency_ms": latency_ms}
            return {
                "status": "degraded",
                "error": f"HTTP {r.status_code}",
                "latency_ms": latency_ms,
            }
    except Exception as e:
        latency_ms = round((time.monotonic() - start) * 1000)
        return {"status": "down", "error": str(e), "latency_ms": latency_ms}


async def _check_gemini() -> dict:
    import os
    import time

    api_key = os.getenv("GOOGLE_GEMINI_API_KEY", "")
    model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash-lite")
    start = time.monotonic()
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}",
                headers={"Content-Type": "application/json"},
                json={"contents": [{"parts": [{"text": "ping"}]}]},
            )
            latency_ms = round((time.monotonic() - start) * 1000)
            if r.status_code == 200:
                return {"status": "operational", "latency_ms": latency_ms}
            return {
                "status": "degraded",
                "error": f"HTTP {r.status_code}",
                "latency_ms": latency_ms,
            }
    except Exception as e:
        latency_ms = round((time.monotonic() - start) * 1000)
        return {"status": "down", "error": str(e), "latency_ms": latency_ms}


async def _check_openrouter() -> dict:
    import os
    import time

    api_key = os.getenv("OPENROUTER_API_KEY", "")
    start = time.monotonic()
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            headers = {
                "Authorization": f"Bearer {api_key}",
                "HTTP-Referer": "http://localhost:8000",
            }
            r = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers=headers,
                json={
                    "model": os.getenv(
                        "OPENROUTER_MODEL", "google/gemma-3-12b-it:free"
                    ),
                    "messages": [{"role": "user", "content": "ping"}],
                    "max_tokens": 1,
                },
            )
            latency_ms = round((time.monotonic() - start) * 1000)
            if r.status_code == 200:
                return {"status": "operational", "latency_ms": latency_ms}
            return {
                "status": "degraded",
                "error": f"HTTP {r.status_code}",
                "latency_ms": latency_ms,
            }
    except Exception as e:
        latency_ms = round((time.monotonic() - start) * 1000)
        return {"status": "down", "error": str(e), "latency_ms": latency_ms}


async def _check_pipeline() -> dict:
    return {"status": "operational", "latency_ms": 0}


@router.get("/api/config/health")
async def get_system_health(services: Optional[str] = None):
    """
    Returns health status for all 8 Argus subsystems.

    Query params:
      ?services=supabase,qdrant,sandbox,jina,groq,gemini,openrouter,pipeline
      - Comma-separated list of service IDs to check.
      - Only these services are checked; others return status "disabled".
      - If omitted, all services are checked.
    """
    import asyncio

    ALL_CHECKS = {
        "supabase": _check_supabase,
        "qdrant": _check_qdrant,
        "sandbox": _check_sandbox,
        "jina": _check_jina,
        "groq": _check_groq,
        "gemini": _check_gemini,
        "openrouter": _check_openrouter,
        "pipeline": _check_pipeline,
    }

    if services:
        requested = [s.strip() for s in services.split(",") if s.strip()]
    else:
        requested = list(ALL_CHECKS.keys())

    enabled_ids = set(requested)
    pending = {sid: ALL_CHECKS[sid] for sid in ALL_CHECKS if sid in enabled_ids}
    results_list = await asyncio.gather(
        *[fn() for fn in pending.values()], return_exceptions=True
    )

    systems = []
    all_operational = True

    for sys_def in SYSTEM_DEFINITIONS:
        sid = sys_def["id"]
        if sid not in enabled_ids:
            systems.append(
                {**sys_def, "status": "disabled", "latency_ms": None, "error": None}
            )
            continue

        idx = list(pending.keys()).index(sid)
        raw_result = results_list[idx]
        if isinstance(raw_result, Exception):
            status = "down"
            all_operational = False
            latency_ms: Optional[int] = None
            error: Optional[str] = str(raw_result)
        else:
            result = cast(dict, raw_result)
            status = result.get("status", "down")  # type: ignore[union-attr]
            latency_ms = result.get("latency_ms")  # type: ignore[union-attr]
            error = result.get("error")  # type: ignore[union-attr]
            if status != "operational":
                all_operational = False

        systems.append(
            {**sys_def, "status": status, "latency_ms": latency_ms, "error": error}
        )

    return {"all_operational": all_operational, "systems": systems}


class SimulateRequest(BaseModel):
    description: str
    user_tier: Literal["standard", "vip", "contractor"] = "standard"
    severity: Literal["P1", "P2", "P3", "P4"] = "P3"
    system_id: str
    active_incident_override: bool = False
    change_freeze_override: bool = False


@router.post("/api/simulate")
async def simulate_pipeline(params: SimulateRequest):
    """
    Dry-run the full pipeline with custom parameters. No DB writes.
    Returns full trace with step-level outputs.
    """
    from api.main import app_state
    from core.embedder import embed_ticket
    from core.retriever import retrieve_similar
    from core.novelty import check_novelty
    from core.confidence import compute_confidence
    from models.ticket import TicketSubmission
    from models.user import User, System
    from models.confidence import GateAction, ConfidenceDecision, SignalStatus
    from services.llm import generate_text
    from core.resolution_mapper import map_resolution_to_action
    from uuid import uuid4
    from datetime import datetime, timezone
    import services.qdrant as qdrant_svc

    def _step(
        index: int,
        name: str,
        status: str,
        value=None,
        threshold=None,
        details: Optional[str] = None,
    ):
        return {
            "index": index,
            "name": name,
            "status": status,
            "value": value,
            "threshold": threshold,
            "details": details,
        }

    def _candidate_fixes(results: list):
        fixes = []
        for r in results[:3]:
            payload = getattr(r, "payload", {}) or {}
            point_id = getattr(r, "id", None)
            ticket_ref = payload.get("ticket_id")
            if not ticket_ref:
                if isinstance(point_id, int):
                    ticket_ref = f"INC-{point_id:05d}"
                elif isinstance(point_id, str) and point_id.isdigit():
                    ticket_ref = f"INC-{int(point_id):05d}"
                else:
                    ticket_ref = str(point_id) if point_id is not None else "N/A"

            fixes.append(
                {
                    "ticket_id": ticket_ref,
                    "resolution": payload.get("resolution", ""),
                    "similarity_score": float(getattr(r, "score", 0.0)),
                }
            )
        return fixes

    async def _detect_category(description: str):
        try:
            supabase = get_supabase()
            valid_res = (
                supabase.table("category_thresholds").select("category").execute()
            )
            categories = (
                [row["category"] for row in valid_res.data] if valid_res.data else []
            )
            if not categories:
                categories = [
                    "Auth/SSO",
                    "SAP Issues",
                    "Email Access",
                    "VPN Problems",
                    "Printer Issues",
                    "Software Install",
                    "Network/Connectivity",
                    "Permissions/Access",
                ]

            sys_prompt = (
                "You are an IT helpdesk classifier. Classify the ticket description into exactly one category from: "
                + ", ".join(categories)
                + ". Return only the category name."
            )
            raw = await generate_text(f"Ticket Description: {description}", sys_prompt)
            clean = raw.strip().strip("\"'\n ")
            for c in categories:
                if c.lower() in clean.lower():
                    return c
            if clean in categories:
                return clean
            return categories[0]
        except Exception:
            return "Auth/SSO"

    supabase = get_supabase()
    steps = []

    # Step 1: Intake & Categorization
    category = await _detect_category(params.description)
    steps.append(
        _step(
            1,
            "Intake & Categorization",
            "PASS",
            value=category,
            details=f"Parsed category: {category}",
        )
    )

    # Build simulated user/system models
    user_model = User(
        id=uuid4(),
        email="simulate@test.local",
        name="Simulated User",
        tier=params.user_tier,
        department="Test",
        created_at=datetime.now(timezone.utc),
    )

    system_row = supabase.get_system_by_id(params.system_id)
    if not system_row:
        raise HTTPException(status_code=404, detail="System not found for simulation.")

    system_model = System(
        id=system_row["id"],
        name=system_row["name"],
        category=system_row["category"],
        change_freeze=bool(
            params.change_freeze_override or system_row.get("change_freeze", False)
        ),
        active_incident=bool(
            params.active_incident_override or system_row.get("active_incident", False)
        ),
        updated_at=datetime.now(timezone.utc),
    )

    ticket_model = TicketSubmission(
        description=params.description,
        category=category,
        severity=params.severity,
        user_email="simulate@test.local",
        system_name=system_model.name,
    )

    # Step 2: Policy Gate
    from core.policy_gate import hard_policy_gate

    policy_res = hard_policy_gate(ticket_model, user_model, system_model)
    if policy_res.action != GateAction.PROCEED:
        steps.append(
            _step(
                2,
                "Policy Gate",
                "FAIL",
                value=policy_res.action.value,
                details=policy_res.reason,
            )
        )
        for idx, name in [
            (3, "Vector DB Novelty Check"),
            (4, "Signal A"),
            (5, "Signal B"),
            (6, "Signal C"),
            (7, "Sandbox Execution"),
        ]:
            steps.append(
                _step(
                    idx,
                    name,
                    "SKIPPED",
                    details="Skipped due to policy gate escalation",
                )
            )
        steps.append(
            _step(
                8,
                "Decision",
                "FAIL",
                value="HUMAN ESCALATION REQUIRED",
                details=policy_res.reason,
            )
        )
        return {
            "layer_intercepted": 2,
            "reason": policy_res.reason,
            "steps": steps,
            "candidate_fixes": [],
            "decision": {
                "outcome": "HUMAN ESCALATION REQUIRED",
                "reason": policy_res.reason,
            },
        }
    steps.append(_step(2, "Policy Gate", "PASS", details="Passed policy constraints"))

    # Step 3: Vector DB Novelty Check
    try:
        vector = await embed_ticket(params.description)
        qdrant_results = await retrieve_similar(vector, top_k=5)
        novelty_threshold = 0.50
        novelty_res = check_novelty(qdrant_results, threshold=novelty_threshold)
        max_similarity = (
            float(getattr(qdrant_results[0], "score", 0.0)) if qdrant_results else 0.0
        )
        novelty_pass = novelty_res.action == GateAction.PROCEED
        steps.append(
            _step(
                3,
                "Vector DB Novelty Check",
                "PASS" if novelty_pass else "FAIL",
                value=max_similarity,
                threshold=novelty_threshold,
                details=novelty_res.reason,
            )
        )
        candidate_fixes = _candidate_fixes(qdrant_results)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simulation retrieval failed: {e}")

    if novelty_res.action != GateAction.PROCEED:
        for idx, name in [
            (4, "Signal A"),
            (5, "Signal B"),
            (6, "Signal C"),
            (7, "Sandbox Execution"),
        ]:
            steps.append(
                _step(idx, name, "SKIPPED", details="Skipped due to novelty failure")
            )
        steps.append(
            _step(
                8,
                "Decision",
                "FAIL",
                value="HUMAN ESCALATION REQUIRED",
                details=novelty_res.reason,
            )
        )
        return {
            "layer_intercepted": 3,
            "reason": novelty_res.reason,
            "steps": steps,
            "candidate_fixes": candidate_fixes,
            "decision": {
                "outcome": "HUMAN ESCALATION REQUIRED",
                "reason": novelty_res.reason,
            },
        }

    # Step 4/5/6: Confidence signals
    conf_report = compute_confidence(
        qdrant_results, category, supabase, app_state.get("cluster_map", {})
    )
    sig_a = conf_report.signals.get("A")
    sig_b = conf_report.signals.get("B")
    sig_c = conf_report.signals.get("C")

    steps.append(
        _step(
            4,
            "Signal A",
            "PASS" if sig_a and sig_a.result == SignalStatus.PASS else "FAIL",
            value=sig_a.score if sig_a else None,
            threshold=sig_a.threshold if sig_a else None,
            details=sig_a.name if sig_a else None,
        )
    )
    steps.append(
        _step(
            5,
            "Signal B",
            "PASS" if sig_b and sig_b.result == SignalStatus.PASS else "FAIL",
            value=sig_b.score if sig_b else None,
            threshold=sig_b.threshold if sig_b else None,
            details=sig_b.name if sig_b else None,
        )
    )
    steps.append(
        _step(
            6,
            "Signal C",
            "PASS" if sig_c and sig_c.result == SignalStatus.PASS else "FAIL",
            value=sig_c.score if sig_c else None,
            threshold=sig_c.threshold if sig_c else None,
            details=sig_c.name if sig_c else None,
        )
    )

    if conf_report.decision == ConfidenceDecision.ESCALATE:
        intercept = 4
        if sig_a and sig_a.result == SignalStatus.FAIL:
            intercept = 4
        elif sig_b and sig_b.result == SignalStatus.FAIL:
            intercept = 5
        elif sig_c and sig_c.result == SignalStatus.FAIL:
            intercept = 6
        steps.append(
            _step(
                7,
                "Sandbox Execution",
                "SKIPPED",
                details="Skipped due to confidence veto",
            )
        )
        steps.append(
            _step(
                8,
                "Decision",
                "FAIL",
                value="HUMAN ESCALATION REQUIRED",
                details=conf_report.reason,
            )
        )
        return {
            "layer_intercepted": intercept,
            "reason": conf_report.reason,
            "steps": steps,
            "candidate_fixes": candidate_fixes,
            "signals": {
                "A": sig_a.score if sig_a else None,
                "B": sig_b.score if sig_b else None,
                "C": sig_c.score if sig_c else None,
            },
            "decision": {
                "outcome": "HUMAN ESCALATION REQUIRED",
                "reason": conf_report.reason,
            },
        }

    # Step 7: Sandbox Execution — simulation mode always succeeds (dry run, no real sandbox call)
    sandbox_passed = True
    sandbox_details = [
        "Simulation mode: sandbox execution skipped — always passes in dry run"
    ]

    steps.append(
        _step(
            7,
            "Sandbox Execution",
            "PASS",
            value=True,
            details=" | ".join(sandbox_details)
            if sandbox_details
            else (
                "Sandbox passed"
                if sandbox_passed
                else sandbox_res.get("error", "Sandbox failed")
            ),
        )
    )

    # Step 8: Decision
    if not sandbox_passed:
        steps.append(
            _step(
                8,
                "Decision",
                "FAIL",
                value="HUMAN ESCALATION REQUIRED",
                details=f"Sandbox validation failed: {sandbox_res.get('error', 'Action could not be executed')}",
            )
        )
        return {
            "layer_intercepted": 7,
            "reason": f"Sandbox validation failed: {sandbox_res.get('error', 'Action could not be executed')}",
            "steps": steps,
            "candidate_fixes": candidate_fixes,
            "signals": {
                "A": sig_a.score if sig_a else None,
                "B": sig_b.score if sig_b else None,
                "C": sig_c.score if sig_c else None,
            },
            "decision": {
                "outcome": "HUMAN ESCALATION REQUIRED",
                "reason": f"Sandbox validation failed: {sandbox_res.get('error', 'Action could not be executed')}",
            },
        }

    decision_reason = "All checks passed including sandbox validation."
    steps.append(
        _step(8, "Decision", "PASS", value="AUTO RESOLVED", details=decision_reason)
    )

    return {
        "layer_intercepted": None,
        "reason": decision_reason,
        "steps": steps,
        "candidate_fixes": candidate_fixes,
        "signals": {
            "A": sig_a.score if sig_a else None,
            "B": sig_b.score if sig_b else None,
            "C": sig_c.score if sig_c else None,
        },
        "decision": {
            "outcome": "AUTO RESOLVED",
            "reason": decision_reason,
        },
    }
