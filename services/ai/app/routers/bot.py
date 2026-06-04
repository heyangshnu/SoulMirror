from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
import re

from app.services.crisis import check_crisis
from app.services.llm import chat_completion, stream_chat_completion

router = APIRouter()

TONE_PREFIX = {
    "gentle": "说话温柔一点，像贴心的老朋友。",
    "rational": "说话干脆一点，但别太冷，还是朋友语气。",
    "humorous": "可以轻松一点，偶尔开个小玩笑，但别贫。",
}

FRIEND_STYLE = (
    "请你扮演用户的一位老朋友。对话规则："
    "每句话尽量控制在60字以内，能一句话说清的绝不用两句；"
    "回答直击重点，不要解释原理、不要展开背景、不要分点列举；"
    "语气自然随和，像平时聊天，可偶尔用「嗯」「行」「那确实」等口头禅；"
    "用户追问细节时再稍微多说一点，否则保持简短；"
    "避免「首先/其次/最后」「总的来说」「根据您的问题」等书面套话。"
)


class ChatBody(BaseModel):
    message: str
    tone: str = "gentle"
    test_summary: str | None = None
    profile_summary: str | None = None
    chart_context: str | None = None
    report_context: str | None = None
    history: list[dict[str, str]] = Field(default_factory=list)


def _is_mostly_english(text: str) -> bool:
    latin = len(re.findall(r"[A-Za-z]", text))
    cjk = len(re.findall(r"[\u4e00-\u9fff]", text))
    return latin >= 3 and latin > cjk


def _language_hint(message: str) -> str:
    if _is_mostly_english(message):
        return (
            "\n\nThe user's latest message is in English. "
            "Reply in natural, friendly English. Keep the same length and tone rules."
        )
    return ""


def _build_messages(body: ChatBody) -> list[dict[str, str]]:
    tone = TONE_PREFIX.get(body.tone, TONE_PREFIX["gentle"])
    system = (
        "你是「心镜」平台的 AI 陪伴者，专注精神抚慰与自我探索。"
        f"{FRIEND_STYLE}{tone} "
        "不提供医疗诊断；不涉及宿命论；鼓励用户关注自身感受与行动。"
        "若用户表达极端痛苦，引导其寻求专业帮助。"
        "当用户提供了解读报告总结时，基于报告理解 ta 的处境，给简短有针对性的回应；"
        "用日常口语，避免「宫位」「四化」等命理术语。"
        "问题与报告相关时，可自然引述一处（如「你报告里提到过…」），不要机械复读。"
        f"{_language_hint(body.message)}"
    )
    if body.report_context:
        system += (
            f"\n\n【用户最新解读总结——聊天核心依据，请优先参考】\n"
            f"{body.report_context}"
        )
    elif body.test_summary:
        system += f"\n\n用户最近测试摘要：{body.test_summary}"
    if body.profile_summary:
        system += f"\n用户画像：{body.profile_summary}"
    if body.chart_context:
        system += f"\n\n命盘结构与生活背景（内部参考，勿向用户罗列术语）：\n{body.chart_context}"

    messages = [{"role": "system", "content": system}]
    for h in body.history[-20:]:
        messages.append({"role": h.get("role", "user"), "content": h.get("content", "")})
    messages.append({"role": "user", "content": body.message})
    return messages


@router.post("/chat")
async def chat(body: ChatBody):
    crisis = check_crisis(body.message)
    if crisis:
        return {"reply": crisis, "crisis": True}

    messages = _build_messages(body)
    reply = await chat_completion(messages, temperature=0.8, max_tokens=220)
    if not reply:
        reply = _fallback_reply(body.message, body.tone)

    return {"reply": reply, "crisis": False}


@router.post("/chat/stream")
async def chat_stream(body: ChatBody):
    crisis = check_crisis(body.message)
    if crisis:
        async def crisis_gen():
            import json
            yield f"data: {json.dumps({'delta': crisis, 'crisis': True})}\n\n"
            yield "data: [DONE]\n\n"

        return StreamingResponse(crisis_gen(), media_type="text/event-stream")

    messages = _build_messages(body)

    async def event_generator():
        import json

        has_content = False
        async for chunk in stream_chat_completion(messages, temperature=0.8, max_tokens=220):
            has_content = True
            yield f"data: {chunk}\n\n"
        if not has_content:
            fallback = _fallback_reply(body.message, body.tone)
            yield f"data: {json.dumps({'delta': fallback})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )


def _fallback_reply(message: str, tone: str) -> str:
    if _is_mostly_english(message):
        if tone == "rational":
            return "Got it. What's the main thing stuck in your head?"
        if tone == "humorous":
            return "Yeah, that's a lot. Want to unpack it a bit?"
        return "I hear you. What part matters most to you right now?"
    if tone == "rational":
        return "嗯，听到了。你现在最卡的是哪一块？"
    if tone == "humorous":
        return "哈，这事确实有点绕。具体咋回事，再说说？"
    return "嗯，我听到了。此刻你最在意的是哪一部分？"
