"""Analyze uploaded chat transcripts for communication patterns (CHAT layer)."""

from __future__ import annotations

import re
from typing import Any

from app.services.llm import chat_completion
from app.services.locale_util import is_english


def _heuristic_analysis(text: str, locale: str) -> dict[str, Any]:
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    fact_markers = ("因为", "所以", "其实", "数据", "because", "actually", "the fact")
    feeling_markers = ("感觉", "觉得", "委屈", "累", "feel", "felt", "tired", "hurt")
    judge_markers = ("应该", "不对", "错了", "always", "never", "wrong", "should")

    patterns: list[str] = []
    escalation_idx = None
    for i, ln in enumerate(lines):
        low = ln.lower()
        if any(m in low for m in judge_markers):
            patterns.append(f"judgment@{i+1}")
        if any(m in low for m in feeling_markers):
            patterns.append(f"feeling@{i+1}")
        if any(m in low for m in fact_markers):
            patterns.append(f"fact@{i+1}")

    for i in range(1, len(lines)):
        a, b = lines[i - 1], lines[i]
        if ("?" in b or "？" in b) and any(m in a for m in judge_markers):
            escalation_idx = i + 1
            break

    if is_english(locale):
        summary = "The chat shows a mix of facts, feelings, and quick judgments."
        if escalation_idx:
            summary += f" Tension may escalate around line {escalation_idx}."
        tags = [
            {"source": "CHAT", "label": "communication_pattern", "id": "chat_pattern"},
        ]
        recommendations = [
            "Pause before replying to judgment triggers",
            "Name the feeling before the solution",
        ]
    else:
        summary = "对话里同时出现事实、感受与快速判断。"
        if escalation_idx:
            summary += f" 紧张可能在第 {escalation_idx} 行附近升级。"
        tags = [{"source": "CHAT", "label": "沟通模式", "id": "chat_pattern"}]
        recommendations = ["在判断触发时先暂停", "先命名感受，再给方案"]

    return {
        "summary": summary,
        "patterns": list(set(patterns))[:8],
        "escalationLine": escalation_idx,
        "tags": tags,
        "recommendations": recommendations,
    }


async def analyze_chat_upload(text: str, *, locale: str = "zh") -> dict[str, Any]:
    text = text.strip()
    if not text:
        return {"summary": "", "patterns": [], "tags": [], "recommendations": []}

    if len(text) < 400:
        return _heuristic_analysis(text, locale)

    system = (
        "Analyze a relationship chat transcript. Output JSON only: "
        "{summary, patterns[], escalationLine?, recommendations[]}. "
        "No metaphysics. Identify fact vs feeling vs judgment and escalation point."
    )
    if is_english(locale):
        user = f"Locale: en\nTranscript:\n{text[:6000]}"
    else:
        user = f"语言：zh\n对话：\n{text[:6000]}"

    raw = await chat_completion(
        [{"role": "system", "content": system}, {"role": "user", "content": user}],
        temperature=0.3,
        max_tokens=800,
    )
    if not raw:
        return _heuristic_analysis(text, locale)

    import json

    try:
        m = re.search(r"\{[\s\S]*\}", raw)
        data = json.loads(m.group(0) if m else raw)
        data["tags"] = [{"source": "CHAT", "label": "uploaded_chat", "id": "chat_upload"}]
        return data
    except Exception:
        return _heuristic_analysis(text, locale)
