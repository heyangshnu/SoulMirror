"""Safety checks per v4 ethics doc."""

from __future__ import annotations

import re
from typing import Any

FORBIDDEN_PATTERNS = [
    r"必(定|会|然).*(离婚|分手|死亡|大病|破产)",
    r"(寿命|寿元|活不过)",
    r"(一定|必然).*(考上|考不上|成为)",
    r"建议(投资|贷款|借贷|加仓)",
    r"(佩戴|穿戴).*(补|化解)",
]

CRISIS_HINTS = ["自伤", "自杀", "不想活", "伤害自己"]


def safety_check_plan(plan: dict[str, Any]) -> dict[str, Any]:
    texts = _collect_texts(plan)
    for text in texts:
        for pat in FORBIDDEN_PATTERNS:
            if re.search(pat, text):
                return _safe_fallback(plan)
        for hint in CRISIS_HINTS:
            if hint in text:
                plan["disclaimer"] = (
                    "如果你正在经历严重情绪困扰，请寻求身边人或专业支持。"
                    + (plan.get("disclaimer") or "")
                )
    return plan


def _collect_texts(obj: Any) -> list[str]:
    if isinstance(obj, str):
        return [obj]
    if isinstance(obj, dict):
        out: list[str] = []
        for v in obj.values():
            out.extend(_collect_texts(v))
        return out
    if isinstance(obj, list):
        out: list[str] = []
        for i in obj:
            out.extend(_collect_texts(i))
        return out
    return []


def _safe_fallback(plan: dict[str, Any]) -> dict[str, Any]:
    plan["plans"] = [
        {
            "id": "safe_1",
            "title": "给你的方案",
            "body": "基于目前信息，更适合先做节奏管理与沟通调整，避免在压力下做重大决定。",
            "actions": ["保证基本休息", "重大议题分开讨论", "必要时寻求专业支持"],
        }
    ]
    plan["coverageLevel"] = "minimal"
    return plan
