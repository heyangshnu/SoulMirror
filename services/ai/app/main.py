from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import analysis, bazi, bot, followup, mbti, palm, tarot, voice, ziwei

app = FastAPI(title="SoulMirror AI", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(mbti.router, prefix="/mbti", tags=["mbti"])
app.include_router(bazi.router, prefix="/bazi", tags=["bazi"])
app.include_router(tarot.router, prefix="/tarot", tags=["tarot"])
app.include_router(palm.router, prefix="/palm", tags=["palm"])
app.include_router(bot.router, prefix="/bot", tags=["bot"])
app.include_router(ziwei.router, prefix="/ziwei", tags=["ziwei"])
app.include_router(analysis.router, prefix="/analysis", tags=["analysis"])
app.include_router(followup.router, prefix="/followup", tags=["followup"])
app.include_router(voice.router, prefix="/voice", tags=["voice"])


@app.get("/health")
def health():
    import os

    return {
        "status": "ok",
        "deepseek_configured": bool(os.getenv("DEEPSEEK_API_KEY", "").strip()),
    }
