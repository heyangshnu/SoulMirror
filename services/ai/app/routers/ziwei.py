"""紫微斗数报告生成（三合派 / iztro 结构化数据 → LLM 解读）"""

import json
from typing import Any, Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services.locale_util import is_english
from app.services.report_llm import generate_ziwei_report

router = APIRouter()

RELATION_LABELS = {
    "spouse": "配偶",
    "child": "子女",
    "parent": "父母",
    "sibling": "兄弟姐妹",
    "other": "其他关系",
}


class NatalReportBody(BaseModel):
    natal: dict[str, Any]
    lifeContext: Optional[dict[str, Any]] = None
    tone: str = "healing"
    locale: str = "zh"


class DaxianReportBody(BaseModel):
    natal: dict[str, Any]
    horoscope: dict[str, Any]
    personalContext: str | None = None
    locale: str = "zh"


class LiunianReportBody(BaseModel):
    natal: dict[str, Any]
    horoscope: dict[str, Any]
    flyingStar: str | dict[str, Any] | None = None
    year: int
    personalContext: str | None = None
    locale: str = "zh"


class RelationReportBody(BaseModel):
    ownerNatal: dict[str, Any]
    targetNatal: dict[str, Any]
    relationType: str
    relationName: str
    flyingStar: str | dict[str, Any] | None = None
    personalContext: str | None = None
    locale: str = "zh"


class SummarizeChatBody(BaseModel):
    messages: list[dict[str, str]] = Field(default_factory=list)
    locale: str = "zh"


def _personal_context(life: dict[str, Any] | None, explicit: str | None = None) -> str | None:
    parts: list[str] = []
    if life:
        if life.get("currentState"):
            parts.append(f"当前状态：{life['currentState']}")
        if life.get("focusDirection"):
            parts.append(f"想测算的方向：{life['focusDirection']}")
    if explicit:
        parts.append(explicit)
    return "\n".join(parts) if parts else None


def _natal_context(natal: dict[str, Any]) -> str:
    palaces = natal.get("palaces") or []
    palace_text = "\n".join(
        f"- {p.get('name')}：主星 {', '.join(p.get('majorStars') or [])}"
        for p in palaces[:12]
    )
    return f"""阳历：{natal.get('solarDate')}
农历：{natal.get('lunarDate')}
时辰：{natal.get('timeRange')} {'（时辰未知，解读需谨慎）' if natal.get('timeUnknown') else ''}
五行局：{natal.get('fiveElementsClass')}
命宫：{natal.get('soul')} / 身宫：{natal.get('body')}
四柱：{' '.join((natal.get('pillars') or {}).values())}
真太阳时：{'已校正' if natal.get('trueSolarTimeApplied') else '未校正'}
宫位：
{palace_text}"""


@router.post("/natal-report")
async def natal_report(body: NatalReportBody):
    ctx = _natal_context(body.natal)
    if body.lifeContext:
        lc = body.lifeContext
        if lc.get("chatSummary"):
            ctx += f"\n\n近期聊天摘要：{lc['chatSummary']}"
        if lc.get("weeklyFocus"):
            ctx += f"\n本周焦点：{lc['weeklyFocus']}"
        if lc.get("voiceDiaryEntries"):
            ctx += f"\n语音日记：{'；'.join(lc['voiceDiaryEntries'][-3:])}"

    fallback = {
        "title": "本命觉察报告",
        "summary": "基于你的命盘结构，看见当下的内在节奏与成长课题。",
        "themeLabel": "觉察",
        "sections": [
            {"title": "核心气质", "content": "你的命盘显示内在敏感而细腻，善于感知环境与他人的情绪。这不是弱点，而是一种天赋——当你学会边界与自我照顾，这份感知力会成为滋养他人的源泉。"},
            {"title": "事业课题", "content": "职业发展上，宜寻找能发挥创意与沟通优势的领域。不必急于一次到位，阶段性积累比速成更符合你的节奏。"},
            {"title": "感情课题", "content": "亲密关系中，你渴望被理解也害怕受伤。练习直接表达需求，比猜测与试探更能建立安全感。"},
            {"title": "身心照顾", "content": "规律作息与适度运动，能帮助你稳定情绪波动。当感到 overwhelmed 时，允许自己暂停而非硬撑。"},
        ],
    }
    return await generate_ziwei_report(
        "ziwei_natal",
        ctx,
        raw={"natal": body.natal},
        fallback=fallback,
        personal_context=_personal_context(body.lifeContext),
        locale=body.locale,
    )


