from typing import Any, Dict
from utils.cluster_map import get_resolution_cluster

# Hardcoded action map for known resolution clusters mapped to Sandbox commands.
# In a real system, this would be centrally managed (e.g. in PostgreSQL).
ACTION_MAP = {
    "pwd_reset": "reset_password",
    "account_unlock": "unlock_account",
    "cache_clear": "clear_cache",
    "service_restart": "restart_service",
    "grant_access": "grant_permission",
    "install_software": "install_software",
}

def map_resolution_to_action(qdrant_top_result: Any, cluster_map: Dict[str, str], ticket_email: str) -> Dict[str, str]:
    """
    Translates a historical resolution string into a concrete API action payload
    that can be executed against the sandbox environment.
    """
    if not qdrant_top_result:
        return {"action": "unknown", "target": ticket_email}

    payload = getattr(qdrant_top_result, "payload", {})
    historical_resolution = payload.get("resolution", "")
    
    cluster_id = get_resolution_cluster(historical_resolution, cluster_map)
    sandbox_action = ACTION_MAP.get(cluster_id, "unknown")

    # In a full robust implementation, LLM could extract specific targets from context.
    # We default the target to the user's email or service name depending on the action.
    return {
        "action": sandbox_action,
        "target": ticket_email
    }
