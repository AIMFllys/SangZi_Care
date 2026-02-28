"""Task 7.1 — 验证豆包AI服务模块 (DoubaoService)

Tests:
- chat(): multi-turn conversation with system prompt injection
- recognize_intent(): intent classification and entity extraction
- generate_summary(): conversation summary generation
- Placeholder/fallback behaviour when API is not configured
- Error handling for malformed LLM responses

Requirements: 19.4
"""

from __future__ import annotations

import asyncio
import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from services.doubao_service import DoubaoService, _INTENT_TYPES, _SYSTEM_PROMPT


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _run(coro):
    """Run an async coroutine synchronously."""
    return asyncio.run(coro)


def _make_service(*, configured: bool = False) -> DoubaoService:
    """Create a DoubaoService with optional fake configuration."""
    svc = DoubaoService()
    if configured:
        svc.api_key = "test-api-key"
        svc.model_endpoint = "test-endpoint-id"
    else:
        svc.api_key = ""
        svc.model_endpoint = ""
    return svc


# ===================================================================
# chat() tests
# ===================================================================


class TestChat:
    """Tests for DoubaoService.chat()."""

    def test_chat_returns_string(self):
        """chat() returns a non-empty string response."""
        svc = _make_service(configured=False)
        result = _run(svc.chat(
            [{"role": "user", "content": "你好"}],
            user_id="user-1",
        ))
        assert isinstance(result, str)
        assert len(result) > 0

    def test_chat_placeholder_includes_user_message(self):
        """Placeholder response echoes part of the user's message."""
        svc = _make_service(configured=False)
        result = _run(svc.chat(
            [{"role": "user", "content": "今天天气怎么样"}],
            user_id="user-1",
        ))
        assert "今天天气怎么样" in result

    def test_chat_prepends_system_prompt(self):
        """When no system message is provided, the default is prepended."""
        svc = _make_service(configured=True)

        captured_messages = []

        async def mock_post(url, *, headers=None, json=None):
            captured_messages.append(json["messages"])
            mock_resp = MagicMock()
            mock_resp.status_code = 200
            mock_resp.raise_for_status = MagicMock()
            mock_resp.json.return_value = {
                "choices": [{"message": {"content": "你好！"}}]
            }
            return mock_resp

        with patch("httpx.AsyncClient.post", side_effect=mock_post):
            _run(svc.chat(
                [{"role": "user", "content": "你好"}],
                user_id="user-1",
            ))

        assert len(captured_messages) == 1
        msgs = captured_messages[0]
        assert msgs[0]["role"] == "system"
        assert msgs[0]["content"] == _SYSTEM_PROMPT

    def test_chat_preserves_existing_system_prompt(self):
        """When a system message is already present, it is not duplicated."""
        svc = _make_service(configured=True)

        captured_messages = []

        async def mock_post(url, *, headers=None, json=None):
            captured_messages.append(json["messages"])
            mock_resp = MagicMock()
            mock_resp.status_code = 200
            mock_resp.raise_for_status = MagicMock()
            mock_resp.json.return_value = {
                "choices": [{"message": {"content": "回复"}}]
            }
            return mock_resp

        custom_system = "你是一个测试助手"
        with patch("httpx.AsyncClient.post", side_effect=mock_post):
            _run(svc.chat(
                [
                    {"role": "system", "content": custom_system},
                    {"role": "user", "content": "测试"},
                ],
                user_id="user-1",
            ))

        msgs = captured_messages[0]
        assert msgs[0]["role"] == "system"
        assert msgs[0]["content"] == custom_system
        # Should not have a second system message
        system_count = sum(1 for m in msgs if m["role"] == "system")
        assert system_count == 1

    def test_chat_configured_calls_api(self):
        """When configured, chat() calls the Ark API and returns the response."""
        svc = _make_service(configured=True)

        async def mock_post(url, *, headers=None, json=None):
            mock_resp = MagicMock()
            mock_resp.status_code = 200
            mock_resp.raise_for_status = MagicMock()
            mock_resp.json.return_value = {
                "choices": [{"message": {"content": "我是小护，很高兴为您服务！"}}]
            }
            return mock_resp

        with patch("httpx.AsyncClient.post", side_effect=mock_post):
            result = _run(svc.chat(
                [{"role": "user", "content": "你好"}],
                user_id="user-1",
            ))

        assert result == "我是小护，很高兴为您服务！"

    def test_chat_api_error_raises_runtime_error(self):
        """HTTP errors from the API raise RuntimeError."""
        svc = _make_service(configured=True)

        import httpx

        async def mock_post(url, *, headers=None, json=None):
            response = httpx.Response(500, request=httpx.Request("POST", url), text="Internal Error")
            raise httpx.HTTPStatusError("error", request=response.request, response=response)

        with patch("httpx.AsyncClient.post", side_effect=mock_post):
            with pytest.raises(RuntimeError, match="请求失败"):
                _run(svc.chat(
                    [{"role": "user", "content": "你好"}],
                    user_id="user-1",
                ))

    def test_chat_network_error_raises_runtime_error(self):
        """Network errors raise RuntimeError."""
        svc = _make_service(configured=True)

        import httpx

        async def mock_post(url, *, headers=None, json=None):
            raise httpx.ConnectError("connection refused")

        with patch("httpx.AsyncClient.post", side_effect=mock_post):
            with pytest.raises(RuntimeError, match="不可用"):
                _run(svc.chat(
                    [{"role": "user", "content": "你好"}],
                    user_id="user-1",
                ))


