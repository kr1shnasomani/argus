import os
import httpx
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

# Primary
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "google/gemma-3-27b-it:free")

# Fallback 1
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

# Fallback 2
GEMINI_API_KEY = os.getenv("GOOGLE_GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

async def generate_text(prompt: str, system_prompt: Optional[str] = None) -> str:
    """
    Generate text using the configured LLM fallback chain.
    1. OpenRouter
    2. Groq
    3. Gemini
    """
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})

    # Try 1: OpenRouter (Primary)
    if OPENROUTER_API_KEY:
        try:
            return await _call_openai_compatible(
                "https://openrouter.ai/api/v1/chat/completions",
                OPENROUTER_API_KEY,
                OPENROUTER_MODEL,
                messages
            )
        except Exception as e:
            print(f"OpenRouter failed: {e}. Falling back to Groq...")
            pass

    # Try 2: Groq (Fallback 1)
    if GROQ_API_KEY:
        try:
            return await _call_openai_compatible(
                "https://api.groq.com/openai/v1/chat/completions",
                GROQ_API_KEY,
                GROQ_MODEL,
                messages
            )
        except Exception as e:
            print(f"Groq failed: {e}. Falling back to Gemini...")
            pass

    # Try 3: Gemini (Fallback 2)
    if GEMINI_API_KEY:
        try:
            return await _call_gemini(GEMINI_API_KEY, GEMINI_MODEL, prompt, system_prompt)
        except Exception as e:
            print(f"Gemini failed: {e}.")
            pass

    raise Exception("All LLM providers in the fallback chain failed.")


async def _call_openai_compatible(url: str, api_key: str, model: str, messages: list) -> str:
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": model,
        "messages": messages,
        "temperature": 0.1
    }
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, headers=headers, json=payload, timeout=60.0)
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"].strip()


async def _call_gemini(api_key: str, model: str, prompt: str, system_prompt: Optional[str] = None) -> str:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    headers = {"Content-Type": "application/json"}
    
    # Construct Gemini payload
    contents = [{"parts": [{"text": prompt}]}]
    payload = {"contents": contents, "generationConfig": {"temperature": 0.1}}
    
    if system_prompt:
        payload["systemInstruction"] = {"parts": [{"text": system_prompt}]}

    async with httpx.AsyncClient() as client:
        resp = await client.post(url, headers=headers, json=payload, timeout=60.0)
        resp.raise_for_status()
        data = resp.json()
        return data["candidates"][0]["content"]["parts"][0]["text"].strip()

import json

async def generate_evidence_card(ticket: dict, signals: dict, qdrant_results: list, escalation_reason: str) -> dict:
    """Generate a structured evidence card via LLM."""
    sys_prompt = "You are an AI generating an Evidence Card JSON for an IT team. Return ONLY valid JSON."
    prompt = f"""
    Create an Evidence Card summarizing this IT ticket evaluation.
    Ticket details: {json.dumps(ticket)}
    Signals evaluated: {json.dumps(signals)}
    Similar past tickets found: {len(qdrant_results)}
    Escalation Reason: {escalation_reason}
    
    Format the response as a JSON object matching an EvidenceCard structure.
    """
    raw_response = await generate_text(prompt, sys_prompt)
    try:
        # Strip potential markdown blocks
        clean_resp = raw_response.strip().removeprefix("```json").removesuffix("```").strip()
        return json.loads(clean_resp)
    except Exception:
        return {"error": "Failed to parse JSON", "raw": raw_response}

async def generate_resolution_message(resolution_text: str, ticket_description: str) -> str:
    """Refine a raw technical resolution into an employee-friendly message."""
    sys_prompt = "You are an empathetic IT support agent. Rephrase technical resolutions into polite, clear replies to the user."
    prompt = f"Ticket Issue: {ticket_description}\nRaw Technical Action Taken: {resolution_text}\nDraft a short, friendly message to the user explaining that the issue has been resolved."
    return await generate_text(prompt, sys_prompt)

async def generate_why_not_automated(signals: dict, qdrant_results: list) -> str:
    """Generate a human-readable explanation of why a ticket failed automation."""
    sys_prompt = "You are an internal IT analytics assistant. Briefly summarize why a ticket was escalated."
    prompt = f"Signals: {json.dumps(signals)}\nSimilar historical matches: {len(qdrant_results)}\nExplain in 1-2 short sentences why this ticket could not be safely auto-resolved. Point out any signals that failed."
    return await generate_text(prompt, sys_prompt)
