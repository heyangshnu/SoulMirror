"""Follow-up conversation router (v4 three-layer flow)."""

from __future__ import annotations

from typing import Any, Optional

from fastapi import APIRouter
from pydantic import BaseModel

from app.services.llm import chat_completion
from app.services.locale_util import is_english
from app.services.safety_check import safety_check_plan
from app.services.terminology_strip import terminology_strip_plan

router = APIRouter()


class FollowUpBody(BaseModel):
    message: str
    topic: str = "self_profile"
    planCardId: Optional[str] = None
    planContext: Optional[str] = None
    realContext: Optional[dict[str, Any]] = None
    history: list[dict[str, str]] = []
    locale: str = "zh"
    layer: int = 1  # 1=短判断 2=补现实 3=更新方案


FOLLOWUP_SYSTEM_ZH = """你是 SoulMirror 方案追问助手。三层对话：
1. 短判断：生活语言，80字内，不吓人，无命理术语
2. 若信息不足：温和追问现实背景（关系、孩子、财务、城市）
3. 若有足够信息：给出1条可执行建议

重要：
- 方案背景仅供理解，禁止复读、改写或重复其中的比喻（如火、方向、底盘等）
- 必须针对用户「当前这一句」和对话历史回应，答所问
- 用户质疑重复时，直接承认并换角度，追问具体情境

严禁：宫位、星曜、八字、吉凶、寿命、疾病、投资建议。
只输出 JSON：{"reply":"...", "needsRealContext":bool, "suggestedQuestions":["..."],"actionTip":"..."}"""

FOLLOWUP_SYSTEM_EN = """SoulMirror follow-up assistant. Short, warm, no jargon.
Do NOT repeat metaphors from the plan background—answer the user's latest message and history.
Output JSON: reply, needsRealContext, suggestedQuestions, actionTip"""


def _normalize_history(history: list[dict[str, str]]) -> list[dict[str, str]]:
    out: list[dict[str, str]] = []
    for item in history[-16:]:
        role = (item.get("role") or "").strip()
        content = (item.get("content") or "").strip()
        if role in ("user", "assistant") and content:
            out.append({"role": role, "content": content})
    return out


@router.post("/ask")
async def followup_ask(body: FollowUpBody):
    en = is_english(body.locale)
    system = FOLLOWUP_SYSTEM_EN if en else FOLLOWUP_SYSTEM_ZH
    context_block = ""
    if body.planContext:
        label = "Plan background (reference only, do not repeat):" if en else "方案背景（仅供理解，禁止复读）："
        context_block = f"{label}\n{body.planContext}\n\n"
    real_label = "Real-life context:" if en else "现实补充："
    user_content = (
        f"{context_block}"
        f"{'Topic' if en else '主题'}：{body.topic}\n"
        f"{'Real-life context' if en else '现实补充'}：{body.realContext or {}}\n"
        f"{'Dialogue layer' if en else '对话层'}：{body.layer}\n"
        f"{'User asks' if en else '用户问'}：{body.message}"
    )
    messages: list[dict[str, str]] = [{"role": "system", "content": system}]
    messages.extend(_normalize_history(body.history))
    messages.append({"role": "user", "content": user_content})
    raw = await chat_completion(
        messages,
        temperature=0.75,
        max_tokens=500,
    )
    if not raw:
        reply = (
            "这个问题需要结合你现在的具体情况来看。你愿意补充一下最近最困扰你的一件事吗？"
            if not is_english(body.locale)
            else "I'd need a bit more context—what's weighing on you most lately?"
        )
        return {"reply": reply, "needsRealContext": True, "suggestedQuestions": [], "actionTip": ""}

    import json
    import re

    try:
        text = raw.strip()
        fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
        if fence:
            text = fence.group(1)
        data = json.loads(text)
    except Exception:
        data = {"reply": raw[:200], "needsRealContext": False}

    plan = {"portrait": data.get("reply", ""), "plans": [], "followUpQuestions": data.get("suggestedQuestions") or []}
    plan = terminology_strip_plan(plan)
    plan = safety_check_plan(plan)
    data["reply"] = plan.get("portrait") or data.get("reply", "")
    return data
