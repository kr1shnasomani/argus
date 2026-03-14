import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from services.supabase import get_supabase
from services.jina import generate_embedding
from services.llm import generate_resolution_message
from utils.audit_hash import log_to_audit

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/tickets", tags=["agent"])


@router.get("/agent/escalated")
async def get_escalated_tickets():
    """
    Returns all escalated tickets, joined with evidence cards from audit_log,
    sorted by severity then creation time.
    """
    supabase = get_supabase()
    try:
        tickets_res = supabase.table("tickets").select("*").in_("status", ["escalated"]).order("created_at", desc=False).execute()
        tickets = tickets_res.data

        if not tickets:
            return []

        # Severity priority mapping
        severity_order = {"P1": 0, "P2": 1, "P3": 2, "P4": 3}

        # For each ticket, fetch the latest evidence card from audit_log
        enriched = []
        for t in tickets:
            audit_res = supabase.table("audit_log") \
                .select("evidence_card, audit_hash, latency_ms, created_at") \
                .eq("ticket_id", t["id"]) \
                .order("created_at", desc=True) \
                .limit(1) \
                .execute()

            evidence_card = audit_res.data[0]["evidence_card"] if audit_res.data else None
            latency_ms = audit_res.data[0]["latency_ms"] if audit_res.data else None

            enriched.append({
                **t,
                "ticket_id": t["id"],
                "evidence_card": evidence_card,
                "decision_latency_ms": latency_ms,
            })

        # Sort by severity then created_at
        enriched.sort(key=lambda x: (severity_order.get(x.get("severity", "P4"), 9), x.get("created_at", "")))

        return enriched

    except Exception as e:
        logger.error(f"Failed to get escalated tickets: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{ticket_id}/evidence")
async def get_ticket_evidence(ticket_id: str):
    """
    Returns the full evidence card for a single ticket by its UUID.
    Used by EvidenceCardView to load a specific ticket without fetching the whole queue.
    """
    supabase = get_supabase()
    try:
        ticket_res = supabase.table("tickets").select("*").eq("id", ticket_id).execute()
        if not ticket_res.data:
            raise HTTPException(status_code=404, detail="Ticket not found.")
        t = ticket_res.data[0]

        # Try to get the latest audit/evidence entry
        audit_res = supabase.table("audit_log") \
            .select("evidence_card, audit_hash, latency_ms, created_at") \
            .eq("ticket_id", ticket_id) \
            .order("created_at", desc=True) \
            .limit(1) \
            .execute()

        evidence_card = audit_res.data[0]["evidence_card"] if audit_res.data else None
        latency_ms = audit_res.data[0]["latency_ms"] if audit_res.data else None

        return {
            **t,
            "ticket_id": t["id"],
            "evidence_card": evidence_card,
            "decision_latency_ms": latency_ms,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch evidence card for {ticket_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class AgentResolution(BaseModel):
    resolution_text: str
    resolution_type: str  # "verified", "workaround", or "uncertain"
    override_reason: Optional[str] = None


@router.post("/{ticket_id}/resolve")
async def resolve_ticket(ticket_id: str, resolution: AgentResolution):
    """
    Agent submits a resolution for an escalated ticket.
    If verified: embeds resolution into Qdrant, inserts outcome, updates ticket status.
    """
    from api.main import app_state

    supabase = get_supabase()
    qdrant_client = app_state["qdrant_client"]

    try:
        # Fetch original ticket
        ticket_res = supabase.table("tickets").select("*").eq("id", ticket_id).execute()
        if not ticket_res.data:
            raise HTTPException(status_code=404, detail="Ticket not found.")
        ticket = ticket_res.data[0]

        # Refine message via LLM 
        try:
            resolution_msg = await generate_resolution_message(
                resolution.resolution_text,
                ticket.get("description", "")
            )
        except Exception:
            resolution_msg = resolution.resolution_text  # fallback

        # Insert ticket outcome
        supabase.table("ticket_outcomes").insert({
            "ticket_id": ticket_id,
            "category": ticket.get("category"),
            "auto_resolved": False,
            "sandbox_passed": None,
            "resolution": resolution.resolution_text,
            "agent_verified": resolution.resolution_type == "verified",
            "override_reason": resolution.override_reason,
            "escalation_reason": None,
        }).execute()

        # If verified, embed and upsert into Qdrant for future auto-resolution
        if resolution.resolution_type == "verified":
            try:
                import services.qdrant as qdrant_svc
                vector = await generate_embedding(ticket.get("description", ""))
                await qdrant_svc.upsert_ticket(
                    ticket_id=ticket_id,
                    vector=vector,
                    payload={
                        "category": ticket.get("category"),
                        "description": ticket.get("description"),
                        "resolution": resolution.resolution_text,
                        "resolution_cluster": "agent_verified",
                        "severity": ticket.get("severity"),
                        "auto_resolved": False,
                        "verified": True,
                    }
                )
            except Exception as e:
                logger.warning(f"Qdrant upsert failed for verified resolution: {e}")

        # Log to audit
        evidence = {"resolution": resolution.resolution_text, "type": resolution.resolution_type, "override_reason": resolution.override_reason}
        log_to_audit(ticket_id, "AGENT_RESOLVED", evidence, supabase)

        # Update ticket status
        from datetime import datetime, timezone
        supabase.table("tickets").update({
            "status": "resolved",
            "resolved_at": datetime.now(timezone.utc).isoformat()
        }).eq("id", ticket_id).execute()

        return {
            "ticket_id": ticket_id,
            "status": "resolved",
            "resolution_message": resolution_msg
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to resolve ticket {ticket_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/agent/all")
async def get_all_tickets():
    """
    Returns history of all tickets allowing admins to see what Argus resolved vs escalated.
    """
    supabase = get_supabase()
    try:
        # Get all tickets, ordered by newest first
        tickets_res = supabase.table("tickets").select(
            "id, user_id, description, category, severity, status, created_at, resolved_at, users(email)"
        ).order("created_at", desc=True).limit(250).execute()
        
        tickets = tickets_res.data
        if not tickets:
            return []
            
        return tickets
    except Exception as e:
        logger.error(f"Failed to fetch all tickets: {e}")
        raise HTTPException(status_code=500, detail=str(e))
