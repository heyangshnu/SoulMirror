from datetime import datetime

from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter()

HEAVENLY = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]
EARTHLY = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]


class BaziSubmitBody(BaseModel):
    birthDate: str
    birthTime: str
    gender: str = Field(pattern="^(male|female)$")
    calendar: str = Field(default="solar", pattern="^(solar|lunar)$")
    birthPlace: str | None = None


def simple_pillars(dt: datetime) -> tuple[str, str, str, str]:
    """MVP 简化排盘：按年月日时取干支索引（非专业历法，仅供演示）。"""
    y, m, d, h = dt.year, dt.month, dt.day, dt.hour
    year = HEAVENLY[(y - 4) % 10] + EARTHLY[(y - 4) % 12]
    month = HEAVENLY[(m + y) % 10] + EARTHLY[(m - 1) % 12]
    day = HEAVENLY[(d + m) % 10] + EARTHLY[(d - 1) % 12]
    hour = HEAVENLY[(h + d) % 10] + EARTHLY[(h // 2) % 12]
    return year, month, day, hour


@router.post("/submit")
async def submit(body: BaziSubmitBody):
    dt = datetime.fromisoformat(f"{body.birthDate}T{body.birthTime}")
    year, month, day, hour = simple_pillars(dt)
    pillars = f"{year} {month} {day} {hour}"

    gender_label = "乾造" if body.gender == "male" else "坤造"
    calendar_label = "公历" if body.calendar == "solar" else "农历"

    sections = [
        {
            "title": "四柱概览",
            "content": (
                f"依据你提供的{calendar_label}出生信息（{body.birthDate} {body.birthTime}），"
                f"排得四柱为：**{pillars}**（{gender_label}）。"
                "心镜将传统命理语言转化为自我觉察框架，供你参考而非宿命论断。"
            ),
        },
        {
            "title": "性格底色",
            "content": (
                f"日柱 {day} 往往被视为内在自我的象征。你可能在处事中呈现出该干支组合所强调的特质："
                "既有向外表达的一面，也有需要被理解的内在节奏。建议关注你在压力下的默认反应模式。"
            ),
        },
        {
            "title": "事业与发展",
            "content": (
                "从五行流通的角度，当前阶段适合在稳定中寻求突破：梳理核心技能，"
                "减少分散精力的事务。下半年可重点关注「深耕一个领域」带来的复利。"
            ),
        },
        {
            "title": "情感与关系",
            "content": (
                "感情领域宜「慢热深交」：真诚的沟通比猜测更重要。若近期有重要对话，"
                "选择双方都放松的时段，表达感受而非评判对方。"
            ),
        },
        {
            "title": "身心与运势",
            "content": (
                "注意作息与情绪联动：睡眠质量直接影响决策质量。"
                "本周适合进行轻度运动与冥想，帮助清空杂念，恢复内在秩序感。"
            ),
        },
    ]

    if body.birthPlace:
        sections.append(
            {
                "title": "出生地能量",
                "content": f"出生地 {body.birthPlace} 的地域气场，可作为你人生叙事中的一个背景注脚，不必过度解读。",
            }
        )

    return {
        "testType": "bazi",
        "title": f"八字命盘 · {day}日柱",
        "summary": f"四柱 {pillars}",
        "score": 82,
        "scoreLabel": "Zenith",
        "sections": sections,
        "raw": {"pillars": pillars, "year": year, "month": month, "day": day, "hour": hour},
    }