# ===================================================================
# recognize_intent() tests
# ===================================================================


class TestRecognizeIntent:
    """Tests for DoubaoService.recognize_intent()."""

    def test_intent_returns_dict_with_required_keys(self):
        """recognize_intent() returns a dict with intent, entities, confidence."""
        svc = _make_service(configured=False)
        result = _run(svc.recognize_intent("今天吃什么药", user_id="user-1"))
        assert isinstance(result, dict)
        assert "intent" in result
        assert "entities" in result
        assert "confidence" in result

    def test_intent_empty_text_returns_general_chat(self):
        """Empty text returns general_chat with zero confidence."""
        svc = _make_service(configured=False)
        result = _run(svc.recognize_intent("", user_id="user-1"))
        assert result["intent"] == "general_chat"
        assert result["confidence"] == 0.0

    def test_intent_whitespace_only_returns_general_chat(self):
        """Whitespace-only text returns general_chat."""
        svc = _make_service(configured=False)
        result = _run(svc.recognize_intent("   ", user_id="user-1"))
        assert result["intent"] == "general_chat"
        assert result["confidence"] == 0.0

    def test_intent_configured_parses_valid_json(self):
        """When the LLM returns valid JSON, it is parsed correctly."""
        svc = _make_service(configured=True)

        llm_response = json.dumps({
            "intent": "health_record",
            "entities": {"record_type": "blood_pressure", "values": {"systolic": 135, "diastolic": 88}},
            "confidence": 0.95,
        })

        async def mock_post(url, *, headers=None, json=None):
            mock_resp = MagicMock()
            mock_resp.status_code = 200
            mock_resp.raise_for_status = MagicMock()
            mock_resp.json.return_value = {
                "choices": [{"message": {"content": llm_response}}]
            }
            return mock_resp

        with patch("httpx.AsyncClient.post", side_effect=mock_post):
            result = _run(svc.recognize_intent("高压135低压88", user_id="user-1"))

        assert result["intent"] == "health_record"
        assert result["entities"]["record_type"] == "blood_pressure"
        assert result["confidence"] == 0.95

    def test_intent_handles_markdown_code_fences(self):
        """JSON wrapped in markdown code fences is parsed correctly."""
        svc = _make_service(configured=False)

        raw = '```json\n{"intent": "make_call", "entities": {"target_relation": "女儿"}, "confidence": 0.9}\n```'
        result = svc._parse_intent_response(raw)
        assert result["intent"] == "make_call"
        assert result["entities"]["target_relation"] == "女儿"

    def test_intent_handles_malformed_json(self):
        """Malformed JSON falls back to general_chat."""
        svc = _make_service(configured=False)

        result = svc._parse_intent_response("this is not json at all")
        assert result["intent"] == "general_chat"
        assert result["entities"] == {}
        assert result["confidence"] == 0.0

    def test_intent_unknown_type_falls_back(self):
        """Unknown intent type falls back to general_chat."""
        svc = _make_service(configured=False)

        raw = json.dumps({"intent": "unknown_type", "entities": {}, "confidence": 0.8})
        result = svc._parse_intent_response(raw)
        assert result["intent"] == "general_chat"

    def test_intent_confidence_clamped(self):
        """Confidence values are clamped to [0.0, 1.0]."""
        svc = _make_service(configured=False)

        raw = json.dumps({"intent": "emergency", "entities": {}, "confidence": 1.5})
        result = svc._parse_intent_response(raw)
        assert result["confidence"] == 1.0

        raw2 = json.dumps({"intent": "emergency", "entities": {}, "confidence": -0.5})
        result2 = svc._parse_intent_response(raw2)
        assert result2["confidence"] == 0.0

    def test_intent_all_types_accepted(self):
        """All defined intent types are accepted without fallback."""
        svc = _make_service(configured=False)
        for intent_type in _INTENT_TYPES:
            raw = json.dumps({"intent": intent_type, "entities": {}, "confidence": 0.8})
            result = svc._parse_intent_response(raw)
            assert result["intent"] == intent_type


