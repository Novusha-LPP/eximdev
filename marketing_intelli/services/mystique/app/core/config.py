# ─── Mystique — Configuration ───────────────────────────────────
# services/mystique/app/core/config.py

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Mystique AI Service configuration — loads from .env"""

    # Service
    PORT: int = 8100
    ENV: str = "development"

    # MongoDB (read-only access)
    MONGO_URI: str = "mongodb://localhost:27017/market_intelligence"
    EXIM_MONGO_URI: str = "mongodb://localhost:27017/eximNew"
    EXPORT_MONGO_URI: str = "mongodb://localhost:27017/export"

    # LLM Provider Selection
    LLM_PROVIDER: str = "ollama"  # "ollama" | "vllm" | "llamacpp"

    # Ollama
    OLLAMA_BASE_URL: str = "http://ollama.alvision.in"
    OLLAMA_MODEL: str = "gemma4:latest"

    # vLLM
    VLLM_BASE_URL: str = "http://localhost:8000/v1"
    VLLM_MODEL: str = "meta-llama/Meta-Llama-3.1-70B-Instruct"

    # llama-cpp-python
    LLAMACPP_MODEL_PATH: str = ""

    @property
    def active_model_name(self) -> str:
        if self.LLM_PROVIDER == "ollama":
            return self.OLLAMA_MODEL
        elif self.LLM_PROVIDER == "vllm":
            return self.VLLM_MODEL
        elif self.LLM_PROVIDER == "llamacpp":
            return self.LLAMACPP_MODEL_PATH.split("/")[-1] if self.LLAMACPP_MODEL_PATH else "llamacpp"
        return "unknown"

    model_config = SettingsConfigDict(
        env_file="../../.env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