@router.post("/daxian-report")
async def daxian_report(body: DaxianReportBody):
    h = body.horoscope
    decadal = h.get("decadal") or {}
    ctx = f"""{_natal_context(body.natal)}

当前年龄：{h.get('currentAge')}
大限：{decadal.get('range')} · 大限命宫 {decadal.get('palace')}
大限主星：{', '.join(decadal.get('majorStars') or [])}"""
    fallback = {
        "title": "大限觉察报告",
        "summary": f"当前大限 {decadal.get('range', '')}，聚焦阶段性成长主题。",
        "themeLabel": "大限",
        "sections": [
            {"title": "阶段主题", "content": "这一大限是整合与突破并存的时期。外在环境可能推动你做出选择，内在则需要厘清什么真正重要。"},
            {"title": "事业方向", "content": "适合在已有基础上深耕，而非频繁转向。积累专业度与人脉，会为下一阶段铺路。"},
            {"title": "关系成长", "content": "亲密关系与家庭议题可能被放大。以诚实沟通代替回避，是穿越课题的关键。"},
            {"title": "自我照顾", "content": "压力增大时，优先保证睡眠与可执行的小习惯。不必一次解决所有问题。"},
        ],
    }
    return await generate_ziwei_report(
        "ziwei_daxian",
        ctx,
        raw={"horoscope": body.horoscope},
        fallback=fallback,
        personal_context=body.personalContext,
        locale=body.locale,
    )


@router.post("/liunian-report")
async def liunian_report(body: LiunianReportBody):
    yearly = body.horoscope.get("yearly") or {}
    ctx = f"""{_natal_context(body.natal)}

流年：{body.year}
流年命宫：{yearly.get('palace')}
流年主星：{', '.join(yearly.get('majorStars') or [])}
流年四化：{', '.join(yearly.get('mutagen') or [])}"""
    if body.flyingStar:
        ctx += f"\n飞星四化附录：{json.dumps(body.flyingStar, ensure_ascii=False)}"

    fallback = {
        "title": f"{body.year} 流年觉察",
        "summary": f"{body.year} 年宜聚焦当下可改变之事，以温和步伐推进。",
        "themeLabel": "流年",
        "sections": [
            {"title": "年度基调", "content": "这一年整体能量偏向内省与调整。适合梳理优先级，减少无效消耗。"},
            {"title": "工作学习", "content": "宜稳中求进，把握 2–3 个核心目标即可。完成比完美更重要。"},
            {"title": "情感人际", "content": "表达边界与感谢，能化解不少误会。不必讨好所有人。"},
            {"title": "身心状态", "content": "留意季节性情绪波动，适度户外与社交有助平衡。"},
            {"title": "飞星四化附录", "content": "四化飞星为进阶参考：化禄主机缘、化权主掌控、化科主名声、化忌主课题（非凶兆，而是需要温柔面对的功课）。"},
        ],
    }
    return await generate_ziwei_report(
        "ziwei_liunian",
        ctx,
        raw={"year": body.year},
        fallback=fallback,
        personal_context=body.personalContext,
        locale=body.locale,
    )


@router.post("/relation-report")
async def relation_report(body: RelationReportBody):
    label = RELATION_LABELS.get(body.relationType, "关系")
    ctx = f"""本人命盘：
{_natal_context(body.ownerNatal)}

{label}（{body.relationName}）命盘：
{_natal_context(body.targetNatal)}"""
    if body.flyingStar:
        ctx += f"\n飞星四化附录：{json.dumps(body.flyingStar, ensure_ascii=False)}"

    fallback = {
        "title": f"与{body.relationName}的关系觉察",
        "summary": f"从命盘互动看见与{label}之间的相处模式与成长空间。",
        "themeLabel": "缘分",
        "sections": [
            {"title": "互动模式", "content": "你们在情感表达与需求优先级上可能存在差异。差异本身不是问题，关键在于是否愿意翻译彼此的语言。"},
            {"title": "支持彼此", "content": "一方需要空间时，另一方可练习不将其解读为拒绝。定期简短对齐期待，比积累猜测更有效。"},
            {"title": "课题提醒", "content": "命盘中的「忌」在此语境下指待整合的课题，如控制、依赖或回避。以好奇取代评判。"},
            {"title": "飞星四化附录", "content": "四化飞星可辅助观察互动中的能量流向，仅供觉察参考。"},
        ],
    }
    return await generate_ziwei_report(
        "ziwei_relation",
        ctx,
        raw={"relationType": body.relationType},
        fallback=fallback,
        personal_context=body.personalContext,
        locale=body.locale,
    )


@router.post("/summarize-chat")
async def summarize_chat(body: SummarizeChatBody):
    if not body.messages:
        return {"summary": ""}

    from app.services.llm import chat_completion

    if is_english(body.locale):
        transcript = "\n".join(
            f"{m.get('role', 'user')}: {m.get('content', '')}" for m in body.messages[-20:]
        )
        system = (
            "You summarize SoulMirror chats in under 80 words in English: "
            "emotions, concerns, and themes for chart context. No diagnosis or fate claims."
        )
        default = "Recent chats explore self-understanding and relationships."
    else:
        transcript = "\n".join(f"{m.get('role', 'user')}：{m.get('content', '')}" for m in body.messages[-20:])
        system = "你是心镜平台的对话摘要助手。用 80 字内中文概括用户近期聊天中的情绪、困惑与关注点，供命盘解读参考。不要诊断，不断言命运。"
        default = "近期对话中，用户在探索自我与关系议题。"
    text = await chat_completion(
        [
            {"role": "system", "content": system},
            {"role": "user", "content": transcript},
        ],
        temperature=0.3,
        max_tokens=200,
    )
    return {"summary": text or default}
