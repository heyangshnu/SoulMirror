#!/usr/bin/env python3
"""Import v4 content library markdown into zh/en JSON entries."""

from __future__ import annotations

import json
import re
import hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
V4_ROOT = Path(
    "/Users/heyang/Documents/10 个人文件/12 一些想法/07 SoulMirror/命理分析APP_外发演示材料包_v4"
)
OUT_ZH = ROOT / "services/ai/content/zh"
OUT_EN = ROOT / "services/ai/content/en"

ATOM_EN: dict[str, str] = {
    "你不是没有能力，而是能力进入了不适合的场景。": "It's not that you lack ability—you're using it in the wrong scene.",
    "这不是单点事件，而是阶段主题在现实中显化。": "This isn't a one-off event; a life theme is showing up in reality.",
    "命盘给的是结构，现实补充决定它落在哪里。": "The chart gives structure; your real life decides where it lands.",
    "真正需要补的不是某个五行，而是一种生活能力。": "What you need isn't a lucky charm—it's a life skill.",
    "不要把流年理解成吉凶，要理解成哪类议题被放大。": "Don't read a year as good or bad—see which themes get louder.",
    "大限像十年天气，流年像当年的风向。": "A major cycle is like a decade of weather; a year is the wind that year.",
    "本命是底盘，大限是主场，流年是触发，现实是落点。": "Foundation sets the base; cycles set the stage; years trigger; life is where it lands.",
    "关系里的冲突常常不是观点不同，而是各自最骄傲的能力没有被承认。": "Conflict often isn't about ideas—it's about unacknowledged strengths.",
    "孩子不是父母关系的翻译器，孩子只需要稳定的环境。": "Children aren't messengers between parents—they need stability.",
    "一个人看地图，一个人感受地形，好的家庭需要两者都存在。": "One reads the map, one feels the terrain—a good family needs both.",
    "你以为自己在优化，对方可能感到自己被审稿。": "You think you're improving things; they may feel judged.",
    "她以为自己在表达生活判断，你可能听成情绪反应。": "They share a life read; you may hear emotion.",
    "先接住，不代表放弃原则；只是把原则放到第二步。": "Acknowledging first isn't giving up principles—it's ordering them.",
    "越累的时候越不要深谈，因为深谈需要心理资源。": "When exhausted, skip deep talks—they need mental bandwidth.",
    "没有现实校准的命理，很容易变成漂亮但空的句子。": "Without real-life context, insights become pretty but empty.",
    "让用户被打中的不是术语，而是术语如何解释他的真实生活。": "What lands isn't jargon—it's jargon translated into their life.",
    "真正的报告要能让用户说：原来我不是单独卡在这件事上。": "A good report makes them say: I'm not alone in this pattern.",
    "不要把孩子的盘写成标签，要写成父母可以创造的环境。": "Don't label the child—describe the environment parents can build.",
    "伴侣分析不是为了证明对方有问题，而是为了找到接口。": "Partner insight isn't to prove who's wrong—it's to find the interface.",
    "长期关系里，赢一次争论不如少一次二次伤害。": "In long relationships, one less wound beats winning one argument.",
}

FAMILY_ZH = [
    {
        "id": "fam_flow_balance",
        "tags": ["SYN", "家庭系统"],
        "productHint": "三人能力流动",
        "userFacing": "这个家庭的紧张往往不是单点冲突，而是阶段叠加：一方想向外，一方在向内托底，孩子需要稳定。解决不是谁放弃自己，而是重新分工。",
        "actions": ["战略与生活议题分开讨论", "每周30分钟家庭对齐", "不让孩子传话"],
        "topic": ["family_system", "family"],
        "confidenceWeight": 0.88,
    },
    {
        "id": "fam_risk_triangle",
        "tags": ["SYN", "家庭系统"],
        "productHint": "三角风险",
        "userFacing": "最大风险不是吵架本身，而是：一方把生活判断当不理性，一方把结构语言当压迫，孩子把紧张当成要适应的空气。",
        "actions": ["父亲少用高位评价", "母亲避免焦虑转成过细控制", "争吵后在孩子面前低强度修复"],
        "topic": ["family_system"],
        "confidenceWeight": 0.85,
    },
    {
        "id": "fam_strength",
        "tags": ["SYN", "家庭系统"],
        "productHint": "家庭优势",
        "userFacing": "如果配合好：一方给方向，一方给现实校准，孩子在稳定环境里能同时学到结构和感受两套能力。",
        "actions": ["决策分三层：战略/生活/情绪", "先列事实再表达在意点"],
        "topic": ["family_system"],
        "confidenceWeight": 0.82,
    },
]

