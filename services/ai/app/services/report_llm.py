import json
import re
from typing import Any, Optional

from app.services.llm import chat_completion

HEADLINE_SUMMARY_SYSTEM = """请根据以下报告内容和用户个性化需求，生成一段总结性的话。要求：

字数控制在150-220字之间，务必写完整、有收尾，不要半句话结束。

用日常口语表达，避免出现"宫位""四化""煞星"等专业术语，让不懂命理的人也能看懂。

内容需紧扣用户的问题（如事业、感情、健康等），给出一个清晰的核心判断或行动建议，语气温和、鼓励。

最后一句可以用一个比喻或金句收尾，增强印象。

只输出总结正文，不要标题、不要 JSON、不要 markdown。"""

REPORT_SYSTEM = """你是「心镜」平台的自我探索报告撰写者。
根据用户提供的测试数据，生成个性化、温暖、专业的中文解读报告。

要求：
1. 仅供自我觉察与娱乐参考，不做医疗诊断，不断言宿命
2. 将传统符号（八字、塔罗、手相等）转化为心理觉察语言
3. score 为 0-100 的整数，根据本次解读的整体能量、自洽度、成长潜力等综合评定，每次应结合输入有所变化
4. scoreLabel 为 2-4 个字的英文或中文关键词，概括本次状态（如 Flow、觉醒、Harmony）
5. sections 包含 4-6 个章节，每章 content 150-300 字，具体、有针对性，避免空泛套话
6. 必须只输出合法 JSON，不要 markdown 代码块，不要其他说明文字

JSON 格式：
{
  "title": "报告标题",
  "summary": "一句话摘要（50字内）",
  "score": 82,
  "scoreLabel": "关键词",
  "sections": [{"title": "章节名", "content": "正文"}],
  "dominantElement": "木"
}

dominantElement 仅八字测试需要（五行：金木水火土之一），其他测试可省略该字段。"""


def _extract_json(text: str) -> Optional[dict[str, Any]]:
    text = text.strip()
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if fence:
        text = fence.group(1).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}")
        if start >= 0 and end > start:
            try:
                return json.loads(text[start : end + 1])
            except json.JSONDecodeError:
                return None
    return None


def _trim_headline(text: str, max_len: int = 240) -> str:
    text = text.strip().replace("\n", "")
    if len(text) <= max_len:
        return text
    cut = text[:max_len]
    for sep in "。！？":
        idx = cut.rfind(sep)
        if idx >= int(max_len * 0.55):
            return cut[: idx + 1]
    return cut.rstrip("，。！？、；") + "…"


