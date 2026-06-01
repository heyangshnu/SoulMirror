from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.data.mbti_questions import MBTI_DESCRIPTIONS, MBTI_QUESTIONS
from app.services.llm import chat_completion

router = APIRouter()


class AnswerItem(BaseModel):
    questionId: int
    value: int = Field(ge=1, le=5)


class MbtiSubmitBody(BaseModel):
    answers: list[AnswerItem]
    profile_hint: str | None = None


def score_mbti(answers: list[AnswerItem]) -> tuple[str, dict[str, int]]:
    scores = {"E": 0, "I": 0, "S": 0, "N": 0, "T": 0, "F": 0, "J": 0, "P": 0}
    q_map = {q["id"]: q for q in MBTI_QUESTIONS}

    for a in answers:
        q = q_map.get(a.questionId)
        if not q:
            continue
        pole = q["pole"]
        # 1-3 倾向反对极，4-5 倾向该题 pole
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


def build_mbti_report(mbti_type: str, scores: dict, profile_hint: str | None) -> dict:
    desc = MBTI_DESCRIPTIONS.get(mbti_type, "独特的人格组合")
    sections = [
        {
            "title": "类型概览",
            "content": f"你的 MBTI 类型为 **{mbti_type}**（{desc}）。这一结果反映你在大体上处理信息、做决定与组织生活的方式偏好，而非固定标签。",
        },
        {
            "title": "认知功能倾向",
            "content": (
                f"外向/内向 (E/I)：{'外向' if mbti_type[0] == 'E' else '内向'}倾向更显著。\n"
                f"感觉/直觉 (S/N)：{'感觉' if mbti_type[1] == 'S' else '直觉'}型思维更占主导。\n"
                f"思考/情感 (T/F)：{'思考' if mbti_type[2] == 'T' else '情感'}维度在决策中更突出。\n"
                f"判断/知觉 (J/P)：{'判断' if mbti_type[3] == 'J' else '知觉'}型生活方式更符合你。"
            ),
        },
        {
            "title": "优势与成长",
            "content": (
                f"作为 {mbti_type}，你往往具备该类型公认的天然优势，同时也可能在压力下放大某些盲点。"
                "建议把本报告当作自我觉察的起点：在重要关系中，留意你与不同类型者的互补与摩擦。"
            ),
        },
        {
            "title": "情感与关系",
            "content": (
                "在亲密关系与友谊中，理解自己的能量来源（独处或社交）以及沟通风格，"
                "能帮助你更清晰地表达需求，减少「别人应该怎样对我」的隐性期待。"
            ),
        },
        {
            "title": "职业与发展",
            "content": (
                "职业选择不必被四个字母限制，但你可以借此筛选更能发挥天赋的工作环境："
                "是需要结构化流程，还是开放探索？是人际密集，还是深度专注？"
            ),
        },
    ]
    if profile_hint:
        sections.append({"title": "结合你的近况", "content": profile_hint})

    return {
        "testType": "mbti",
        "title": f"MBTI · {mbti_type}",
        "summary": desc,
        "score": min(100, max(60, 70 + (scores.get(mbti_type[0], 0) % 20))),
        "scoreLabel": mbti_type,
        "sections": sections,
        "raw": {"mbtiType": mbti_type, "scores": scores},
    }


@router.get("/questions")
def get_questions():
    return {"questions": MBTI_QUESTIONS}


@router.post("/submit")
async def submit(body: MbtiSubmitBody):
    mbti_type, scores = score_mbti(body.answers)
    report = build_mbti_report(mbti_type, scores, body.profile_hint)

    llm_prompt = (
        f"用户 MBTI 为 {mbti_type}。请用温暖、专业的中文扩写一段 300 字左右的个性化解读，"
        "涵盖情感、职业、自我成长，不要使用迷信表述。"
    )
    extra = await chat_completion([{"role": "user", "content": llm_prompt}])
    if extra:
        report["sections"].append({"title": "AI 深度解读", "content": extra})

    return report
