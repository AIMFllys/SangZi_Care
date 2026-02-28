"""Doubao (豆包) AI service wrapping Volcano Engine Ark LLM APIs.

Provides:
- chat: multi-turn conversation with the Doubao LLM
- recognize_intent: analyse user text to identify intent and entities
- generate_summary: summarise a list of conversation messages

The Volcano Engine Ark API is OpenAI-compatible (POST /chat/completions).
Current implementation uses httpx for async HTTP calls and falls back to
placeholder responses when the API key is not configured.

Requirements: 19.4
"""

from __future__ import annotations

import json
import logging
from typing import Any

import httpx

from core.config import settings

logger = logging.getLogger(__name__)

# Default system prompt for the elderly-care assistant
_SYSTEM_PROMPT = (
    "你是\u201c小护\u201d，桑梓智护的AI语音助手。你是一位温暖亲切的老年人智慧医养助手，"
    "说话像关心老人的晚辈一样体贴。回复要简洁、通俗易懂，避免专业术语。"
    "你的职责是帮助老年人管理健康、用药提醒、联系家属、紧急呼叫等。"
    "请用温暖、积极、鼓励的语气与老人交流。"
)

# Intent types supported by the system
_INTENT_TYPES = [
    "health_record",
    "medication_confirm",
    "send_message",
    "make_call",
    "emergency",
    "query_medication",
    "query_health",
    "general_chat",
]

_INTENT_PROMPT = (
    "你是一个意图识别引擎。分析用户输入文本，识别用户意图和关键实体。\n"
    "支持的意图类型：{intents}\n\n"
    "请严格按以下JSON格式返回，不要包含其他内容：\n"
    '{{"intent": "<意图类型>", "entities": {{<提取的实体>}}, "confidence": <0-1的置信度>}}\n\n'
    "实体提取规则：\n"
    "- health_record: 提取 record_type, values (如 systolic, diastolic, blood_sugar 等)\n"
    "- medication_confirm: 提取 medicine_name (如有提及)\n"
    "- send_message: 提取 target_relation (如 女儿、儿子), message_content\n"
    "- make_call: 提取 target_relation\n"
    "- emergency: 无需额外实体\n"
    "- query_medication: 提取 time_range (如 今天、明天)\n"
    "- query_health: 提取 record_type, time_range\n"
    "- general_chat: 提取 topic\n"
).format(intents=", ".join(_INTENT_TYPES))

_SUMMARY_PROMPT = (
    "你是一位温暖的对话分析师。请分析以下老年人与AI助手的对话记录，"
    "生成一段温暖积极的摘要。摘要需要：\n"
    "1. 提取老人表达的关键需求和期望\n"
    "2. 总结老人的健康状况和情绪状态\n"
    "3. 用温暖、积极的语气呈现\n"
    "4. 突出老人与家属之间的情感连接\n"
    "5. 控制在200字以内\n\n"
    "对话记录：\n{conversations}"
)


