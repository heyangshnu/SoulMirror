CRISIS_KEYWORDS = [
    "自杀",
    "不想活",
    "结束生命",
    "自残",
    "割腕",
    "跳楼",
    "活着没意思",
    "suicide",
    "kill myself",
    "end my life",
    "self-harm",
    "don't want to live",
]

CRISIS_REPLY_ZH = """我注意到你可能正在经历非常艰难的时刻。你并不孤单，寻求帮助是勇敢的表现。

**24 小时心理援助**
- 全国心理援助热线：400-161-9995
- 北京心理危机研究与干预中心：010-82951332
- 生命热线：400-821-1215

若你有立即伤害自己的冲动，请拨打 **120** 或前往最近医院急诊。我会在这里陪你，但专业支持非常重要。"""

CRISIS_REPLY_EN = """I hear that you may be going through an extremely difficult time. You are not alone—reaching out is brave.

**Crisis support (examples)**
- US: 988 Suicide & Crisis Lifeline
- UK: Samaritans 116 123
- International: findahelpline.com

If you are in immediate danger, call your local emergency number now. I'm here with you, but professional help matters."""


def check_crisis(text: str, locale: str | None = "zh") -> str | None:
    lower = text.lower()
    for kw in CRISIS_KEYWORDS:
        if kw in text or kw in lower:
            return CRISIS_REPLY_EN if locale and str(locale).lower().startswith("en") else CRISIS_REPLY_ZH
    return None
