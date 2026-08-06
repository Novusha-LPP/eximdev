# ─── Mystique — Async MongoDB Connection ────────────────────────
# services/mystique/app/core/database.py
#
# Read-only connections. Mystique NEVER writes to the database.

import motor.motor_asyncio
import structlog

from app.core.config import settings

logger = structlog.get_logger()

# Clients
_mi_client: motor.motor_asyncio.AsyncIOMotorClient | None = None
_exim_client: motor.motor_asyncio.AsyncIOMotorClient | None = None
_export_client: motor.motor_asyncio.AsyncIOMotorClient | None = None


async def connect_db():
    """Initialize read-only MongoDB connections."""
    global _mi_client, _exim_client, _export_client

    _mi_client = motor.motor_asyncio.AsyncIOMotorClient(settings.MONGO_URI)
    _exim_client = motor.motor_asyncio.AsyncIOMotorClient(settings.EXIM_MONGO_URI)
    _export_client = motor.motor_asyncio.AsyncIOMotorClient(settings.EXPORT_MONGO_URI)

    # Verify connections
    await _mi_client.admin.command("ping")
    logger.info("✅ Mystique connected to MI database (read-only)")

    await _exim_client.admin.command("ping")
    logger.info("✅ Mystique connected to EXIM database (read-only)")

    await _export_client.admin.command("ping")
    logger.info("✅ Mystique connected to Export database (read-only)")


async def close_db():
    """Close all MongoDB connections."""
    if _mi_client:
        _mi_client.close()
    if _exim_client:
        _exim_client.close()
    if _export_client:
        _export_client.close()


def get_mi_db():
    """Get the Market Intelligence database."""
    return _mi_client.get_database()


def get_exim_db():
    """Get the EximTransport database (read-only federation)."""
    return _exim_client.get_database()


def get_export_db():
    """Get the Export database (read-only federation)."""
    return _export_client.get_database()
