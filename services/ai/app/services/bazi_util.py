"""Build bazi summary dict from four pillars (for AI layer)."""

from __future__ import annotations

from typing import Any

STEM_ELEMENT = {
    "甲": "木", "乙": "木", "丙": "火", "丁": "火", "戊": "土",
    "己": "土", "庚": "金", "辛": "金", "壬": "水", "癸": "水",
}

BRANCH_ELEMENT = {
    "子": "水", "丑": "土", "寅": "木", "卯": "木", "辰": "土", "巳": "火",
    "午": "火", "未": "土", "申": "金", "酉": "金", "戌": "土", "亥": "水",
}


def extract_bazi_tags_from_pillars(pillars: dict[str, str]) -> dict[str, Any]:
    day = pillars.get("day", "")
    day_stem = day[0] if day else "甲"
    day_element = STEM_ELEMENT.get(day_stem, "木")
    counts = {"金": 0.0, "木": 0.0, "水": 0.0, "火": 0.0, "土": 0.0}

    for p in [pillars.get("year"), pillars.get("month"), day, pillars.get("hour")]:
        if not p or len(p) < 2:
            continue
        s, b = p[0], p[1]
        if s in STEM_ELEMENT:
            counts[STEM_ELEMENT[s]] += 1
        if b in BRANCH_ELEMENT:
            counts[BRANCH_ELEMENT[b]] += 0.5

    traits: list[str] = []
    if counts["火"] >= 2:
        traits.append("火透")
    if counts["土"] >= 2.5:
        traits.append("土重")
    if counts["水"] < 1:
        traits.append("水弱")

    return {
        "pillars": pillars,
        "dayMaster": day_stem,
        "dayElement": day_element,
        "elementCounts": counts,
        "dominantElement": max(counts, key=counts.get),
        "traits": traits,
    }
