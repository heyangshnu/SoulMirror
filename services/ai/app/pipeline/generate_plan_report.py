"""v4 plan report generation pipeline."""

from __future__ import annotations

import json
import re
import uuid
from typing import Any

from app.services.content_retriever import coverage_level, retrieve_content
from app.services.llm import chat_completion
from app.services.locale_util import is_english
from app.services.safety_check import safety_check_plan
from app.services.tag_extractor import extract_all_tags, tag_labels
from app.services.terminology_strip import terminology_strip_plan

PLAN_SYSTEM_ZH = """你是 SoulMirror 生活方案撰写者。根据内部标签与素材，生成用户可见的生活方案 JSON。

规则：
1. 用户可见文本严禁命理术语（无宫位、星曜、八字、四柱、大限、流年等）
2. 不做医疗、法律、投资、离婚、寿命断言
3. 对孩子只做环境建议，不做终身标签
4. 输出推导感但用生活语言，像朋友在说话
5. 只输出合法 JSON，无 markdown

JSON 格式：
{
  "portrait": "一句话底色（50字内）",
  "stage": "阶段判断（可选，近几年/今年主题）",
  "plans": [{"id":"p1","title":"标题","body":"正文","actions":["行动1"],"phrases":["可选话术"]}],
  "followUpQuestions": ["追问1","追问2"],
  "disclaimer": "安全边界说明"
}"""

PLAN_SYSTEM_EN = """You are SoulMirror's life-plan writer. Generate user-facing plans in English JSON only.

Rules: no metaphysics jargon, no medical/legal/investment claims, warm practical tone.
JSON shape: portrait, stage?, plans[{id,title,body,actions,phrases?}], followUpQuestions[], disclaimer"""


def _topic_title(topic: str, locale: str) -> str:
    if is_english(locale):
        titles = {
            "self_profile": "Your foundation",
            "recent_years": "These years ahead",
            "synastry": "Relationship insight",
            "child_environment": "Child environment",
            "partner_conflict": "Relationship patterns",
            "family_system": "Family system plan",
        }
        return titles.get(topic, "Life plan")
    titles = {
        "self_profile": "你的底色方案",
        "recent_years": "近几年方案",
        "synastry": "关系方案",
        "child_environment": "孩子成长环境",
        "partner_conflict": "关系沟通方案",
        "child": "孩子成长环境",
        "marriage": "关系方案",
        "career": "事业节奏方案",
        "family_system": "家庭系统方案",
        "family": "家庭方案",
    }
    return titles.get(topic, "生活方案")


async def generate_plan_report(
    *,
    topic: str,
    natal: dict[str, Any],
    horoscope: dict[str, Any] | None = None,
    bazi: dict[str, Any] | None = None,
    real_context: dict[str, Any] | None = None,
    locale: str = "zh",
    relation_name: str | None = None,
) -> dict[str, Any]:
    tags = extract_all_tags(bazi=bazi, natal=natal, horoscope=horoscope, real_context=real_context)
    labels = tag_labels(tags)
    snippets, hit_count = retrieve_content(topic, labels, locale=locale or "zh")
    cov = coverage_level(hit_count)

    internal = _build_internal_cards(tags, snippets, cov)

    if cov == "minimal":
        plan = _fallback_minimal(topic, snippets, locale, relation_name)
    else:
        llm_plan = await _llm_plan(topic, tags, snippets, real_context, locale, cov)
        plan = llm_plan if llm_plan else _fallback_from_snippets(topic, snippets, locale, cov, relation_name)

    plan["topic"] = topic
    plan["title"] = _topic_title(topic, locale)
    plan["coverageLevel"] = cov
    plan["testType"] = f"plan_{topic}"
    plan["summary"] = plan.get("portrait", "")
    plan["headlineSummary"] = plan.get("portrait", "")

    if not plan.get("disclaimer"):
        plan["disclaimer"] = (
            "本方案基于传统模型与你提供的现实信息生成，用于自我理解与关系反思，"
            "不替代医学、法律、投资或心理治疗等专业意见。"
            if not is_english(locale)
            else "For self-reflection only—not medical, legal, or financial advice."
        )

    plan = safety_check_plan(plan)
    plan = terminology_strip_plan(plan)
    plan["_internal"] = internal
    return plan


