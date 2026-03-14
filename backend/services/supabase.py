import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    raise ValueError("Missing Supabase credentials in .env")

# Using the service_role key to bypass RLS for the backend service
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

def get_supabase() -> Client:
    """Returns the initialized Supabase client."""
    return supabase

def get_user_by_email(email: str):
    response = supabase.table("users").select("*").eq("email", email).execute()
    return response.data[0] if response.data else None

def get_system_by_name(name: str):
    response = supabase.table("systems").select("*").eq("name", name).execute()
    return response.data[0] if response.data else None

def insert_ticket(ticket_data: dict) -> str:
    response = supabase.table("tickets").insert(ticket_data).execute()
    return response.data[0]["id"]

def update_ticket_status(ticket_id: str, status: str, resolved_at: str = None):
    update_data = {"status": status}
    if resolved_at:
        update_data["resolved_at"] = resolved_at
    supabase.table("tickets").update(update_data).eq("id", ticket_id).execute()

def update_ticket(ticket_id: str, updates: dict):
    supabase.table("tickets").update(updates).eq("id", ticket_id).execute()

def add_ticket_comment(ticket_id: str, comment: str, is_bot: bool):
    pass

def insert_ticket_outcome(outcome_data: dict):
    supabase.table("ticket_outcomes").insert(outcome_data).execute()

def get_category_thresholds(category: str) -> dict:
    response = supabase.table("category_thresholds").select("*").eq("category", category).execute()
    return response.data[0] if response.data else None

def get_ticket_history(category: str, days: int = 30) -> list:
    # Approximate days logic (in production we'd filter by created_at >= now() - interval)
    # Supabase allows filtering dates via strings
    from datetime import datetime, timedelta
    cutoff = (datetime.utcnow() - timedelta(days=days)).isoformat()
    response = supabase.table("ticket_outcomes").select("*").eq("category", category).gte("created_at", cutoff).execute()
    return response.data

def insert_audit_log(entry_data: dict):
    response = supabase.table("audit_log").insert(entry_data).execute()
    return response.data[0]["id"]

def get_last_audit_hash() -> str:
    response = supabase.table("audit_log").select("audit_hash").order("created_at", desc=True).limit(1).execute()
    return response.data[0]["audit_hash"] if response.data else "genesis_hash"

def insert_novel_ticket(ticket_id: str, max_similarity: float):
    supabase.table("novel_tickets").insert({
        "ticket_id": ticket_id,
        "max_similarity": max_similarity,
        "reviewed": False
    }).execute()

