import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from services.supabase import get_supabase

logger = logging.getLogger(__name__)
router = APIRouter(tags=["config"])


@router.get("/api/config/thresholds")
async def get_all_thresholds():
    """Returns all category_thresholds rows."""
    supabase = get_supabase()
    try:
        res = supabase.table("category_thresholds").select("*").execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/config/thresholds/{category}")
async def get_threshold_for_category(category: str):
    """Returns thresholds for a specific category."""
    supabase = get_supabase()
    try:
        res = supabase.table("category_thresholds").select("*").eq("category", category).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail=f"No thresholds found for category '{category}'.")
        return res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/config/systems")
async def get_all_systems():
    """Returns all available systems."""
    supabase = get_supabase()
    try:
        res = supabase.table("systems").select("id, name").execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class SimulateRequest(BaseModel):
    description: str
    category: str = "General"
    severity: str = "P3"
    user_tier: str = "standard"
    system_name: Optional[str] = None
    change_freeze: bool = False
    active_incident: bool = False


@router.post("/api/simulate")
async def simulate_pipeline(params: SimulateRequest):
    """
    Dry-run the pipeline with custom parameters. No DB writes.
    Returns which layer intercepted and why.
    """
    from core.policy_gate import hard_policy_gate
    from models.ticket import TicketSubmission
    from models.user import User, System
    from models.confidence import GateAction
    from uuid import uuid4
    from datetime import datetime, timezone

    # Build mock models from request
    user_model = User(
        id=uuid4(),
        email="simulate@test.local",
        name="Simulated User",
        tier=params.user_tier,
        department="Test",
        created_at=datetime.now(timezone.utc),
    )

    system_model = None
    if params.system_name or params.change_freeze or params.active_incident:
        system_model = System(
            id=uuid4(),
            name=params.system_name or "Test System",
            category="Software",
            change_freeze=params.change_freeze,
            active_incident=params.active_incident,
            updated_at=datetime.now(timezone.utc),
        )

    ticket_model = TicketSubmission(
        description=params.description,
        category=params.category,
        severity=params.severity,
        user_email="simulate@test.local",
        system_name=params.system_name,
    )

    # --- Layer 0 check only (deterministic, no API calls) ---
    policy_res = hard_policy_gate(ticket_model, user_model, system_model)
    if policy_res.action != GateAction.PROCEED:
        return {
            "intercepted_at_layer": 0,
            "layer_name": "Hard Policy Gate",
            "gate_action": policy_res.action.value,
            "reason": policy_res.reason,
        }

    return {
        "intercepted_at_layer": None,
        "layer_name": None,
        "gate_action": "PROCEED",
        "reason": "All deterministic checks passed. Ticket would proceed to AI layers.",
        "note": "AI layers (Embedding, Novelty, Confidence, Sandbox) require live services and are not simulated in dry-run mode."
    }
