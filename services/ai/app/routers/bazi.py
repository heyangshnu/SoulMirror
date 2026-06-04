from datetime import datetime

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services.report_llm import generate_test_report

router = APIRouter()

HEAVENLY = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]
EARTHLY = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]


class BaziSubmitBody(BaseModel):
    birthDate: str
    birthTime: str
    gender: str = Field(pattern="^(male|female)$")
    calendar: str = Field(default="solar", pattern="^(solar|lunar)$")
    birthPlace: str | None = None
    locale: str = "zh"


def simple_pillars(dt: datetime) -> tuple[str, str, str, str]:
    y, m, d, h = dt.year, dt.month, dt.day, dt.hour
    year = HEAVENLY[(y - 4) % 10] + EARTHLY[(y - 4) % 12]
    month = HEAVENLY[(m + y) % 10] + EARTHLY[(m - 1) % 12]
    day = HEAVENLY[(d + m) % 10] + EARTHLY[(d - 1) % 12]
    hour = HEAVENLY[(h + d) % 10] + EARTHLY[(h // 2) % 12]
    return year, month, day, hour


def _fallback_bazi(day: str, pillars: str) -> dict:
    return {
        "testType": "bazi",
        "title": f"八字命盘 · {day}日柱",
        "summary": f"四柱 {pillars}",
        "score": 75,
        "scoreLabel": "Insight",
        "sections": [
            {"title": "报告生成中", "content": "AI 服务暂不可用，请稍后重试或检查 DEEPSEEK_API_KEY 配置。"},
        ],
    }


@router.post("/submit")
async def submit(body: BaziSubmitBody):
    dt = datetime.fromisoformat(f"{body.birthDate}T{body.birthTime}")
    year, month, day, hour = simple_pillars(dt)
    pillars = f"{year} {month} {day} {hour}"
    gender_label = "乾造" if body.gender == "male" else "坤造"
    calendar_label = "公历" if body.calendar == "solar" else "农历"

    raw = {"pillars": pillars, "year": year, "month": month, "day": day, "hour": hour}

    context = (
        f"出生日期：{body.birthDate}\n"
        f"出生时间：{body.birthTime}\n"
        f"历法：{calendar_label}\n"
        f"性别：{gender_label}\n"
        f"四柱：年柱{year}、月柱{month}、日柱{day}、时柱{hour}\n"
        f"出生地：{body.birthPlace or '未提供'}\n\n"
        "请结合四柱与五行，从性格底色、事业与发展、情感与关系、身心能量等维度撰写报告，"
        "并给出 dominantElement（日主五行倾向：金/木/水/火/土之一）。"
    )

    return await generate_test_report(
        "bazi",
        context,
        raw=raw,
        fallback=_fallback_bazi(day, pillars),
        locale=body.locale,
    )
