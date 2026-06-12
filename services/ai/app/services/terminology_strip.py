"""Strip metaphysics terminology from user-facing text."""

from __future__ import annotations

import re
from typing import Any

FORBIDDEN_TERMS = [
    "宫位", "四化", "大限", "流年", "命宫", "身宫", "夫妻宫", "子女宫", "福德宫",
    "事业宫", "迁移宫", "田宅宫", "武曲", "七杀", "紫微", "天机", "天梁", "天同",
    "太阴", "巨门", "廉贞", "贪狼", "化禄", "化权", "化科", "化忌",
    "甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸",
    "子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥",
    "八字", "斗数", "星曜", "日主", "十神", "五行", "乾造", "坤造",
    "[BZ]", "[ZW-M]", "[ZW-D]", "[ZW-Y]", "[REAL]", "[SYN]",
]

REPLACEMENTS = [
    (r"迁移大限", "外部扩张阶段"),
    (r"子女大限", "家庭育儿阶段"),
    (r"命盘", "底层结构"),
    (r"流年", "今年"),
    (r"大限", "这几年"),
]


def terminology_strip_plan(plan: dict[str, Any]) -> dict[str, Any]:
    plan["portrait"] = _strip(plan.get("portrait", ""))
    if plan.get("stage"):
        plan["stage"] = _strip(plan["stage"])
    for card in plan.get("plans") or []:
        card["title"] = _strip(card.get("title", ""))
        card["body"] = _strip(card.get("body", ""))
        card["actions"] = [_strip(a) for a in card.get("actions") or []]
        if card.get("phrases"):
            card["phrases"] = [_strip(p) for p in card["phrases"]]
    plan["followUpQuestions"] = [_strip(q) for q in plan.get("followUpQuestions") or []]
    return plan


def _strip(text: str) -> str:
    if not text:
        return text
    for pat, repl in REPLACEMENTS:
        text = re.sub(pat, repl, text)
    for term in FORBIDDEN_TERMS:
        if len(term) <= 1:
            continue
        text = text.replace(term, "")
    text = re.sub(r"\s{2,}", " ", text).strip()
    return text
