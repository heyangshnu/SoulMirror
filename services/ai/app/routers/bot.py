from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services.crisis import check_crisis
from app.services.llm import chat_completion

router = APIRouter()

TONE_PREFIX = {
    "gentle": "语气温柔、包容，像一位耐心的朋友。",
    "rational": "语气理性、清晰，注重逻辑与可行建议。",
    "humorous": "语气轻松幽默，但不过度玩笑，保持尊重。",
}


class ChatBody(BaseModel):
    message: str
    tone: str = "gentle"
    test_summary: str | None = None
    profile_summary: str | None = None
    history: list[dict[str, str]] = Field(default_factory=list)


@router.post("/chat")
async def chat(body: ChatBody):
    crisis = check_crisis(body.message)
    if crisis:
        return {"reply": crisis, "crisis": True}

    tone = TONE_PREFIX.get(body.tone, TONE_PREFIX["gentle"])
    system = (
        "你是「心镜」平台的 AI 陪伴者，专注精神抚慰与自我探索。"
        f"{tone} "
        "不提供医疗诊断；不涉及宿命论；鼓励用户关注自身感受与行动。"
        "若用户表达极端痛苦，引导其寻求专业帮助。"
    )
    if body.test_summary:
        system += f"\n\n用户测试摘要：{body.test_summary}"
    if body.profile_summary:
        system += f"\n用户画像：{body.profile_summary}"

    messages = [{"role": "system", "content": system}]
    for h in body.history[-20:]:
        messages.append({"role": h.get("role", "user"), "content": h.get("content", "")})
    messages.append({"role": "user", "content": body.message})

    reply = await chat_completion(messages, temperature=0.8, max_tokens=800)
    if not reply:
        reply = _fallback_reply(body.message, body.tone)

    return {"reply": reply, "crisis": False}


def _fallback_reply(message: str, tone: str) -> str:
    if tone == "rational":
        return (
            f"我听到了你说的：「{message[:80]}」。"
            "从理性角度看，先把感受命名出来会很有帮助。你此刻最困扰的是哪一部分？"
        )
    if tone == "humorous":
        return (
            f"嗯，关于「{message[:60]}」——生活有时像乱线的塔罗牌，"
            "但翻过来往往另有解法。愿意多说说具体场景吗？"
        )
    return (
        f"谢谢你愿意分享：「{message[:80]}」。"
        "我能感受到这对你很重要。不用急着理清一切，我们可以慢慢聊——"
        "此刻你的身体感觉是怎样的？"
    )
