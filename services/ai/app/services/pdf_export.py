"""Export plan report to PDF bytes."""

from __future__ import annotations

import io
from typing import Any

from fpdf import FPDF


def _safe(text: str) -> str:
    return text.encode("latin-1", errors="replace").decode("latin-1")


def render_plan_pdf(report: dict[str, Any], *, locale: str = "zh") -> bytes:
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 16)
    pdf.multi_cell(0, 10, _safe(report.get("title") or "SoulMirror Plan"))
    pdf.ln(4)

    pdf.set_font("Helvetica", "B", 12)
    label_portrait = "Foundation" if locale.startswith("en") else "Your foundation"
    pdf.cell(0, 8, _safe(label_portrait), ln=True)
    pdf.set_font("Helvetica", "", 11)
    pdf.multi_cell(0, 6, _safe(report.get("portrait") or ""))
    pdf.ln(3)

    if report.get("stage"):
        pdf.set_font("Helvetica", "B", 12)
        label_stage = "These years" if locale.startswith("en") else "Stage"
        pdf.cell(0, 8, _safe(label_stage), ln=True)
        pdf.set_font("Helvetica", "", 11)
        pdf.multi_cell(0, 6, _safe(report["stage"]))
        pdf.ln(3)

    pdf.set_font("Helvetica", "B", 12)
    label_plans = "Plans" if locale.startswith("en") else "Plans"
    pdf.cell(0, 8, _safe(label_plans), ln=True)
    for i, plan in enumerate(report.get("plans") or [], 1):
        pdf.set_font("Helvetica", "B", 11)
        pdf.multi_cell(0, 6, _safe(f"{i}. {plan.get('title', '')}"))
        pdf.set_font("Helvetica", "", 10)
        pdf.multi_cell(0, 5, _safe(plan.get("body", "")))
        for act in plan.get("actions") or []:
            pdf.multi_cell(0, 5, _safe(f"  - {act}"))
        pdf.ln(2)

    pdf.ln(4)
    pdf.set_font("Helvetica", "I", 9)
    pdf.multi_cell(0, 5, _safe(report.get("disclaimer") or ""))

    out = pdf.output()
    if isinstance(out, bytearray):
        return bytes(out)
    if isinstance(out, str):
        return out.encode("latin-1", errors="replace")
    return out
