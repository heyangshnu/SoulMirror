from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class PalmAnalyzeBody(BaseModel):
    imageBase64: str | None = None
    note: str | None = None


@router.post("/analyze")
async def analyze(body: PalmAnalyzeBody):
    # MVP：规则模板解读（生产环境对接云视觉 API）
    sections = [
        {
            "title": "掌纹概览",
            "content": (
                "根据图像特征与相学框架的综合参考（MVP 为模板解读），你的手掌呈现出"
                "较为清晰的生命线弧度，通常与生命力、自我修复力相关联。"
            ),
        },
        {
            "title": "感情线",
            "content": (
                "感情线若深长而弧度柔和，往往象征情感表达细腻、重视深度联结。"
                "近期宜练习直接表达需求，减少「期待对方读懂」的隐性消耗。"
            ),
        },
        {
            "title": "智慧线",
            "content": (
                "智慧线的走向提示你善于多角度思考，适合在创意与逻辑之间找到平衡。"
                "决策时可为直觉留出验证窗口，避免过度分析导致行动延迟。"
            ),
        },
        {
            "title": "事业线",
            "content": (
                "事业线若有向中指延伸的趋势，代表职业认同感逐渐增强。"
                "未来数月适合聚焦一项可积累的技能，而非同时铺开过多方向。"
            ),
        },
    ]

    if body.note:
        sections.append({"title": "你的补充", "content": body.note})

    return {
        "testType": "palm",
        "title": "手相 · 掌纹解读",
        "summary": "生命线弧度清晰，内在韧性良好",
        "score": 85,
        "scoreLabel": "Harmony",
        "sections": sections,
        "raw": {"mode": "template"},
    }