FAMILY_EN = [
    {
        "id": "fam_flow_balance",
        "tags": ["SYN", "family"],
        "productHint": "Three-person flow",
        "userFacing": "Tension often stacks: one pushes outward, one holds the home base, a child needs stability. The fix is re-division of roles, not someone giving themselves up.",
        "actions": ["Separate strategy from daily-life talks", "30-min weekly family sync", "Don't use the child as messenger"],
        "topic": ["family_system", "family"],
        "confidenceWeight": 0.88,
    },
    {
        "id": "fam_risk_triangle",
        "tags": ["SYN", "family"],
        "productHint": "Triangle risk",
        "userFacing": "The biggest risk isn't fighting—it's one dismissing life judgment as irrational, one hearing structure as pressure, and a child absorbing the tension as normal air.",
        "actions": ["Father: fewer top-down reviews", "Mother: don't turn anxiety into micro-control", "Repair lightly in front of the child after conflict"],
        "topic": ["family_system"],
        "confidenceWeight": 0.85,
    },
    {
        "id": "fam_strength",
        "tags": ["SYN", "family"],
        "productHint": "Family strength",
        "userFacing": "When it works: direction plus ground-checking, and a child who learns both structure and feeling in a stable home.",
        "actions": ["Three layers: strategy / daily life / emotions", "Facts first, then what each person cares about"],
        "topic": ["family_system"],
        "confidenceWeight": 0.82,
    },
]

HOROSCOPE_PALACES_ZH = {
    "迁移": "这几年外部场景、城市、合作、事业扩张容易成为反复主题。",
    "子女": "这一阶段孩子、家庭秩序和照顾压力会被推到前台。",
    "夫妻": "关系议题与互相期待容易在这一阶段被放大。",
    "事业": "方向、机会与职业排序会成为主线之一。",
    "财帛": "资源、现金流与价值感会成为高频议题。",
    "田宅": "居住、空间、家人同堂与生活秩序变重。",
    "福德": "内在节奏、恢复方式与情绪阈值需要被看见。",
    "父母": "长辈、责任与上一代议题可能同时出现。",
    "兄弟": "同伴、合作与资源分配议题变多。",
    "疾厄": "身心负荷与休息节奏值得优先处理。",
    "奴仆": "工作方式、协作与日常负荷需要重新分配。",
    "官禄": "社会角色、名声与长期路径被推到台前。",
}

HOROSCOPE_PALACES_EN = {
    "迁移": "These years may repeat themes of outward moves: city, partnership, career expansion.",
    "子女": "Childcare, family order, and caregiving pressure move to the foreground.",
    "夫妻": "Relationship expectations and friction themes may amplify.",
    "事业": "Direction, opportunity, and career ordering become a main line.",
    "财帛": "Resources, cash flow, and sense of value come up often.",
    "田宅": "Home, space, and household rhythm grow heavier.",
    "福德": "Inner pace, recovery, and emotional thresholds need care.",
    "父母": "Elders, duty, and prior-generation themes may surface together.",
    "兄弟": "Peers, collaboration, and sharing resources matter more.",
    "疾厄": "Body-mind load and rest rhythm deserve priority.",
    "奴仆": "Work style, collaboration, and daily load need rebalancing.",
    "官禄": "Social role, reputation, and long path step forward.",
}


def _slug(text: str) -> str:
    return hashlib.md5(text.encode()).hexdigest()[:10]


