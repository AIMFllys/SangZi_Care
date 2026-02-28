from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).resolve().parent.parent.parent / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Supabase
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""

    # JWT
    JWT_SECRET: str = "your-jwt-secret-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 1440

    # Volcano Engine – Ark (LLM)
    VOLCANO_ARK_API_KEY: str = ""
    VOLCANO_ARK_BASE_URL: str = "https://ark.cn-beijing.volces.com/api/v3"
    VOLCANO_ARK_MODEL_ENDPOINT: str = ""  # Doubao model endpoint ID

    # Volcano Engine – Voice
    VOLCANO_APP_ID: str = ""
    VOLCANO_ACCESS_TOKEN: str = ""
    VOLCANO_SECRET_KEY: str = ""
    VOLCANO_TTS_RESOURCE_ID: str = ""
    VOLCANO_ASR_STREAM_RESOURCE_ID: str = ""
    VOLCANO_ASR_BATCH_STANDARD_RESOURCE_ID: str = ""
    VOLCANO_ASR_BATCH_FAST_RESOURCE_ID: str = ""
    VOLCANO_ASR_BATCH_IDLE_RESOURCE_ID: str = ""
    VOLCANO_REALTIME_VOICE_RESOURCE_ID: str = ""
    VOLCANO_TTS_WS_URL: str = "wss://openspeech.bytedance.com/api/v1/tts/ws"
    VOLCANO_ASR_WS_URL: str = "wss://openspeech.bytedance.com/api/v2/asr"


settings = Settings()
