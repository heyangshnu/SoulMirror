from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.data.mbti_questions import MBTI_DESCRIPTIONS, MBTI_QUESTIONS
from app.data.mbti_questions_en import MBTI_QUESTIONS_EN
from app.services.locale_util import is_english
from app.services.report_llm import generate_test_report

router = APIRouter()


class AnswerItem(BaseModel):
    questionId: int
    value: int = Field(ge=1, le=5)


class MbtiSubmitBody(BaseModel):
    answers: list[AnswerItem]
    profile_hint: str | None = None
    locale: str = "zh"


def score_mbti(answers: list[AnswerItem]) -> tuple[str, dict[str, int]]:
    scores = {"E": 0, "I": 0, "S": 0, "N": 0, "T": 0, "F": 0, "J": 0, "P": 0}
    q_map = {q["id"]: q for q in MBTI_QUESTIONS}

    for a in answers:
        q = q_map.get(a.questionId)
        if not q:
            continue
        pole = q["pole"]
        weight = a.value - 3
        if weight == 0:
            continue
        if weight > 0:
            scores[pole] += weight
        else:
            opposite = {"E": "I", "I": "E", "S": "N", "N": "S", "T": "F", "F": "T", "J": "P", "P": "J"}[pole]
            scores[opposite] += abs(weight)

    mbti_type = ""
    mbti_type += "E" if scores["E"] >= scores["I"] else "I"
    mbti_type += "S" if scores["S"] >= scores["N"] else "N"
    mbti_type += "T" if scores["T"] >= scores["F"] else "F"
    mbti_type += "J" if scores["J"] >= scores["P"] else "P"
    return mbti_type, scores


def _fallback_mbti(mbti_type: str, desc: str) -> dict:
    return {
        "testType": "mbti",
        "title": f"MBTI · {mbti_type}",
        "summary": desc,
        "score": 75,
        "scoreLabel": mbti_type,
        "sections": [
            {"title": "报告生成中", "content": "AI 服务暂不可用，请稍后重试或检查 DEEPSEEK_API_KEY 配置。"},
        ],
    }


@router.get("/questions")
def get_questions(locale: str = "zh"):
    return {"questions": MBTI_QUESTIONS_EN if is_english(locale) else MBTI_QUESTIONS}


@router.post("/submit")
async def submit(body: MbtiSubmitBody):
    mbti_type, scores = score_mbti(body.answers)
    desc = MBTI_DESCRIPTIONS.get(mbti_type, "独特的人格组合")

    raw = {"mbtiType": mbti_type, "type": mbti_type, "scores": scores}

    dim_lines = "\n".join(
        f"- {k}：{v} 分" for k, v in scores.items() if v > 0
    )
    context = (
        f"MBTI 类型：{mbti_type}\n"
        f"类型描述：{desc}\n"
        f"各维度得分：\n{dim_lines}\n"
        f"答题数量：{len(body.answers)}\n"
        f"用户近况补充：{body.profile_hint or '无'}\n\n"
        "请从类型概览、认知倾向、优势与盲点、情感关系、职业与发展等角度撰写报告。"
        f"score 应反映该用户在本类型内的自我认知清晰度与成长潜力（类型为 {mbti_type}）。"
    )

    report = await generate_test_report(
        "mbti",
        context,
        raw=raw,
        fallback=_fallback_mbti(mbti_type, desc),
        locale=body.locale,
    )
    return report
