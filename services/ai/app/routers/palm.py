from fastapi import APIRouter
from pydantic import BaseModel

from app.services.report_llm import generate_test_report

router = APIRouter()


class PalmAnalyzeBody(BaseModel):
    imageBase64: str | None = None
    note: str | None = None


def _fallback_palm() -> dict:
    return {
        "testType": "palm",
        "title": "手相 · 掌纹解读",
        "summary": "掌纹自我探索报告",
        "score": 75,
        "scoreLabel": "Insight",
        "sections": [
            {"title": "报告生成中", "content": "AI 服务暂不可用，请稍后重试或检查 DEEPSEEK_API_KEY 配置。"},
        ],
    }


@router.post("/analyze")
async def analyze(body: PalmAnalyzeBody):
    has_image = bool(body.imageBase64 and len(body.imageBase64) > 100)
    image_hint = "用户已上传手掌照片" if has_image else "用户未上传照片"

    raw = {
        "hasImage": has_image,
        "note": body.note,
    }

    context = (
        f"{image_hint}\n"
        f"用户补充说明：{body.note or '无'}\n\n"
        "请基于手相学框架（生命线、感情线、智慧线、事业线等），"
        "结合用户补充信息，撰写掌纹概览、各线解读与身心能量建议。"
        "若仅有文字说明而无图像细节，请据用户描述做合理推断，并避免声称已精确识别图像。"
        "score 反映掌纹所象征的生命力、情感表达与内在平衡的综合评估。"
    )

    return await generate_test_report(
        "palm",
        context,
        raw=raw,
        fallback=_fallback_palm(),
    )
