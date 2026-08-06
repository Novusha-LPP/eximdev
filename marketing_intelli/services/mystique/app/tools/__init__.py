# ─── Mystique — Tool Definitions ────────────────────────────────
# services/mystique/app/tools/__init__.py
#
# The 6 Mystique tools from the development guide §5.2
# Each tool: schema (for LLM) + executor (for backend)

from app.tools.find_service_gaps import FindServiceGapsTool
from app.tools.get_company_360 import GetCompany360Tool
from app.tools.rank_priority_accounts import RankPriorityAccountsTool
from app.tools.get_market_coverage import GetMarketCoverageTool
from app.tools.get_seasonal_opportunities import GetSeasonalOpportunitiesTool
from app.tools.get_competitor_vulnerability import GetCompetitorVulnerabilityTool

# Registry: tool name → tool class
TOOL_REGISTRY = {
    "find_service_gaps": FindServiceGapsTool,
    "get_company_360": GetCompany360Tool,
    "rank_priority_accounts": RankPriorityAccountsTool,
    "get_market_coverage": GetMarketCoverageTool,
    "get_seasonal_opportunities": GetSeasonalOpportunitiesTool,
    "get_competitor_vulnerability": GetCompetitorVulnerabilityTool,
}


def get_tool_schemas() -> list[dict]:
    """Return OpenAI-format tool schemas for all registered tools."""
    return [
        {
            "type": "function",
            "function": tool_cls.schema(),
        }
        for tool_cls in TOOL_REGISTRY.values()
    ]


async def execute_tool(tool_name: str, arguments: dict, user_role: str) -> dict:
    """Execute a tool by name with role-based scoping."""
    tool_cls = TOOL_REGISTRY.get(tool_name)
    if not tool_cls:
        return {"error": f"Unknown tool: {tool_name}"}

    tool = tool_cls()
    return await tool.execute(arguments, user_role)
