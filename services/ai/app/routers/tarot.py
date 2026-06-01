import random

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.data.tarot_cards import DOMAIN_LABELS, TAROT_MAJOR

router = APIRouter()


class TarotDrawBody(BaseModel):
    domain: str = Field(pattern="^(love|career|health|general)$")
    seed: int | None = None


@router.post("/draw")
async def draw(body: TarotDrawBody):
    rng = random.Random(body.seed)
    picked = rng.sample(TAROT_MAJOR, 3)
    positions = ["过去", "现在", "建议"]
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
        f"【{c['position']}】{c['name']}（{'正位' if c['upright'] else '逆位'}）：{c['meaning']}"
        for c in cards
    )

    sections = [
        {
            "title": f"{domain_label} · 牌阵解读",
            "content": (
                f"你关注的是**{domain_label}**领域。三张牌分别代表过去的影响、当下状态与未来建议。\n\n"
                + card_text
            ),
        },
        {
            "title": "整体讯息",
            "content": (
                "牌面呈现的是当下心理能量的隐喻，而非固定预言。请把「建议」位当作内在智慧的提醒，"
                "而非外界必然发生的事。"
            ),
        },
        {
            "title": "行动指引",
            "content": (
                "未来一周，尝试做一件与「建议」位能量一致的小事：可能是沟通、放手、或给自己一个暂停。"
                "细微的行动往往比宏大的誓言更能带来改变。"
            ),
        },
    ]

    return {
        "testType": "tarot",
        "title": f"塔罗 · {domain_label}",
        "summary": f"{cards[1]['name']} 指引当下",
        "score": 78,
        "scoreLabel": cards[1]["name"],
        "sections": sections,
        "raw": {"cards": cards, "domain": body.domain},
    }
