# ─── Mystique AI Service — FastAPI Entry Point ──────────────────
# services/mystique/app/main.py

import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import structlog

from app.core.config import settings
from app.core.database import connect_db, close_db
from app.core.llm_client import init_llm_client

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    logger.info("🧠 Starting Mystique AI Service", port=settings.PORT, env=settings.ENV)
    await connect_db()
    await init_llm_client()
    yield
    await close_db()
    logger.info("Mystique shutdown complete")


app = FastAPI(
    title="Mystique — AI Query Engine",
    description="Local LLM-powered market intelligence query service for AIVision",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    req_id = request.headers.get("x-request-id", "unknown")
    start_time = time.time()

    logger.info("📥 [Mystique IN]", req_id=req_id, method=request.method, path=request.url.path)

    try:
        response = await call_next(request)
        duration_ms = round((time.time() - start_time) * 1000, 2)
        logger.info(
            "📤 [Mystique OUT]",
            req_id=req_id,
            method=request.method,
            path=request.url.path,
            status=response.status_code,
            duration_ms=duration_ms,
        )
        response.headers["x-request-id"] = req_id
        return response
    except Exception as exc:
        duration_ms = round((time.time() - start_time) * 1000, 2)
        logger.error(
            "🚨 [Mystique Error]",
            req_id=req_id,
            method=request.method,
            path=request.url.path,
            error=str(exc),
            duration_ms=duration_ms,
        )
        raise exc


# ─── Health Check ───────────────────────────────────────────────
@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "mystique",
        "llm_provider": settings.LLM_PROVIDER,
        "llm_model": settings.active_model_name,
    }


# ─── Route Imports ──────────────────────────────────────────────
from app.core.routes import router as query_router   # noqa: E402

app.include_router(query_router, prefix="/api", tags=["Mystique Query"])
app.include_router(query_router, tags=["Mystique Query Direct"])
