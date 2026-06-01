CRISIS_KEYWORDS = [
    "自杀",
    "不想活",
    "结束生命",
    "自残",
    "割腕",
    "跳楼",
    "活着没意思",
]

CRISIS_REPLY = """我注意到你可能正在经历非常艰难的时刻。你并不孤单，寻求帮助是勇敢的表现。

**24 小时心理援助**
- 全国心理援助热线：400-161-9995
- 北京心理危机研究与干预中心：010-82951332
- 生命热线：400-821-1215

若你有立即伤害自己的冲动，请拨打 **120** 或前往最近医院急诊。我会在这里陪你，但专业支持非常重要。"""


def check_crisis(text: str) -> str | None:
    for kw in CRISIS_KEYWORDS:
        if kw in text:
            return CRISIS_REPLY
    return None