async def generate_headline_summary(
    *,
    report_title: str,
    sections: list[dict[str, str]],
    personal_context: str | None = None,
    fallback: str | None = None,
) -> str:
    body = "\n".join(f"【{s['title']}】{s['content']}" for s in sections)
    user_prompt = f"报告标题：{report_title}\n\n报告正文：\n{body}"
    if personal_context:
        user_prompt += f"\n\n用户个性化需求：\n{personal_context}"

    llm_text = await chat_completion(
        [
            {"role": "system", "content": HEADLINE_SUMMARY_SYSTEM},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.7,
        max_tokens=300,
    )

    if llm_text:
        return _trim_headline(llm_text)

    if fallback:
        return _trim_headline(fallback)
    return _trim_headline(f"{report_title}。{sections[0]['content'][:80]}" if sections else report_title)


def _validate_report(data: dict[str, Any]) -> dict[str, Any]:
    sections = data.get("sections") or []
    if not isinstance(sections, list) or len(sections) == 0:
        raise ValueError("sections empty")

    clean_sections = []
    for s in sections:
        if isinstance(s, dict) and s.get("title") and s.get("content"):
            clean_sections.append({"title": str(s["title"]), "content": str(s["content"])})

    if not clean_sections:
        raise ValueError("no valid sections")

    score = data.get("score", 75)
    try:
        score = int(round(float(score)))
    except (TypeError, ValueError):
        score = 75
    score = max(0, min(100, score))

    return {
        "title": str(data.get("title") or "探索报告"),
        "summary": str(data.get("summary") or ""),
        "score": score,
        "scoreLabel": str(data.get("scoreLabel") or "Insight"),
        "sections": clean_sections,
        "dominantElement": data.get("dominantElement"),
    }


async def generate_test_report(
    test_type: str,
    context: str,
    *,
    raw: dict[str, Any],
    fallback: dict[str, Any],
    personal_context: str | None = None,
) -> dict[str, Any]:
    """Call DeepSeek to produce report JSON; fall back to template if unavailable."""
    user_prompt = f"""测试类型：{test_type}

用户数据：
{context}"""
    if personal_context:
        user_prompt += f"\n\n用户个性化背景：\n{personal_context}"
    user_prompt += "\n\n请基于以上数据生成完整的个性化报告 JSON。"

    llm_text = await chat_completion(
        [
            {"role": "system", "content": REPORT_SYSTEM},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.75,
        max_tokens=2800,
    )

    if not llm_text:
        result = {**fallback, "raw": {**raw, "llmGenerated": False}}
        headline = await generate_headline_summary(
            report_title=result.get("title", "探索报告"),
            sections=result.get("sections", []),
            personal_context=personal_context,
            fallback=result.get("summary"),
        )
        result["headlineSummary"] = headline
        return result

    parsed = _extract_json(llm_text)
    if not parsed:
        result = {**fallback, "raw": {**raw, "llmGenerated": False, "llmError": "parse_failed"}}
        headline = await generate_headline_summary(
            report_title=result.get("title", "探索报告"),
            sections=result.get("sections", []),
            personal_context=personal_context,
            fallback=result.get("summary"),
        )
        result["headlineSummary"] = headline
        return result

    try:
        report = _validate_report(parsed)
    except ValueError:
        result = {**fallback, "raw": {**raw, "llmGenerated": False, "llmError": "validation_failed"}}
        headline = await generate_headline_summary(
            report_title=result.get("title", "探索报告"),
            sections=result.get("sections", []),
            personal_context=personal_context,
            fallback=result.get("summary"),
        )
        result["headlineSummary"] = headline
        return result

    headline = await generate_headline_summary(
        report_title=report["title"],
        sections=report["sections"],
        personal_context=personal_context,
        fallback=report["summary"],
    )

    result: dict[str, Any] = {
        "testType": test_type,
        "title": report["title"],
        "summary": report["summary"],
        "headlineSummary": headline,
        "score": report["score"],
        "scoreLabel": report["scoreLabel"],
        "sections": report["sections"],
        "raw": {**raw, "llmGenerated": True},
    }

    if report.get("dominantElement"):
        result["raw"]["dominant_element"] = report["dominantElement"]

    return result


ZIWEI_SYSTEM = """你是「心镜 SoulMirror」紫微斗数解读师（三合派语境）。
根据结构化命盘数据，生成治愈向、非宿命论的中文觉察报告。

要求：
1. 仅供自我觉察与娱乐参考，不做医疗诊断，不断言吉凶祸福
2. 将传统符号（星曜、宫位、四化）转化为心理觉察与成长课题语言
3. 「忌」一律表述为「课题」或「待整合的能量」，避免恐吓性用语
4. 不要输出任何数值得分或百分比
5. themeLabel 为 2-4 字关键词，概括本次主题（如「觉察」「流年」「大限」）
6. sections 包含 4-6 个章节，每章 content 150-300 字，具体、有针对性
7. 必须结合用户个性化背景（当前状态、测算方向）给出针对性解读
8. 必须只输出合法 JSON，不要 markdown 代码块

JSON 格式：
{
  "title": "报告标题",
  "summary": "一句话摘要（50字内）",
  "headlineSummary": "150-220字口语化总结，紧扣用户问题，有清晰判断与收尾",
  "themeLabel": "关键词",
  "sections": [{"title": "章节名", "content": "正文"}]
}"""


def _validate_ziwei_report(data: dict[str, Any]) -> dict[str, Any]:
    sections = data.get("sections") or []
    clean_sections = []
    for s in sections:
        if isinstance(s, dict) and s.get("title") and s.get("content"):
            clean_sections.append({"title": str(s["title"]), "content": str(s["content"])})
    if not clean_sections:
        raise ValueError("no valid sections")

    headline = data.get("headlineSummary")
    return {
        "title": str(data.get("title") or "紫微觉察报告"),
        "summary": str(data.get("summary") or ""),
        "headlineSummary": str(headline).strip() if headline else "",
        "themeLabel": str(data.get("themeLabel") or "觉察"),
        "sections": clean_sections,
    }


async def generate_ziwei_report(
    test_type: str,
    context: str,
    *,
    raw: dict[str, Any],
    fallback: dict[str, Any],
    personal_context: str | None = None,
) -> dict[str, Any]:
    user_prompt = f"""报告类型：{test_type}

命盘与运势数据：
{context}"""
    if personal_context:
        user_prompt += f"\n\n用户个性化背景：\n{personal_context}"
    user_prompt += "\n\n请生成完整的治愈向紫微解读报告 JSON。"

    llm_text = await chat_completion(
        [
            {"role": "system", "content": ZIWEI_SYSTEM},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.75,
        max_tokens=3200,
        timeout=120.0,
    )

    async def _with_headline(report: dict[str, Any], *, skip_llm: bool = False) -> dict[str, Any]:
        existing = str(report.get("headlineSummary") or "").strip()
        if existing and len(existing) >= 80:
            return {**report, "headlineSummary": _trim_headline(existing)}
        if skip_llm:
            fallback_text = report.get("summary") or report.get("title") or "觉察报告"
            return {**report, "headlineSummary": _trim_headline(str(fallback_text))}
        headline = await generate_headline_summary(
            report_title=report["title"],
            sections=report["sections"],
            personal_context=personal_context,
            fallback=report.get("summary"),
        )
        return {**report, "headlineSummary": headline}

    if not llm_text:
        base = {**fallback, "testType": test_type, "raw": {**raw, "llmGenerated": False}}
        return await _with_headline(base, skip_llm=True)

    parsed = _extract_json(llm_text)
    if not parsed:
        base = {**fallback, "testType": test_type, "raw": {**raw, "llmGenerated": False}}
        return await _with_headline(base, skip_llm=True)

    try:
        report = _validate_ziwei_report(parsed)
    except ValueError:
        base = {**fallback, "testType": test_type, "raw": {**raw, "llmGenerated": False}}
        return await _with_headline(base, skip_llm=True)

    result = {
        "testType": test_type,
        "title": report["title"],
        "summary": report["summary"],
        "themeLabel": report["themeLabel"],
        "sections": report["sections"],
        "raw": {**raw, "llmGenerated": True},
    }
    if report.get("headlineSummary"):
        result["headlineSummary"] = report["headlineSummary"]
    return await _with_headline(result)
