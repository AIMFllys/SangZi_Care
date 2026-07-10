import sys
import warnings
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).resolve().parent.parent / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Application
    DEBUG: bool = True
    ALLOWED_ORIGINS: str = "http://localhost:7742,http://localhost:3000"

    # Supabase
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""

    # JWT
    JWT_SECRET: str = "your-jwt-secret-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 1440

    @property
    def cors_origins(self) -> list[str]:
        """Parse comma-separated ALLOWED_ORIGINS into a list."""
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]

    # SMTP (Aliyun Email Push)
    SMTP_HOST: str = "smtpdm.aliyun.com"
    SMTP_PORT: int = 465
    SMTP_USER: str = ""
    SMTP_PASS: str = ""
    SMTP_FROM_NAME: str = "SangZiCare"

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

# --- Startup safety checks ---
_JWT_DEFAULT = "your-jwt-secret-change-in-production"
if settings.JWT_SECRET == _JWT_DEFAULT:
    if settings.DEBUG:
        warnings.warn(
            "⚠️  JWT_SECRET 使用默认值！仅限开发环境使用。"
            "请在 .env 中设置安全的 JWT_SECRET。",
            stacklevel=1,
        )
    else:
        print(
            "❌ FATAL: JWT_SECRET 未配置！"
            "生产环境禁止使用默认密钥。"
            "请在 .env 中设置 JWT_SECRET 和 DEBUG=false",
            file=sys.stderr,
        )
        sys.exit(1)
