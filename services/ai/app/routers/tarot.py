import random

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.data.tarot_cards import DOMAIN_LABELS, TAROT_MAJOR
from app.services.locale_util import is_english
from app.services.report_llm import generate_test_report

router = APIRouter()


class TarotDrawBody(BaseModel):
    domain: str = Field(pattern="^(love|career|health|general)$")
    seed: int | None = None
    locale: str = "zh"


def _fallback_tarot(domain_label: str, card_name: str) -> dict:
    return {
        "testType": "tarot",
        "title": f"塔罗 · {domain_label}",
        "summary": f"{card_name} 指引当下",
        "score": 75,
        "scoreLabel": card_name,
        "sections": [
            {"title": "报告生成中", "content": "AI 服务暂不可用，请稍后重试或检查 DEEPSEEK_API_KEY 配置。"},
        ],
    }


@router.post("/draw")
async def draw(body: TarotDrawBody):
    rng = random.Random(body.seed)
    picked = rng.sample(TAROT_MAJOR, 3)
    positions = ["Past", "Present", "Advice"] if is_english(body.locale) else ["过去", "现在", "建议"]
    cards = []
    for i, card in enumerate(picked):
        upright = rng.random() > 0.35
        meaning = card["upright"] if upright else card["reversed"]
        cards.append(
            {
                "id": card["id"],
                "name": card["name"],
                "nameEn": card["nameEn"],
                "upright": upright,
                "meaning": meaning,
                "position": positions[i],
            }
        )

    domain_label = DOMAIN_LABELS.get(body.domain, "综合")
    card_text = "\n".join(
        f"【{c['position']}】{c['name']}（{'正位' if c['upright'] else '逆位'}，{c['nameEn']}）：{c['meaning']}"
        for c in cards
    )

    raw = {"cards": cards, "domain": body.domain}

    context = (
        f"占卜领域：{domain_label}\n"
        f"三牌阵（过去-现在-建议）：\n{card_text}\n\n"
        "请结合牌面与领域，撰写牌阵解读、当下心理能量、行动指引等章节。"
        "强调牌面是内在心理的隐喻而非固定预言。"
        f"score 反映当前在「{domain_label}」领域的内在能量与行动就绪度。"
    )

    return await generate_test_report(
        "tarot",
        context,
        raw=raw,
        fallback=_fallback_tarot(domain_label, cards[1]["name"]),
        locale=body.locale,
    )
