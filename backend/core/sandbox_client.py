import os
import httpx
from typing import Dict, Optional

SANDBOX_URL = os.getenv("SANDBOX_URL", "http://localhost:8001")

async def test_in_sandbox(action: str, target: str, params: Optional[Dict] = None) -> Dict:
    """
    Layer 4: Sandbox execution.
    Sends the resolved action to the isolated sandbox environment.
    Returns the parsed JSON response or a graceful failure payload.
    """
    payload = {
        "action": action,
        "target": target,
        "params": params or {}
    }
    
    url = f"{SANDBOX_URL}/sandbox/execute"
    
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, json=payload, timeout=10.0)
            # We don't raise for status instantly so we can parse 400s if the sandbox returns standardized errors.
            if resp.status_code >= 500:
                resp.raise_for_status()
                
            return resp.json()
    except httpx.ConnectError:
        return {"success": False, "error": "Sandbox connection failed.", "logs": []}
    except httpx.TimeoutException:
        return {"success": False, "error": "Sandbox execution timed out.", "logs": []}
    except Exception as e:
        return {"success": False, "error": str(e), "logs": []}
