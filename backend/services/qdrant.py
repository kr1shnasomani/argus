import os
from qdrant_client import AsyncQdrantClient
from qdrant_client.models import VectorParams, Distance
from dotenv import load_dotenv

load_dotenv()

QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
QDRANT_COLLECTION = os.getenv("QDRANT_COLLECTION_NAME", "resolved_tickets")

if not QDRANT_URL or not QDRANT_API_KEY:
    raise ValueError("Missing Qdrant credentials in .env")

# Initialize async client
client = AsyncQdrantClient(
    url=QDRANT_URL,
    api_key=QDRANT_API_KEY,
    timeout=30.0
)

def get_qdrant_client() -> AsyncQdrantClient:
    """Returns the initialized Qdrant async client."""
    return client

async def init_collection():
    """Ensure the resolved_tickets collection exists with proper dimensions."""
    exists = await client.collection_exists(collection_name=QDRANT_COLLECTION)
    if not exists:
        print(f"Creating Qdrant collection: {QDRANT_COLLECTION}...")
        await client.create_collection(
            collection_name=QDRANT_COLLECTION,
            vectors_config=VectorParams(size=1024, distance=Distance.COSINE),
        )
        print("Collection created successfully.")
    else:
        print(f"Collection {QDRANT_COLLECTION} already exists.")

from qdrant_client.models import PointStruct, Filter, FieldCondition, MatchValue

async def search_similar(vector: list[float], top_k: int = 5, filter_verified: bool = True) -> list:
    """Search for similar tickets in Qdrant."""
    query_filter = None
    if filter_verified:
        query_filter = Filter(
            must=[FieldCondition(key="verified", match=MatchValue(value=True))]
        )
        
    results = await client.search(
        collection_name=QDRANT_COLLECTION,
        query_vector=vector,
        query_filter=query_filter,
        limit=top_k
    )
    return results

async def upsert_ticket(ticket_id: str, vector: list[float], payload: dict):
    """Upsert a single ticket vector and payload."""
    await client.upsert(
        collection_name=QDRANT_COLLECTION,
        points=[PointStruct(id=ticket_id, vector=vector, payload=payload)]
    )

async def count_vectors() -> int:
    """Return the total number of vectors in the collection."""
    response = await client.count(collection_name=QDRANT_COLLECTION)
    return response.count
