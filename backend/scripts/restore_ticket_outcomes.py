import os
import sys
import csv
import uuid

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../'))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '../../.env'))

from services.supabase import get_supabase

CSV_PATH = os.path.join(os.path.dirname(__file__), '../../data/synthetic_tickets.csv')

def main():
    supabase = get_supabase()

    # Read CSV
    outcomes = []
    with open(CSV_PATH, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            outcomes.append({
                # Generate random UUIDs since `tickets` instances are no longer strictly needed in the DB
                "ticket_id": str(uuid.uuid4()), 
                "category": row["category"],
                "auto_resolved": row["auto_resolved"].lower() == "true",
                "sandbox_passed": True,
                "signal_a": float(row["signal_a"]),
                "signal_b": float(row["signal_b"]),
                "signal_c": float(row["signal_c"]),
                "resolution": row["resolution"],
                "resolution_cluster": row["resolution_cluster"],
                "agent_verified": row["verified"].lower() == "true",
            })

    print(f"Read {len(outcomes)} outcomes from CSV.")

    print("Truncating ticket_outcomes...")
    # Delete all rows from ticket_outcomes
    supabase.table("ticket_outcomes").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()

    print("Inserting 500 seed rows into ticket_outcomes...")
    # Bulk insert
    step = 50
    for i in range(0, len(outcomes), step):
        batch = outcomes[i:i+step]
        supabase.table("ticket_outcomes").insert(batch).execute()
        print(f"Inserted {i + len(batch)} / {len(outcomes)}")

    print("Done")

if __name__ == "__main__":
    main()