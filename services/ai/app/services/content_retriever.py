"""Load and retrieve content library entries by locale."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

CONTENT_ROOT = Path(__file__).resolve().parents[2] / "content"


def _locale_dir(locale: str) -> Path:
    loc = "en" if locale and locale.lower().startswith("en") else "zh"
    preferred = CONTENT_ROOT / loc
    if preferred.exists():
        return preferred
    return CONTENT_ROOT


@lru_cache(maxsize=4)
def _load_all_entries(locale: str) -> list[dict[str, Any]]:
    entries: list[dict[str, Any]] = []
    base = _locale_dir(locale)
    # zh/en subdirs first
    for path in base.rglob("entries.json"):
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, list):
                entries.extend(data)
    # legacy flat layout fallback
    if not entries:
        for path in CONTENT_ROOT.rglob("entries.json"):
            if "zh" in path.parts or "en" in path.parts:
                continue
            with open(path, encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list):
                    entries.extend(data)
    loc = "en" if locale and locale.lower().startswith("en") else "zh"
    return [e for e in entries if e.get("locale", loc) == loc or not e.get("locale")]


def retrieve_content(
    topic: str,
    tag_labels: list[str],
    *,
    locale: str = "zh",
    limit: int = 8,
) -> tuple[list[dict[str, Any]], int]:
    all_entries = _load_all_entries(locale)
    if not all_entries and locale.startswith("en"):
        all_entries = _load_all_entries("zh")
    scored: list[tuple[int, dict[str, Any]]] = []

    tag_set = set(tag_labels)
    for entry in all_entries:
        topics = entry.get("topic") or []
        if topic not in topics and not any(t in topics for t in _topic_aliases(topic)):
            continue
        entry_tags = set(entry.get("tags") or [])
        overlap = len(tag_set & entry_tags)
        match = entry.get("match") or {}
        for key, val in match.items():
            if key in tag_labels or str(val) in tag_labels:
                overlap += 2
        if overlap > 0 or topic in topics:
            base = overlap if overlap > 0 else 1
            scored.append((base + int((entry.get("confidenceWeight") or 0.5) * 10), entry))

    scored.sort(key=lambda x: x[0], reverse=True)
    hits = [e for _, e in scored[:limit]]
    return hits, len(scored)


def _topic_aliases(topic: str) -> list[str]:
    aliases = {
        "self_profile": ["career", "marriage"],
        "recent_years": ["career", "family"],
        "synastry": ["partner_conflict", "marriage"],
        "child_environment": ["child", "family"],
        "family_system": ["family", "synastry", "child_environment"],
    }
    return aliases.get(topic, [])


def coverage_level(hit_count: int) -> str:
    if hit_count >= 3:
        return "full"
    if hit_count >= 1:
        return "partial"
    return "minimal"


def clear_cache() -> None:
    _load_all_entries.cache_clear()
