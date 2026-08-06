# ─── Mystique — LLM Client Abstraction ──────────────────────────
# services/mystique/app/core/llm_client.py
#
# Supports 3 providers: Ollama, vLLM, llama-cpp-python
# All expose tool-use via OpenAI-compatible chat completion format.

from typing import Any
import structlog
from openai import AsyncOpenAI

from app.core.config import settings

logger = structlog.get_logger()

# Global client — initialized at startup
_llm_client: AsyncOpenAI | None = None


async def init_llm_client():
    """Initialize the LLM client based on configured provider."""
    global _llm_client

    provider = settings.LLM_PROVIDER

    if provider == "ollama":
        _llm_client = AsyncOpenAI(
            base_url=f"{settings.OLLAMA_BASE_URL}/v1",
            api_key="ollama",  # Ollama doesn't need a real key
        )
        logger.info("🦙 LLM client initialized",
                     provider="ollama",
                     model=settings.OLLAMA_MODEL,
                     base_url=settings.OLLAMA_BASE_URL)

    elif provider == "vllm":
        _llm_client = AsyncOpenAI(
            base_url=settings.VLLM_BASE_URL,
            api_key="vllm",  # vLLM doesn't need a real key by default
        )
        logger.info("⚡ LLM client initialized",
                     provider="vllm",
                     model=settings.VLLM_MODEL,
                     base_url=settings.VLLM_BASE_URL)

    elif provider == "llamacpp":
        # llama-cpp-python runs its own OpenAI-compatible server
        _llm_client = AsyncOpenAI(
            base_url="http://localhost:8080/v1",
            api_key="llamacpp",
        )
        logger.info("🐪 LLM client initialized", provider="llamacpp")

    else:
        raise ValueError(f"Unknown LLM_PROVIDER: {provider}")


def get_llm_client() -> AsyncOpenAI:
    """Get the initialized LLM client."""
    if _llm_client is None:
        raise RuntimeError("LLM client not initialized. Call init_llm_client() first.")
    return _llm_client


def get_active_model() -> str:
    """Return the model name for the active provider."""
    return settings.active_model_name


async def chat_completion_with_tools(
    messages: list[dict],
    tools: list[dict],
    temperature: float = 0.1,
    max_tokens: int = 2048,
) -> Any:
    """
    Send a chat completion request with tool definitions.

    All providers (Ollama, vLLM) expose OpenAI-compatible tool-use.
    Returns the full response object.
    """
    client = get_llm_client()
    model = get_active_model()

    response = await client.chat.completions.create(
        model=model,
        messages=messages,
        tools=tools,
        tool_choice="auto",
        temperature=temperature,
        max_tokens=max_tokens,
    )

    return response