def parse_atoms(path: Path) -> list[str]:
    if not path.exists():
        return list(ATOM_EN.keys())
    text = path.read_text(encoding="utf-8")
    found: list[str] = []
    seen: set[str] = set()
    for m in re.finditer(r"^\d+\.\s*(.+)$", text, re.M):
        s = m.group(1).strip()
        if s and s not in seen:
            seen.add(s)
            found.append(s)
    return found or list(ATOM_EN.keys())


def parse_relation_phrases(path: Path, limit: int = 40) -> list[dict]:
    if not path.exists():
        return []
    text = path.read_text(encoding="utf-8")
    entries: list[dict] = []
    blocks = re.split(r"## 话术 \d+", text)[1:]
    for idx, block in enumerate(blocks[:limit], 1):
        header = re.search(r"：(.+?)｜场景：(.+)", block)
        trigger = header.group(1).strip() if header else None
        scene = header.group(2).strip() if header else f"scene_{idx}"
        suggest = re.search(r"### 建议回复\s*\n>\s*(.+)", block)
        continue_phrase = re.search(r"### 如果需要继续\s*\n>\s*(.+)", block)
        avoid = re.search(r"### 不建议回复\s*\n>\s*(.+)", block)
        if not suggest:
            continue
        phrase = suggest.group(1).strip()
        entry_id = f"rel_{idx:03d}_{_slug(trigger or scene)}"
        entries.append(
            {
                "id": entry_id,
                "tags": ["SYN", "关系", "CHAT"],
                "match": {"topic": "partner_conflict", "trigger": trigger, "scene": scene},
                "productHint": f"{trigger} · {scene}" if trigger else "关系话术",
                "userFacing": "关系里常见的是表达方式错位，不是谁不爱谁。先换一句话，比赢争论更重要。",
                "actions": [phrase],
                "phrases": [phrase],
                "topic": ["synastry", "partner_conflict", "marriage"],
                "confidenceWeight": 0.8,
                "_avoid": avoid.group(1).strip() if avoid else None,
            }
        )
        if continue_phrase:
            cont = continue_phrase.group(1).strip()
            entries.append(
                {
                    "id": f"{entry_id}_cont",
                    "tags": ["SYN", "关系", "CHAT"],
                    "match": {"topic": "partner_conflict", "trigger": trigger, "scene": scene},
                    "productHint": f"继续 · {scene}" if scene else "关系跟进",
                    "userFacing": "深谈前先确认对方要的是倾听还是方案，能避免很多二次伤害。",
                    "actions": [cont],
                    "phrases": [cont],
                    "topic": ["synastry", "partner_conflict", "marriage"],
                    "confidenceWeight": 0.78,
                }
            )
    return entries


def translate_relation_entry(e: dict) -> dict:
    en = dict(e)
    en["id"] = e["id"] + "_en"
    en["tags"] = ["SYN", "relation", "CHAT"]
    en["productHint"] = "Relationship phrase"
    en["userFacing"] = "Misalignment is often about expression, not lack of love. Changing one sentence beats winning the argument."
    phrase = e["actions"][0] if e.get("actions") else ""
    phrase_en_map = {
        "我听到了，你不是只在说这一件事，而是在说你经常有这种感觉。这个我先不反驳，我先把你的意思接住。": "I hear you—you're not only talking about this moment, but a pattern. I won't argue first; I'll receive what you mean.",
        "我可以先不提意见。你如果只是想让我听，我就听；如果你想要我一起想办法，我再说我的担心。": "I can hold my opinions for now. If you need listening, I'll listen; if you want solutions, I'll share my concerns after.",
    }
    en_phrase = phrase_en_map.get(phrase, "I hear you. Tell me more about what you need from me right now.")
    en["actions"] = [en_phrase]
    en["phrases"] = [en_phrase]
    return en


