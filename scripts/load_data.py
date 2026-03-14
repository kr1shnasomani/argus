#!/usr/bin/env python3
"""
load_data.py
Read `data/synthetic_tickets.csv`, validate schema, and insert records
into Supabase `tickets` + `ticket_outcomes` tables.
Tickets are pre-marked as auto_resolved=true, agent_verified=true.
Run after seed_systems.py and seed_users.py.
"""

import os
import sys
import csv

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../backend'))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '../.env'))

from services.supabase import get_supabase

CSV_PATH = os.path.join(os.path.dirname(__file__), '../data/synthetic_tickets.csv')

REQUIRED_COLUMNS = {
    "ticket_id", "description", "category", "severity",
    "resolution", "resolution_cluster", "user_tier", "department",
    "signal_a", "signal_b", "signal_c", "auto_resolved", "verified", "created_at"
}

# Map user_tier to a seeded email for FK lookup
TIER_EMAIL_MAP = {
    "vip":        "ceo@argus.local",
    "standard":   "john.doe@argus.local",
    "contractor": "contractor.1@argus.local",
}

CATEGORY_SYSTEM_MAP = {
    "Auth/SSO":            "Active Directory",
    "SAP Issues":          "SAP",
    "Email Access":        "Email",
    "VPN Problems":        "VPN",
    "Printer Issues":      "Printer",
    "Software Install":    "Software Portal",
    "Network/Connectivity":"Network",
    "Permissions/Access":  "Active Directory",
}


def main():
    supabase = get_supabase()

    # Pre-fetch user IDs by email
    user_cache = {}
    system_cache = {}

    # Fetch all users once
    users_res = supabase.table("users").select("id, email, tier").execute()
    for u in users_res.data:
        user_cache[u["email"]] = u["id"]
        user_cache[u["tier"]] = u["id"]  # fallback by tier

    # Fetch all systems once
    systems_res = supabase.table("systems").select("id, name").execute()
    for s in systems_res.data:
        system_cache[s["name"]] = s["id"]

    inserted = 0
    skipped = 0
    errors = 0

    with open(CSV_PATH, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)

        # Validate schema
        if not REQUIRED_COLUMNS.issubset(set(reader.fieldnames or [])):
            missing = REQUIRED_COLUMNS - set(reader.fieldnames or [])
            print(f"❌ CSV is missing required columns: {missing}")
            sys.exit(1)

        for row in reader:
            ticket_id = row["ticket_id"]
            tier = row.get("user_tier", "standard")

            # Resolve user_id
            email = TIER_EMAIL_MAP.get(tier, "john.doe@argus.local")
            user_id = user_cache.get(email)
            if not user_id:
                print(f"  [WARN] No user found for tier='{tier}', skipping ticket {ticket_id}.")
                skipped += 1
                continue

            # Resolve system_id
            system_name = CATEGORY_SYSTEM_MAP.get(row["category"])
            system_id = system_cache.get(system_name) if system_name else None

            # Insert ticket
            ticket_row = {
                "user_id": user_id,
                "system_id": system_id,
                "description": row["description"],
                "category": row["category"],
                "severity": row["severity"],
                "status": "auto_resolved" if row["auto_resolved"].lower() == "true" else "resolved",
                "created_at": row["created_at"],
            }

            try:
                ticket_res = supabase.table("tickets").insert(ticket_row).execute()
                db_ticket_id = ticket_res.data[0]["id"]

                # Insert outcome
                outcome_row = {
                    "ticket_id": db_ticket_id,
                    "category": row["category"],
                    "auto_resolved": row["auto_resolved"].lower() == "true",
                    "sandbox_passed": True,
                    "signal_a": float(row["signal_a"]),
                    "signal_b": float(row["signal_b"]),
                    "signal_c": float(row["signal_c"]),
                    "resolution": row["resolution"],
                    "resolution_cluster": row["resolution_cluster"],
                    "agent_verified": row["verified"].lower() == "true",
                }
                supabase.table("ticket_outcomes").insert(outcome_row).execute()

                inserted += 1
                if inserted % 50 == 0:
                    print(f"  ... {inserted} tickets inserted so far")

            except Exception as e:
                print(f"  [ERROR] Failed to insert ticket {ticket_id}: {e}")
                errors += 1

    print(f"\nDone. {inserted} inserted, {skipped} skipped, {errors} errors.")


if __name__ == "__main__":
    main()
