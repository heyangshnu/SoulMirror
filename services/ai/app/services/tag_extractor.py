"""Extract evidence tags from chart data (internal layer)."""

from __future__ import annotations

from typing import Any


def extract_bazi_tags(bazi: dict[str, Any] | None) -> list[dict[str, str]]:
    if not bazi:
        return []
    tags: list[dict[str, str]] = []
    day_el = bazi.get("dayElement", "")
    if day_el:
        tags.append({"source": "BZ", "label": f"日主{day_el}", "id": "bz_day"})
    for trait in bazi.get("traits") or []:
        tags.append({"source": "BZ", "label": trait, "id": f"bz_{trait[:4]}"})
    counts = bazi.get("elementCounts") or {}
    if counts.get("水", 0) < 1:
        tags.append({"source": "BZ", "label": "水弱", "id": "bz_water_weak"})
    if counts.get("火", 0) >= 2:
        tags.append({"source": "BZ", "label": "火透", "id": "bz_fire"})
    if counts.get("土", 0) >= 2.5:
        tags.append({"source": "BZ", "label": "土重", "id": "bz_earth"})
    return tags


def extract_ziwei_natal_tags(natal: dict[str, Any]) -> list[dict[str, str]]:
    tags: list[dict[str, str]] = []
    palaces = natal.get("palaces") or []
    for p in palaces:
        name = p.get("name", "")
        stars = p.get("majorStars") or []
        if name == "命宫" and stars:
            tags.append({
                "source": "ZW-M",
                "label": f"命宫 {' '.join(stars)}",
                "id": "zw_ming",
            })
            for s in stars:
                tags.append({"source": "ZW-M", "label": s, "id": f"star_{s}"})
        if name == "事业宫" and stars:
            tags.append({"source": "ZW-M", "label": "事业宫强", "id": "zw_career"})
        if name == "福德宫" and "巨门" in stars:
            tags.append({"source": "ZW-M", "label": "福德巨门", "id": "zw_fude_jumen"})
    return tags


def extract_horoscope_tags(horoscope: dict[str, Any] | None) -> list[dict[str, str]]:
    if not horoscope:
        return []
    tags: list[dict[str, str]] = []
    decadal = horoscope.get("decadal") or {}
    palace = decadal.get("palace", "")
    if palace:
        tags.append({
            "source": "ZW-D",
            "label": f"大限{palace}",
            "id": f"zw_d_{palace}",
        })
    yearly = horoscope.get("yearly") or {}
    y_palace = yearly.get("palace", "")
    if y_palace:
        tags.append({
            "source": "ZW-Y",
            "label": f"流年{y_palace}",
            "id": f"zw_y_{y_palace}",
        })
    return tags


def extract_real_tags(real_context: dict[str, Any] | None) -> list[dict[str, str]]:
    if not real_context:
        return []
    tags: list[dict[str, str]] = []
    mapping = [
        ("relationshipStatus", "关系状态"),
        ("hasChildren", "有孩子"),
        ("childAge", "孩子年龄"),
        ("financialPressure", "财务压力"),
        ("cityChangeRecently", "城市变动"),
        ("partnerNotes", "伴侣补充"),
        ("currentConflict", "当前冲突"),
        ("currentState", "当前状态"),
        ("focusDirection", "关注方向"),
    ]
    for key, label in mapping:
        val = real_context.get(key)
        if val is not None and val != "" and val is not False:
            tags.append({"source": "REAL", "label": f"{label}:{val}", "id": f"real_{key}"})
    if real_context.get("freeText"):
        tags.append({"source": "REAL", "label": "自由补充", "id": "real_free"})
    return tags


def extract_all_tags(
    *,
    bazi: dict[str, Any] | None,
    natal: dict[str, Any],
    horoscope: dict[str, Any] | None,
    real_context: dict[str, Any] | None,
) -> list[dict[str, str]]:
    tags: list[dict[str, str]] = []
    tags.extend(extract_bazi_tags(bazi))
    tags.extend(extract_ziwei_natal_tags(natal))
    tags.extend(extract_horoscope_tags(horoscope))
    tags.extend(extract_real_tags(real_context))
    return tags


def tag_labels(tags: list[dict[str, str]]) -> list[str]:
    labels: list[str] = []
    for t in tags:
        labels.append(t["label"])
        labels.append(t.get("source", ""))
    return labels