# ===================================================================
# generate_summary() tests
# ===================================================================


class TestGenerateSummary:
    """Tests for DoubaoService.generate_summary()."""

    def test_summary_empty_conversations_returns_empty(self):
        """Empty conversation list returns empty string."""
        svc = _make_service(configured=False)
        result = _run(svc.generate_summary([], user_id="user-1"))
        assert result == ""

    def test_summary_returns_string(self):
        """generate_summary() returns a non-empty string."""
        svc = _make_service(configured=False)
        conversations = [
            {"role": "user", "content": "我今天血压有点高"},
            {"role": "assistant", "content": "别担心，我帮您记录下来"},
        ]
        result = _run(svc.generate_summary(conversations, user_id="user-1"))
        assert isinstance(result, str)
        assert len(result) > 0

    def test_summary_configured_calls_api(self):
        """When configured, generate_summary() calls the Ark API."""
        svc = _make_service(configured=True)

        async def mock_post(url, *, headers=None, json=None):
            mock_resp = MagicMock()
            mock_resp.status_code = 200
            mock_resp.raise_for_status = MagicMock()
            mock_resp.json.return_value = {
                "choices": [{"message": {"content": "老人今天关注血压健康，情绪稳定。"}}]
            }
            return mock_resp

        conversations = [
            {"role": "user", "content": "我今天血压有点高"},
            {"role": "assistant", "content": "别担心，我帮您记录下来"},
        ]

        with patch("httpx.AsyncClient.post", side_effect=mock_post):
            result = _run(svc.generate_summary(conversations, user_id="user-1"))

        assert "血压" in result


# ===================================================================
# _is_configured property tests
# ===================================================================


class TestConfiguration:
    """Tests for configuration detection."""

    def test_not_configured_when_empty(self):
        """Service is not configured when keys are empty."""
        svc = _make_service(configured=False)
        assert svc._is_configured is False

    def test_configured_when_keys_set(self):
        """Service is configured when both keys are set."""
        svc = _make_service(configured=True)
        assert svc._is_configured is True

    def test_not_configured_missing_endpoint(self):
        """Service is not configured when only API key is set."""
        svc = DoubaoService()
        svc.api_key = "some-key"
        svc.model_endpoint = ""
        assert svc._is_configured is False

    def test_not_configured_missing_api_key(self):
        """Service is not configured when only endpoint is set."""
        svc = DoubaoService()
        svc.api_key = ""
        svc.model_endpoint = "some-endpoint"
        assert svc._is_configured is False
