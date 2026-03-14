import logging
from typing import Dict, Any

from core.policy_gate import hard_policy_gate
from core.embedder import embed_ticket
from core.retriever import retrieve_similar
from core.novelty import check_novelty
from core.confidence import compute_confidence
from core.resolution_mapper import map_resolution_to_action
from core.sandbox_client import test_in_sandbox
from utils.timestamps import start_timer, stop_timer
from utils.audit_hash import log_to_audit
from services.llm import generate_evidence_card, generate_resolution_message

from models.confidence import GateAction, ConfidenceDecision
from models.user import User, System
from models.ticket import TicketSubmission

logger = logging.getLogger(__name__)

async def process_ticket(
    ticket: Dict[str, Any],
    supabase_client,
    qdrant_client,
    cluster_map: Dict[str, str]
) -> Dict[str, Any]:
    """
    The main Argus Pipeline Orchestrator.
    Executes Layer 0 -> Layer 4 sequentially, updating the database as needed.
    """
    pipeline_start = start_timer()
    logs = []
    
    def conclude(status: str, action: GateAction, reason: str, extra: dict = None) -> Dict[str, Any]:
        latency = stop_timer(pipeline_start)
        # In a real deployed app, we'd update Supabase ticket status here and log telemetry.
        supabase_client.update_ticket(ticket["id"], {"status": status})
        
        result = {
            "ticket_id": ticket["id"],
            "status": status,
            "action": action,
            "reason": reason,
            "latency_ms": latency,
            "logs": logs
        }
        if extra:
            result.update(extra)
        return result

    # --- Layer 0: Hard Policy Gate ---
    logs.append("Running Layer 0: Hard Policy Gate")
    user_data = supabase_client.get_user_by_email(ticket.get("user_email"))
    system_data = supabase_client.get_system_by_name(ticket.get("system_name")) if ticket.get("system_name") else None
    
    user_model = User(**user_data) if user_data else None
    system_model = System(**system_data) if system_data else None
    # We must exclude the 'id' when constructing TicketSubmission if it relies solely on submission fields
    submission_data = {k: v for k, v in ticket.items() if k in ["description", "category", "severity", "user_email", "system_name", "attachment_url"]}
    ticket_model = TicketSubmission(**submission_data)
    
    policy_res = hard_policy_gate(ticket_model, user_model, system_model)
    if policy_res.action != GateAction.PROCEED:
        return conclude("escalated", policy_res.action, policy_res.reason)
        
    # --- Layer 1a: Embedding ---
    logs.append("Running Layer 1a: Embedding ticket context")
    try:
        url = ticket.get("attachments", [None])[0] if ticket.get("attachments") else None
        vector = await embed_ticket(ticket["description"], attachment_url=url)
    except Exception as e:
        logger.error(f"Embedding failed: {e}")
        return conclude("escalated", GateAction.ESCALATE, f"Embedding generation failed: {e}")
        
    # --- Layer 1b: Retrieval ---
    logs.append("Running Layer 1b: Retrieving similar past tickets")
    try:
        qdrant_results = await retrieve_similar(qdrant_client, vector, top_k=5)
    except Exception as e:
        logger.error(f"Retrieval failed: {e}")
        return conclude("escalated", GateAction.ESCALATE, f"Vector DB retrieval failed: {e}")

    # --- Layer 2: Novelty Detection ---
    logs.append("Running Layer 2: Novelty Detection")
    novelty_res = check_novelty(qdrant_results, threshold=0.50)
    if novelty_res.action == GateAction.ESCALATE:
        # Save as a novel ticket for human review queue
        supabase_client.insert_novel_ticket(ticket["id"], qdrant_results[0].score if qdrant_results else 0.0)
        return conclude("escalated", GateAction.ESCALATE, novelty_res.reason)

    # --- Layer 3: Confidence Engine ---
    logs.append("Running Layer 3: Confidence Engine")
    conf_report = compute_confidence(qdrant_results, ticket.get("category", "General"), supabase_client, cluster_map)
    if conf_report.decision == ConfidenceDecision.ESCALATE:
        return conclude("escalated", GateAction.ESCALATE, conf_report.reason, {"confidence_report": conf_report.model_dump()})

    # --- Layer 4: Resolution Mapping & Sandbox Execution ---
    logs.append("Running Layer 4: Action Mapping & Sandbox")
    action_payload = map_resolution_to_action(qdrant_results[0], cluster_map, ticket.get("user_email", "unknown@domain.com"))
    
    sandbox_res = await test_in_sandbox(action_payload["action"], action_payload["target"])
    if not sandbox_res.get("success", False):
        return conclude("escalated", GateAction.ESCALATE, f"Sandbox validation failed: {sandbox_res.get('error', 'Unknown Error')}")

    # --- Layer 5: Finalization & Audit Logging ---
    logs.append("All gates passed. Compiling evidence card and auto-resolving.")
    
    # Generate Evidence Card
    # Using mock parameters for missing signals/escalation_reason since this is auto-resolved
    evidence_card_dict = await generate_evidence_card(
        ticket=ticket, 
        signals=conf_report.model_dump()["signals"], 
        qdrant_results=[r.payload for r in qdrant_results], 
        escalation_reason="Auto-Resolved"
    )
    
    # Store evidence card in DB
    supabase_client.update_ticket(ticket["id"], {"evidence_card": evidence_card_dict})
    
    # Cryptographic Audit Log
    audit_hash = log_to_audit(ticket["id"], "AUTO_RESOLVED", evidence_card_dict, supabase_client)
    
    # Generate final user-facing resolution message
    resolution_msg = await generate_resolution_message(ticket)
    supabase_client.add_ticket_comment(ticket["id"], resolution_msg, is_bot=True)

    return conclude(
        "auto_resolved", 
        GateAction.PROCEED, 
        "Successfully auto-resolved.", 
        {"audit_hash": audit_hash, "action_taken": action_payload}
    )
