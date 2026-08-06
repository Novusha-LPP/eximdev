# ─── Mystique — find_service_gaps Tool ──────────────────────────
# services/mystique/app/tools/find_service_gaps.py
#
# The primary tool: finds companies with unengaged services (gaps).
# Maps to PRD §4.5 Priority Score + §9.3 Monthly Report criteria.

from typing import Any
import structlog

from app.core.database import get_mi_db

logger = structlog.get_logger()

VERTICALS = [
    "customs_clearance", "freight_forwarding", "transport_logistics",
    "packaging_crates", "gps_elocks", "rfid_autorack",
]

TURNOVER_ORDER = ["<1Cr", "1-10Cr", "10-50Cr", "50-200Cr", "200-1000Cr", "1000Cr+"]


class FindServiceGapsTool:
    """Find companies with service gaps matching given filters."""

    @staticmethod
    def schema() -> dict:
        return {
            "name": "find_service_gaps",
            "description": (
                "Find companies with at least one unengaged service ('gap') "
                "matching the given filters. Use this for any question about "
                "sales gaps, cross-sell opportunities, or which companies are "
                "missing a given service."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "vertical": {
                        "type": "string",
                        "enum": VERTICALS,
                        "description": "Restrict to this vertical's gap. Omit to search across all six.",
                    },
                    "city": {"type": "string"},
                    "industry": {"type": "string"},
                    "min_turnover_band": {
                        "type": "string",
                        "enum": TURNOVER_ORDER,
                    },
                    "status": {
                        "type": "string",
                        "enum": ["Yellow", "Approached"],
                        "default": "Yellow",
                    },
                    "min_priority_score": {
                        "type": "integer",
                        "default": 50,
                    },
                    "min_days_since_last_approach": {"type": "integer"},
                    "limit": {"type": "integer", "default": 20},
                },
            },
        }

    async def execute(self, params: dict, user_role: str) -> dict[str, Any]:
        """Execute the service gap query against MongoDB."""
        db = get_mi_db()

        # Build MongoDB aggregation pipeline
        match_stage: dict = {}

        # Status filter
        status = params.get("status", "Yellow")
        match_stage["status"] = status

        # City filter (case-insensitive)
        if city := params.get("city"):
            match_stage["city"] = {"$regex": city, "$options": "i"}

        # Industry filter
        if industry := params.get("industry"):
            match_stage["primary_industry"] = {"$regex": industry, "$options": "i"}

        # Turnover filter (>= minimum band)
        if min_band := params.get("min_turnover_band"):
            min_idx = TURNOVER_ORDER.index(min_band)
            match_stage["turnover_band"] = {"$in": TURNOVER_ORDER[min_idx:]}

        # Priority score filter
        min_score = params.get("min_priority_score", 50)
        match_stage["priority_score.total_score"] = {"$gte": min_score}

        # Vertical gap filter
        if vertical := params.get("vertical"):
            match_stage["services"] = {
                "$elemMatch": {"vertical": vertical, "engaged": False}
            }
        else:
            # At least one gap across any vertical
            match_stage["services.engaged"] = False

        pipeline = [
            {"$match": match_stage},
            {"$sort": {"priority_score.total_score": -1}},
            {"$limit": params.get("limit", 20)},
            {
                "$project": {
                    "_id": 0,
                    "company_name": 1,
                    "city": 1,
                    "primary_industry": 1,
                    "turnover_band": 1,
                    "growth_trend": 1,
                    "status": 1,
                    "priority_score": 1,
                    "account_owner": 1,
                    "services": 1,
                }
            },
        ]

        cursor = db.mi_companies.aggregate(pipeline)
        results = await cursor.to_list(length=params.get("limit", 20))

        # Compute gap list per company
        for company in results:
            company["service_gaps"] = [
                s["vertical"]
                for s in company.get("services", [])
                if not s.get("engaged", False)
            ]
            company["gap_count"] = len(company["service_gaps"])
            del company["services"]  # Don't send raw array

        logger.info(
            "find_service_gaps executed",
            params=params,
            result_count=len(results),
            user_role=user_role,
        )

        return {
            "tool": "find_service_gaps",
            "filters_applied": params,
            "result_count": len(results),
            "companies": results,
        }