def build_atoms_entries(atoms: list[str], locale: str) -> list[dict]:
    out = []
    for i, zh in enumerate(atoms):
        if locale == "zh":
            out.append(
                {
                    "id": f"atom_{i+1:03d}",
                    "tags": ["原子"],
                    "userFacing": zh,
                    "topic": ["self_profile", "recent_years", "family_system", "synastry"],
                    "confidenceWeight": 0.65,
                    "locale": "zh",
                }
            )
        else:
            out.append(
                {
                    "id": f"atom_{i+1:03d}_en",
                    "tags": ["atom"],
                    "userFacing": ATOM_EN.get(zh, "Small shifts in rhythm often change more than one big speech."),
                    "topic": ["self_profile", "recent_years", "family_system", "synastry"],
                    "confidenceWeight": 0.65,
                    "locale": "en",
                }
            )
    return out


def build_horoscope_entries(locale: str) -> list[dict]:
    mapping = HOROSCOPE_PALACES_ZH if locale == "zh" else HOROSCOPE_PALACES_EN
    entries = []
    for palace, sentence in mapping.items():
        entries.append(
            {
                "id": f"hor_{palace}_{locale}",
                "tags": ["ZW-D", palace],
                "match": {"decadalPalace": palace},
                "productHint": f"{'大限' if locale == 'zh' else 'Cycle'} {palace}",
                "userFacing": sentence,
                "actions": ["把变动做成表格再讨论" if locale == "zh" else "Put changes in a table before debating"],
                "topic": ["recent_years", "family_system"],
                "confidenceWeight": 0.75,
                "locale": locale,
            }
        )
    return entries


def write_category(locale: str, category: str, entries: list[dict]) -> None:
    out_dir = OUT_ZH if locale == "zh" else OUT_EN
    path = out_dir / category / "entries.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    for e in entries:
        e.setdefault("locale", locale)
        e.setdefault("source", "v4_import")
    path.write_text(json.dumps(entries, ensure_ascii=False, indent=2), encoding="utf-8")


def main() -> None:
    v4_content = V4_ROOT / "内容库"
    atoms = parse_atoms(v4_content / "05_内容原子库_200条.md")
    relations_zh = parse_relation_phrases(v4_content / "09_关系修复话术库_180组.md", limit=60)
    relations_en = [translate_relation_entry(r) for r in relations_zh]

    # Keep existing manual ziwei/bazi snippets from legacy folder if present
    legacy = ROOT / "services/ai/content"
    for sub in ["bazi", "ziwei", "child"]:
        legacy_path = legacy / sub / "entries.json"
        if legacy_path.exists():
            data = json.loads(legacy_path.read_text(encoding="utf-8"))
            zh_copy = [{**e, "locale": "zh"} for e in data]
            write_category("zh", sub, zh_copy)
            en_copy = []
            for e in data:
                en_e = {**e, "id": e["id"] + "_en", "locale": "en"}
                if "userFacing" in en_e:
                    en_e["userFacing"] = ATOM_EN.get(e["userFacing"], e["userFacing"])
                en_copy.append(en_e)
            write_category("en", sub, en_copy)

    write_category("zh", "atoms", build_atoms_entries(atoms, "zh"))
    write_category("en", "atoms", build_atoms_entries(atoms, "en"))
    write_category("zh", "relation", relations_zh)
    write_category("en", "relation", relations_en)
    write_category("zh", "family", FAMILY_ZH)
    write_category("en", "family", FAMILY_EN)
    write_category("zh", "horoscope", build_horoscope_entries("zh"))
    write_category("en", "horoscope", build_horoscope_entries("en"))

    # manifest
    total = sum(1 for _ in (OUT_ZH.rglob("entries.json")))
    manifest = {
        "version": "2.0.0",
        "locales": ["zh", "en"],
        "categories": ["atoms", "bazi", "ziwei", "horoscope", "relation", "child", "family"],
        "note": "Imported from v4 content library",
    }
    for loc in ["zh", "en"]:
        base = OUT_ZH if loc == "zh" else OUT_EN
        count = 0
        for p in base.rglob("entries.json"):
            count += len(json.loads(p.read_text(encoding="utf-8")))
        manifest[f"{loc}_entries"] = count
    (ROOT / "services/ai/content/manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(json.dumps(manifest, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
