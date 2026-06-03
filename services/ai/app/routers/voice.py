"""语音转文字（内测：优先文字输入；有 OPENAI_API_KEY 时尝试 Whisper）"""

import base64
import os
import tempfile

import httpx
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class TranscribeBody(BaseModel):
    audioBase64: str | None = None
    text: str | None = None


@router.post("/transcribe")
async def transcribe(body: TranscribeBody):
    if body.text and body.text.strip():
        return {"text": body.text.strip()}

    if not body.audioBase64:
        return {"text": "", "error": "请提供文字或语音"}

    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        return {
            "text": "（内测模式：语音已收到，请改用文字输入日记内容，或配置 OPENAI_API_KEY 启用 Whisper ASR）",
            "devMode": True,
        }

    try:
        audio_bytes = base64.b64decode(body.audioBase64)
        with tempfile.NamedTemporaryFile(suffix=".m4a", delete=False) as f:
            f.write(audio_bytes)
            path = f.name

        async with httpx.AsyncClient(timeout=60.0) as client:
            with open(path, "rb") as audio_file:
                resp = await client.post(
                    "https://api.openai.com/v1/audio/transcriptions",
                    headers={"Authorization": f"Bearer {api_key}"},
                    files={"file": ("audio.m4a", audio_file, "audio/m4a")},
                    data={"model": "whisper-1", "language": "zh"},
                )
            resp.raise_for_status()
            data = resp.json()
            return {"text": data.get("text", "").strip()}
    except Exception as e:
        return {"text": "", "error": str(e)}
