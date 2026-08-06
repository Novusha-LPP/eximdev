# ─── Mystique — API Routes with Auto Data Context & Streaming ─────────
# services/mystique/app/core/routes.py

from fastapi import APIRouter, Header
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Any, Optional
import structlog
import json
import httpx
import re

from app.core.config import settings
from app.core.database import get_mi_db
from app.tools import get_tool_schemas, execute_tool

logger = structlog.get_logger()

router = APIRouter()

class QueryRequest(BaseModel):
    query: str
    company_context: Optional[str] = None

class QueryResponse(BaseModel):
    answer: str
    tools_used: list[dict[str, Any]]
    thinking: Optional[str] = None

MYSTIQUE_SYSTEM_PROMPT = """
You are Mystique, the market-intelligence analyst inside Suraj Group's AIVision platform.
You answer questions from Shipra (Outreach Team Lead) and the CEO about companies, contacts, and sales opportunities across SFPL (Import/Export), SRCC (Transport), Rabs/Paramount (Factory), SR E-Locks, and Alluvium IoT's RFID/AutoRack line.

Definitions you must use consistently:
- Green: an active paying customer for at least one service.
- Yellow: an identified opportunity account.
- Red: not suitable to approach; always carries a reason code.
- Service gap: one of the six verticals a company is NOT currently engaged in with Suraj Group, despite being a plausible fit.
- Priority Score: a 0-100 score, recalculated daily, ranking Yellow accounts by conversion potential.

Rules:
1. Always generate a complete, practical outreach briefing immediately when company data or context is provided.
2. Do NOT say data is missing or ask for additional data if company data context is provided in the prompt.
3. Highlight specific unsold service gaps (e.g. Freight Forwarding, Transport Logistics, Packaging Crates, GPS E-Locks, RFID/AutoRack) and key talking points for the outreach call.
4. Cite Priority Score and key decision-maker contact details whenever available in context.
"""

async def auto_fetch_company_context(query: str) -> str:
    """Auto-detect company name in query and fetch 360 data from MongoDB."""
    try:
        db = get_mi_db()
        # Search for company names in mi_companies
        companies = await db["mi_companies"].find({}, {"legal_name": 1, "gstin": 1, "city": 1, "status": 1, "priority_score": 1, "service_gaps": 1, "engaged_services": 1, "turnover_band": 1}).to_list(length=200)
        
        matched_doc = None
        for doc in companies:
            name = doc.get("legal_name", "")
            if name and re.search(r'\b' + re.escape(name) + r'\b', query, re.IGNORECASE):
                # Fetch full document
                matched_doc = await db["mi_companies"].find_one({"_id": doc["_id"]})
                break
        
        if matched_doc:
            matched_doc["_id"] = str(matched_doc["_id"])
            logger.info("Auto-fetched company context for streaming", company=matched_doc.get("legal_name"))
            return f"REAL DATABASE INTELLIGENCE FOR COMPANY:\n{json.dumps(matched_doc, default=str, indent=2)}"
    except Exception as e:
        logger.error("Auto fetch context error", error=str(e))
    return ""

@router.post("/query", response_model=QueryResponse)
async def query_mystique(
    request: QueryRequest,
    x_user_role: str = Header(None)
):
    role = x_user_role or "CEO"
    prompt = request.query
    auto_ctx = await auto_fetch_company_context(request.query)
    ctx = request.company_context or auto_ctx

    if ctx:
        prompt = f"Data Context:\n{ctx}\n\nUser Question:\n{request.query}"

    async with httpx.AsyncClient(timeout=120.0) as client:
        res = await client.post(
            f"{settings.OLLAMA_BASE_URL}/api/chat",
            json={
                "model": settings.OLLAMA_MODEL,
                "messages": [
                    {"role": "system", "content": MYSTIQUE_SYSTEM_PROMPT},
                    {"role": "user", "content": prompt}
                ],
                "stream": False
            }
        )
        if res.status_code == 200:
            data = res.json()
            content = data.get("message", {}).get("content", "")
            thinking = data.get("message", {}).get("thinking", "")
            return QueryResponse(answer=content, tools_used=[], thinking=thinking)

    return QueryResponse(answer="Could not retrieve response from Ollama engine.", tools_used=[])


@router.post("/stream_query")
@router.post("/query/stream")
async def stream_mystique_query(
    request: QueryRequest,
    x_user_role: str = Header(None)
):
    role = x_user_role or "CEO"
    prompt = request.query
    auto_ctx = await auto_fetch_company_context(request.query)
    ctx = request.company_context or auto_ctx

    if ctx:
        prompt = f"Data Context:\n{ctx}\n\nUser Request:\n{request.query}"

    async def event_generator():
        async with httpx.AsyncClient(timeout=120.0) as client:
            try:
                async with client.stream(
                    "POST",
                    f"{settings.OLLAMA_BASE_URL}/api/chat",
                    json={
                        "model": settings.OLLAMA_MODEL,
                        "messages": [
                            {"role": "system", "content": MYSTIQUE_SYSTEM_PROMPT},
                            {"role": "user", "content": prompt}
                        ],
                        "stream": True
                    }
                ) as response:
                    async for line in response.aiter_lines():
                        if not line:
                            continue
                        try:
                            chunk = json.loads(line)
                            msg = chunk.get("message", {})
                            thinking_chunk = msg.get("thinking", "")
                            content_chunk = msg.get("content", "")

                            if thinking_chunk:
                                payload = json.dumps({"type": "thinking", "content": thinking_chunk})
                                yield f"data: {payload}\n\n"

                            if content_chunk:
                                payload = json.dumps({"type": "token", "content": content_chunk})
                                yield f"data: {payload}\n\n"

                        except json.JSONDecodeError:
                            continue

                yield f"data: {json.dumps({'type': 'done'})}\n\n"

            except Exception as e:
                logger.error("Streaming error", error=str(e))
                err_payload = json.dumps({"type": "token", "content": f"\n\n[Error streaming from Gemma 4: {str(e)}]"})
                yield f"data: {err_payload}\n\n"
                yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
