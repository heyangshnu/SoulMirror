from __future__ import annotations

from typing import Any, Optional

from fastapi import APIRouter
from fastapi.responses import Response
from pydantic import BaseModel

from app.pipeline.generate_plan_report import generate_plan_report
from app.services.bazi_util import extract_bazi_tags_from_pillars
from app.services.chat_analyzer import analyze_chat_upload

router = APIRouter()


class PlanReportBody(BaseModel):
    topic: str = "self_profile"
    natal: dict[str, Any]
    ownerNatal: Optional[dict[str, Any]] = None
    partnerNatal: Optional[dict[str, Any]] = None
    childNatal: Optional[dict[str, Any]] = None
    horoscope: Optional[dict[str, Any]] = None
    bazi: Optional[dict[str, Any]] = None
    realContext: Optional[dict[str, Any]] = None
    locale: str = "zh"
    relationName: Optional[str] = None
    years: Optional[list[int]] = None


class ChatUploadBody(BaseModel):
    text: str
    locale: str = "zh"


class PdfExportBody(BaseModel):
    report: dict[str, Any]
    locale: str = "zh"


def _build_bazi_from_natal(natal: dict[str, Any], bazi: dict[str, Any] | None) -> dict[str, Any] | None:
    if bazi:
        return bazi
    pillars = natal.get("pillars")
    if not pillars:
        return None
    return extract_bazi_tags_from_pillars(pillars)


def _merge_family_context(body: PlanReportBody) -> dict[str, Any] | None:
    ctx = dict(body.realContext or {})
    if body.ownerNatal:
        ctx["familyOwner"] = True
    if body.partnerNatal:
        ctx["familyPartner"] = True
    if body.childNatal:
        ctx["familyChild"] = True
    if body.partnerNatal and body.childNatal:
        ctx["familySystemNote"] = "ABC family system analysis"
    return ctx


@router.post("/natal")
async def natal_plan(body: PlanReportBody):
    bazi = _build_bazi_from_natal(body.natal, body.bazi)
    return await generate_plan_report(
        topic=body.topic or "self_profile",
        natal=body.natal,
        bazi=bazi,
        real_context=body.realContext,
        locale=body.locale,
    )


@router.post("/recent-years")
async def recent_years_plan(body: PlanReportBody):
    bazi = _build_bazi_from_natal(body.natal, body.bazi)
    return await generate_plan_report(
        topic="recent_years",
        natal=body.natal,
        horoscope=body.horoscope,
        bazi=bazi,
        real_context=body.realContext,
        locale=body.locale,
    )


@router.post("/synastry")
async def synastry_plan(body: PlanReportBody):
    bazi = _build_bazi_from_natal(body.natal, body.bazi)
    return await generate_plan_report(
        topic="synastry",
        natal=body.natal,
        horoscope=body.horoscope,
        bazi=bazi,
        real_context=body.realContext,
        locale=body.locale,
        relation_name=body.relationName,
    )


@router.post("/child")
async def child_plan(body: PlanReportBody):
    return await generate_plan_report(
        topic="child_environment",
        natal=body.natal,
        bazi=body.bazi,
        real_context=body.realContext,
        locale=body.locale,
        relation_name=body.relationName,
    )


@router.post("/family-system")
async def family_system_plan(body: PlanReportBody):
    bazi = _build_bazi_from_natal(body.ownerNatal or body.natal, body.bazi)
    real = _merge_family_context(body)
    # Use owner natal as primary chart anchor; family tags from REAL + horoscope
    natal = body.ownerNatal or body.natal
    return await generate_plan_report(
        topic="family_system",
        natal=natal,
        horoscope=body.horoscope,
        bazi=bazi,
        real_context=real,
        locale=body.locale,
    )


@router.post("/chat-upload/analyze")
async def chat_upload_analyze(body: ChatUploadBody):
    return await analyze_chat_upload(body.text, locale=body.locale)


@router.post("/export-pdf")
async def export_pdf(body: PdfExportBody):
    from app.services.pdf_export import render_plan_pdf

    pdf_bytes = render_plan_pdf(body.report, locale=body.locale)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="soulmirror-plan.pdf"'},
    )