def _build_internal_cards(
    tags: list[dict[str, str]],
    snippets: list[dict[str, Any]],
    cov: str,
) -> list[dict[str, Any]]:
    conf = {"full": 0.85, "partial": 0.6, "minimal": 0.35}.get(cov, 0.5)
    return [
        {
            "id": str(uuid.uuid4())[:8],
            "conclusion": snippets[0].get("productHint", "综合判断") if snippets else "证据不足",
            "sources": [{"type": t["source"], "evidence": t["label"]} for t in tags[:6]],
            "reasoning": [s.get("productHint", "") for s in snippets[:3]],
            "confidence": conf,
            "matchedContentIds": [s.get("id", "") for s in snippets],
        }
    ]


def _fallback_minimal(
    topic: str,
    snippets: list[dict[str, Any]],
    locale: str,
    relation_name: str | None,
) -> dict[str, Any]:
    portrait = snippets[0]["userFacing"] if snippets else (
        "你的底层有清晰的方向感，近期适合先稳住节奏，再逐步推进。"
        if not is_english(locale)
        else "You have clear direction; stabilize rhythm before pushing forward."
    )
    return {
        "portrait": portrait,
        "plans": [
            {
                "id": "p1",
                "title": "给你的方案" if not is_english(locale) else "Your plan",
                "body": "目前信息有限，建议先补充现实背景，我们再做更贴合的判断。"
                if not is_english(locale)
                else "With limited context, add life details for a tighter plan.",
                "actions": [
                    "保证基本休息与节奏",
                    "补充当前最关心的问题",
                ],
            }
        ],
        "followUpQuestions": [
            "为什么会这样？",
            "这几年会持续多久？",
        ] if not is_english(locale) else ["Why is this happening?", "How long might this last?"],
    }


def _fallback_from_snippets(
    topic: str,
    snippets: list[dict[str, Any]],
    locale: str,
    cov: str,
    relation_name: str | None,
) -> dict[str, Any]:
    portrait = snippets[0]["userFacing"] if snippets else "你有自己擅长的节奏与方式。"
    stage = None
    if topic == "recent_years" and len(snippets) > 1:
        stage = snippets[1]["userFacing"]

    plans = []
    for i, s in enumerate(snippets[:3]):
        plans.append({
            "id": f"p{i+1}",
            "title": s.get("productHint", "方案")[:20] or "给你的方案",
            "body": s["userFacing"],
            "actions": s.get("actions") or ["先稳住一件最小的事"],
            "phrases": s.get("phrases"),
        })

    if cov == "partial" and plans:
        plans[0]["body"] += "（部分建议基于目前了解，补充更多信息可获得更贴合方案。）"

    return {
        "portrait": portrait,
        "stage": stage,
        "plans": plans,
        "followUpQuestions": [
            "为什么会这样？",
            "我该怎么开口？",
            "伴侣怎么看？" if relation_name else "这几年要注意什么？",
        ],
    }


async def _llm_plan(
    topic: str,
    tags: list[dict[str, str]],
    snippets: list[dict[str, Any]],
    real_context: dict[str, Any] | None,
    locale: str,
    cov: str,
) -> dict[str, Any] | None:
    system = PLAN_SYSTEM_EN if is_english(locale) else PLAN_SYSTEM_ZH
    user = json.dumps(
        {
            "topic": topic,
            "coverage": cov,
            "tags": tags,
            "snippets": [{"userFacing": s.get("userFacing"), "actions": s.get("actions")} for s in snippets],
            "realContext": real_context,
        },
        ensure_ascii=False,
    )
    raw = await chat_completion(
        [{"role": "system", "content": system}, {"role": "user", "content": user}],
        temperature=0.7,
        max_tokens=2000,
        timeout=120.0,
    )
    if not raw:
        return None
    return _parse_json(raw)


def _parse_json(text: str) -> dict[str, Any] | None:
    text = text.strip()
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if fence:
        text = fence.group(1).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}")
        if start >= 0 and end > start:
            try:
                return json.loads(text[start : end + 1])
            except json.JSONDecodeError:
                return None
    return None
