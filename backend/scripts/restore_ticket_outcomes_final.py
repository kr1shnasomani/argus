import os
import sys
import csv
import uuid

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../'))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '../../.env'))

from services.supabase import get_supabase

CSV_PATH = os.path.join(os.path.dirname(__file__), '../../data/argus_seed_data_final.csv')

def main():
    supabase = get_supabase()

    outcomes = []
    with open(CSV_PATH, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            outcomes.append({
                "ticket_id": str(uuid.uuid4()), 
                "category": row["category"],
                "description": row["description"],
                "resolution": row["resolution"],
                "resolution_cluster": row["resolution_cluster"],
                "auto_resolved": row["auto_resolved"].lower() == "true",
                "created_at": row["created_at"],
            })

    print(f"Read {len(outcomes)} outcomes from CSV.")

    print("Truncating ticket_outcomes...")
    # Delete all rows from ticket_outcomes
    supabase.table("ticket_outcomes").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
    
    print("Inserting 500 seed rows into ticket_outcomes...")
    step = 50
    for i in range(0, len(outcomes), step):
        batch = outcomes[i:i+step]
        supabase.table("ticket_outcomes").insert(batch).execute()
        print(f"Inserted {i + len(batch)} / {len(outcomes)}")

    print("Done")

if __name__ == "__main__":
    main()
