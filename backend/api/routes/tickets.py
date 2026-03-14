import logging
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends
from typing import Optional

from models.ticket import TicketSubmission, TicketResponse
from services.supabase import get_supabase
from services.storage import upload_attachment

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/tickets", tags=["tickets"])


@router.post("/submit", response_model=TicketResponse)
async def submit_ticket(
    description: str = Form(...),
    user_email: str = Form(...),
    category: Optional[str] = Form(""),
    severity: Optional[str] = Form("P3"),
    urgent: Optional[bool] = Form(False),
    system_name: Optional[str] = Form(None),
    attachment: Optional[UploadFile] = File(None),
):
    """
    Submit a new support ticket. Runs the full Argus pipeline.
    """
    from api.main import app_state  # lazy import to access lifespan state
    from core.pipeline import process_ticket

    attachment_url = None
    if attachment and attachment.filename:
        try:
            file_bytes = await attachment.read()
            attachment_url = await upload_attachment(
                file_name=attachment.filename,
                file_bytes=file_bytes,
                mime_type=attachment.content_type
            )
        except Exception as e:
            logger.warning(f"Attachment upload failed: {e}. Proceeding without attachment.")

    ticket = {
        "description": description,
        "category": category,
        "severity": severity,
        "user_email": user_email,
        "system_name": system_name,
        "attachment_url": attachment_url,
    }

    supabase = get_supabase()

    # Insert the raw ticket first (status: processing)
    try:
        user_data = supabase.table("users").select("id").eq("email", user_email).execute()
        user_id = user_data.data[0]["id"] if user_data.data else None
        if not user_id:
            raise HTTPException(status_code=404, detail=f"User with email '{user_email}' not found. Please register first.")

        ticket_row = {
            "user_id": user_id,
            "description": description,
            "category": category,
            "severity": severity,
            "status": "processing",
            "attachment_url": attachment_url
        }
        insert_res = supabase.table("tickets").insert(ticket_row).execute()
        ticket["id"] = insert_res.data[0]["id"]
        ticket["created_at"] = insert_res.data[0]["created_at"]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to insert ticket: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create ticket: {e}")

    # Run the full pipeline
    import services.supabase as supabase_svc
    try:
        result = await process_ticket(ticket, supabase_svc, app_state["qdrant_client"], app_state["cluster_map"])
    except Exception as e:
        logger.error(f"Pipeline execution failed: {e}")
        raise HTTPException(status_code=500, detail=f"Pipeline error: {e}")

    return TicketResponse(
        ticket_id=ticket["id"],
        status=result["status"],
        resolution_message=result.get("resolution_message"),
        decision_latency_ms=result.get("latency_ms"),
    )


@router.get("/{ticket_id}")
async def get_ticket_status(ticket_id: str):
    """
    Get the current status, resolution, and latency for a ticket.
    """
    supabase = get_supabase()
    try:
        ticket_res = supabase.table("tickets").select("*").eq("id", ticket_id).execute()
        if not ticket_res.data:
            raise HTTPException(status_code=404, detail="Ticket not found.")
        
        ticket = ticket_res.data[0]
        
        outcome_res = supabase.table("ticket_outcomes").select("resolution, signal_a, signal_b, signal_c").eq("ticket_id", ticket_id).execute()
        outcome = outcome_res.data[0] if outcome_res.data else None
        
        audit_res = supabase.table("audit_log").select("latency_ms").eq("ticket_id", ticket_id).order("created_at", desc=True).limit(1).execute()
        latency = audit_res.data[0]["latency_ms"] if audit_res.data else None
        
        return {
            "ticket_id": ticket_id,
            "status": ticket["status"],
            "category": ticket["category"],
            "severity": ticket["severity"],
            "created_at": ticket["created_at"],
            "resolved_at": ticket.get("resolved_at"),
            "resolution": outcome["resolution"] if outcome else None,
            "decision_latency_ms": latency,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