class DoubaoService:
    """Encapsulates Volcano Engine Ark (Doubao) LLM API calls."""

    def __init__(self) -> None:
        self.api_key = settings.VOLCANO_ARK_API_KEY
        self.base_url = settings.VOLCANO_ARK_BASE_URL
        self.model_endpoint = settings.VOLCANO_ARK_MODEL_ENDPOINT

    @property
    def _is_configured(self) -> bool:
        """Return True when both API key and model endpoint are set."""
        return bool(self.api_key) and bool(self.model_endpoint)

    # ------------------------------------------------------------------
    # Internal: call the Ark chat/completions endpoint
    # ------------------------------------------------------------------

    async def _call_llm(
        self,
        messages: list[dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 1024,
    ) -> str:
        """Send messages to the Doubao LLM and return the assistant reply.

        The Ark API is OpenAI-compatible:
            POST {base_url}/chat/completions
            Authorization: Bearer {api_key}
            Body: { model, messages, temperature, max_tokens }

        Falls back to a placeholder when the API key is not configured.
        """
        if not self._is_configured:
            logger.warning(
                "Doubao LLM not configured (missing API key or model endpoint). "
                "Returning placeholder response."
            )
            return self._placeholder_chat_response(messages)

        url = f"{self.base_url}/chat/completions"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}",
        }
        payload = {
            "model": self.model_endpoint,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(url, headers=headers, json=payload)
                resp.raise_for_status()
                data = resp.json()
                return data["choices"][0]["message"]["content"]
        except httpx.HTTPStatusError as exc:
            logger.error("Doubao LLM HTTP error: %s %s", exc.response.status_code, exc.response.text)
            raise RuntimeError(f"豆包LLM服务请求失败: {exc.response.status_code}") from exc
        except httpx.RequestError as exc:
            logger.error("Doubao LLM request error: %s", exc)
            raise RuntimeError("豆包LLM服务不可用") from exc

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def chat(
        self,
        messages: list[dict[str, str]],
        user_id: str | None = None,
    ) -> str:
        """Send chat messages to the Doubao LLM and return the reply.

        Args:
            messages: List of {"role": "system"|"user"|"assistant", "content": str}.
                      If no system message is present, the default elderly-care
                      system prompt is prepended automatically.
            user_id: Optional user identifier for logging/tracing.

        Returns:
            The assistant's response text.
        """
        logger.info("Doubao chat request: user=%s turns=%d", user_id, len(messages))

        # Ensure a system prompt is present
        if not messages or messages[0].get("role") != "system":
            messages = [{"role": "system", "content": _SYSTEM_PROMPT}] + list(messages)

        return await self._call_llm(messages)

    async def recognize_intent(
        self,
        text: str,
        user_id: str | None = None,
    ) -> dict[str, Any]:
        """Analyse user text to identify intent and entities.

        Args:
            text: The user's input text.
            user_id: Optional user identifier for logging/tracing.

        Returns:
            {"intent": str, "entities": dict, "confidence": float}
        """
        if not text or not text.strip():
            return {"intent": "general_chat", "entities": {}, "confidence": 0.0}

        logger.info("Doubao intent recognition: user=%s text=%r", user_id, text[:80])

        messages = [
            {"role": "system", "content": _INTENT_PROMPT},
            {"role": "user", "content": text},
        ]

        raw = await self._call_llm(messages, temperature=0.1, max_tokens=512)
        return self._parse_intent_response(raw)

    async def generate_summary(
        self,
        conversations: list[dict[str, str]],
        user_id: str | None = None,
    ) -> str:
        """Generate a warm, positive summary of conversation messages.

        Args:
            conversations: List of {"role": str, "content": str} messages.
            user_id: Optional user identifier for logging/tracing.

        Returns:
            A summary string in warm, positive tone.
        """
        if not conversations:
            return ""

        logger.info(
            "Doubao summary generation: user=%s messages=%d",
            user_id,
            len(conversations),
        )

        conv_text = "\n".join(
            f"{msg.get('role', 'unknown')}: {msg.get('content', '')}"
            for msg in conversations
        )
        prompt = _SUMMARY_PROMPT.format(conversations=conv_text)

        messages = [
            {"role": "system", "content": prompt},
            {"role": "user", "content": "请生成对话摘要。"},
        ]

        return await self._call_llm(messages, temperature=0.5, max_tokens=512)

    # ------------------------------------------------------------------
    # Placeholder / fallback helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _placeholder_chat_response(messages: list[dict[str, str]]) -> str:
        """Return a placeholder response when the LLM is not configured."""
        last_user_msg = ""
        for msg in reversed(messages):
            if msg.get("role") == "user":
                last_user_msg = msg.get("content", "")
                break
        return (
            f"您好！我是小护，您的智慧医养助手。"
            f"我收到了您的消息：\u201c{last_user_msg[:50]}\u201d。"
            f"目前AI服务正在配置中，稍后将为您提供更好的服务。"
        )

    @staticmethod
    def _parse_intent_response(raw: str) -> dict[str, Any]:
        """Parse the LLM's JSON response into a structured intent dict.

        Handles cases where the LLM wraps JSON in markdown code fences
        or returns slightly malformed output.
        """
        cleaned = raw.strip()
        # Strip markdown code fences if present
        if cleaned.startswith("```"):
            lines = cleaned.split("\n")
            # Remove first and last lines (``` markers)
            lines = [l for l in lines if not l.strip().startswith("```")]
            cleaned = "\n".join(lines).strip()

        try:
            parsed = json.loads(cleaned)
        except json.JSONDecodeError:
            logger.warning("Failed to parse intent JSON: %r", raw[:200])
            return {
                "intent": "general_chat",
                "entities": {},
                "confidence": 0.0,
            }

        # Validate and normalise
        intent = parsed.get("intent", "general_chat")
        if intent not in _INTENT_TYPES:
            intent = "general_chat"

        entities = parsed.get("entities", {})
        if not isinstance(entities, dict):
            entities = {}

        confidence = parsed.get("confidence", 0.0)
        try:
            confidence = float(confidence)
            confidence = max(0.0, min(1.0, confidence))
        except (TypeError, ValueError):
            confidence = 0.0

        return {
            "intent": intent,
            "entities": entities,
            "confidence": confidence,
        }


# Module-level singleton
doubao_service = DoubaoService()
