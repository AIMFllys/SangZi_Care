"""健康广播服务 — 个性化推荐、内容生成、音频合成。

根据用户年龄、慢性病、季节等信息，提供个性化健康广播推荐，
并支持通过豆包LLM生成广播文本、火山引擎TTS合成音频。

需求: 11.1, 11.2, 11.3, 11.4, 11.8
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from services.doubao_service import doubao_service
from services.voice_service import voice_service

logger = logging.getLogger(__name__)

# 广播分类
BROADCAST_CATEGORIES = [
    {"key": "养生保健", "name": "养生保健", "description": "日常养生保健知识"},
    {"key": "慢病管理", "name": "慢病管理", "description": "慢性病管理与防治"},
    {"key": "季节养生", "name": "季节养生", "description": "四季养生要点"},
    {"key": "心理健康", "name": "心理健康", "description": "心理调适与情绪管理"},
    {"key": "饮食营养", "name": "饮食营养", "description": "合理膳食与营养搭配"},
    {"key": "运动健身", "name": "运动健身", "description": "适合老年人的运动方式"},
]


def _get_current_season() -> str:
    """根据当前月份返回季节名称。"""
    month = datetime.now(timezone.utc).month
    if month in (3, 4, 5):
        return "春季"
    elif month in (6, 7, 8):
        return "夏季"
    elif month in (9, 10, 11):
        return "秋季"
    else:
        return "冬季"


def _calculate_age(birth_date: str | None) -> int | None:
    """根据出生日期计算年龄。"""
    if not birth_date:
        return None
    try:
        born = datetime.fromisoformat(birth_date.replace("Z", "+00:00"))
        today = datetime.now(timezone.utc)
        age = today.year - born.year - (
            (today.month, today.day) < (born.month, born.day)
        )
        return age
    except (ValueError, TypeError):
        return None


class HealthBroadcastService:
    """健康广播服务"""

    def build_recommend_filters(self, user: dict) -> dict:
        """根据用户信息构建推荐过滤条件。

        Args:
            user: 用户信息字典，包含 birth_date, chronic_diseases 等字段。

        Returns:
            过滤条件字典，包含 age, diseases, season。
        """
        age = _calculate_age(user.get("birth_date"))
        diseases = user.get("chronic_diseases") or []
        season = _get_current_season()

        return {
            "age": age,
            "diseases": diseases,
            "season": season,
        }

    async def generate_broadcast_text(
        self,
        category: str,
        topic: str | None = None,
        target_diseases: list[str] | None = None,
    ) -> dict[str, str]:
        """使用豆包LLM生成广播文本内容。

        Args:
            category: 广播分类。
            topic: 可选主题。
            target_diseases: 目标慢性病列表。

        Returns:
            {"title": str, "content": str, "ai_prompt": str}
        """
        disease_hint = ""
        if target_diseases:
            disease_hint = f"，特别关注以下慢性病人群：{'、'.join(target_diseases)}"

        topic_hint = f"，主题为：{topic}" if topic else ""

        prompt = (
            f"请为老年人生成一段健康广播内容，分类为「{category}」{topic_hint}{disease_hint}。\n"
            f"要求：\n"
            f"1. 标题简洁明了，不超过20字\n"
            f"2. 内容通俗易懂，适合老年人收听\n"
            f"3. 内容控制在300字以内\n"
            f"4. 语气温暖亲切\n\n"
            f"请严格按以下格式返回：\n"
            f"标题：<标题内容>\n"
            f"内容：<正文内容>"
        )

        messages = [
            {"role": "system", "content": "你是一位专业的老年健康科普编辑，擅长用通俗易懂的语言撰写健康知识。"},
            {"role": "user", "content": prompt},
        ]

        raw = await doubao_service.chat(messages)

        # 解析标题和内容
        title = category
        content = raw
        if "标题：" in raw and "内容：" in raw:
            parts = raw.split("内容：", 1)
            title_part = parts[0]
            content = parts[1].strip() if len(parts) > 1 else raw
            if "标题：" in title_part:
                title = title_part.split("标题：", 1)[1].strip()

        return {
            "title": title,
            "content": content,
            "ai_prompt": prompt,
        }

    async def generate_audio(self, text: str) -> tuple[bytes, float]:
        """使用火山引擎TTS将文本转为音频。

        Args:
            text: 要合成的文本。

        Returns:
            (audio_bytes, estimated_duration_seconds)
        """
        audio_bytes = await voice_service.text_to_speech(
            text=text,
            speed=0.9,  # 老年人适合稍慢语速
            voice_type="zh_female_cancan",
        )
        # 估算音频时长：中文约每秒4个字，0.9倍速
        char_count = len(text)
        estimated_duration = char_count / (4 * 0.9)
        return audio_bytes, round(estimated_duration, 1)


# 模块级单例
health_broadcast_service = HealthBroadcastService()
