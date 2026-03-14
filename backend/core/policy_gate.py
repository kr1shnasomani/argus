from models.ticket import TicketSubmission
from models.user import User, System
from models.confidence import GateResult, GateAction

def hard_policy_gate(ticket: TicketSubmission, user: User, system: System = None) -> GateResult:
    """
    Layer 0: Pure deterministic business logic.
    Evaluates strict rules before any AI processing occurs.
    """
    
    # 1. VIP Tier Check
    if user.tier == "vip":
        return GateResult(
            action=GateAction.ESCALATE, 
            reason="User is VIP tier. Manual handling required."
        )
        
    # 2. Sev 1 / Sev 2 Check
    if ticket.severity in ["P1", "P2"]:
        return GateResult(
            action=GateAction.ESCALATE,
            reason=f"High severity ticket ({ticket.severity}). Manual handling required."
        )
        
    # System-specific checks
    if system:
        # 3. Active Incident Check
        if system.active_incident:
            return GateResult(
                action=GateAction.BATCH_ESCALATE,
                reason=f"System '{system.name}' has an active incident. Batching for major incident management."
            )
            
        # 4. Change Freeze Check
        if system.change_freeze:
            return GateResult(
                action=GateAction.ESCALATE,
                reason=f"System '{system.name}' is currently under a change freeze."
            )
            
    # Passed all hard policies
    return GateResult(action=GateAction.PROCEED)
